export type GateStatus = "READY" | "DEGRADED" | "BLOCKED";
export type SourceStatus = "READY" | "WARNING" | "BLOCKED";
export type CheckResult = "PASS" | "WARNING" | "FAIL";
export type Severity = "Critical" | "Warning" | "Info";

export type SourceType =
  | "REST API"
  | "SQL / database"
  | "CSV"
  | "Excel"
  | "SharePoint"
  | "OneDrive"
  | "Email attachment"
  | "Webhook"
  | "Manual owner response";

export interface Owner {
  id: string;
  name: string;
  initials: string;
  department: string;
  title: string;
  email: string;
  avgResponseMin: number;
  /** Last 14 reporting days, oldest first. */
  history: ("on-time" | "late" | "missed" | "none")[];
}

export interface Source {
  id: string;
  name: string;
  type: SourceType;
  system: string;
  ownerId: string;
  ownerLabel: string;
  mandatory: boolean;
  expectedBy: string;
  freshnessRequirement: string;
  receivedAt: string | null;
  currentThrough: string;
  reportingDate: string;
  rowCount: number | null;
  rowLabel: string;
  lastSuccessfulRun: string;
  lastValidation: string;
  connection: string;
  /** Linked to PM asset items when relevant. */
  tracksPmAssets?: boolean;
}

export interface PmAsset {
  id: string;
  asset: string;
  task: string;
  required: string;
  state: "Complete" | "Deferred" | null;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface OwnerResponse {
  id: string;
  ownerId: string;
  label: string;
  dueBy: string;
  receivedAt: string | null;
  mandatory: boolean;
}

export interface AuditEntry {
  t: string;
  actor: string;
  msg: string;
}

export interface Exception {
  id: string;
  title: string;
  description: string;
  ownerId: string;
  checkId: string;
  sourceId: string;
  ruleName: string;
  missing: string[];
  expected: string;
  status: "WAITING FOR OWNER" | "BLOCKING REPORT RELEASE" | "RESOLVED";
  blocking: boolean;
  openedAt: string;
  date: string;
  audit: AuditEntry[];
  /** Resolution side effects, applied to raw data when resolved. */
  resolvesPmAssets?: string[];
  resolvesResponses?: string[];
  resolution?: { note: string; by: string; at: string; kind: string };
  awaitingRecheck?: boolean;
}

export interface Rule {
  id: string;
  name: string;
  sources: string[];
  left: string;
  comparison: string;
  right: string;
  threshold: string;
  severity: Severity;
  blocking: boolean;
  owner: string;
  expectedTime: string;
  enabled: boolean;
}

export interface SourceEval {
  id: string;
  status: SourceStatus;
  headline: string;
  missingItems: number;
}

export interface CheckEval {
  id: string;
  name: string;
  ruleId: string;
  description: string;
  result: CheckResult;
  headline: string;
  actual: string[];
  expected: string;
  sources: string[];
  owner: string;
  blocking: boolean;
  checkedAt: string;
  details: { label: string; a: string; b: string; result: CheckResult }[];
  detailCols: [string, string, string];
}

export interface Snapshot {
  checkedAt: string;
  runId: string;
  sources: Record<string, SourceEval>;
  checks: CheckEval[];
  status: GateStatus;
  missingSourceItems: number;
  failedBlockingRules: number;
  warnings: number;
}

export interface ReleaseRecord {
  releasedBy: string;
  releasedAt: string;
  reportingDate: string;
  cutoff: string;
  runId: string;
  decision: GateStatus;
  acknowledgedWarnings: string[];
  digest: string;
}

export interface HistoricalRun {
  date: string;
  dateLabel: string;
  initial: GateStatus;
  final: GateStatus;
  finalAt: string;
  runId: string;
  releasedBy: string;
  releasedAt: string;
  sources: { name: string; status: SourceStatus; at: string }[];
  checks: { name: string; result: CheckResult; value: string }[];
  exceptions: {
    id: string;
    title: string;
    owner: string;
    resolvedAt: string;
    resolvedBy?: string;
    note?: string;
    kind?: string;
    missing?: string[];
    openedAt?: string;
    blocking?: boolean;
  }[];
  responses: { owner: string; area: string; status: "RECEIVED" | "RESOLVED" | "LATE"; at: string }[];
  timeline: AuditEntry[];
  digest: string;
  live?: boolean;
  /** Set on runs released in this session: the record is frozen. */
  sealed?: boolean;
  acknowledgedWarnings?: string[];
  scenario?: string;
}
