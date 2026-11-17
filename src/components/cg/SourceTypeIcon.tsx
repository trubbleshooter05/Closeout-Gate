import { Cloud, Database, FileSpreadsheet, FileText, Globe, Mail, Share2, UserCheck, Webhook } from "lucide-react";

import { cn } from "@/lib/utils";
import type { SourceType } from "@/lib/types";

const MAP: Record<SourceType, typeof Database> = {
  "REST API": Globe,
  "SQL / database": Database,
  CSV: FileText,
  Excel: FileSpreadsheet,
  SharePoint: Share2,
  OneDrive: Cloud,
  "Email attachment": Mail,
  Webhook: Webhook,
  "Manual owner response": UserCheck,
};

export function SourceTypeIcon({ type, className }: { type: SourceType; className?: string }) {
  const Icon = MAP[type];
  return <Icon className={cn("h-4 w-4 text-muted-foreground", className)} strokeWidth={1.6} aria-hidden />;
}
