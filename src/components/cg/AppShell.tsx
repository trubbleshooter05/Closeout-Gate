import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AlertTriangle, ChevronDown, Database, History, LayoutDashboard, Menu, Settings, SlidersHorizontal, Users, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

import { TruncatedText } from "@/components/cg/TruncatedText";
import { CURRENT_USER } from "@/data/seed";
import { cn } from "@/lib/utils";
import { useCloseout } from "@/state/closeout";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/sources", label: "Sources", icon: Database },
  { to: "/rules", label: "Rules", icon: SlidersHorizontal },
  { to: "/exceptions", label: "Exceptions", icon: AlertTriangle },
  { to: "/owners", label: "Owners", icon: Users },
  { to: "/audit", label: "Audit History", icon: History },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function GateMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" aria-hidden>
      <rect x="2.5" y="2.5" width="27" height="27" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M9 7v18M23 7v18M9 12h14M9 20h14" stroke="currentColor" strokeWidth="2" />
      <path d="M13 16l2 2 4-4" stroke="#3FB96B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StatusPip() {
  const { snapshot, release } = useCloseout();
  const s = snapshot.status;
  const color = s === "READY" ? "bg-[#3FB96B]" : s === "DEGRADED" ? "bg-[#E0A526]" : "bg-[#E5484D]";
  return (
    <NavLink to="/" className="focus-ring mx-3 mb-3 flex items-center gap-3 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2.5 text-left hover:bg-white/[0.07]">
      <span className={cn("h-2.5 w-2.5 rounded-full", color, s !== "READY" && "pulse-dot")} />
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-medium uppercase tracking-[0.08em] text-[#8A8F96]">Nov 15 report</span>
        <span className="block text-sm font-semibold text-white">{release ? "Released" : s}</span>
      </span>
    </NavLink>
  );
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const { openExceptions } = useCloseout();
  const blockingCount = openExceptions.filter((e) => e.blocking).length;
  const openCount = openExceptions.length;
  return (
    <div className="flex h-full flex-col bg-ink text-[#E8E9EA]">
      <div className="flex items-center gap-3 border-b border-white/[0.08] px-5 py-5">
        <GateMark className="h-9 w-9 text-white" />
        <div className="text-[19px] font-bold leading-[1.1] tracking-[-0.01em] text-white">
          Closeout
          <br />
          Gate
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 py-3" aria-label="Main">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "focus-ring relative flex h-11 items-center gap-3 px-5 text-[15px] transition-colors",
                isActive ? "bg-ink-2 font-semibold text-white" : "text-[#C9CBCE] hover:bg-white/[0.04] hover:text-white",
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && <span className="absolute inset-y-0 left-0 w-[3px] bg-white" />}
                <Icon className={cn("h-[18px] w-[18px]", isActive ? "text-white" : "text-[#8A8F96]")} strokeWidth={1.6} />
                <span className="flex-1">{label}</span>
                {to === "/exceptions" && openCount > 0 && (
                  <span
                    className={cn(
                      "tnum inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-white",
                      blockingCount > 0 ? "bg-bad" : "bg-warn",
                    )}
                  >
                    {openCount}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <StatusPip />
      <div className="flex items-center gap-3 border-t border-white/[0.08] px-5 py-4">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/25 text-xs font-semibold">{CURRENT_USER.initials}</span>
        <div className="min-w-0 flex-1">
          <TruncatedText text={CURRENT_USER.name} className="text-sm font-semibold text-white" />
          <TruncatedText text={`${CURRENT_USER.title} · Northstar Components Demo`} className="text-xs text-[#8A8F96]" />
        </div>
        <ChevronDown className="h-4 w-4 text-[#8A8F96]" />
      </div>
    </div>
  );
}

export function AppShell({ children }: { children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const current = NAV.find((n) => (n.to === "/" ? loc.pathname === "/" : loc.pathname.startsWith(n.to)));

  return (
    <div className="min-h-screen bg-paper">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[240px] lg:block">
        <SidebarBody />
      </aside>

      {/* Narrow viewports: compact top bar + slide-in navigation */}
      <div className="sticky top-0 z-30 flex h-14 items-center gap-3 bg-ink px-4 text-white lg:hidden">
        <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
          <DialogPrimitive.Trigger className="btn h-9 w-9 px-0 text-white hover:bg-white/10" aria-label="Open navigation">
            <Menu className="h-5 w-5" />
          </DialogPrimitive.Trigger>
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
            <DialogPrimitive.Content className="fixed inset-y-0 left-0 z-50 w-[272px] outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-left">
              <DialogPrimitive.Title className="sr-only">Navigation</DialogPrimitive.Title>
              <DialogPrimitive.Description className="sr-only">Main navigation</DialogPrimitive.Description>
              <SidebarBody onNavigate={() => setOpen(false)} />
              <DialogPrimitive.Close className="btn absolute right-2 top-5 h-9 w-9 px-0 text-white hover:bg-white/10" aria-label="Close navigation">
                <X className="h-5 w-5" />
              </DialogPrimitive.Close>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
        <GateMark className="h-6 w-6" />
        <span className="font-semibold">Closeout Gate</span>
        <span className="text-sm text-[#8A8F96]">/ {current?.label ?? ""}</span>
      </div>

      <main className="lg:pl-[240px]">
        <div className="mx-auto w-full max-w-[1440px] px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pt-7">{children ?? <Outlet />}</div>
      </main>

      {/* Opaque footer strip: the hosting badge is pinned to the bottom-right corner, so page content scrolls
          behind this strip instead of under the badge. */}
      <footer className="fixed inset-x-0 bottom-0 z-20 flex h-16 items-center border-t border-line bg-paper px-4 text-xs text-muted-foreground sm:px-6 lg:left-[240px] lg:px-8">
        Closeout Gate · Demo environment • Synthetic sample data
      </footer>
    </div>
  );
}
