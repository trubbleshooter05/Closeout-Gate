import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { CURRENT_USER, EXCEPTIONS, PM_ASSETS, RESPONSES, RULES, SOURCES, ownerById } from "@/data/seed";
import { CUTOFF, REPORTING_DATE, demoNow, digestOf, fmtStamp, fmtTime, fmtTimeSec, runIdFor } from "@/lib/clock";
import { evaluate, type RawState } from "@/lib/evaluate";
import { buildRunRecord } from "@/lib/record";
import type { AuditEntry, Exception, HistoricalRun, OwnerResponse, PmAsset, ReleaseRecord, Rule, Snapshot, Source } from "@/lib/types";

export type Scenario = "blocked" | "degraded" | "ready";

interface State {
  scenario: Scenario;
  sources: Source[];
  pmAssets: PmAsset[];
  responses: OwnerResponse[];
  exceptions: Exception[];
  rules: Rule[];
  qualityWarning: boolean;
  snapshot: Snapshot;
  release: ReleaseRecord | null;
  runLog: AuditEntry[];
}

const INITIAL_CHECK = "6:43 AM";
const INITIAL_RUN = "CG-20261115-0643";

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

function buildInitial(scenario: Scenario, runId: string = INITIAL_RUN): State {
  const pmAssets = clone(PM_ASSETS);
  const responses = clone(RESPONSES);
  let exceptions = clone(EXCEPTIONS);
  const rules = clone(RULES);
  const qualityWarning = scenario === "degraded";

  if (scenario !== "blocked") {
    pmAssets.forEach((a) => {
      if (!a.state) {
        a.state = "Complete";
        a.updatedAt = "6:34 AM";
        a.updatedBy = "M. Chen";
      }
    });
    responses.forEach((r) => {
      if (!r.receivedAt) r.receivedAt = "6:36 AM";
    });
    exceptions = exceptions.map((e) => ({
      ...e,
      status: "RESOLVED" as const,
      audit: [...e.audit.slice(0, 2), { t: "06:36:12", actor: "M. Chen", msg: "Owner response submitted — resolved" }],
      resolution: { note: "Completed on second shift; maintenance export was generated before close.", by: "M. Chen", at: "6:36 AM", kind: "Owner confirmed" },
    }));
    if (scenario === "degraded") {
      exceptions.push({
        id: "EXC-1115-03",
        title: "Quality hold missing disposition",
        description: "Hold QH-1002 (Lot A-108, label adhesion) has no disposition, so held units may be counted as good production.",
        ownerId: "cmorgan",
        checkId: "chk-quality",
        sourceId: "quality",
        ruleName: "Quality holds must be reflected in production quantities",
        missing: ["QH-1002 disposition"],
        expected: "7:00 AM",
        status: "WAITING FOR OWNER",
        blocking: false,
        openedAt: "6:30 AM",
        date: REPORTING_DATE,
        audit: [
          { t: "06:30:04", actor: "System", msg: "Rule QH-RECON evaluated → WARNING" },
          { t: "06:30:05", actor: "System", msg: "Warning opened, assigned to C. Morgan" },
        ],
      });
    }
  }

  const raw: RawState = { pmAssets, responses, rules, qualityWarning };
  return {
    scenario,
    sources: clone(SOURCES),
    pmAssets,
    responses,
    exceptions,
    rules,
    qualityWarning,
    snapshot: evaluate(raw, INITIAL_CHECK, runId),
    release: null,
    runLog: [
      { t: "06:00:00", actor: "System", msg: `Closeout run ${runId} opened for Nov 15, 2026` },
      { t: "06:15:02", actor: "System", msg: "Initial evaluation → BLOCKED" },
      ...(scenario === "blocked" ? [{ t: "06:20:41", actor: "T. Brooks", msg: "Reminder sent to M. Chen" }] : [{ t: "06:36:12", actor: "M. Chen", msg: "Maintenance responses submitted" }]),
      { t: "06:43:10", actor: "System", msg: `Recheck → ${evaluate(raw, INITIAL_CHECK, runId).status}` },
    ],
  };
}

interface Ctx extends State {
  rechecking: boolean;
  openExceptions: Exception[];
  /** Sealed records of runs released in this session, newest first. Never mutated. */
  archive: HistoricalRun[];
  recheck: () => void;
  sendReminder: (id: string) => void;
  resolveException: (id: string, note: string, kind: string) => void;
  releaseReport: (ackWarnings: string[]) => void;
  saveRule: (rule: Rule) => void;
  toggleRule: (id: string) => void;
  addSource: (s: Source) => void;
  setScenario: (s: Scenario) => void;
}

