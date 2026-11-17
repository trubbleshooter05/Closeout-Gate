import { Bell, Mail } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { ExceptionDrawer } from "@/components/cg/ExceptionDrawer";
import { Avatar, KV, PageHeader, Panel, SidePanel, StatusChip } from "@/components/cg/primitives";
import { OWNERS, PAST_EXCEPTIONS } from "@/data/seed";
import { cn } from "@/lib/utils";
import type { Owner } from "@/lib/types";
import { useCloseout } from "@/state/closeout";

const DAY_LABELS = ["Nov 1", "Nov 2", "Nov 3", "Nov 4", "Nov 5", "Nov 6", "Nov 7", "Nov 8", "Nov 9", "Nov 10", "Nov 11", "Nov 12", "Nov 13", "Nov 14"];
const histColor = { "on-time": "bg-ok", late: "bg-warn", missed: "bg-bad", none: "bg-[#DCDCD7]" } as const;
const histLabel = { "on-time": "On time", late: "Late", missed: "Missed", none: "No request" } as const;

function useOwnerStats() {
  const { responses, exceptions, sources, rules } = useCloseout();
  return useMemo(
    () =>
      OWNERS.map((o) => {
        const rs = responses.filter((r) => r.ownerId === o.id);
        const outstanding = rs.filter((r) => !r.receivedAt);
        const open = exceptions.filter((e) => e.ownerId === o.id && e.status !== "RESOLVED");
        const late = o.history.filter((h) => h === "late" || h === "missed").length;
        return {
          owner: o,
          responses: rs,
          outstanding,
          open,
          blocking: open.some((e) => e.blocking),
          late,
          sources: sources.filter((s) => s.ownerId === o.id),
          rules: rules.filter((r) => r.owner === o.name || r.owner === o.department),
        };
      }),
    [responses, exceptions, sources, rules],
  );
}

