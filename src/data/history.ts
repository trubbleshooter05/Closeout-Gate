import { digestOf } from "@/lib/clock";
import type { CheckResult, GateStatus, HistoricalRun, SourceStatus } from "@/lib/types";

// Synthetic Audit History fixtures for the demo. Sealed runs are immutable once released.
interface Spec {
  day: number;
  initial: GateStatus;
  final: GateStatus;
  at: string;
  note?: { source?: string; check?: string; checkValue?: string; exception?: { id: string; title: string; owner: string; resolvedAt: string } };
  bbAt?: string;
}

const SPECS: Spec[] = [
  { day: 14, initial: "READY", final: "READY", at: "6:52 AM" },
  {
    day: 13,
    initial: "DEGRADED",
    final: "DEGRADED",
    at: "6:58 AM",
    note: { check: "Quality Holds vs Production", checkValue: "1 of 2 holds missing disposition", exception: { id: "EXC-1113-01", title: "Quality hold missing disposition", owner: "C. Morgan", resolvedAt: "8:14 AM (after release)" } },
  },
  { day: 12, initial: "READY", final: "READY", at: "6:49 AM" },
  { day: 11, initial: "READY", final: "READY", at: "6:47 AM" },
  {
    day: 10,
    initial: "BLOCKED",
    final: "READY",
    at: "7:14 AM",
    note: { source: "Timecards", check: "Labor Hours vs Timecards", checkValue: "Timecards stale (4:58 AM)", exception: { id: "EXC-1110-01", title: "Timecards sync stale", owner: "J. Parker", resolvedAt: "7:10 AM" } },
  },
  { day: 9, initial: "READY", final: "READY", at: "6:51 AM" },
  { day: 8, initial: "READY", final: "READY", at: "6:44 AM" },
  { day: 7, initial: "DEGRADED", final: "DEGRADED", at: "6:57 AM", bbAt: "6:52 AM", note: { source: "Daily Operations Closeout" } },
  { day: 6, initial: "READY", final: "READY", at: "6:50 AM" },
  {
    day: 5,
    initial: "BLOCKED",
    final: "READY",
    at: "7:09 AM",
    note: { source: "Master Schedule", check: "ERP Production vs Master Schedule", checkValue: "Schedule dated Nov 4", exception: { id: "EXC-1105-01", title: "Master Schedule not refreshed", owner: "A. Rivera", resolvedAt: "7:03 AM" } },
  },
  { day: 4, initial: "READY", final: "READY", at: "6:48 AM" },
  { day: 3, initial: "READY", final: "READY", at: "6:53 AM" },
  { day: 2, initial: "READY", final: "READY", at: "6:46 AM" },
  { day: 1, initial: "READY", final: "READY", at: "6:45 AM" },
];

const releasers = ["Taylor Brooks", "Taylor Brooks", "Taylor Brooks", "Riley Adams"];

function toId(day: number, at: string) {
  const [hm] = at.split(" ");
  const [h, m] = hm.split(":");
  return `CG-202611${String(day).padStart(2, "0")}-${h.padStart(2, "0")}${m}`;
}

export const HISTORY: HistoricalRun[] = SPECS.map((s, i) => {
  const srcStatus = (name: string): SourceStatus => {
    if (s.note?.source !== name) return "READY";
    return s.final === "DEGRADED" ? "WARNING" : "READY";
  };
  const sources = [
    { name: "ERP Production", status: srcStatus("ERP Production"), at: "6:1" + (i % 6) + " AM" },
    { name: "Master Schedule", status: srcStatus("Master Schedule"), at: s.day === 5 ? "7:02 AM" : "5:5" + (i % 9) + " AM" },
    { name: "Timecards", status: srcStatus("Timecards"), at: s.day === 10 ? "7:09 AM" : "6:2" + (i % 5) + " AM" },
    { name: "Maintenance / PM", status: srcStatus("Maintenance / PM"), at: "6:" + (10 + (i % 8)) + " AM" },
    { name: "Quality", status: srcStatus("Quality"), at: "6:0" + (i % 9) + " AM" },
    { name: "Daily Operations Closeout", status: srcStatus("Daily Operations Closeout"), at: s.bbAt ?? "6:3" + (i % 6) + " AM" },
  ];
  const checkNames = [
    ["ERP Production vs Master Schedule", `Variance ${(0.2 + (i % 5) * 0.1).toFixed(1)}%`],
    ["Labor Hours vs Timecards", `Variance ${(0.12 + (i % 4) * 0.05).toFixed(2)}%`],
    ["Closeout vs ERP", `Orders checked: ${40 + (i % 3)}`],
    ["PM Completion Status", "8 of 8 assets final"],
    ["Required Owner Responses", "7 of 7 received"],
    ["Quality Holds vs Production", "2 holds accounted for"],
  ];
  const checks = checkNames.map(([name, value]) => {
    let result: CheckResult = "PASS";
    let v = value;
    if (s.note?.check === name) {
      v = s.note.checkValue ?? value;
      result = s.final === "DEGRADED" ? "WARNING" : "PASS";
    }
    return { name, result, value: v };
  });
  const exceptions = s.note?.exception ? [s.note.exception] : [];
  const responses = [
    { owner: "Morgan Chen", area: "Maintenance", status: (i % 3 === 1 ? "LATE" : "RECEIVED") as "LATE" | "RECEIVED", at: i % 3 === 1 ? "6:41 AM" : "6:2" + (i % 9) + " AM" },
    { owner: "Jamie Parker", area: "Payroll", status: (s.day === 10 ? "RESOLVED" : "RECEIVED") as "RESOLVED" | "RECEIVED", at: s.day === 10 ? "7:10 AM" : "6:1" + (i % 9) + " AM" },
    { owner: "Alex Rivera", area: "Planning", status: (s.day === 5 ? "RESOLVED" : "RECEIVED") as "RESOLVED" | "RECEIVED", at: s.day === 5 ? "7:03 AM" : "5:5" + (i % 9) + " AM" },
    { owner: "Casey Morgan", area: "Quality", status: "RECEIVED" as const, at: "6:1" + (i % 7) + " AM" },
    { owner: "Riley Adams", area: "Operations", status: (s.bbAt ? "LATE" : "RECEIVED") as "LATE" | "RECEIVED", at: s.bbAt ?? "6:3" + (i % 6) + " AM" },
  ];
  const timeline = [
    { t: "06:00:00", actor: "System", msg: "Closeout run opened for Nov " + s.day },
    { t: "06:30:02", actor: "System", msg: `Initial evaluation → ${s.initial}` },
    ...(s.initial !== s.final ? [{ t: "07:0" + (i % 9) + ":00", actor: "System", msg: `Recheck → ${s.final}` }] : []),
    ...(s.final === "DEGRADED" ? [{ t: "06:5" + (i % 9) + ":30", actor: releasers[i % 4], msg: "Warnings acknowledged before release" }] : []),
    { t: s.at, actor: releasers[i % 4], msg: `Management report released (${s.final})` },
  ];
  const runId = toId(s.day, s.at);
  return {
    date: `2026-11-${String(s.day).padStart(2, "0")}`,
    dateLabel: `Nov ${s.day}`,
    initial: s.initial,
    final: s.final,
    finalAt: s.at,
    runId,
    releasedBy: releasers[i % 4],
    releasedAt: `Nov ${s.day}, 2026 ${s.at.replace(" ", ":" + String(10 + ((i * 7) % 49)).padStart(2, "0") + " ")}`,
    sources,
    checks,
    exceptions,
    responses,
    timeline,
    digest: digestOf(runId + s.final + s.at),
  };
});
