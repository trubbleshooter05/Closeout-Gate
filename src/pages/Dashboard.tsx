import { ArrowRight, CheckCircle2, Lock, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { CheckDrawer, SourceDrawer } from "@/components/cg/DetailDrawers";
import { ExceptionCard } from "@/components/cg/ExceptionCard";
import { ExceptionDrawer } from "@/components/cg/ExceptionDrawer";
import { AuditTrail, Panel, SectionTitle, StatusChip } from "@/components/cg/primitives";
import { ReleaseDialog } from "@/components/cg/ReleaseDialog";
import { ownerById } from "@/data/seed";
import { CUTOFF, REPORTING_DATE } from "@/lib/clock";
import { cn } from "@/lib/utils";
import type { GateStatus } from "@/lib/types";
import { useCloseout } from "@/state/closeout";

const bannerTone: Record<GateStatus, { wrap: string; word: string; label: string }> = {
  READY: { wrap: "border-l-ok bg-ok-tint", word: "text-ok", label: "READY" },
  DEGRADED: { wrap: "border-l-warn bg-warn-tint", word: "text-warn", label: "DEGRADED" },
  BLOCKED: { wrap: "border-l-bad bg-bad-tint", word: "text-bad", label: "BLOCKED" },
};

function statusSentence(status: GateStatus, failed: number, warnings: number, released: boolean, pendingRecheck = 0) {
  if (released && status === "DEGRADED")
    return `Today's management report passed all mandatory closeout checks and was released with ${warnings} acknowledged warning${warnings === 1 ? "" : "s"}.`;
  if (released) return "Today's management report passed all mandatory closeout checks and was released.";
  if (status === "BLOCKED" && pendingRecheck > 0)
    return `${pendingRecheck} exception${pendingRecheck === 1 ? "" : "s"} resolved since the last check. Run Recheck to re-evaluate the release decision.`;
  if (status === "BLOCKED")
    return `${failed} blocking issue${failed === 1 ? "" : "s"} must be resolved before today's management report can be released.`;
  if (status === "DEGRADED")
    return `All critical sources are available. ${warnings} non-critical warning${warnings === 1 ? "" : "s"} must be acknowledged at release.`;
  return "All required sources are current and all blocking reconciliations passed.";
}

export default function Dashboard() {
  const cg = useCloseout();
  const { snapshot, rechecking, release, sources, exceptions } = cg;
  const [exId, setExId] = useState<string | null>(null);
  const [focusNote, setFocusNote] = useState(false);
  const [srcId, setSrcId] = useState<string | null>(null);
  const [chkId, setChkId] = useState<string | null>(null);
  const [releaseOpen, setReleaseOpen] = useState(false);

  const tone = release
    ? { ...bannerTone[release.decision], label: "REPORT RELEASED" }
    : bannerTone[snapshot.status];
  const visibleEx = exceptions
    .filter((e) => e.status !== "RESOLVED" || e.awaitingRecheck)
    .sort((a, b) => Number(b.blocking) - Number(a.blocking) || Number(a.status === "RESOLVED") - Number(b.status === "RESOLVED"));
  const openBlocking = exceptions.filter((e) => e.status !== "RESOLVED" && e.blocking).length;
  const mandatory = sources.filter((s) => s.mandatory && snapshot.sources[s.id]);
  const readyCount = mandatory.filter((s) => snapshot.sources[s.id].status === "READY").length;
  const passCount = snapshot.checks.filter((c) => c.result === "PASS").length;
  const failCount = snapshot.checks.filter((c) => c.result === "FAIL").length;
  const warnCount = snapshot.checks.filter((c) => c.result === "WARNING").length;
  const blocked = snapshot.status === "BLOCKED";

  return (
    <div className="space-y-7">
      {/* Header */}
      <header className="flex flex-col gap-2 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[28px] font-bold leading-tight tracking-[-0.02em]">Daily Management Report</h1>
          <p className="mt-1 flex flex-wrap gap-x-2 text-[15px] text-[#3E434A]">
            <span>Reporting Date: {REPORTING_DATE}</span>
            <span className="text-[#BDBDB7]">·</span>
            <span>Cutoff: {CUTOFF}</span>
            <span className="text-[#BDBDB7]">·</span>
            <span>Last checked: {snapshot.checkedAt}</span>
          </p>
        </div>
        <div className="font-mono text-[13px] text-[#3E434A]">Run ID {snapshot.runId}</div>
      </header>

      {/* Report status */}
      <section aria-labelledby="report-status" className={cn("relative overflow-hidden rounded-lg border border-line border-l-[6px] transition-colors duration-500", tone.wrap)}>
        <div className="flex flex-col gap-5 p-5 sm:p-6 2xl:flex-row 2xl:items-center 2xl:gap-8">
          <div className="shrink-0 2xl:min-w-[300px] 2xl:border-r 2xl:border-black/10 2xl:pr-8">
            <div id="report-status" className="text-[13px] font-bold uppercase tracking-[0.06em] text-[#3E434A]">
              Report Status
            </div>
            <div
              key={tone.label}
              className={cn(
                "rise mt-0.5 font-extrabold leading-none tracking-[-0.02em]",
                release ? "text-[40px] sm:text-[48px]" : "text-[52px] sm:text-[64px]",
                tone.word,
              )}
            >
              {tone.label}
            </div>
          </div>
          <p className="max-w-[460px] flex-1 text-[17px] font-medium leading-snug text-foreground">
            {statusSentence(release?.decision ?? snapshot.status, snapshot.failedBlockingRules, release ? release.acknowledgedWarnings.length : snapshot.warnings, !!release, openBlocking === 0 ? exceptions.filter((e) => e.awaitingRecheck).length : 0)}
          </p>
          <div className="flex flex-col gap-2.5 sm:flex-row 2xl:ml-auto">
            <button
              type="button"
              className={cn("btn-primary h-12 px-6 text-[15px]", release && "cursor-not-allowed opacity-50")}
              onClick={cg.recheck}
              disabled={rechecking || !!release}
              title={release ? "This run is released and sealed" : undefined}
              aria-live="polite"
            >
              <RefreshCw className={cn("h-4 w-4", rechecking && "animate-spin")} />
              {rechecking ? "Rechecking…" : "Recheck Closeout"}
            </button>
            {release ? (
              <span className="btn h-12 border border-ok/30 bg-white px-5 text-[15px] text-ok-ink">
                <CheckCircle2 className="h-4 w-4" /> Released {release.releasedAt.split(" ").slice(-2).join(" ")}
              </span>
            ) : blocked ? (
              <button type="button" className="btn-locked h-12 px-5 text-[15px]" disabled title="Resolve all blocking issues and recheck to enable release">
                <Lock className="h-4 w-4" /> Release Management Report
              </button>
            ) : (
              <button
                type="button"
                disabled={rechecking}
                className={cn(snapshot.status === "READY" ? "btn-release" : "btn-secondary border-warn text-warn-ink", "h-12 px-5 text-[15px]")}
                onClick={() => setReleaseOpen(true)}
              >
                <ShieldCheck className="h-4 w-4" /> Release Management Report
              </button>
            )}
          </div>
        </div>
        {rechecking && (
          <div className="absolute inset-x-0 bottom-0 h-[3px] overflow-hidden bg-black/5" role="progressbar" aria-label="Rechecking sources and rules">
            <div className="scan-bar h-full w-2/5 bg-ink" />
          </div>
        )}
      </section>

      {/* Blocking exceptions */}
      <section aria-labelledby="blocking-ex">
        <SectionTitle
          id="blocking-ex"
          right={
            <Link to="/exceptions" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              All exceptions <ArrowRight className="h-4 w-4" />
            </Link>
          }
        >
          Blocking Exceptions · {openBlocking}
        </SectionTitle>
        {visibleEx.length === 0 ? (
          <div className="panel flex items-center gap-3 border-l-[4px] border-l-ok px-5 py-5">
            <CheckCircle2 className="h-5 w-5 text-ok" />
            <div>
              <div className="font-semibold">No open exceptions</div>
              <div className="text-sm text-muted-foreground">Every required source item and owner response has been received for {REPORTING_DATE}.</div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleEx.map((e) => (
              <ExceptionCard
                key={e.id}
                ex={e}
                onView={() => {
                  setFocusNote(false);
                  setExId(e.id);
                }}
                onResolve={() => {
                  setFocusNote(true);
                  setExId(e.id);
                }}
              />
            ))}
          </div>
        )}
      </section>

      {/* Sources + Reconciliation */}
      <div className="grid gap-5 2xl:grid-cols-2">
        <Panel
          title={
            <>
              Source Readiness · {readyCount} of {mandatory.length} ready
            </>
          }
          right={
            <Link to="/sources" className="text-sm text-muted-foreground hover:text-foreground">
              Manage
            </Link>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="bg-[#F3F3F0]">
                <tr>
                  <th className="th">Status</th>
                  <th className="th">Source</th>
                  <th className="th">Owner</th>
                  <th className="th">Freshness</th>
                  <th className="th">Expected / actual</th>
                  <th className="th">
                    <span className="sr-only">Action</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {mandatory.map((s) => {
                  const ev = snapshot.sources[s.id];
                  return (
                    <tr key={s.id} className="hover:bg-[#FAFAF8]">
                      <td className="td">
                        <StatusChip label={ev.status} />
                      </td>
                      <td className="td">
                        <div className="font-medium">{s.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {s.rowCount !== null && `${s.rowCount.toLocaleString()} ${s.rowLabel} · `}Last OK {s.lastSuccessfulRun.replace("Nov ", "").replace(/^\d+, /, "")}
                        </div>
                      </td>
                      <td className="td">{s.ownerLabel}</td>
                      <td className={cn("td", ev.status === "BLOCKED" && "font-medium text-bad-ink")}>
                        {ev.headline}
                        <div className="text-xs text-muted-foreground">Reporting date {s.reportingDate.replace(", 2026", "")}</div>
                      </td>
                      <td className="td tnum whitespace-nowrap font-mono text-[12.5px] text-[#3E434A]">
                        {s.expectedBy} / {s.receivedAt ?? "—"}
                      </td>
                      <td className="td text-right">
                        <button type="button" className="btn-secondary h-8 px-3" onClick={() => setSrcId(s.id)}>
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel
          title={
            <>
              Reconciliation Checks · {passCount} pass{warnCount > 0 && ` · ${warnCount} warning`}
              {failCount > 0 && ` · ${failCount} fail`}
            </>
          }
          right={
            <Link to="/rules" className="text-sm text-muted-foreground hover:text-foreground">
              Rules
            </Link>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px]">
              <thead className="bg-[#F3F3F0]">
                <tr>
                  <th className="th">Result</th>
                  <th className="th">Check</th>
                  <th className="th">Actual vs expected</th>
                  <th className="th">Owner</th>
                  <th className="th">
                    <span className="sr-only">Action</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {snapshot.checks.map((c) => (
                  <tr key={c.id} className="cursor-pointer hover:bg-[#FAFAF8]" onClick={() => setChkId(c.id)}>
                    <td className="td">
                      <StatusChip label={c.result} />
                    </td>
                    <td className="td">
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {c.sources.join(" · ")} · {c.blocking ? "Blocking" : "Non-blocking"}
                      </div>
                    </td>
                    <td className="td">
                      <div className={cn("tnum font-mono text-[12.5px]", c.result === "FAIL" ? "text-bad-ink" : c.result === "WARNING" ? "text-warn-ink" : "text-[#3E434A]")}>
                        {c.id === "chk-labor" ? c.actual.slice(0, 2).join(" vs ") : c.headline}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {c.id === "chk-labor" ? `${c.headline} · ${c.expected}` : c.expected}
                      </div>
                    </td>
                    <td className="td text-sm">{c.owner}</td>
                    <td className="td text-right">
                      <button
                        type="button"
                        className="btn-secondary h-8 px-3"
                        onClick={(e) => {
                          e.stopPropagation();
                          setChkId(c.id);
                        }}
                      >
                        Detail
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-line px-4 py-2 text-xs text-muted-foreground">Last checked {snapshot.checkedAt} · Blocking rules decide release; warnings degrade it.</div>
        </Panel>
      </div>

      {/* Report release */}
      <section aria-labelledby="report-release" className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div>
          <SectionTitle id="report-release">Report Release</SectionTitle>
          <div className={cn("panel overflow-hidden border-l-[6px]", release || snapshot.status === "READY" ? "border-l-ok" : blocked ? "border-l-bad" : "border-l-warn")}>
            <div className="grid gap-5 p-5 md:grid-cols-[1fr_1.15fr]">
              <div>
                <div className="eyebrow">Release decision</div>
                {blocked ? (
                  <>
                    <div className="mt-1 flex items-start gap-2 text-[26px] font-extrabold leading-[1.05] tracking-[-0.02em] text-bad">
                      <XCircle className="mt-1 h-6 w-6 shrink-0" /> Report cannot be released
                    </div>
                    <div className="mt-3 text-sm font-semibold">Reasons:</div>
                    <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-[#3E434A]">
                      {snapshot.missingSourceItems > 0 && (
                        <li>
                          {snapshot.missingSourceItems} mandatory source item{snapshot.missingSourceItems === 1 ? "" : "s"} incomplete
                        </li>
                      )}
                      {snapshot.failedBlockingRules > 0 && (
                        <li>
                          {snapshot.failedBlockingRules} blocking rule{snapshot.failedBlockingRules === 1 ? "" : "s"} failed
                        </li>
                      )}
                    </ul>
                  </>
                ) : (
                  <>
                    <div className={cn("mt-1 text-[26px] font-extrabold leading-[1.05] tracking-[-0.02em]", snapshot.status === "READY" ? "text-ok" : "text-warn")}>
                      {release ? "REPORT RELEASED" : snapshot.status === "READY" ? "Ready for release" : "Release with warnings"}
                    </div>
                    <p className="mt-2 text-sm text-[#3E434A]">
                      {release
                        ? statusSentence(release.decision, 0, release.acknowledgedWarnings.length, true)
                        : snapshot.status === "READY"
                          ? "All required sources are current and all blocking reconciliations passed."
                          : "All critical sources are available. Non-critical warnings must be acknowledged at release."}
                    </p>
                  </>
                )}
              </div>
              <dl className="grid grid-cols-[130px_1fr] gap-y-2 self-start rounded-md bg-paper px-4 py-3 text-sm">
                <dt className="text-muted-foreground">Released by:</dt>
                <dd className="font-mono text-[13px]">{release?.releasedBy ?? "—"}</dd>
                <dt className="text-muted-foreground">Release timestamp:</dt>
                <dd className="font-mono text-[13px]">{release?.releasedAt ?? "—"}</dd>
                <dt className="text-muted-foreground">Reporting date:</dt>
                <dd className="font-mono text-[13px]">{REPORTING_DATE}</dd>
                <dt className="text-muted-foreground">Data cutoff:</dt>
                <dd className="font-mono text-[13px]">{CUTOFF}</dd>
                <dt className="text-muted-foreground">Run ID:</dt>
                <dd className="font-mono text-[13px]">{release?.runId ?? snapshot.runId}</dd>
              </dl>
            </div>
            {release && (
              <div className="flex items-center gap-2 border-t border-line bg-[#F3F3F0] px-5 py-2.5 font-mono text-[12.5px] text-[#3E434A]">
                <Lock className="h-3.5 w-3.5" /> Sealed · digest {release.digest.slice(0, 4)}…{release.digest.slice(-4)}
                <Link to="/audit" className="ml-auto font-sans text-xs text-muted-foreground hover:text-foreground">
                  View record →
                </Link>
              </div>
            )}
          </div>
        </div>
        <div>
          <SectionTitle
            right={
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Lock className="h-3.5 w-3.5" /> Append-only
              </span>
            }
          >
            Today's run log
          </SectionTitle>
          <Panel bodyClass="max-h-[280px] overflow-y-auto px-4 py-2">
            <AuditTrail entries={[...cg.runLog].reverse()} />
          </Panel>
        </div>
      </section>

      <p className="pb-4 text-xs text-muted-foreground">
        Owner on point for open items:{" "}
        {[...new Set(exceptions.filter((e) => e.status !== "RESOLVED").map((e) => ownerById(e.ownerId).name))].join(", ") || "none"}.
      </p>

      <ExceptionDrawer id={exId} focusNote={focusNote} onClose={() => setExId(null)} />
      <SourceDrawer id={srcId} onClose={() => setSrcId(null)} />
      <CheckDrawer id={chkId} onClose={() => setChkId(null)} />
      <ReleaseDialog open={releaseOpen} onOpenChange={setReleaseOpen} />
    </div>
  );
}
