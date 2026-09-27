import { useState } from "react";
import {
  AlertTriangle,
  Clock3,
  Shield,
  AlertOctagon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listProjects, useRequiredApi } from "@/services/api";
import type { ProjectDto } from "@/services/api";
import { ApiErrorState, ApiLoadingState } from "@/components/domain/ApiStates";
import { stageShortLabel, formatDate } from "@/lib/format";
import type { LifecycleStage } from "@/types/domain";

/**
 * Risk & Delay Monitor — rows are live projects whose derived risk is
 * `critical` or `high` (rules live on the server: shared/workflow/risk.ts).
 * The "reason" text is derived from the same real fields, never stored.
 */
function riskReason(p: ProjectDto): string {
  const today = new Date().toISOString().slice(0, 10);
  const parts: string[] = [];
  if (p.targetDate && p.targetDate < today) {
    parts.push(`Target date passed (${formatDate(p.targetDate)})`);
  }
  const over = Math.round(p.daysInStage - p.stageSlaDays);
  if (p.stageSlaDays > 0 && p.daysInStage > p.stageSlaDays) {
    parts.push(`${over}d beyond the ${p.stageSlaDays}d stage SLA`);
  }
  return parts.join(" · ") || "Approaching statutory timeline";
}

export function RiskDelayMonitorPage() {
  const [severityFilter, setSeverityFilter] = useState<"all" | "critical" | "high">("all");

  const { data, error, reload } = useRequiredApi(async () => {
    const [critical, high] = await Promise.all([
      listProjects({ risk: "critical", limit: 200 }),
      listProjects({ risk: "high", limit: 200 }),
    ]);
    return [...critical.items, ...high.items];
  }, []);

  const atRisk: ProjectDto[] = data ?? [];
  const filtered = atRisk.filter((p) => severityFilter === "all" || p.risk === severityFilter);
  const criticalCount = atRisk.filter((p) => p.risk === "critical").length;
  const highCount = atRisk.filter((p) => p.risk === "high").length;
  const avgDaysOver =
    atRisk.length > 0
      ? Math.round(atRisk.reduce((sum, p) => sum + (p.daysInStage - p.stageSlaDays), 0) / atRisk.length)
      : 0;

  if (error && !data) {
    return (
      <div className="space-y-5">
        <ApiErrorState error={error} onRetry={reload} label="Unable to load live risk data." />
      </div>
    );
  }
  if (!data) {
    return (
      <div className="space-y-5">
        <ApiLoadingState label="Loading risk & delay data…" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-[#0F2340]">Risk & Delay Monitor</h1>
          <p className="text-xs text-muted-foreground">Projects exceeding or approaching statutory timelines</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="border-l-4 border-l-[#B42318]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Critical</p>
              <AlertOctagon className="h-4 w-4 text-[#B42318]" />
            </div>
            <p className="mt-1 text-2xl font-bold text-[#B42318]">{criticalCount}</p>
            <p className="text-[11px] text-muted-foreground">Immediate action required</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">High Risk</p>
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            </div>
            <p className="mt-1 text-2xl font-bold text-amber-600">{highCount}</p>
            <p className="text-[11px] text-muted-foreground">Nearing timeline breach</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Total At Risk</p>
              <Shield className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="mt-1 text-2xl font-bold text-[#0F2340]">{atRisk.length}</p>
            <p className="text-[11px] text-muted-foreground">Projects under monitoring</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-slate-400">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Avg. Days Over</p>
              <Clock3 className="h-4 w-4 text-slate-500" />
            </div>
            <p className="mt-1 text-2xl font-bold text-[#0F2340]">{avgDaysOver}d</p>
            <p className="text-[11px] text-muted-foreground">Beyond expected duration</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {(["all", "critical", "high"] as const).map((f) => (
          <Button
            key={f}
            variant={severityFilter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setSeverityFilter(f)}
            className="h-8 text-xs"
          >
            {f === "all" ? "All" : f === "critical" ? `Critical (${criticalCount})` : `High (${highCount})`}
          </Button>
        ))}
      </div>

      {/* Risk Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b">
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Project</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">State</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">District</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Stage</th>
                  <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Days in Stage</th>
                  <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Expected</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Risk</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Reason</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Last Activity</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-slate-800">{p.projectName}</p>
                      <p className="text-[11px] text-muted-foreground gov-mono">{p.projectCode}</p>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-slate-700">{p.state}</td>
                    <td className="px-3 py-2.5 text-xs text-slate-700">{p.district}</td>
                    <td className="px-3 py-2.5">
                      <Badge variant="secondary" className="text-[10px]">{stageShortLabel(p.currentWorkflowStage as LifecycleStage)}</Badge>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span className={`text-xs font-semibold ${p.daysInStage > p.stageSlaDays ? "text-[#B42318]" : "text-slate-700"}`}>
                        {Math.round(p.daysInStage)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right text-xs text-muted-foreground">{p.stageSlaDays}d</td>
                    <td className="px-3 py-2.5">
                      <Badge variant={p.risk === "critical" ? "danger" : "warning"} className="text-[10px] capitalize">
                        {p.risk}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-slate-600 max-w-[300px]">
                      <p className="line-clamp-2">{riskReason(p)}</p>
                    </td>
                    <td className="px-3 py-2.5 text-[11px] text-muted-foreground">{formatDate(p.lastActivityAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No projects are currently exceeding statutory timelines.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
