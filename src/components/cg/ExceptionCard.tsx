import { Bell, CheckCircle2, Eye } from "lucide-react";

import { ownerById } from "@/data/seed";
import { cn } from "@/lib/utils";
import type { Exception } from "@/lib/types";
import { useCloseout } from "@/state/closeout";

import { AuditTrail, Avatar, StatusChip } from "./primitives";

export function ExceptionCard({ ex, onView, onResolve }: { ex: Exception; onView: () => void; onResolve: () => void }) {
  const { sendReminder, release } = useCloseout();
  const owner = ownerById(ex.ownerId);
  const resolved = ex.status === "RESOLVED";
  const edge = resolved ? "border-l-ok" : ex.blocking ? "border-l-bad" : "border-l-warn";

  return (
    <article className={cn("rise panel grid gap-4 border-l-[4px] p-4 sm:p-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:gap-x-0 xl:gap-y-4", edge)}>
      <div className="min-w-0 xl:col-start-1 xl:row-start-1 xl:pr-6">
        <h3 className="text-[17px] font-bold tracking-[-0.01em]">
          <button type="button" onClick={onView} className="focus-ring rounded-sm text-left hover:underline hover:decoration-[#BDBDB7] hover:underline-offset-4">
            {ex.title}
          </button>
        </h3>
        <div className="mt-2.5 flex items-center gap-2.5 text-sm">
          <Avatar initials={owner.initials} />
          <span>
            Owner: <span className="font-medium">{owner.name}</span>
          </span>
        </div>
        <p className="mt-2 text-[13px] text-[#3E434A]">
          <span className="text-muted-foreground">Missing:</span> {ex.missing.join(" · ")}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          {ex.id} · {ex.ruleName}
        </p>
      </div>

      <div className="flex flex-row flex-wrap items-center gap-3 xl:col-start-1 xl:row-start-2 xl:pr-6">
        <div className="text-sm font-medium">Expected {ex.expected}</div>
        <StatusChip label={resolved ? "RESOLVED" : ex.status} pulse={!resolved} />
        {resolved && ex.awaitingRecheck && <span className="text-xs font-medium text-warn-ink">Status updates at next recheck</span>}
      </div>

      <div className="min-w-0 border-t border-line pt-3 xl:col-start-2 xl:row-start-1 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0">
        <AuditTrail entries={ex.audit.slice(-3)} compact />
      </div>

      <div className="flex flex-wrap items-end gap-2 xl:col-start-2 xl:row-start-2 xl:justify-end xl:border-l xl:border-line xl:pl-6">
        <button type="button" className="btn-secondary" onClick={onView}>
          <Eye className="h-4 w-4" /> View
        </button>
        {!resolved && !release && (
          <>
            <button type="button" className="btn-secondary" onClick={() => sendReminder(ex.id)}>
              <Bell className="h-4 w-4" /> Send Reminder
            </button>
            <button type="button" className="btn-primary" onClick={onResolve}>
              <CheckCircle2 className="h-4 w-4" /> Mark Resolved
            </button>
          </>
        )}
      </div>
    </article>
  );
}
