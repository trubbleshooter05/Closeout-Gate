import { SOURCES, ownerById } from "@/data/seed";
import type { CheckEval, CheckResult, GateStatus, OwnerResponse, PmAsset, Rule, Snapshot, SourceEval } from "@/lib/types";

export interface RawState {
  pmAssets: PmAsset[];
  responses: OwnerResponse[];
  rules: Rule[];
  qualityWarning: boolean;
}

const pct = (a: number, b: number) => (Math.abs(a - b) / b) * 100;
const n1 = (v: number) => v.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function evaluateSources(raw: RawState): Record<string, SourceEval> {
  const out: Record<string, SourceEval> = {};
  const missingPm = raw.pmAssets.filter((a) => !a.state).length;
  const outstanding = raw.responses.filter((r) => r.mandatory && !r.receivedAt).length;
  for (const s of SOURCES) {
    let status: SourceEval["status"] = "READY";
    let headline = "";
    let missingItems = 0;
    switch (s.id) {
      case "erp":
        headline = "Current through Nov 15, 6:15 AM";
        break;
      case "schedule":
        headline = "Current through Nov 15";
        break;
      case "timecards":
        headline = "Last sync: 6:22 AM";
        break;
      case "maint":
        missingItems = missingPm;
        if (missingPm > 0) {
          status = s.mandatory ? "BLOCKED" : "WARNING";
          headline = `${missingPm} required update${missingPm === 1 ? "" : "s"} missing`;
        } else {
          headline = `All ${raw.pmAssets.length} PM assets have a completion state`;
        }
        break;
      case "quality":
        headline = "Current through Nov 15";
        break;
      case "bb":
        headline = "Received: 6:31 AM";
        break;
      case "shipments":
        headline = "Last event: 6:38 AM";
        break;
      case "checkins": {
        const total = raw.responses.filter((r) => r.mandatory).length;
        headline = `${total - outstanding} of ${total} responses received`;
        if (outstanding > 0) status = "WARNING";
        break;
      }
    }
    out[s.id] = { id: s.id, status, headline, missingItems };
  }
  return out;
}

function ruleFor(raw: RawState, id: string) {
  return raw.rules.find((r) => r.id === id);
}

