import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AlertTriangle, ShieldCheck, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { CURRENT_USER } from "@/data/seed";
import { CUTOFF, REPORTING_DATE } from "@/lib/clock";
import { cn } from "@/lib/utils";
import { useCloseout } from "@/state/closeout";

import { StatusChip } from "./primitives";

export function ReleaseDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { snapshot, sources, exceptions, releaseReport } = useCloseout();
  const warnings = snapshot.checks.filter((c) => c.result === "WARNING").map((c) => `${c.name}: ${c.headline}`);
  const [acks, setAcks] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (open) setAcks({});
  }, [open]);

  const degraded = snapshot.status === "DEGRADED";
  const allAcked = warnings.every((w) => acks[w]);
  const passCount = snapshot.checks.filter((c) => c.result === "PASS").length;
  const mandatory = sources.filter((s) => s.mandatory && snapshot.sources[s.id]);
  const readySources = mandatory.filter((s) => snapshot.sources[s.id].status === "READY").length;
  const openBlocking = exceptions.filter((e) => e.status !== "RESOLVED" && e.blocking).length;
  const canRelease = snapshot.status !== "BLOCKED" && openBlocking === 0 && allAcked;

  const rows: [string, ReactNode][] = [
    ["Reporting date", REPORTING_DATE],
    ["Data cutoff", CUTOFF],
    ["Overall status", <StatusChip key="s" label={snapshot.status} />],
    ["Sources checked", `${mandatory.length} (${readySources} ready)`],
    ["Reconciliation checks passed", `${passCount} of ${snapshot.checks.length}`],
    ["Outstanding blocking exceptions", String(openBlocking)],
    ["Released by", `${CURRENT_USER.name}, ${CURRENT_USER.title}`],
    ["Run ID", snapshot.runId],
  ];

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[#1D1F22]/45 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 max-h-[92vh] w-[calc(100%-2rem)] max-w-[560px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-line bg-white shadow-2xl outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
          <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
            <div>
              <div className="eyebrow">Release decision</div>
              <DialogPrimitive.Title className="mt-1 flex items-center gap-2 text-xl font-bold tracking-[-0.015em]">
                {degraded && <AlertTriangle className="h-5 w-5 text-warn" />}
                {degraded ? "Release with warnings?" : "Release today's Daily Management Report?"}
              </DialogPrimitive.Title>
            </div>
            <DialogPrimitive.Close className="btn-ghost -mr-2 h-9 w-9 px-0" aria-label="Close">
              <X className="h-5 w-5" />
            </DialogPrimitive.Close>
          </div>
          <DialogPrimitive.Description className="sr-only">Confirm the report release</DialogPrimitive.Description>
          <div className="space-y-4 px-6 py-5">
            <dl className="divide-y divide-line rounded-md border border-line bg-paper text-sm">
              {rows.map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-4 px-4 py-2">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className={cn("text-right font-medium", typeof v === "string" && /\d/.test(v) && "font-mono text-[13px]")}>{v}</dd>
                </div>
              ))}
            </dl>
            {warnings.length > 0 && (
              <fieldset className="rounded-md border border-warn/40 bg-warn-tint px-4 py-3">
                <legend className="px-1 text-sm font-semibold text-warn-ink">Acknowledge each non-blocking warning</legend>
                <p className="mb-2 text-xs text-warn-ink">The report will be released as DEGRADED and your acknowledgement is recorded in Audit History.</p>
                {warnings.map((w) => (
                  <label key={w} className="flex cursor-pointer items-start gap-2.5 py-1 text-sm">
                    <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#24272B]" checked={!!acks[w]} onChange={(e) => setAcks((p) => ({ ...p, [w]: e.target.checked }))} />
                    {w}
                  </label>
                ))}
              </fieldset>
            )}
            <p className="text-xs text-muted-foreground">The run is sealed on release and added to Audit History. Its results cannot be edited afterwards.</p>
          </div>
          <div className="flex justify-end gap-2 border-t border-line px-6 py-4">
            <DialogPrimitive.Close className="btn-secondary h-10 px-4">Cancel</DialogPrimitive.Close>
            <button
              type="button"
              disabled={!canRelease}
              className={cn(degraded ? "btn-primary" : "btn-release", "h-10 px-4", !canRelease && "cursor-not-allowed opacity-50")}
              onClick={() => {
                if (!canRelease) return;
                releaseReport(warnings);
                onOpenChange(false);
              }}
            >
              <ShieldCheck className="h-4 w-4" />
              Release Report
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
