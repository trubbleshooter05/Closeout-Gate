import { OWNERS, SOURCES, ownerById } from "@/data/seed";
import type { AuditEntry, Exception, HistoricalRun, OwnerResponse, ReleaseRecord, Snapshot } from "@/lib/types";

interface RecordInput {
  snapshot: Snapshot;
  exceptions: Exception[];
  responses: OwnerResponse[];
  runLog: AuditEntry[];
  release: ReleaseRecord | null;
  scenario: string;
}

/** Builds an audit run record from the current run. Released records are deep-frozen copies. */
export function buildRunRecord({ snapshot, exceptions, responses, runLog, release, scenario }: RecordInput): HistoricalRun {
  const final = release ? release.decision : snapshot.status;
  const finalAt = release ? release.releasedAt.replace(/^.*?(\d{1,2}:\d{2}):\d{2} (AM|PM)$/, "$1 $2") : "";
  const resolvedResponseIds = new Set(exceptions.filter((e) => e.status === "RESOLVED").flatMap((e) => e.resolvesResponses ?? []));

  const record: HistoricalRun = {
    date: "2026-11-15",
    dateLabel: "Nov 15",
    initial: "BLOCKED",
    final,
    finalAt,
    runId: release?.runId ?? snapshot.runId,
    releasedBy: release?.releasedBy ?? "",
    releasedAt: release?.releasedAt ?? "",
    sources: SOURCES.filter((s) => s.mandatory).map((s) => ({ name: s.name, status: snapshot.sources[s.id].status, at: s.receivedAt ?? "—" })),
    checks: snapshot.checks.map((c) => ({ name: c.name, result: c.result, value: c.headline })),
    exceptions: exceptions.map((e) => ({
      id: e.id,
      title: e.title,
      owner: ownerById(e.ownerId).name,
      resolvedAt: e.resolution?.at ?? "",
      resolvedBy: e.resolution?.by,
      note: e.resolution?.note,
      kind: e.resolution?.kind,
      missing: [...e.missing],
      openedAt: e.openedAt,
      blocking: e.blocking,
    })),
    responses: OWNERS.map((o) => {
      const rs = responses.filter((r) => r.ownerId === o.id);
      const outstanding = rs.some((r) => !r.receivedAt);
      const viaException = rs.some((r) => resolvedResponseIds.has(r.id));
      const last = rs.map((r) => r.receivedAt).filter(Boolean).pop();
      return {
        owner: o.name,
        area: o.department,
        status: outstanding ? ("LATE" as const) : viaException ? ("RESOLVED" as const) : ("RECEIVED" as const),
        at: outstanding ? "Outstanding" : (last ?? "—"),
      };
    }),
    timeline: runLog.map((e) => ({ ...e })),
    digest: release?.digest ?? "",
    live: !release,
    sealed: !!release,
    acknowledgedWarnings: release ? [...release.acknowledgedWarnings] : [],
    scenario,
  };
  return release ? deepFreeze(JSON.parse(JSON.stringify(record)) as HistoricalRun) : record;
}

function deepFreeze<T>(o: T): T {
  if (o && typeof o === "object") {
    Object.values(o as Record<string, unknown>).forEach((v) => deepFreeze(v));
    Object.freeze(o);
  }
  return o;
}