const CloseoutContext = createContext<Ctx | null>(null);

const initialsOf = (name: string) =>
  name
    .split(" ")
    .map((p, i) => (i === 0 ? p[0] + "." : p))
    .join(" ");

export function CloseoutProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(() => buildInitial("blocked"));
  const [archive, setArchive] = useState<HistoricalRun[]>([]);
  const [rechecking, setRechecking] = useState(false);
  const timer = useRef<number | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const runSeq = useRef(1);
  const me = initialsOf(CURRENT_USER.name);

  const recheck = useCallback(() => {
    if (timer.current) return;
    if (stateRef.current.release) {
      toast("This run is released and sealed", { description: "Switch the demo scenario in Settings to start a new run." });
      return;
    }
    setRechecking(true);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      setRechecking(false);
      setState((prev) => {
        if (prev.release) return prev;
        const now = demoNow();
        const t = fmtTimeSec(now);
        const snapshot = evaluate(
          { pmAssets: prev.pmAssets, responses: prev.responses, rules: prev.rules, qualityWarning: prev.qualityWarning },
          fmtTime(now),
          prev.snapshot.runId,
        );
        const exceptions = prev.exceptions.map((e) => {
          const check = snapshot.checks.find((c) => c.id === e.checkId);
          if (e.status === "RESOLVED") {
            if (!e.awaitingRecheck) return e;
            return { ...e, awaitingRecheck: false, audit: [...e.audit, { t, actor: "System", msg: `Recheck → ${check?.result ?? "PASS"}, exception closed` }] };
          }
          return { ...e, audit: [...e.audit, { t, actor: "System", msg: `Recheck → ${check ? check.headline.toLowerCase() : "still open"}` }] };
        });
        const statusMsg =
          snapshot.status === "READY"
            ? "All blocking checks passed. The report can be released."
            : snapshot.status === "DEGRADED"
              ? "No blocking issues. Warnings must be acknowledged at release."
              : `${snapshot.failedBlockingRules} blocking rule${snapshot.failedBlockingRules === 1 ? "" : "s"} still failing.`;
        const fn = snapshot.status === "READY" ? toast.success : snapshot.status === "DEGRADED" ? toast.warning : toast.error;
        fn(`Recheck complete — ${snapshot.status}`, { description: statusMsg });
        const transition = prev.snapshot.status !== snapshot.status ? `Status changed ${prev.snapshot.status} → ${snapshot.status}` : `Status unchanged (${snapshot.status})`;
        return {
          ...prev,
          snapshot,
          exceptions,
          runLog: [
            ...prev.runLog,
            { t, actor: me, msg: `Recheck Closeout run — ${snapshot.checks.length} checks, ${Object.keys(snapshot.sources).length} sources re-evaluated` },
            { t, actor: "System", msg: transition },
          ],
        };
      });
    }, 1500);
  }, [me]);

  const sendReminder = useCallback(
    (id: string) => {
      setState((prev) => {
        const t = fmtTimeSec(demoNow());
        const ex = prev.exceptions.find((e) => e.id === id);
        if (!ex || prev.release) return prev;
        const owner = ownerById(ex.ownerId);
        toast(`Reminder sent to ${owner.name}`, { description: `Email + chat · ${ex.missing.join(", ")} due ${ex.expected}` });
        return {
          ...prev,
          exceptions: prev.exceptions.map((e) => (e.id === id ? { ...e, audit: [...e.audit, { t, actor: me, msg: "Reminder sent via email + chat" }] } : e)),
          runLog: [...prev.runLog, { t, actor: me, msg: `Reminder sent to ${initialsOf(owner.name)} (${id})` }],
        };
      });
    },
    [me],
  );

  const resolveException = useCallback(
    (id: string, note: string, kind: string) => {
      setState((prev) => {
        const now = demoNow();
        const t = fmtTimeSec(now);
        const at = fmtTime(now);
        const ex = prev.exceptions.find((e) => e.id === id);
        if (!ex || ex.status === "RESOLVED" || prev.release) return prev;
        const ownerShort = initialsOf(ownerById(ex.ownerId).name);
        const pmAssets = prev.pmAssets.map((a) =>
          ex.resolvesPmAssets?.includes(a.id) ? { ...a, state: (kind === "Deferred with approval" ? "Deferred" : "Complete") as PmAsset["state"], updatedAt: at, updatedBy: ownerShort } : a,
        );
        const responses = prev.responses.map((r) => (ex.resolvesResponses?.includes(r.id) ? { ...r, receivedAt: at } : r));
        const qualityWarning = ex.checkId === "chk-quality" ? false : prev.qualityWarning;
        toast.success(`${id} marked resolved`, { description: "Run Recheck Closeout to re-evaluate the release decision." });
        return {
          ...prev,
          pmAssets,
          responses,
          qualityWarning,
          exceptions: prev.exceptions.map((e) =>
            e.id === id
              ? {
                  ...e,
                  status: "RESOLVED" as const,
                  awaitingRecheck: true,
                  resolution: { note, by: me, at, kind },
                  audit: [...e.audit, { t, actor: me, msg: `Marked resolved (${kind}): “${note}”` }],
                }
              : e,
          ),
          runLog: [...prev.runLog, { t, actor: me, msg: `${id} marked resolved — pending recheck` }],
        };
      });
    },
    [me],
  );

  const releaseReport = useCallback(
    (ackWarnings: string[]) => {
      const prev = stateRef.current;
      if (prev.snapshot.status === "BLOCKED" || prev.release || timer.current) return;
      const warnings = prev.snapshot.checks.filter((c) => c.result === "WARNING").length;
      if (prev.snapshot.status === "DEGRADED" && ackWarnings.length < warnings) return;
      const now = demoNow();
      const t = fmtTimeSec(now);
      const runId = prev.snapshot.runId;
      const release: ReleaseRecord = {
        releasedBy: `${CURRENT_USER.name}, ${CURRENT_USER.title}`,
        releasedAt: fmtStamp(now),
        reportingDate: REPORTING_DATE,
        cutoff: CUTOFF,
        runId,
        decision: prev.snapshot.status,
        acknowledgedWarnings: ackWarnings,
        digest: digestOf(runId + prev.snapshot.status + fmtStamp(now) + JSON.stringify(prev.snapshot.checks.map((c) => c.result))),
      };
      const next: State = {
        ...prev,
        release,
        runLog: [
          ...prev.runLog,
          ...(ackWarnings.length ? [{ t, actor: me, msg: `Release with warnings acknowledged: ${ackWarnings.join("; ")}` }] : []),
          { t, actor: me, msg: `Management report released (${prev.snapshot.status}) — run sealed` },
        ],
      };
      stateRef.current = next;
      setState(next);
      const record = buildRunRecord(next);
      setArchive((a) => (a.some((r) => r.runId === record.runId) ? a : [record, ...a]));
      toast.success("Management report released", { description: `${runId} sealed and recorded in Audit History.` });
    },
    [me],
  );

  const saveRule = useCallback((rule: Rule) => {
    setState((prev) => {
      const exists = prev.rules.some((r) => r.id === rule.id);
      return { ...prev, rules: exists ? prev.rules.map((r) => (r.id === rule.id ? rule : r)) : [...prev.rules, rule] };
    });
    toast.success("Rule saved", { description: "Changes apply at the next recheck." });
  }, []);

  const toggleRule = useCallback((id: string) => {
    setState((prev) => ({ ...prev, rules: prev.rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)) }));
  }, []);

  const addSource = useCallback((s: Source) => {
    setState((prev) => ({ ...prev, sources: [...prev.sources, s] }));
    toast.success(`${s.name} added`, { description: "Demo source — no live connection is made." });
  }, []);

  const setScenario = useCallback((s: Scenario) => {
    if (timer.current) {
      window.clearTimeout(timer.current);
      timer.current = null;
      setRechecking(false);
    }
    runSeq.current += 1;
    const runId = `${runIdFor(demoNow())}-R${runSeq.current}`;
    const next = buildInitial(s, runId);
    stateRef.current = next;
    setState(next);
    toast(`New ${s.toUpperCase()} demo run started`, { description: `${runId} · released records are kept in Audit History.` });
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      ...state,
      rechecking,
      openExceptions: state.exceptions.filter((e) => e.status !== "RESOLVED"),
      archive,
      recheck,
      sendReminder,
      resolveException,
      releaseReport,
      saveRule,
      toggleRule,
      addSource,
      setScenario,
    }),
    [state, archive, rechecking, recheck, sendReminder, resolveException, releaseReport, saveRule, toggleRule, addSource, setScenario],
  );

  return <CloseoutContext.Provider value={value}>{children}</CloseoutContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCloseout(): Ctx {
  const ctx = useContext(CloseoutContext);
  if (!ctx) throw new Error("useCloseout must be used inside CloseoutProvider");
  return ctx;
}
