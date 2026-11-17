import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Plus, Search, X } from "lucide-react";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";

import { SourceDrawer } from "@/components/cg/DetailDrawers";
import { SourceTypeIcon } from "@/components/cg/SourceTypeIcon";
import { TruncatedText } from "@/components/cg/TruncatedText";
import { Avatar, EmptyRow, FilterChip, PageHeader, StatusChip } from "@/components/cg/primitives";
import { OWNERS, SOURCE_TYPES, TIME_OPTIONS, ownerById } from "@/data/seed";
import { REPORTING_DATE } from "@/lib/clock";
import { cn } from "@/lib/utils";
import type { Source, SourceType } from "@/lib/types";
import { useCloseout } from "@/state/closeout";

type StatusFilter = "all" | "READY" | "WARNING" | "BLOCKED";

export default function Sources() {
  const { sources, snapshot } = useCloseout();
  const [status, setStatus] = useState<StatusFilter>("all");
  const [type, setType] = useState<SourceType | "all">("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState<SourceType | null>(null);

  const statusOf = (s: Source) => snapshot.sources[s.id]?.status ?? "READY";
  const counts = useMemo(() => {
    const c = { READY: 0, WARNING: 0, BLOCKED: 0 };
    sources.forEach((s) => c[snapshot.sources[s.id]?.status ?? "READY"]++);
    return c;
  }, [sources, snapshot]);

  const rows = sources.filter(
    (s) =>
      (status === "all" || statusOf(s) === status) &&
      (type === "all" || s.type === type) &&
      (!q || `${s.name} ${s.system} ${s.ownerLabel}`.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Sources"
        subtitle="Every data feed the daily management report depends on, with its delivery and freshness requirements."
        right={
          <button type="button" className="btn-primary" onClick={() => setAdding("REST API")}>
            <Plus className="h-4 w-4" /> Add Source
          </button>
        }
      />

      <section aria-labelledby="types-h">
        <h2 id="types-h" className="eyebrow mb-2">
          Supported source types · 9
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 2xl:grid-cols-9">
          {SOURCE_TYPES.map((t) => {
            const n = sources.filter((s) => s.type === t.type).length;
            const active = type === t.type;
            return (
              <button
                key={t.type}
                type="button"
                onClick={() => setType(active ? "all" : t.type)}
                aria-pressed={active}
                title={t.hint}
                className={cn(
                  "focus-ring panel flex flex-col items-start gap-2 px-3 py-3 text-left transition-colors",
                  active ? "border-ink bg-ink text-white" : "hover:border-[#BDBDB7]",
                )}
              >
                <SourceTypeIcon type={t.type} className={cn("h-5 w-5", active ? "text-white" : "text-[#3E434A]")} />
                <span className="text-[13px] font-semibold leading-tight">{t.type}</span>
                <span className={cn("tnum text-xs", active ? "text-white/70" : "text-muted-foreground")}>{n ? `${n} in use` : "Not in use"}</span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <label className="relative block lg:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search sources"
            aria-label="Search sources"
            className="focus-ring h-10 w-full rounded-md border border-[#D4D4CF] bg-white pl-9 pr-3 text-sm"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <FilterChip active={status === "all"} onClick={() => setStatus("all")} count={sources.length}>
            All
          </FilterChip>
          <FilterChip active={status === "READY"} onClick={() => setStatus("READY")} count={counts.READY}>
            Ready
          </FilterChip>
          <FilterChip active={status === "WARNING"} onClick={() => setStatus("WARNING")} count={counts.WARNING}>
            Warning
          </FilterChip>
          <FilterChip active={status === "BLOCKED"} onClick={() => setStatus("BLOCKED")} count={counts.BLOCKED}>
            Blocked
          </FilterChip>
          {type !== "all" && (
            <button type="button" className="btn-ghost h-9" onClick={() => setType("all")}>
              {type} <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[1080px]">
          <thead className="bg-[#F3F3F0]">
            <tr>
              <th className="th">Status</th>
              <th className="th">Name</th>
              <th className="th">Type</th>
              <th className="th">Owner</th>
              <th className="th">Expected</th>
              <th className="th">Freshness requirement</th>
              <th className="th">Mandatory</th>
              <th className="th">Last received</th>
              <th className="th">Last validation</th>
              <th className="th text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((s) => {
              const owner = ownerById(s.ownerId);
              return (
                <tr key={s.id} className="cursor-pointer hover:bg-[#FAFAF8]" onClick={() => setOpen(s.id)}>
                  <td className="td">
                    <StatusChip label={statusOf(s)} />
                  </td>
                  <td className="td">
                    <div className="font-semibold">{s.name}</div>
                    <TruncatedText text={s.system} className="max-w-[220px] text-xs text-muted-foreground" />
                  </td>
                  <td className="td">
                    <span className="inline-flex items-center gap-2 whitespace-nowrap">
                      <SourceTypeIcon type={s.type} className="h-4 w-4 text-[#3E434A]" />
                      {s.type}
                    </span>
                  </td>
                  <td className="td">
                    <span className="inline-flex items-center gap-2 whitespace-nowrap">
                      <Avatar initials={owner.initials} size={24} /> {owner.name}
                    </span>
                  </td>
                  <td className="td font-mono text-[13px]">{s.expectedBy}</td>
                  <td className="td max-w-[220px] text-[13px]">{s.freshnessRequirement}</td>
                  <td className="td">{s.mandatory ? <span className="font-semibold">Yes</span> : <span className="text-muted-foreground">Optional</span>}</td>
                  <td className="td font-mono text-[13px]">{s.receivedAt ?? <span className="text-bad">Not received</span>}</td>
                  <td className="td font-mono text-[13px]">{s.lastValidation}</td>
                  <td className="td text-right">
                    <button
                      type="button"
                      className="btn-secondary h-8 px-3"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpen(s.id);
                      }}
                    >
                      View
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && <EmptyRow>No sources match these filters.</EmptyRow>}
      </div>

      <SourceDrawer id={open} onClose={() => setOpen(null)} />
      <AddSourceDialog initialType={adding} onClose={() => setAdding(null)} />
    </div>
  );
}

function AddSourceDialog({ initialType, onClose }: { initialType: SourceType | null; onClose: () => void }) {
  const { addSource, sources } = useCloseout();
  const [name, setName] = useState("");
  const [type, setType] = useState<SourceType>("REST API");
  const [ownerId, setOwnerId] = useState(OWNERS[0].id);
  const [expectedBy, setExpectedBy] = useState("6:30 AM");
  const [freshness, setFreshness] = useState("Data date = reporting date");
  const [mandatory, setMandatory] = useState(true);
  const [connection, setConnection] = useState("");
  const [tried, setTried] = useState(false);

  const reset = () => {
    setName("");
    setType("REST API");
    setOwnerId(OWNERS[0].id);
    setExpectedBy("6:30 AM");
    setFreshness("Data date = reporting date");
    setMandatory(true);
    setConnection("");
    setTried(false);
  };

  const close = () => {
    reset();
    onClose();
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (!name.trim()) return;
    const owner = ownerById(ownerId);
    addSource({
      id: `src-${sources.length + 1}-${Date.now()}`,
      name: name.trim(),
      type,
      system: connection.trim() || `${type} · not yet connected`,
      ownerId,
      ownerLabel: owner.department,
      mandatory,
      expectedBy,
      freshnessRequirement: freshness,
      receivedAt: null,
      currentThrough: "—",
      reportingDate: REPORTING_DATE,
      rowCount: null,
      rowLabel: "rows",
      lastSuccessfulRun: "Never",
      lastValidation: "—",
      connection: connection.trim() || "Not configured",
    });
    close();
  };

  const placeholder: Record<SourceType, string> = {
    "REST API": "https://demo-feed.internal/v1/daily",
    "SQL / database": "demo-erp.internal / DEMO / view name",
    CSV: "demo-share / exports / daily.csv",
    Excel: "Workbook.xlsx · Sheet1!A1:H200",
    SharePoint: "demo-library / Planning / file.xlsx",
    OneDrive: "OneDrive Demo / Reports / file.xlsx",
    "Email attachment": "Gate inbox · demo sender allow-list",
    Webhook: "Generated after saving",
    "Manual owner response": "Question the owner will answer",
  };

  return (
    <DialogPrimitive.Root
      open={initialType !== null}
      onOpenChange={(v) => {
        if (!v) close();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[#1D1F22]/45 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 max-h-[92vh] w-[calc(100%-24px)] max-w-[620px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg bg-white shadow-2xl outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
          <form onSubmit={submit}>
            <div className="flex items-start justify-between border-b border-line px-6 py-5">
              <div>
                <DialogPrimitive.Title className="text-xl font-bold tracking-[-0.015em]">Add source</DialogPrimitive.Title>
                <DialogPrimitive.Description className="mt-1 text-sm text-muted-foreground">
                  Register a data feed the report depends on. Demo only — no live connection is made.
                </DialogPrimitive.Description>
              </div>
              <DialogPrimitive.Close className="btn-ghost -mr-2 h-9 w-9 px-0" aria-label="Close">
                <X className="h-5 w-5" />
              </DialogPrimitive.Close>
            </div>

            <div className="space-y-4 px-6 py-5">
              <fieldset>
                <legend className="mb-2 text-sm font-semibold">Type</legend>
                <div className="grid grid-cols-3 gap-2">
                  {SOURCE_TYPES.map((t) => (
                    <button
                      key={t.type}
                      type="button"
                      onClick={() => setType(t.type)}
                      aria-pressed={type === t.type}
                      className={cn(
                        "focus-ring flex items-center gap-2 rounded-md border px-2.5 py-2 text-left text-[12.5px] font-medium",
                        type === t.type ? "border-ink bg-ink text-white" : "border-[#D4D4CF] hover:border-[#BDBDB7]",
                      )}
                    >
                      <SourceTypeIcon type={t.type} className="h-4 w-4 shrink-0" />
                      <span className="leading-tight">{t.type}</span>
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{SOURCE_TYPES.find((t) => t.type === type)?.hint}</p>
              </fieldset>

              <Field label="Name">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Scrap Log"
                  aria-invalid={tried && !name.trim()}
                  className={cn("focus-ring h-10 w-full rounded-md border bg-white px-3 text-sm", tried && !name.trim() ? "border-bad" : "border-[#D4D4CF]")}
                />
                {tried && !name.trim() && <p className="mt-1 text-xs text-bad">Give the source a name.</p>}
              </Field>

              <Field label={type === "Manual owner response" ? "Question" : "Connection"}>
                <input
                  value={connection}
                  onChange={(e) => setConnection(e.target.value)}
                  placeholder={placeholder[type]}
                  className="focus-ring h-10 w-full rounded-md border border-[#D4D4CF] bg-white px-3 font-mono text-[13px]"
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Owner">
                  <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className="focus-ring h-10 w-full rounded-md border border-[#D4D4CF] bg-white px-3 text-sm">
                    {OWNERS.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name} · {o.department}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Expected availability">
                  <select value={expectedBy} onChange={(e) => setExpectedBy(e.target.value)} className="focus-ring h-10 w-full rounded-md border border-[#D4D4CF] bg-white px-3 text-sm">
                    {TIME_OPTIONS.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Freshness requirement">
                <input value={freshness} onChange={(e) => setFreshness(e.target.value)} className="focus-ring h-10 w-full rounded-md border border-[#D4D4CF] bg-white px-3 text-sm" />
              </Field>

              <label className="flex items-start gap-3 rounded-md border border-line bg-paper px-3 py-3 text-sm">
                <input type="checkbox" checked={mandatory} onChange={(e) => setMandatory(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#1D1F22]" />
                <span>
                  <span className="font-semibold">Mandatory for release</span>
                  <span className="block text-muted-foreground">If this source is late or stale, the report is blocked.</span>
                </span>
              </label>
            </div>

            <div className="flex justify-end gap-2 border-t border-line px-6 py-4">
              <button type="button" className="btn-secondary" onClick={close}>
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Add Source
              </button>
            </div>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-sm font-semibold">{label}</div>
      {children}
    </div>
  );
}
