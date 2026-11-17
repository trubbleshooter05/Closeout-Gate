// The prototype runs on a demo clock anchored to the reporting morning:
// Nov 15, 2026 at 6:43:15 AM (just after the seeded 6:43:10 recheck), advancing in real time from page load.
const ANCHOR = new Date(2026, 10, 15, 6, 43, 15).getTime();
const loadedAt = Date.now();

export const REPORTING_DATE = "Nov 15, 2026";
export const REPORTING_DATE_ISO = "2026-11-15";
export const CUTOFF = "7:00 AM";

export function demoNow(): Date {
  return new Date(ANCHOR + (Date.now() - loadedAt));
}

export function fmtTime(d: Date): string {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function fmtTimeSec(d: Date): string {
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

export function fmtStamp(d: Date): string {
  return `${REPORTING_DATE} ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" })}`;
}

export function runIdFor(d: Date): string {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `CG-20261115-${hh}${mm}`;
}

/** Minutes remaining until the 7:00 AM cutoff on the demo clock. */
export function minutesToCutoff(): number {
  const cutoff = new Date(2026, 10, 15, 7, 0, 0).getTime();
  return Math.round((cutoff - demoNow().getTime()) / 60000);
}

/** Deterministic record digest (not cryptographic; prototype only). */
export function digestOf(input: string): string {
  let out = "";
  for (let seed = 0; seed < 8; seed++) {
    let h = 0x811c9dc5 ^ (seed * 0x9e3779b1);
    for (let i = 0; i < input.length; i++) {
      h ^= input.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    out += (h >>> 0).toString(16).padStart(8, "0");
  }
  return out;
}
