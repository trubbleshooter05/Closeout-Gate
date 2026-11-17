import { ChevronDown, Plus, Search } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";

import { FilterChip, PageHeader, StatusChip } from "@/components/cg/primitives";
import { Switch } from "@/components/ui/switch";
import { COMPARISONS, FIELD_OPTIONS, OWNER_OPTIONS, TIME_OPTIONS } from "@/data/seed";
import { cn } from "@/lib/utils";
import type { CheckResult, Rule, Severity } from "@/lib/types";
import { useCloseout } from "@/state/closeout";

const STATIC_RESULTS: Record<string, { result: CheckResult; text: string }> = {
  r1: { result: "PASS", text: "ERP production date = Nov 15, 2026" },
  r2: { result: "PASS", text: "Last refresh 6:22 AM (after 5:45 AM)" },
  r5: { result: "PASS", text: "Received 6:31 AM (before 6:45 AM)" },
  r6: { result: "PASS", text: "Modified Nov 15, 5:52 AM" },
  r11: { result: "PASS", text: "2 rows received" },
};
const THRESHOLDS = ["0.5 %", "1.0 %", "2.0 %", "5.0 %", "0 orders", "0 units", "12 h"];
const SOURCE_NAMES = ["ERP Production", "Master Schedule", "Timecards", "Maintenance / PM", "Quality", "Daily Operations Closeout", "Department Check-ins", "Shipments"];

type Filter = "all" | "blocking" | "warning" | "disabled";

function Select({ value, onChange, options, label, className }: { value: string; onChange: (v: string) => void; options: string[]; label: string; className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="focus-ring h-11 w-full appearance-none rounded-md border border-[#CFCFCA] bg-white pl-3.5 pr-9 text-[15px] font-medium hover:border-[#B5B5AF]"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#3E434A]" />
    </div>
  );
}

function Token({ children }: { children: ReactNode }) {
  return <span className="inline-flex h-11 shrink-0 items-center rounded-md bg-[#F0F0EC] px-3.5 text-[15px] text-[#3E434A]">{children}</span>;
}

