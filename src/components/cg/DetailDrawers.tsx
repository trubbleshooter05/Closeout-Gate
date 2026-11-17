import { useNavigate } from "react-router-dom";

import { HISTORY } from "@/data/history";
import { ownerById } from "@/data/seed";
import { useCloseout } from "@/state/closeout";

import { Avatar, KV, Panel, SidePanel, StatusChip } from "./primitives";
import { SourceTypeIcon } from "./SourceTypeIcon";

export function SourceDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { sources, snapshot, pmAssets } = useCloseout();
  const s = sources.find((x) => x.id === id);
  if (!s) return <SidePanel open={false} onOpenChange={() => onClose()} title="">{null}</SidePanel>;
  const ev = snapshot.sources[s.id] ?? { status: "READY" as const, headline: "Awaiting first delivery", missingItems: 0 };
  const owner = ownerById(s.ownerId);
  const recent = HISTORY.slice(0, 7).map((h) => ({ day: h.dateLabel, row: h.sources.find((x) => x.name === s.name) }));

  return (
    <SidePanel open onOpenChange={(v) => !v && onClose()} title={s.name} eyebrow={<StatusChip label={ev.status} size="md" />} meta={s.type} width="max-w-[720px]">
      <Panel bodyClass="px-4 py-3">
        <p className="mb-2 text-sm font-medium">{ev.headline}</p>
        <dl className="grid md:grid-cols-2 md:gap-x-8">
          <KV k="Owner">
            <span className="inline-flex items-center gap-2">
              <Avatar initials={owner.initials} size={22} />
              {s.ownerLabel === owner.name ? owner.name : `${s.ownerLabel} · ${owner.name}`}
            </span>
          </KV>
          <KV k="Mandatory">{s.mandatory ? "Yes — blocks release" : "No — warning only"}</KV>
          <KV k="Expected by">{s.expectedBy}</KV>
          <KV k="Received / sync">{s.receivedAt ?? "Not received"}</KV>
          <KV k="Reporting date">{s.reportingDate}</KV>
          <KV k="Current through">{s.currentThrough}</KV>
          <KV k="Freshness rule">{s.freshnessRequirement}</KV>
          <KV k="Rows / items">{s.rowCount !== null ? `${s.rowCount.toLocaleString()} ${s.rowLabel}` : "—"}</KV>
          <KV k="Last successful run">{s.lastSuccessfulRun}</KV>
          <KV k="Last validation">{snapshot.checkedAt}</KV>
        </dl>
      </Panel>

      <Panel title="Connection" bodyClass="px-4 py-3">
        <dl>
          <KV k="Type">
            <span className="inline-flex items-center gap-2">
              <SourceTypeIcon type={s.type} /> {s.type}
            </span>
          </KV>
          <KV k="System / file" mono>
            {s.system}
          </KV>
          <KV k="Location" mono>
            {s.connection}
          </KV>
        </dl>
      </Panel>

      {s.tracksPmAssets && (
        <Panel title="Mandatory PM assets">
          <table className="w-full">
            <tbody className="divide-y divide-line">
              {pmAssets.map((a) => (
                <tr key={a.id}>
                  <td className="td font-medium">{a.asset}</td>
                  <td className="td text-muted-foreground">{a.task}</td>
                  <td className="td font-mono text-xs text-muted-foreground">{a.updatedAt ? `${a.updatedAt} · ${a.updatedBy}` : "—"}</td>
                  <td className="td text-right">
                    <StatusChip label={a.state ? a.state.toUpperCase() : "MISSING"} tone={a.state ? (a.state === "Deferred" ? "warn" : "ok") : "bad"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}

      <Panel title="Last 7 deliveries">
        <table className="w-full">
          <tbody className="divide-y divide-line">
            {recent.map((r) => (
              <tr key={r.day}>
                <td className="td w-24 font-medium">{r.day}</td>
                <td className="td font-mono text-[13px] text-muted-foreground">{r.row?.at ?? "—"}</td>
                <td className="td text-right">{r.row ? <StatusChip label={r.row.status} /> : <span className="text-xs text-muted-foreground">New source</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </SidePanel>
  );
}

export function CheckDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { snapshot, rules } = useCloseout();
  const nav = useNavigate();
  const c = snapshot.checks.find((x) => x.id === id);
  if (!c) return <SidePanel open={false} onOpenChange={() => onClose()} title="">{null}</SidePanel>;
  const rule = rules.find((r) => r.id === c.ruleId);
  return (
    <SidePanel open onOpenChange={(v) => !v && onClose()} title={c.name} eyebrow={<StatusChip label={c.result} size="md" />} meta={c.blocking ? "Blocking rule" : "Non-blocking"} width="max-w-[720px]">
      <Panel bodyClass="px-4 py-3">
        <p className="mb-2 text-sm text-muted-foreground">{c.description}</p>
        <dl>
          <KV k="Actual">
            <span className="tnum font-mono text-[13px]">{c.actual.join(" · ")}</span>
          </KV>
          <KV k="Expected">{c.expected}</KV>
          <KV k="Sources">{c.sources.join(", ")}</KV>
          <KV k="Owner">{c.owner}</KV>
          <KV k="Last checked">{c.checkedAt}</KV>
          {rule && (
            <KV k="Rule">
              <button
                type="button"
                className="text-left underline decoration-[#BDBDB7] underline-offset-2 hover:decoration-ink"
                onClick={() => {
                  onClose();
                  nav(`/rules?rule=${rule.id}`);
                }}
              >
                {rule.name}
              </button>
            </KV>
          )}
        </dl>
      </Panel>
      <Panel title="Line-level detail">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px]">
            <thead className="bg-[#F3F3F0]">
              <tr>
                {c.detailCols.map((h) => (
                  <th key={h} className="th">
                    {h}
                  </th>
                ))}
                <th className="th text-right">Result</th>
              </tr>
            </thead>
            <tbody className="tnum divide-y divide-line">
              {c.details.map((d) => (
                <tr key={d.label}>
                  <td className="td font-medium">{d.label}</td>
                  <td className="td">{d.a}</td>
                  <td className="td">{d.b}</td>
                  <td className="td text-right">
                    <StatusChip label={d.result} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </SidePanel>
  );
}
