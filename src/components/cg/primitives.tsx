import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Lock, X } from "lucide-react";
import type { ReactNode } from "react";

import { TruncatedText } from "@/components/cg/TruncatedText";
import { cn } from "@/lib/utils";
import type { AuditEntry } from "@/lib/types";

type Tone = "ok" | "warn" | "bad" | "neutral" | "info";

const toneFor = (label: string): Tone => {
  const l = label.toUpperCase();
  if (["READY", "PASS", "OK", "RESOLVED", "RECEIVED", "COMPLETE", "ON TIME", "ENABLED", "RELEASED"].includes(l)) return "ok";
  if (["DEGRADED", "WARNING", "LATE", "DEFERRED", "PENDING RECHECK"].includes(l)) return "warn";
  if (["BLOCKED", "FAIL", "MISSING", "BLOCKING", "WAITING FOR OWNER", "BLOCKING REPORT RELEASE", "OUTSTANDING", "CRITICAL"].includes(l)) return "bad";
  if (["IN PROGRESS"].includes(l)) return "info";
  return "neutral";
};

const toneClass: Record<Tone, string> = {
  ok: "bg-ok-tint text-ok-ink",
  warn: "bg-warn-tint text-warn-ink",
  bad: "bg-bad-tint text-bad-ink",
  neutral: "bg-[#EDEDE9] text-[#4D5157]",
  info: "bg-[#E9ECEF] text-ink",
};
const dotClass: Record<Tone, string> = {
  ok: "bg-ok",
  warn: "bg-warn",
  bad: "bg-bad",
  neutral: "bg-[#9A9EA3]",
  info: "bg-ink",
};

export function StatusChip({ label, tone, pulse, className, size = "sm" }: { label: string; tone?: Tone; pulse?: boolean; className?: string; size?: "sm" | "md" }) {
  const t = tone ?? toneFor(label);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md font-semibold uppercase tracking-[0.04em]",
        size === "sm" ? "h-6 px-2 text-[11px]" : "h-7 px-2.5 text-xs",
        toneClass[t],
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dotClass[t], pulse && "pulse-dot")} aria-hidden />
      {label}
    </span>
  );
}

export function Avatar({ initials, size = 28, dark }: { initials: string; size?: number; dark?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
        dark ? "bg-ink-3 text-white" : "bg-[#E6E6E1] text-[#3E434A]",
      )}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {initials}
    </span>
  );
}

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: ReactNode; right?: ReactNode }) {
  return (
    <header className="flex flex-col gap-3 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-[26px] font-bold leading-tight tracking-[-0.02em] text-foreground">{title}</h1>
        {subtitle && <div className="mt-1 text-sm text-muted-foreground">{subtitle}</div>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </header>
  );
}

export function SectionTitle({ children, right, id }: { children: ReactNode; right?: ReactNode; id?: string }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2 id={id} className="text-lg font-semibold tracking-[-0.01em]">
        {children}
      </h2>
      {right}
    </div>
  );
}

export function AuditTrail({ entries, compact, sealed }: { entries: AuditEntry[]; compact?: boolean; sealed?: boolean }) {
  if (compact) {
    return (
      <ol className="space-y-1 font-mono text-[12.5px] leading-5 text-[#3E434A]">
        {entries.map((e, i) => (
          <li key={i} className="flex gap-3">
            <span className="shrink-0 text-muted-foreground">{e.t.slice(0, 5)}</span>
            <TruncatedText text={e.msg} className="min-w-0" />
          </li>
        ))}
      </ol>
    );
  }
  return (
    <div className="relative">
      {sealed && <Lock className="absolute -top-9 right-0 h-4 w-4 text-muted-foreground" aria-label="Append-only" />}
      <ol className="relative space-y-0">
        {entries.map((e, i) => (
          <li key={i} className="relative grid grid-cols-[18px_76px_minmax(0,120px)_1fr] items-start gap-x-3 py-2 font-mono text-[12.5px]">
            <span className="relative flex h-5 justify-center">
              <span className="z-10 mt-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#9A9EA3] ring-1 ring-[#C9C9C4]" />
              {i < entries.length - 1 && <span className="absolute top-3 h-[calc(100%+16px)] w-px bg-[#D4D4CF]" />}
            </span>
            <span className="text-muted-foreground">{e.t}</span>
            <TruncatedText text={e.actor} className="text-[#3E434A]" />
            <span className="text-foreground">{e.msg}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function KV({ k, children, mono }: { k: string; children: ReactNode; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[130px_1fr] gap-3 py-1.5 text-sm">
      <dt className="font-medium text-muted-foreground">{k}</dt>
      <dd className={cn("min-w-0 text-foreground", mono && "font-mono text-[13px]")}>{children}</dd>
    </div>
  );
}

export function SidePanel({
  open,
  onOpenChange,
  title,
  eyebrow,
  meta,
  children,
  footer,
  width = "max-w-[860px]",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  eyebrow?: ReactNode;
  meta?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[#1D1F22]/45 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            "fixed inset-y-0 right-0 z-50 flex h-full w-full flex-col bg-paper shadow-2xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right data-[state=open]:duration-300 data-[state=closed]:duration-200",
            width,
          )}
        >
          <div className="flex items-start gap-4 border-b border-line bg-white px-6 py-5">
            <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              {eyebrow && <div className="shrink-0">{eyebrow}</div>}
              <DialogPrimitive.Title className="min-w-0 text-xl font-bold tracking-[-0.015em] text-foreground sm:text-[22px]">{title}</DialogPrimitive.Title>
              {meta && <div className="shrink-0 font-mono text-[13px] text-muted-foreground sm:border-l sm:border-line sm:pl-4">{meta}</div>}
            </div>
            <DialogPrimitive.Close className="btn-ghost -mr-2 h-9 w-9 px-0" aria-label="Close">
              <X className="h-5 w-5" />
            </DialogPrimitive.Close>
          </div>
          <DialogPrimitive.Description className="sr-only">{title} details</DialogPrimitive.Description>
          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6">{children}</div>
          {/* Extra bottom space keeps footer actions clear of the hosting badge pinned to the bottom-right corner. */}
          {footer && <div className="border-t border-line bg-white px-4 pb-16 pt-4 sm:px-6">{footer}</div>}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function Panel({ title, right, children, className, bodyClass }: { title?: ReactNode; right?: ReactNode; children: ReactNode; className?: string; bodyClass?: string }) {
  return (
    <section className={cn("panel overflow-hidden", className)}>
      {title && (
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h3 className="text-[15px] font-semibold">{title}</h3>
          {right}
        </div>
      )}
      <div className={bodyClass}>{children}</div>
    </section>
  );
}

export function EmptyRow({ children }: { children: ReactNode }) {
  return <div className="px-4 py-10 text-center text-sm text-muted-foreground">{children}</div>;
}

export function FilterChip({ active, onClick, children, count }: { active: boolean; onClick: () => void; children: ReactNode; count?: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "btn h-9 border px-3",
        active ? "border-ink bg-ink text-white" : "border-[#D4D4CF] bg-white text-foreground hover:border-[#BDBDB7]",
      )}
    >
      {children}
      {count !== undefined && <span className={cn("tnum text-xs", active ? "text-white/70" : "text-muted-foreground")}>{count}</span>}
    </button>
  );
}
