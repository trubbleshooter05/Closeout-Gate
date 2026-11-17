import { RotateCcw } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { PageHeader, Panel, StatusChip } from "@/components/cg/primitives";
import { Switch } from "@/components/ui/switch";
import { CURRENT_USER, TIME_OPTIONS } from "@/data/seed";
import { cn } from "@/lib/utils";
import { useCloseout, type Scenario } from "@/state/closeout";

const SCENARIOS: { id: Scenario; label: string; text: string }[] = [
  { id: "blocked", label: "BLOCKED", text: "Morgan Chen's PM updates and closeout sign-off are missing." },
  { id: "degraded", label: "DEGRADED", text: "Blocking items resolved; a non-blocking quality warning remains." },
  { id: "ready", label: "READY", text: "Everything received and reconciled; ready to release." },
];

export default function Settings() {
  const { scenario, setScenario } = useCloseout();
  const [cutoff, setCutoff] = useState("7:00 AM");
  const [recheckEvery, setRecheckEvery] = useState("15");
  const [notify, setNotify] = useState({ email: true, chat: true, escalate: true, digest: false });
  const [approver, setApprover] = useState(true);

  const save = () => toast.success("Settings saved", { description: `Cutoff ${cutoff} · automatic recheck every ${recheckEvery} min` });

  return (
    <div className="space-y-5">
      <PageHeader title="Settings" subtitle="Report, release and notification settings for Northstar Components Demo." />

      <div className="grid items-start gap-5 xl:grid-cols-2">
        <Panel title="Report" bodyClass="divide-y divide-line">
          <Row label="Report name" hint="Shown on the dashboard and in release records.">
            <span className="font-semibold">Daily Management Report</span>
          </Row>
          <Row label="Data cutoff" hint="Owners are expected to deliver before this time.">
            <select value={cutoff} onChange={(e) => setCutoff(e.target.value)} className="focus-ring h-9 rounded-md border border-[#D4D4CF] bg-white px-3 text-sm">
              {TIME_OPTIONS.filter((t) => t !== "Continuous").map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Row>
          <Row label="Automatic recheck" hint="Closeout is re-evaluated on this interval until release.">
            <select value={recheckEvery} onChange={(e) => setRecheckEvery(e.target.value)} className="focus-ring h-9 rounded-md border border-[#D4D4CF] bg-white px-3 text-sm">
              <option value="5">Every 5 min</option>
              <option value="15">Every 15 min</option>
              <option value="30">Every 30 min</option>
            </select>
          </Row>
          <Row label="Release approver" hint="Only this person can release the report.">
            <span>
              {CURRENT_USER.name}, {CURRENT_USER.title}
            </span>
          </Row>
          <Row label="Require acknowledgement for DEGRADED" hint="Warnings must be ticked off before a degraded release.">
            <Switch checked={approver} onCheckedChange={setApprover} aria-label="Require acknowledgement" />
          </Row>
          <Row label="Auto-publish" hint="Closeout Gate never publishes without an explicit release.">
            <span className="text-sm font-semibold text-muted-foreground">Always off</span>
          </Row>
        </Panel>

        <Panel title="Notifications" bodyClass="divide-y divide-line">
          <Row label="Email reminders" hint="Send owners an email when a requirement is late.">
            <Switch checked={notify.email} onCheckedChange={(v) => setNotify((n) => ({ ...n, email: v }))} aria-label="Email reminders" />
          </Row>
          <Row label="Chat reminders" hint="Post to the owner in chat alongside email.">
            <Switch checked={notify.chat} onCheckedChange={(v) => setNotify((n) => ({ ...n, chat: v }))} aria-label="Chat reminders" />
          </Row>
          <Row label="Escalate at cutoff" hint="Notify the plant manager when blockers remain at cutoff.">
            <Switch checked={notify.escalate} onCheckedChange={(v) => setNotify((n) => ({ ...n, escalate: v }))} aria-label="Escalate at cutoff" />
          </Row>
          <Row label="Daily digest" hint="Send a summary of each run after release.">
            <Switch checked={notify.digest} onCheckedChange={(v) => setNotify((n) => ({ ...n, digest: v }))} aria-label="Daily digest" />
          </Row>
        </Panel>
      </div>

      <div className="flex justify-end">
        <button type="button" className="btn-primary" onClick={save}>
          Save Settings
        </button>
      </div>

      <Panel title="Demo scenario" right={<span className="text-xs text-muted-foreground">Mock data · resets today's run</span>} bodyClass="p-4">
        <div className="grid gap-3 md:grid-cols-3">
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={scenario === s.id}
              onClick={() => setScenario(s.id)}
              className={cn(
                "focus-ring rounded-lg border px-4 py-4 text-left transition-colors",
                scenario === s.id ? "border-ink bg-[#F0F0EC] ring-1 ring-ink" : "border-line bg-white hover:border-[#BDBDB7]",
              )}
            >
              <StatusChip label={s.label} size="md" />
              <p className="mt-2.5 text-sm text-[#3E434A]">{s.text}</p>
            </button>
          ))}
        </div>
        <button type="button" className="btn-secondary mt-4" onClick={() => setScenario(scenario)}>
          <RotateCcw className="h-4 w-4" /> Reset current scenario
        </button>
      </Panel>
    </div>
  );
}

function Row({ label, hint, children }: { label: string; hint: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3.5">
      <div className="min-w-0">
        <div className="text-sm font-semibold">{label}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </div>
      <div className="shrink-0 text-sm">{children}</div>
    </div>
  );
}