export function evaluateChecks(raw: RawState, checkedAt: string): CheckEval[] {
  const all: (Omit<CheckEval, "result" | "blocking" | "checkedAt" | "owner"> & { failed: boolean; ownerDefault: string })[] = [];

  // 1. ERP Production vs Master Schedule
  const lines = [
    { label: "Line A", a: 520, b: 522 },
    { label: "Line B", a: 410, b: 411 },
    { label: "Machine 12", a: 198, b: 199 },
    { label: "Assembly Cell 3", a: 122, b: 122 },
  ];
  const erpUnits = lines.reduce((s, l) => s + l.a, 0);
  const schUnits = lines.reduce((s, l) => s + l.b, 0);
  all.push({
    id: "chk-erp-sched",
    ruleId: "r7",
    name: "ERP Production vs Master Schedule",
    description: "Units reported produced in ERP must reconcile to the Master Schedule plan for the reporting date.",
    failed: pct(erpUnits, schUnits) > 1,
    headline: `Variance: ${pct(erpUnits, schUnits).toFixed(1)}%`,
    actual: [`ERP: ${erpUnits.toLocaleString()} units`, `Schedule: ${schUnits.toLocaleString()} units`, `Variance: ${pct(erpUnits, schUnits).toFixed(1)}%`],
    expected: "Tolerance: 1.0%",
    sources: ["ERP Production", "Master Schedule"],
    ownerDefault: "Planning",
    detailCols: ["Line", "ERP units", "Scheduled"],
    details: lines.map((l) => ({ label: l.label, a: l.a.toLocaleString(), b: l.b.toLocaleString(), result: pct(l.a, l.b) > 1 ? "WARNING" : "PASS" })),
  });

  // 2. Labor Hours vs Timecards
  const depts = [
    { label: "Assembly", a: 420.0, b: 418.5 },
    { label: "Finishing", a: 330.0, b: 329.0 },
    { label: "Packaging", a: 236.0, b: 235.0 },
    { label: "Maintenance", a: 100.0, b: 100.0 },
  ];
  const erpHrs = depts.reduce((s, d) => s + d.a, 0);
  const tcHrs = depts.reduce((s, d) => s + d.b, 0);
  all.push({
    id: "chk-labor",
    ruleId: "r3",
    name: "Labor Hours vs Timecards",
    description: "Direct and indirect labor hours booked in ERP must reconcile to approved timecards.",
    failed: pct(erpHrs, tcHrs) > 1,
    headline: `Variance: ${pct(erpHrs, tcHrs).toFixed(2)}%`,
    actual: [`ERP: ${n1(erpHrs)} hrs`, `Timecards: ${n1(tcHrs)} hrs`, `Variance: ${pct(erpHrs, tcHrs).toFixed(2)}%`],
    expected: "Tolerance: 1.0%",
    sources: ["ERP Production", "Timecards"],
    ownerDefault: "Payroll",
    detailCols: ["Department", "ERP hrs", "Timecard hrs"],
    details: depts.map((d) => ({ label: d.label, a: n1(d.a), b: n1(d.b), result: "PASS" as CheckResult })),
  });

  // 3. Closeout vs ERP
  const orders = [
    { label: "SO-10001 · Sample Customer A", a: "$12,400.00", b: "$12,400.00" },
    { label: "SO-10004 · Sample Customer B", a: "$8,250.50", b: "$8,250.50" },
    { label: "SO-10009 · Sample Customer C", a: "$15,100.00", b: "$15,100.00" },
    { label: "SO-10012 · Sample Customer D", a: "$6,320.75", b: "$6,320.75" },
    { label: "+ 38 more orders", a: "$58,429.75", b: "$58,429.75" },
  ];
  all.push({
    id: "chk-bb",
    ruleId: "r8",
    name: "Closeout vs ERP",
    description: "Every order on the daily operations closeout must match a completed order in ERP.",
    failed: false,
    headline: "Orders checked: 42",
    actual: ["Orders checked: 42", "Mismatches: 0", "Billed: $100,501.00"],
    expected: "0 mismatched orders",
    sources: ["Daily Operations Closeout", "ERP Production"],
    ownerDefault: "Operations",
    detailCols: ["Order", "Closeout amount", "ERP amount"],
    details: orders.map((o) => ({ ...o, result: "PASS" as CheckResult })),
  });

  // 4. PM Completion Status
  const missing = raw.pmAssets.filter((a) => !a.state);
  all.push({
    id: "chk-pm",
    ruleId: "r4",
    name: "PM Completion Status",
    description: "Every mandatory preventive-maintenance asset must have a final state (Complete or Deferred) before release.",
    failed: missing.length > 0,
    headline: missing.length ? `${missing.length} assets missing final status` : `All ${raw.pmAssets.length} assets have a final status`,
    actual: missing.length
      ? [`${raw.pmAssets.length - missing.length} of ${raw.pmAssets.length} assets complete`, `Missing: ${missing.map((m) => m.asset).join(", ")}`]
      : [`${raw.pmAssets.length} of ${raw.pmAssets.length} assets have a final state`],
    expected: `${raw.pmAssets.length} of ${raw.pmAssets.length} assets Complete or Deferred`,
    sources: ["Maintenance / PM"],
    ownerDefault: "Maintenance",
    detailCols: ["Asset", "PM task", "State"],
    details: raw.pmAssets.map((a) => ({ label: a.asset, a: a.task, b: a.state ?? "Missing", result: a.state ? "PASS" : "FAIL" })),
  });

  // 5. Required Owner Responses
  const req = raw.responses.filter((r) => r.mandatory);
  const out = req.filter((r) => !r.receivedAt);
  all.push({
    id: "chk-resp",
    ruleId: "r9",
    name: "Required Owner Responses",
    description: "Every department owner must submit their required closeout response before the cutoff.",
    failed: out.length > 0,
    headline: out.length ? `${out.length} update${out.length === 1 ? "" : "s"} outstanding` : `${req.length} of ${req.length} received`,
    actual: [`Received: ${req.length - out.length} of ${req.length}`, ...(out.length ? [`Outstanding: ${out.length}`] : [])],
    expected: `${req.length} of ${req.length} by 7:00 AM`,
    sources: ["Department Check-ins"],
    ownerDefault: "Operations",
    detailCols: ["Owner", "Response", "Received"],
    details: req.map((r) => ({ label: ownerById(r.ownerId).name, a: r.label, b: r.receivedAt ?? "Outstanding", result: r.receivedAt ? "PASS" : "FAIL" })),
  });

  // 6. Quality Holds vs Production
  const holds = [
    { label: "QH-1001 · Lot A-101", a: "120 units", b: "Excluded", ok: true },
    { label: "QH-1002 · Lot A-108", a: "64 units", b: raw.qualityWarning ? "No disposition" : "Excluded", ok: !raw.qualityWarning },
  ];
  all.push({
    id: "chk-quality",
    ruleId: "r10",
    name: "Quality Holds vs Production",
    description: "Units on quality hold must be excluded from good production quantities reported to management.",
    failed: raw.qualityWarning,
    headline: raw.qualityWarning ? "1 of 2 holds missing disposition" : "2 holds accounted for",
    actual: raw.qualityWarning ? ["Holds: 2", "Accounted for: 1", "Missing disposition: QH-1002"] : ["Holds: 2", "Accounted for: 2"],
    expected: "All holds excluded from good units",
    sources: ["Quality", "ERP Production"],
    ownerDefault: "Quality",
    detailCols: ["Hold", "Held qty", "In ERP"],
    details: holds.map((h) => ({ label: h.label, a: h.a, b: h.b, result: h.ok ? "PASS" : "WARNING" })),
  });

  const res: CheckEval[] = [];
  for (const c of all) {
    const rule = ruleFor(raw, c.ruleId);
    if (rule && !rule.enabled) continue;
    const blocking = rule ? rule.blocking : true;
    const result: CheckResult = !c.failed ? "PASS" : blocking ? "FAIL" : "WARNING";
    const { failed: _f, ownerDefault, ...rest } = c;
    void _f;
    res.push({ ...rest, result, blocking, owner: rule?.owner ?? ownerDefault, checkedAt });
  }
  return res;
}

export function evaluate(raw: RawState, checkedAt: string, runId: string): Snapshot {
  const sources = evaluateSources(raw);
  const checks = evaluateChecks(raw, checkedAt);
  const mandatoryBlocked = SOURCES.filter((s) => s.mandatory && sources[s.id].status === "BLOCKED");
  const missingSourceItems = mandatoryBlocked.reduce((s, src) => s + Math.max(1, sources[src.id].missingItems), 0);
  const failedBlockingRules = checks.filter((c) => c.blocking && c.result === "FAIL").length;
  const warnings =
    checks.filter((c) => c.result === "WARNING").length +
    SOURCES.filter((s) => sources[s.id].status === "WARNING").length;
  let status: GateStatus = "READY";
  if (mandatoryBlocked.length > 0 || failedBlockingRules > 0) status = "BLOCKED";
  else if (warnings > 0) status = "DEGRADED";
  return { checkedAt, runId, sources, checks, status, missingSourceItems, failedBlockingRules, warnings };
}
