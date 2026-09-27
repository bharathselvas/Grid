import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getProjectFacets, listProjects, useRequiredApi } from "@/services/api";
import type { ProjectDto, RiskLevel } from "@/services/api";
import { ApiErrorState, ApiLoadingState } from "@/components/domain/ApiStates";
import { stageShortLabel, formatDate } from "@/lib/format";
import { stageProgress } from "@/lib/stages";
import type { LifecycleStage } from "@/types/domain";

const RISK_VARIANT: Record<string, "danger" | "warning" | "info" | "success" | "secondary"> = {
  critical: "danger",
  high: "warning",
  medium: "info",
  low: "secondary",
  on_track: "success",
};

const RISK_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
  { value: "on_track", label: "On Track" },
];

const PAGE_SIZE = 25;

export function NationalMonitoringPage() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const [ministryFilter, setMinistryFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [page, setPage] = useState(0);

  // Debounce the search box so typing does not hammer the API.
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(0);
  }, [stateFilter, ministryFilter, stageFilter, riskFilter]);

  const { data, loading, error, reload } = useRequiredApi(async () => {
    const [facets, projects] = await Promise.all([
      getProjectFacets(),
      listProjects({
        q: query || undefined,
        state: stateFilter !== "all" ? stateFilter : undefined,
        ministry: ministryFilter !== "all" ? ministryFilter : undefined,
        stage: stageFilter !== "all" ? stageFilter : undefined,
        risk: riskFilter !== "all" ? (riskFilter as RiskLevel) : undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      }),
    ]);
    return { facets, projects };
  }, [query, stateFilter, ministryFilter, stageFilter, riskFilter, page]);

  const facets = data?.facets;
  const items: ProjectDto[] = data?.projects.items ?? [];
  const total = data?.projects.total ?? 0;
  const offset = page * PAGE_SIZE;

  const states = facets?.states.map((row) => row.value) ?? [];
  const ministries = facets?.ministries.map((row) => row.value) ?? [];
  const stageOptions = (facets?.stages ?? []).filter((row) => row.count > 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-[#0F2340]">National Monitoring</h1>
          <p className="text-xs text-muted-foreground">Track all acquisition projects across states and ministries</p>
        </div>
        <Badge variant="secondary" className="text-[11px]">{total} projects</Badge>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
            <Select value={stateFilter} onValueChange={setStateFilter}>
              <SelectTrigger className="w-[160px] h-9 text-sm">
                <SelectValue placeholder="State / UT" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {states.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={ministryFilter} onValueChange={setMinistryFilter}>
              <SelectTrigger className="w-[180px] h-9 text-sm">
                <SelectValue placeholder="Ministry" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ministries</SelectItem>
                {ministries.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-[160px] h-9 text-sm">
                <SelectValue placeholder="Current Stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                {stageOptions.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{stageShortLabel(s.value as LifecycleStage)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger className="w-[140px] h-9 text-sm">
                <SelectValue placeholder="Risk Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Risk</SelectItem>
                {RISK_OPTIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {error && !data && <ApiErrorState error={error} onRetry={reload} />}
      {!error && !data && loading && <ApiLoadingState label="Loading live projects…" />}

      {/* Projects Table */}
      {data && (
        <>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Project ID</th>
                      <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Project Name</th>
                      <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Ministry</th>
                      <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">State</th>
                      <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">District</th>
                      <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Parcels</th>
                      <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Stage</th>
                      <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Progress</th>
                      <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Risk</th>
                      <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Last Activity</th>
                      <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {items.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2.5">
                          <span className="gov-mono text-[#0F2340]">{p.projectCode}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          <p className="font-medium text-slate-800 max-w-[250px] truncate">{p.projectName}</p>
                          <p className="text-[11px] text-muted-foreground">{p.requiringOrganizationName ?? "—"}</p>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-slate-700">{p.ministry ?? "—"}</td>
                        <td className="px-3 py-2.5 text-xs text-slate-700">{p.state}</td>
                        <td className="px-3 py-2.5 text-xs text-slate-700">{p.district}</td>
                        <td className="px-3 py-2.5 text-right text-xs font-medium text-slate-700">{p.parcelCount.toLocaleString("en-IN")}</td>
                        <td className="px-3 py-2.5">
                          <Badge variant="secondary" className="text-[10px]">{stageShortLabel(p.currentWorkflowStage as LifecycleStage)}</Badge>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-[#0F2340] rounded-full" style={{ width: `${stageProgress(p.currentWorkflowStage as LifecycleStage)}%` }} />
                            </div>
                            <span className="text-[11px] text-muted-foreground">{stageProgress(p.currentWorkflowStage as LifecycleStage)}%</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge variant={RISK_VARIANT[p.risk]} className="text-[10px] capitalize">
                            {p.risk === "on_track" ? "On Track" : p.risk}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5 text-[11px] text-muted-foreground">{formatDate(p.lastActivityAt)}</td>
                        <td className="px-3 py-2.5">
                          <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-[11px]">
                            <Link to={`/app/admin/projects/${p.id}`}>
                              View <ExternalLink className="h-3 w-3 ml-1" />
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {items.length === 0 && (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No projects match the current filters.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pagination */}
          {total > PAGE_SIZE && (
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground">
                Showing {offset + 1}–{offset + items.length} of {total}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0 || loading}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={offset + items.length >= total || loading}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