export default function Rules() {
  const { rules, snapshot, saveRule, toggleRule } = useCloseout();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState<string>(params.get("rule") ?? "r3");
  const [draft, setDraft] = useState<Rule | null>(null);

  const selected = rules.find((r) => r.id === selectedId) ?? null;

  useEffect(() => {
    const p = params.get("rule");
    if (p && p !== selectedId) setSelectedId(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  useEffect(() => {
    if (selected) setDraft({ ...selected, sources: [...selected.sources] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const counts = {
    all: rules.length,
    blocking: rules.filter((r) => r.blocking).length,
    warning: rules.filter((r) => r.severity === "Warning").length,
    disabled: rules.filter((r) => !r.enabled).length,
  };

  const list = useMemo(
    () =>
      rules.filter((r) => {
        if (filter === "blocking" && !r.blocking) return false;
        if (filter === "warning" && r.severity !== "Warning") return false;
        if (filter === "disabled" && r.enabled) return false;
        if (q && !`${r.name} ${r.sources.join(" ")} ${r.owner}`.toLowerCase().includes(q.toLowerCase())) return false;
        return true;
      }),
    [rules, filter, q],
  );

  const isNew = draft ? !rules.some((r) => r.id === draft.id) : false;
  const dirty = draft && (isNew || JSON.stringify(draft) !== JSON.stringify(selected));

  const todayResult = (r: Rule): { result: CheckResult | "OFF" | "NEW"; text: string } => {
    if (!rules.some((x) => x.id === r.id)) return { result: "NEW", text: "Evaluates at the next recheck" };
    if (!r.enabled) return { result: "OFF", text: "Disabled — not evaluated" };
    const c = snapshot.checks.find((x) => x.ruleId === r.id);
    if (c) return { result: c.result, text: c.id === "chk-labor" ? "1,086.0 vs 1,082.5 hrs (0.32%)" : c.headline };
    return STATIC_RESULTS[r.id] ?? { result: "PASS", text: "Passed at last check" };
  };

  const startNew = () => {
    const id = `r${Date.now().toString(36)}`;
    const r: Rule = {
      id,
      name: "New rule",
      sources: ["ERP Production"],
      left: FIELD_OPTIONS[0],
      comparison: "equals",
      right: "Reporting date",
      threshold: "1.0 %",
      severity: "Warning",
      blocking: false,
      owner: "Operations",
      expectedTime: "7:00 AM",
      enabled: true,
    };
    setSelectedId(id);
    setDraft(r);
    setParams({});
  };

  const set = <K extends keyof Rule>(k: K, v: Rule[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));
  const res = draft ? todayResult(draft) : null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Rules"
        subtitle="Define and manage the closeout rules that determine whether the daily management report can be released."
        right={<span className="font-mono text-[13px] text-[#3E434A]">Run ID {snapshot.runId}</span>}
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <label className="relative w-full lg:max-w-[340px]">
          <span className="sr-only">Search rules</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search rules"
            className="focus-ring h-10 w-full rounded-md border border-[#CFCFCA] bg-white pl-9 pr-3 text-sm placeholder:text-[#9A9EA3]"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")} count={counts.all}>
            All
          </FilterChip>
          <FilterChip active={filter === "blocking"} onClick={() => setFilter("blocking")} count={counts.blocking}>
            Blocking
          </FilterChip>
          <FilterChip active={filter === "warning"} onClick={() => setFilter("warning")} count={counts.warning}>
            Warning
          </FilterChip>
          <FilterChip active={filter === "disabled"} onClick={() => setFilter("disabled")} count={counts.disabled}>
            Disabled
          </FilterChip>
        </div>
        <button type="button" className="btn-primary h-10 lg:ml-auto" onClick={startNew}>
          <Plus className="h-4 w-4" /> New Rule
        </button>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <section className="panel overflow-hidden" aria-label="Rules list">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px]">
              <thead>
                <tr className="border-b border-line">
                  <th className="th h-12 text-[13px] text-foreground">Rule name</th>
                  <th className="th h-12 text-[13px] text-foreground">Sources</th>
                  <th className="th h-12 text-[13px] text-foreground">Severity</th>
                  <th className="th h-12 text-[13px] text-foreground">Blocking</th>
                  <th className="th h-12 text-[13px] text-foreground">Owner</th>
                  <th className="th h-12 text-right text-[13px] text-foreground">Enabled</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {list.map((r) => {
                  const active = r.id === selectedId;
                  return (
                    <tr
                      key={r.id}
                      onClick={() => {
                        setSelectedId(r.id);
                        setParams({ rule: r.id });
                      }}
                      className={cn("cursor-pointer transition-colors", active ? "bg-[#F0F0EC] shadow-[inset_4px_0_0_#C7362F]" : "hover:bg-[#FAFAF8]", !r.enabled && "text-muted-foreground")}
                    >
                      <td className="td max-w-[240px] font-medium">
                        <button type="button" className="focus-ring rounded-sm text-left">
                          {r.name}
                        </button>
                      </td>
                      <td className="td text-[13px]">{r.sources.join(", ")}</td>
                      <td className="td">
                        <StatusChip label={r.blocking ? "BLOCKING" : r.severity === "Info" ? "INFO" : "WARNING"} tone={r.blocking ? "bad" : r.severity === "Info" ? "neutral" : "warn"} />
                      </td>
                      <td className="td">{r.blocking ? "Yes" : "No"}</td>
                      <td className="td text-[13px]">{r.owner}</td>
                      <td className="td text-right" onClick={(e) => e.stopPropagation()}>
                        <Switch
                          checked={r.enabled}
                          onCheckedChange={() => {
                            toggleRule(r.id);
                            if (draft?.id === r.id) set("enabled", !r.enabled);
                          }}
                          aria-label={`Enable ${r.name}`}
                          className="data-[state=checked]:bg-ok"
                        />
                      </td>
                    </tr>
                  );
                })}
                {list.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      No rules match this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {draft && (
          <section className="panel xl:sticky xl:top-6" aria-label="Rule editor">
            <div className="border-b border-line px-5 py-4">
              <label htmlFor="rule-name" className="sr-only">
                Rule name
              </label>
              <input
                id="rule-name"
                value={draft.name}
                onChange={(e) => set("name", e.target.value)}
                className="focus-ring -mx-1.5 w-full rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-[19px] font-bold tracking-[-0.01em] hover:border-line"
              />
              <p className="mt-0.5 text-sm text-muted-foreground">{isNew ? "Build the rule logic, severity and ownership." : "Edit the rule logic, severity, and ownership."}</p>
            </div>

            <div className="space-y-4 px-5 py-5">
              <div className="space-y-2.5">
                <div className="flex gap-2.5">
                  <Token>When</Token>
                  <Select className="flex-1" label="Left side" value={draft.left} onChange={(v) => set("left", v)} options={FIELD_OPTIONS} />
                </div>
                <div className="flex flex-col gap-2.5 sm:flex-row">
                  <Select className="sm:w-[180px]" label="Comparison" value={draft.comparison} onChange={(v) => set("comparison", v)} options={COMPARISONS} />
                  <Select className="flex-1" label="Right side" value={draft.right} onChange={(v) => set("right", v)} options={FIELD_OPTIONS} />
                </div>
                {draft.comparison === "differs from" && (
                  <div className="flex gap-2.5">
                    <Token>by more than</Token>
                    <Select className="w-[150px]" label="Threshold" value={draft.threshold || "1.0 %"} onChange={(v) => set("threshold", v)} options={THRESHOLDS} />
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  {draft.comparison === "differs from"
                    ? `Fails when ${draft.left} and ${draft.right} are more than ${draft.threshold || "1.0 %"} apart.`
                    : `Passes when ${draft.left} ${draft.comparison} ${draft.right}.`}
                </p>
              </div>

              <div>
                <div className="mb-1.5 text-sm font-semibold">Sources</div>
                <div className="flex flex-wrap gap-1.5">
                  {SOURCE_NAMES.map((s) => {
                    const on = draft.sources.includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        aria-pressed={on}
                        onClick={() => set("sources", on ? draft.sources.filter((x) => x !== s) : [...draft.sources, s])}
                        className={cn("btn h-8 border px-2.5 text-xs", on ? "border-ink bg-ink text-white" : "border-[#D4D4CF] bg-white text-[#3E434A]")}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-line pt-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="w-[110px] text-[15px] font-semibold">Severity:</span>
                  <div className="flex gap-1.5" role="radiogroup" aria-label="Severity">
                    {(["Critical", "Warning", "Info"] as Severity[]).map((s) => (
                      <button
                        key={s}
                        type="button"
                        role="radio"
                        aria-checked={draft.severity === s}
                        onClick={() => setDraft((d) => (d ? { ...d, severity: s, blocking: s === "Critical" ? d.blocking : false } : d))}
                        className={cn("btn h-10 min-w-[86px] border", draft.severity === s ? "border-ink bg-ink-2 text-white" : "border-[#D4D4CF] bg-white")}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="mt-4 flex items-center gap-3">
                  <Switch
                    checked={draft.blocking}
                    onCheckedChange={(v) => setDraft((d) => (d ? { ...d, blocking: v, severity: v ? "Critical" : d.severity === "Critical" ? "Warning" : d.severity } : d))}
                    className="data-[state=checked]:bg-ok"
                  />
                  <span className="text-[15px] font-semibold">Blocks report release</span>
                </label>
                <p className="ml-[52px] mt-0.5 text-xs text-muted-foreground">{draft.blocking ? "A failure sets the report to BLOCKED." : "A failure sets the report to DEGRADED (warning)."}</p>
              </div>

              <div className="grid grid-cols-[110px_1fr] items-center gap-x-3 gap-y-3 border-t border-line pt-4">
                <span className="text-[15px] font-semibold">Owner</span>
                <Select label="Owner" value={draft.owner} onChange={(v) => set("owner", v)} options={OWNER_OPTIONS} />
                <span className="text-[15px] font-semibold">Expected time</span>
                <Select label="Expected time" value={draft.expectedTime} onChange={(v) => set("expectedTime", v)} options={TIME_OPTIONS} />
                <span className="text-[15px] font-semibold">Enabled</span>
                <div>
                  <Switch checked={draft.enabled} onCheckedChange={(v) => set("enabled", v)} aria-label="Rule enabled" className="data-[state=checked]:bg-ok" />
                </div>
              </div>
            </div>

            {res && (
              <div
                className={cn(
                  "mx-5 flex flex-wrap items-center gap-3 rounded-md px-4 py-3.5",
                  res.result === "PASS" ? "bg-ok-tint" : res.result === "FAIL" ? "bg-bad-tint" : res.result === "WARNING" ? "bg-warn-tint" : "bg-[#F0F0EC]",
                )}
              >
                <span className="text-[15px] font-semibold">Today's result:</span>
                {res.result === "OFF" || res.result === "NEW" ? <StatusChip label={res.result === "OFF" ? "DISABLED" : "PENDING"} tone="neutral" /> : <StatusChip label={res.result} />}
                <span className="tnum font-mono text-[13.5px] font-medium">{res.text}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 px-5 py-5">
              {dirty && <span className="mr-auto text-xs font-medium text-warn-ink">Unsaved changes</span>}
              <button
                type="button"
                className="btn-secondary h-11 px-6"
                onClick={() => {
                  if (selected) setDraft({ ...selected, sources: [...selected.sources] });
                  else {
                    setSelectedId("r3");
                    setDraft(rules.find((r) => r.id === "r3") ?? null);
                  }
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className={cn("btn-primary h-11 px-6", !dirty && "opacity-50")}
                disabled={!dirty || !draft.name.trim() || draft.sources.length === 0}
                onClick={() => {
                  saveRule(draft);
                  setParams({ rule: draft.id });
                }}
              >
                Save Rule
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
