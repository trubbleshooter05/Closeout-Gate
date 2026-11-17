import { Bell, CheckCircle2, Lock, Mail } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { PAST_EXCEPTIONS, SOURCES, ownerById } from "@/data/seed";
import { minutesToCutoff } from "@/lib/clock";
import { cn } from "@/lib/utils";
import { useCloseout } from "@/state/closeout";

import { AuditTrail, Avatar, KV, Panel, SidePanel, StatusChip } from "./primitives";

const KINDS = ["Owner confirmed", "Deferred with approval", "Verified in source system"];

export function ExceptionDrawer({ id, onClose, focusNote }: { id: string | null; onClose: () => void; focusNote?: boolean }) {
  const { exceptions, pmAssets, responses, sendReminder, resolveException, release } = useCloseout();
  const ex = exceptions.find((e) => e.id === id) ?? PAST_EXCEPTIONS.find((e) => e.id === id);
  const [note, setNote] = useState("");
  const [kind, setKind] = useState(KINDS[0]);
  const [touched, setTouched] = useState(false);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setNote("");
    setKind(KINDS[0]);
    setTouched(false);
    if (id && focusNote) {
      const t = window.setTimeout(() => noteRef.current?.focus(), 350);
      return () => window.clearTimeout(t);
    }
  }, [id, focusNote]);

  if (!ex) return <SidePanel open={false} onOpenChange={() => onClose()} title="">{null}</SidePanel>;

  const owner = ownerById(ex.ownerId);
  const source = SOURCES.find((s) => s.id === ex.sourceId);
  const resolved = ex.status === "RESOLVED";
  const live = exceptions.some((e) => e.id === ex.id);
  const mins = minutesToCutoff();

  const itemRows =
    ex.checkId === "chk-pm" && live
      ? pmAssets.map((a) => ({ a: a.asset, b: a.task, c: a.required, state: a.state ? (a.state === "Deferred" ? "DEFERRED" : "OK") : "MISSING", tone: a.state ? (a.state === "Deferred" ? "warn" : "ok") : "bad" }))
      : ex.checkId === "chk-resp" && live
        ? responses
            .filter((r) => r.ownerId === ex.ownerId)
            .map((r) => ({ a: owner.department, b: r.label, c: `Due ${r.dueBy}`, state: r.receivedAt ? "RECEIVED" : "MISSING", tone: r.receivedAt ? "ok" : "bad" }))
        : ex.missing.map((m) => ({ a: source?.name ?? "", b: m, c: "Required", state: resolved ? "OK" : "MISSING", tone: resolved ? "ok" : "bad" }));

  const missingCount = itemRows.filter((r) => r.state === "MISSING").length;
  const canResolve = note.trim().length >= 4;

  return (
    <SidePanel
      open={!!id}
      onOpenChange={(v) => !v && onClose()}
      title={ex.title}
      eyebrow={<StatusChip label={resolved ? "RESOLVED" : ex.blocking ? "BLOCKING" : "WARNING"} size="md" pulse={!resolved} />}
      meta={ex.id}
      footer={
        !resolved && !release ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <span className="mr-auto text-xs text-muted-foreground">Resolving marks the items as received. The release decision changes only after a recheck.</span>
            <button type="button" className="btn-secondary h-11 px-5" onClick={() => sendReminder(ex.id)}>
              <Bell className="h-4 w-4" /> Send Reminder
            </button>
            <button
              type="button"
              className={cn("btn-primary h-11 px-5", !canResolve && "opacity-50")}
              aria-disabled={!canResolve}
              onClick={() => {
                setTouched(true);
                if (!canResolve) {
                  noteRef.current?.focus();
                  return;
                }
                resolveException(ex.id, note.trim(), kind);
              }}
            >
              <CheckCircle2 className="h-4 w-4" /> Mark Resolved
            </button>
          </div>
        ) : undefined
      }
    >
      <Panel bodyClass="grid gap-x-8 px-4 py-3 md:grid-cols-2 md:divide-x md:divide-line">
        <dl>
          <KV k="Owner">
            <span className="inline-flex items-center gap-2">
              <Avatar initials={owner.initials} size={22} />
              {owner.name} · {owner.department}
            </span>
          </KV>
          <KV k="Status">
            <span className="inline-flex flex-wrap items-center gap-2">
              <StatusChip label={resolved ? "RESOLVED" : ex.status} />
              {resolved && ex.awaitingRecheck && <span className="text-xs font-medium text-warn-ink">pending recheck</span>}
            </span>
          </KV>
          <KV k="Expected">{ex.expected}</KV>
          {live && !resolved && <KV k="Time remaining">{mins > 0 ? `${mins} min to cutoff` : <span className="font-semibold text-bad">Past cutoff by {-mins} min</span>}</KV>}
          {!live && <KV k="Reporting date">{ex.date}</KV>}
        </dl>
        <dl className="md:pl-8">
          <KV k="Rule">{ex.ruleName}</KV>
          <KV k="Source">
            {source?.name} ({source?.system.split(" · ")[0]}, {source?.type})
          </KV>
          <KV k="Opened">{ex.openedAt}</KV>
          <KV k="Contact">
            <a className="inline-flex items-center gap-1.5 underline-offset-2 hover:underline" href={`mailto:${owner.email}`}>
              <Mail className="h-3.5 w-3.5" /> {owner.email}
            </a>
          </KV>
        </dl>
      </Panel>

      <p className="px-1 text-sm text-muted-foreground">{ex.description}</p>

      <Panel title={<>Missing items · {missingCount}</>}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px]">
            <thead className="bg-[#F3F3F0]">
              <tr>
                <th className="th">Asset / area</th>
                <th className="th">Item</th>
                <th className="th">Required state</th>
                <th className="th">Current state</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {itemRows.map((r, i) => (
                <tr key={i}>
                  <td className="td font-medium">{r.a}</td>
                  <td className="td">{r.b}</td>
                  <td className="td text-muted-foreground">{r.c}</td>
                  <td className="td">
                    <StatusChip label={r.state} tone={r.tone as "ok" | "warn" | "bad"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title={<>Audit trail · Append-only</>} right={<Lock className="h-4 w-4 text-muted-foreground" aria-label="Append-only" />} bodyClass="px-4 py-2">
        <AuditTrail entries={ex.audit} />
      </Panel>

      {resolved && ex.resolution ? (
        <Panel bodyClass="flex gap-3 px-4 py-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-ok" />
          <div className="text-sm">
            <div className="font-semibold">
              Resolved by {ex.resolution.by} at {ex.resolution.at} · {ex.resolution.kind}
            </div>
            <p className="mt-1 text-muted-foreground">“{ex.resolution.note}”</p>
            {ex.awaitingRecheck && <p className="mt-2 font-medium text-warn-ink">Waiting for the next recheck before the release decision updates.</p>}
          </div>
        </Panel>
      ) : (
        !resolved &&
        !release && (
          <Panel bodyClass="space-y-3 px-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label htmlFor="res-note" className="text-[15px] font-semibold">
                Resolution note (required)
              </label>
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Resolution type">
                {KINDS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    role="radio"
                    aria-checked={kind === k}
                    onClick={() => setKind(k)}
                    className={cn("btn h-8 border px-2.5 text-xs", kind === k ? "border-ink bg-ink text-white" : "border-[#D4D4CF] bg-white")}
                  >
                    {k}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              id="res-note"
              ref={noteRef}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              placeholder="e.g. Morgan confirmed by phone: Machine 12 hydraulic PM and Assembly Cell 3 PM completed on 3rd shift; maintenance export ran before close-out."
              className={cn(
                "focus-ring w-full resize-y rounded-md border bg-white px-3 py-2.5 text-sm placeholder:text-[#9A9EA3]",
                touched && !canResolve ? "border-bad" : "border-[#CFCFCA]",
              )}
            />
            {touched && !canResolve && <p className="text-xs font-medium text-bad">A resolution note is required for the audit record.</p>}
          </Panel>
        )
      )}
    </SidePanel>
  );
}
