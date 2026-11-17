import { CheckCircle2 } from "lucide-react";
import { useRef, useState, type KeyboardEvent } from "react";

import { ExceptionCard } from "@/components/cg/ExceptionCard";
import { ExceptionDrawer } from "@/components/cg/ExceptionDrawer";
import {
  Avatar,
  EmptyRow,
  PageHeader,
  StatusChip,
} from "@/components/cg/primitives";
import { PAST_EXCEPTIONS, ownerById } from "@/data/seed";
import { cn } from "@/lib/utils";
import type { Exception } from "@/lib/types";
import { useCloseout } from "@/state/closeout";

type Tab = "open" | "resolved" | "all";
const TAB_ORDER: Tab[] = ["open", "resolved", "all"];
const TAB_LABEL: Record<Tab, string> = {
  open: "Open",
  resolved: "Resolved",
  all: "All",
};
const tabId = (t: Tab) => `exc-tab-${t}`;
const panelId = (t: Tab) => `exc-panel-${t}`;

export default function Exceptions() {
  const { exceptions, openExceptions } = useCloseout();
  const [tab, setTab] = useState<Tab>("open");
  const [drawer, setDrawer] = useState<{ id: string; focus: boolean } | null>(
    null,
  );

  const resolved: Exception[] = [
    ...exceptions.filter((e) => e.status === "RESOLVED"),
    ...PAST_EXCEPTIONS,
  ];
  const blocking = openExceptions.filter((e) => e.blocking).length;
  const counts: Record<Tab, number> = {
    open: openExceptions.length,
    resolved: resolved.length,
    all: openExceptions.length + resolved.length,
  };
  const tabRefs = useRef<Partial<Record<Tab, HTMLButtonElement | null>>>({});

  // Roving focus with automatic activation: Left/Right wrap, Home/End jump to the ends.
  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const i = TAB_ORDER.indexOf(tab);
    let next: Tab | null = null;
    if (e.key === "ArrowRight") next = TAB_ORDER[(i + 1) % TAB_ORDER.length];
    else if (e.key === "ArrowLeft")
      next = TAB_ORDER[(i - 1 + TAB_ORDER.length) % TAB_ORDER.length];
    else if (e.key === "Home") next = TAB_ORDER[0];
    else if (e.key === "End") next = TAB_ORDER[TAB_ORDER.length - 1];
    if (!next) return;
    e.preventDefault();
    setTab(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Exceptions"
        subtitle={
          openExceptions.length
            ? `${openExceptions.length} open · ${blocking} blocking report release. Resolutions take effect at the next recheck.`
            : "No open exceptions for Nov 15, 2026."
        }
      />

      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Exception status"
      >
        {TAB_ORDER.map((t) => {
          const active = tab === t;
          return (
            <button
              key={t}
              ref={(el) => {
                tabRefs.current[t] = el;
              }}
              type="button"
              role="tab"
              id={tabId(t)}
              aria-selected={active}
              aria-controls={panelId(t)}
              tabIndex={active ? 0 : -1}
              onClick={() => setTab(t)}
              onKeyDown={onTabKey}
              className={cn(
                "btn h-9 border px-3",
                active
                  ? "border-ink bg-ink text-white"
                  : "border-[#D4D4CF] bg-white text-foreground hover:border-[#BDBDB7]",
              )}
            >
              {TAB_LABEL[t]}
              <span
                className={cn(
                  "tnum text-xs",
                  active ? "text-white/70" : "text-muted-foreground",
                )}
              >
                {counts[t]}
              </span>
            </button>
          );
        })}
      </div>

      {TAB_ORDER.filter((t) => t !== tab).map((t) => (
        <div
          key={t}
          role="tabpanel"
          id={panelId(t)}
          aria-labelledby={tabId(t)}
          hidden
        />
      ))}
      <div
        role="tabpanel"
        id={panelId(tab)}
        aria-labelledby={tabId(tab)}
        tabIndex={0}
        className="space-y-5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2"
      >
        {tab !== "resolved" && (
          <section aria-label="Open exceptions" className="space-y-3">
            {openExceptions.map((ex) => (
              <ExceptionCard
                key={ex.id}
                ex={ex}
                onView={() => setDrawer({ id: ex.id, focus: false })}
                onResolve={() => setDrawer({ id: ex.id, focus: true })}
              />
            ))}
            {openExceptions.length === 0 && (
              <div className="panel flex items-center gap-3 px-5 py-6 text-sm">
                <CheckCircle2 className="h-5 w-5 text-ok" />
                Every exception for today has been resolved.
              </div>
            )}
          </section>
        )}

        {tab !== "open" && (
          <section aria-label="Resolved exceptions">
            {tab === "all" && (
              <h2 className="mb-3 mt-2 text-lg font-semibold">Resolved</h2>
            )}
            <div className="panel overflow-x-auto">
              <table className="w-full min-w-[820px]">
                <thead className="bg-[#F3F3F0]">
                  <tr>
                    <th className="th">ID</th>
                    <th className="th">Exception</th>
                    <th className="th">Owner</th>
                    <th className="th">Date</th>
                    <th className="th">Resolution</th>
                    <th className="th">Status</th>
                    <th className="th text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {resolved.map((e) => {
                    const o = ownerById(e.ownerId);
                    return (
                      <tr key={e.id} className="hover:bg-[#FAFAF8]">
                        <td className="td font-mono text-[13px]">{e.id}</td>
                        <td className="td font-medium">{e.title}</td>
                        <td className="td">
                          <span className="inline-flex items-center gap-2 whitespace-nowrap">
                            <Avatar initials={o.initials} size={24} /> {o.name}
                          </span>
                        </td>
                        <td className="td whitespace-nowrap font-mono text-[13px]">
                          {e.date}
                        </td>
                        <td className="td text-[13px]">
                          {e.resolution ? (
                            <>
                              <span className="font-medium">
                                {e.resolution.kind}
                              </span>
                              <span className="text-muted-foreground">
                                {" "}
                                · {e.resolution.by} ·{" "}
                              </span>
                              <span className="font-mono">
                                {e.resolution.at}
                              </span>
                            </>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="td">
                          <StatusChip label="RESOLVED" />
                          {e.awaitingRecheck && (
                            <div className="mt-1 text-xs font-medium text-warn-ink">
                              pending recheck
                            </div>
                          )}
                        </td>
                        <td className="td text-right">
                          <button
                            type="button"
                            className="btn-secondary h-8 px-3"
                            onClick={() =>
                              setDrawer({ id: e.id, focus: false })
                            }
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {resolved.length === 0 && (
                <EmptyRow>No resolved exceptions yet.</EmptyRow>
              )}
            </div>
          </section>
        )}
      </div>

      <ExceptionDrawer
        id={drawer?.id ?? null}
        focusNote={drawer?.focus}
        onClose={() => setDrawer(null)}
      />
    </div>
  );
}