export default function Owners() {
  const stats = useOwnerStats();
  const [selected, setSelected] = useState<string | null>(null);
  const [exId, setExId] = useState<string | null>(null);
  const current = stats.find((s) => s.owner.id === selected) ?? null;

  return (
    <div className="space-y-5">
      <PageHeader title="Owners" subtitle="The people who must deliver data or confirmations before the report can be released." />

      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[860px]">
          <thead className="bg-[#F3F3F0]">
            <tr>
              <th className="th">Owner</th>
              <th className="th">Department</th>
              <th className="th">Today</th>
              <th className="th text-right">Outstanding</th>
              <th className="th text-right">Late (14 days)</th>
              <th className="th text-right">Avg response</th>
              <th className="th">Blocking</th>
              <th className="th">Last 14 days</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {stats.map((s) => (
              <tr
                key={s.owner.id}
                tabIndex={0}
                onClick={() => setSelected(s.owner.id)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setSelected(s.owner.id))}
                className="focus-ring cursor-pointer hover:bg-[#FAFAF8]"
                aria-label={`Open ${s.owner.name}`}
              >
                <td className="td">
                  <span className="inline-flex items-center gap-2.5">
                    <Avatar initials={s.owner.initials} dark={s.blocking} />
                    <span>
                      <span className="block font-semibold">{s.owner.name}</span>
                      <span className="block text-xs text-muted-foreground">{s.owner.title}</span>
                    </span>
                  </span>
                </td>
                <td className="td">{s.owner.department}</td>
                <td className="td">
                  <StatusChip label={s.outstanding.length ? "OUTSTANDING" : "RECEIVED"} />
                </td>
                <td className={cn("td tnum text-right font-semibold", s.outstanding.length + s.open.length > 0 && "text-bad")}>{s.outstanding.length + s.open.length}</td>
                <td className={cn("td tnum text-right", s.late >= 3 && "font-semibold text-warn-ink")}>{s.late}</td>
                <td className="td tnum text-right font-mono text-[13px]">{s.owner.avgResponseMin} min</td>
                <td className="td">{s.blocking ? <StatusChip label="BLOCKING" /> : <span className="text-muted-foreground">No</span>}</td>
                <td className="td">
                  <HistoryStrip history={s.owner.history} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <OwnerPanel stat={current} onClose={() => setSelected(null)} onOpenException={setExId} />
      <ExceptionDrawer id={exId} onClose={() => setExId(null)} />
    </div>
  );
}

function HistoryStrip({ history, large }: { history: Owner["history"]; large?: boolean }) {
  return (
    <div className="flex gap-[3px]" role="img" aria-label={`Last 14 days: ${history.filter((h) => h === "on-time").length} on time, ${history.filter((h) => h === "late").length} late`}>
      {history.map((h, i) => (
        <span key={i} title={`${DAY_LABELS[i]} · ${histLabel[h]}`} className={cn("rounded-[2px]", histColor[h], large ? "h-7 w-full" : "h-4 w-2")} />
      ))}
    </div>
  );
}

function OwnerPanel({
  stat,
  onClose,
  onOpenException,
}: {
  stat: ReturnType<typeof useOwnerStats>[number] | null;
  onClose: () => void;
  onOpenException: (id: string) => void;
}) {
  const { sendReminder } = useCloseout();
  if (!stat) return <SidePanel open={false} onOpenChange={() => onClose()} title="">{null}</SidePanel>;
  const { owner } = stat;
  const past = PAST_EXCEPTIONS.filter((e) => e.ownerId === owner.id);

  const remind = () => {
    if (stat.open.length) stat.open.forEach((e) => sendReminder(e.id));
    else toast(`Reminder sent to ${owner.name}`, { description: "Email + chat" });
  };

  return (
    <SidePanel
      open
      onOpenChange={(v) => !v && onClose()}
      title={owner.name}
      eyebrow={<Avatar initials={owner.initials} size={36} dark />}
      meta={owner.department}
      width="max-w-[720px]"
      footer={
        <div className="flex justify-end gap-2">
          <a className="btn-secondary" href={`mailto:${owner.email}`}>
            <Mail className="h-4 w-4" /> Email
          </a>
          <button type="button" className="btn-primary" onClick={remind} disabled={stat.outstanding.length === 0 && stat.open.length === 0}>
            <Bell className="h-4 w-4" /> Send Reminder
          </button>
        </div>
      }
    >
      <Panel bodyClass="px-4 py-3">
        <dl>
          <KV k="Title">{owner.title}</KV>
          <KV k="Email" mono>
            {owner.email}
          </KV>
          <KV k="Avg response">{owner.avgResponseMin} min after request</KV>
        </dl>
      </Panel>

      <Panel title="Unresolved items">
        {stat.open.length === 0 ? (
          <p className="px-4 py-4 text-sm text-muted-foreground">Nothing unresolved.</p>
        ) : (
          <ul className="divide-y divide-line">
            {stat.open.map((e) => (
              <li key={e.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{e.title}</div>
                  <div className="font-mono text-xs text-muted-foreground">
                    {e.id} · due {e.expected}
                  </div>
                </div>
                <StatusChip label={e.blocking ? "BLOCKING" : "WARNING"} />
                <button type="button" className="btn-secondary h-8 px-3" onClick={() => onOpenException(e.id)}>
                  View
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Today's status · Nov 15">
        <table className="w-full">
          <tbody className="divide-y divide-line">
            {stat.responses.map((r) => (
              <tr key={r.id}>
                <td className="td">{r.label}</td>
                <td className="td font-mono text-[13px] text-muted-foreground">due {r.dueBy}</td>
                <td className="td font-mono text-[13px]">{r.receivedAt ?? "—"}</td>
                <td className="td text-right">
                  <StatusChip label={r.receivedAt ? "RECEIVED" : "OUTSTANDING"} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel title="Requirements">
        <div className="divide-y divide-line">
          <div className="px-4 py-3">
            <div className="eyebrow mb-1.5">Sources owned · {stat.sources.length}</div>
            {stat.sources.length ? (
              <ul className="space-y-1 text-sm">
                {stat.sources.map((s) => (
                  <li key={s.id} className="flex justify-between gap-3">
                    <span>{s.name}</span>
                    <span className="font-mono text-[13px] text-muted-foreground">by {s.expectedBy}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">None</p>
            )}
          </div>
          <div className="px-4 py-3">
            <div className="eyebrow mb-1.5">Rules owned · {stat.rules.length}</div>
            {stat.rules.length ? (
              <ul className="space-y-1 text-sm">
                {stat.rules.map((r) => (
                  <li key={r.id} className="flex justify-between gap-3">
                    <span className={cn(!r.enabled && "text-muted-foreground line-through")}>{r.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{r.blocking ? "Blocking" : "Warning"}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">None</p>
            )}
          </div>
        </div>
      </Panel>

      <Panel title="Response history · last 14 days" bodyClass="px-4 py-4">
        <HistoryStrip history={owner.history} large />
        <div className="mt-2 flex justify-between font-mono text-[11px] text-muted-foreground">
          <span>Nov 1</span>
          <span>Nov 14</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
          {(Object.keys(histLabel) as (keyof typeof histLabel)[]).map((k) => (
            <span key={k} className="inline-flex items-center gap-1.5">
              <span className={cn("h-2.5 w-2.5 rounded-[2px]", histColor[k])} /> {histLabel[k]} · {owner.history.filter((h) => h === k).length}
            </span>
          ))}
        </div>
        {past.length > 0 && (
          <ul className="mt-4 space-y-1 border-t border-line pt-3 text-sm">
            {past.map((e) => (
              <li key={e.id}>
                <button type="button" className="focus-ring rounded-sm text-left hover:underline" onClick={() => onOpenException(e.id)}>
                  <span className="font-mono text-[13px]">{e.id}</span> · {e.title} <span className="text-muted-foreground">({e.date})</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </SidePanel>
  );
}
