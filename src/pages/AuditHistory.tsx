import { ArrowRight, Calendar, CheckCircle2, ChevronDown, ChevronRight, Database, Download, Lock, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";

import { AuditTrail, Avatar, FilterChip, PageHeader, Panel, StatusChip } from "@/components/cg/primitives";
import { HISTORY } from "@/data/history";
import { OWNERS } from "@/data/seed";
import { CUTOFF } from "@/lib/clock";
import { buildRunRecord } from "@/lib/record";
import { cn } from "@/lib/utils";
import type { GateStatus, HistoricalRun } from "@/lib/types";
import { useCloseout } from "@/state/closeout";

type DecisionFilter = "all" | "READY" | "DEGRADED" | "BLOCKED";

const edge: Record<GateStatus, string> = { READY: "border-l-ok", DEGRADED: "border-l-warn", BLOCKED: "border-l-bad" };

/** The open run of the current session, or null once it is released (then it lives in the sealed archive). */
function useLiveRun(): HistoricalRun | null {
  const { snapshot, release, exceptions, responses, runLog, scenario } = useCloseout();
  return useMemo(
    () => (release ? null : buildRunRecord({ snapshot, release, exceptions, responses, runLog, scenario })),
    [snapshot, release, exceptions, responses, runLog, scenario],
  );
}

function runTitle(r: HistoricalRun) {
  if (r.live) return `${r.dateLabel} — IN PROGRESS · ${r.final}`;
  if (r.sealed) return `${r.dateLabel} — ${r.initial} → ${r.final} · RELEASED ${r.finalAt}`;
  if (r.initial !== r.final) return `${r.dateLabel} — ${r.initial} → ${r.final} at ${r.finalAt}`;
  return `${r.dateLabel} — ${r.final} at ${r.finalAt}`;
}

function toCsv(runs: HistoricalRun[]) {
  const rows = [["Date", "Run ID", "Initial", "Final", "Released at", "Released by", "Sources ready", "Checks passed", "Exceptions", "Digest"]];
  runs.forEach((r) =>
    rows.push([
      r.date,
      r.runId,
      r.initial,
      r.live ? "IN PROGRESS" : r.final,
      r.releasedAt,
      r.releasedBy,
      `${r.sources.filter((s) => s.status === "READY").length}/${r.sources.length}`,
      `${r.checks.filter((c) => c.result === "PASS").length}/${r.checks.length}`,
      String(r.exceptions.length),
      r.digest,
    ]),
  );
  return rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
}

export default function AuditHistory() {
  const live = useLiveRun();
  const { archive } = useCloseout();
  const all = useMemo(() => [...(live ? [live] : []), ...archive, ...HISTORY], [live, archive]);
  const [range, setRange] = useState<"15" | "7">("15");
  const [filter, setFilter] = useState<DecisionFilter>("all");
  const [selected, setSelected] = useState<string | null>(null);

  const runs = all.filter((r) => {
    const day = Number(r.date.slice(-2));
    if (range === "7" && day < 9) return false;
    if (filter === "all") return true;
    if (filter === "BLOCKED") return r.initial === "BLOCKED" || r.final === "BLOCKED";
    return r.final === filter;
  });
  const run = all.find((r) => r.runId === selected) ?? all[0];
  const releaseOk = !run.live;

  const exportCsv = () => {
    const blob = new Blob([toCsv(runs)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `closeout-gate-audit-${range === "7" ? "nov9-15" : "nov1-15"}-2026.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Audit History" subtitle="Completed runs, release decisions, and immutable audit records." />

      <div className="panel flex flex-col gap-3 p-3 lg:flex-row lg:items-center">
        <label className="relative flex items-center">
          <Calendar className="pointer-events-none absolute left-3 h-4 w-4 text-[#3E434A]" />
          <select
            aria-label="Date range"
            value={range}
            onChange={(e) => setRange(e.target.value as "15" | "7")}
            className="focus-ring h-10 appearance-none rounded-md border border-transparent bg-transparent pl-9 pr-9 text-[15px] font-semibold hover:border-line"
          >
            <option value="15">Nov 1 – Nov 15, 2026</option>
            <option value="7">Nov 9 – Nov 15, 2026</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4" />
        </label>
        <div className="hidden h-7 w-px bg-line lg:block" />
        <div className="flex flex-wrap gap-2">
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
            All
          </FilterChip>
          <FilterChip active={filter === "READY"} onClick={() => setFilter("READY")}>
            Ready
          </FilterChip>
          <FilterChip active={filter === "DEGRADED"} onClick={() => setFilter("DEGRADED")}>
            Degraded
          </FilterChip>
          <FilterChip active={filter === "BLOCKED"} onClick={() => setFilter("BLOCKED")}>
            Blocked
          </FilterChip>
        </div>
        <button type="button" className="btn-primary h-10 lg:ml-auto" onClick={exportCsv}>
          <Download className="h-4 w-4" /> Export
        </button>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.3fr)]">
        <section aria-label="Run history">
          <h2 className="mb-3 text-lg font-semibold">Run History · {runs.length} runs</h2>
          <ul className="max-h-[calc(100vh-260px)] min-h-[200px] space-y-2 overflow-y-auto pr-1">
            {runs.map((r) => {
              const active = r.runId === run.runId;
              return (
                <li key={r.runId}>
                  <button
                    type="button"
                    onClick={() => setSelected(r.runId)}
                    aria-current={active}
                    className={cn(
                      "focus-ring panel flex w-full items-center gap-3 border-l-[4px] px-4 py-3.5 text-left transition-colors",
                      r.live ? "border-l-ink" : edge[r.final],
                      active ? "bg-[#F0F0EC]" : "hover:bg-[#FAFAF8]",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-[15px] font-bold tracking-[-0.01em]">{runTitle(r)}</div>
                      <div className="mt-0.5 font-mono text-[12.5px] text-muted-foreground">{r.runId}</div>
                      <div className="mt-2 flex items-center gap-1.5">
                        {r.live ? (
                          <StatusChip label="IN PROGRESS" pulse />
                        ) : r.initial !== r.final ? (
                          <>
                            <StatusChip label={r.initial} />
                            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                            <StatusChip label={r.final} />
                          </>
                        ) : (
                          <StatusChip label={r.final} />
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                </li>
              );
            })}
            {runs.length === 0 && <li className="panel px-4 py-10 text-center text-sm text-muted-foreground">No runs match this filter.</li>}
          </ul>
        </section>

        <section aria-label="Run record" className="space-y-4">
          <h2 className="text-lg font-semibold">Run record — {run.dateLabel}, 2026</h2>

          <div className={cn("panel grid overflow-hidden border-l-[5px] md:grid-cols-[1fr_1.2fr]", run.live ? (run.final === "BLOCKED" ? "border-l-bad" : run.final === "DEGRADED" ? "border-l-warn" : "border-l-ok") : edge[run.final])}>
            <div className={cn("px-5 py-5", run.live ? "bg-[#F3F3F0]" : run.final === "DEGRADED" ? "bg-warn-tint" : "bg-ok-tint")}>
              <div className="eyebrow">Release decision</div>
              <div
                className={cn(
                  "mt-1 text-[34px] font-extrabold uppercase leading-[0.98] tracking-[-0.02em]",
                  run.live ? (run.final === "BLOCKED" ? "text-bad" : "text-ink") : run.final === "DEGRADED" ? "text-warn" : "text-ok",
                )}
              >
                {run.live ? (run.final === "BLOCKED" ? "Not released" : "Awaiting release") : run.final === "DEGRADED" ? "Released degraded" : "Released"}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <StatusChip label={run.initial} />
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <StatusChip label={run.final} />
                {!run.live && (
                  <span className="inline-flex items-center gap-1 rounded-sm border border-line bg-white px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <Lock className="h-3 w-3" /> Sealed · read-only
                  </span>
                )}
              </div>
              {run.live && <p className="mt-2 text-sm text-muted-foreground">This run is still open. The record seals when the report is released.</p>}
              {run.acknowledgedWarnings && run.acknowledgedWarnings.length > 0 && (
                <div className="mt-3 text-sm">
                  <div className="font-semibold text-warn">Warnings acknowledged at release</div>
                  <ul className="mt-1 list-disc pl-5 text-ink">
                    {run.acknowledgedWarnings.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <dl className="grid grid-cols-[130px_1fr] content-center gap-y-1.5 px-5 py-4 text-sm">
              <dt className="text-muted-foreground">Released by:</dt>
              <dd className="font-mono text-[13px]">{run.releasedBy || "—"}</dd>
              <dt className="text-muted-foreground">Release timestamp:</dt>
              <dd className="font-mono text-[13px]">{run.releasedAt || "—"}</dd>
              <dt className="text-muted-foreground">Reporting date:</dt>
              <dd className="font-mono text-[13px]">{run.dateLabel}, 2026</dd>
              <dt className="text-muted-foreground">Data cutoff:</dt>
              <dd className="font-mono text-[13px]">{CUTOFF}</dd>
              <dt className="text-muted-foreground">Run ID:</dt>
              <dd className="font-mono text-[13px] font-semibold">{run.runId}</dd>
            </dl>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="panel flex items-center gap-3 px-4 py-3.5">
              <Database className="h-6 w-6 text-[#3E434A]" strokeWidth={1.5} />
              <div>
                <div className="font-semibold">Sources</div>
                <div className={cn("text-lg font-bold", run.sources.every((s) => s.status === "READY") ? "text-ok" : "text-bad")}>
                  {run.sources.filter((s) => s.status === "READY").length}/{run.sources.length} READY
                </div>
              </div>
            </div>
            <div className="panel flex items-center gap-3 px-4 py-3.5">
              <CheckCircle2 className="h-6 w-6 text-[#3E434A]" strokeWidth={1.5} />
              <div>
                <div className="font-semibold">Reconciliations</div>
                <div className={cn("text-lg font-bold", run.checks.every((c) => c.result === "PASS") ? "text-ok" : run.checks.some((c) => c.result === "FAIL") ? "text-bad" : "text-warn")}>
                  {run.checks.filter((c) => c.result === "PASS").length}/{run.checks.length} PASS
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 2xl:grid-cols-2">
            <Panel title="Source statuses">
              <table className="w-full">
                <tbody className="divide-y divide-line">
                  {run.sources.map((s) => (
                    <tr key={s.name}>
                      <td className="td py-2 font-medium">{s.name}</td>
                      <td className="td py-2 font-mono text-[12.5px] text-muted-foreground">{s.at}</td>
                      <td className="td py-2 text-right">
                        <StatusChip label={s.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
            <Panel title="Reconciliation results">
              <table className="w-full">
                <tbody className="divide-y divide-line">
                  {run.checks.map((c) => (
                    <tr key={c.name}>
                      <td className="td py-2">
                        <div className="font-medium">{c.name}</div>
                        <div className="font-mono text-[12px] text-muted-foreground">{c.value}</div>
                      </td>
                      <td className="td py-2 text-right">
                        <StatusChip label={c.result} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
          </div>

          <Panel title={<>Exceptions · {run.exceptions.length}</>}>
            {run.exceptions.length === 0 ? (
              <p className="px-4 py-4 text-sm text-muted-foreground">No exceptions were raised for this run.</p>
            ) : (
              <ul className="divide-y divide-line">
                {run.exceptions.map((e) => (
                  <li key={e.id} className="flex gap-3 px-4 py-3 text-sm">
                    <CheckCircle2 className={cn("mt-0.5 h-4 w-4 shrink-0", e.resolvedAt ? "text-ok" : "text-muted-foreground")} />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[13px] font-semibold">{e.id}</span>
                        <span className="font-medium">{e.title}</span>
                        {e.blocking !== undefined && <StatusChip label={e.blocking ? "BLOCKING" : "WARNING"} />}
                        <StatusChip label={e.resolvedAt ? "RESOLVED" : "OPEN"} />
                      </div>
                      <div className="text-muted-foreground">Owner: <span className="text-ink">{e.owner}</span>{e.kind ? <> · {e.kind}</> : null}</div>
                      {e.missing && e.missing.length > 0 && <div className="text-muted-foreground">Missing: {e.missing.join(", ")}</div>}
                      <div className="font-mono text-[12.5px] text-muted-foreground">
                        {e.openedAt ? <>Opened {e.openedAt}</> : null}
                        {e.resolvedAt ? <>{e.openedAt ? " · " : ""}Resolved {e.resolvedAt}{e.resolvedBy ? ` by ${e.resolvedBy}` : ""}</> : null}
                      </div>
                      {e.note && <blockquote className="border-l-2 border-line pl-3 italic text-ink">“{e.note}”</blockquote>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title={<>Owner responses · {run.responses.length}</>}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px]">
                <thead className="bg-[#F3F3F0]">
                  <tr>
                    <th className="th">Owner</th>
                    <th className="th">Area</th>
                    <th className="th">Response</th>
                    <th className="th">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {run.responses.map((r) => {
                    const o = OWNERS.find((x) => x.name === r.owner);
                    return (
                      <tr key={r.owner}>
                        <td className="td">
                          <span className="inline-flex items-center gap-2">
                            <Avatar initials={o?.initials ?? "?"} dark /> {r.owner}
                          </span>
                        </td>
                        <td className="td">{r.area}</td>
                        <td className="td">
                          <StatusChip label={r.at === "Outstanding" ? "OUTSTANDING" : r.status} />
                        </td>
                        <td className="td font-mono text-[13px]">{r.at}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="Run timeline" right={<Lock className="h-4 w-4 text-muted-foreground" aria-label="Append-only" />} bodyClass="px-4 py-2">
            <AuditTrail entries={run.timeline} />
          </Panel>

          <div className="flex items-center gap-3 rounded-lg bg-[#E8E8E4] px-5 py-3.5">
            {releaseOk ? <Lock className="h-5 w-5 text-[#3E434A]" /> : <ShieldCheck className="h-5 w-5 text-muted-foreground" />}
            <span className="text-[15px] font-semibold">
              {releaseOk ? (
                <>
                  Sealed · <span className="font-mono">digest {run.digest.slice(0, 4)}…{run.digest.slice(-4)}</span>
                </>
              ) : (
                <span className="text-muted-foreground">Open run — not yet sealed</span>
              )}
            </span>
            {releaseOk && <span className="ml-auto hidden font-mono text-[11px] text-muted-foreground md:block">{run.digest.slice(0, 32)}…</span>}
          </div>
        </section>
      </div>
    </div>
  );
}
