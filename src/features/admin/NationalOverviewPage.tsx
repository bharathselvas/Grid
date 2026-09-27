import { Link } from "react-router-dom";
import {
  Files,
  MapPin,
  IndianRupee,
  Users2,
  AlertTriangle,
  Clock3,
  ArrowUpRight,
  Building2,
  TrendingUp,
  Home,
  Shield,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getNationalOverview, useRequiredApi } from "@/services/api";
import type { NationalOverviewDto } from "@/services/api";
import { ApiErrorState, ApiLoadingState } from "@/components/domain/ApiStates";
import { stageShortLabel, stageGroupColor, formatDateTime } from "@/lib/format";
import type { LifecycleStage } from "@/types/domain";

const KPI_ICONS = [Files, Files, MapPin, Building2, MapPin, IndianRupee, IndianRupee, Users2, Home, AlertTriangle];

type KpiCard = { label: string; value: string; subtext: string };

function unavailableCards(overview: NationalOverviewDto): Record<string, KpiCard> {
  const byKey = new Map(overview.kpis.unavailableMetrics.map((metric) => [metric.key, metric]));
  const card = (key: string, label: string): KpiCard => ({
    label,
    value: "—",
    subtext: byKey.get(key)?.reason ?? "Not captured in this system yet.",
  });
  return {
    compensationAssessedCr: card("compensationAssessedCr", "Compensation Assessed"),
    compensationDisbursedCr: card("compensationDisbursedCr", "Compensation Disbursed"),
    affectedFamilies: card("affectedFamilies", "Affected Families"),
    rrPending: card("rrPending", "R&R Pending"),
  };
}

export function NationalOverviewPage() {
  const { data: overview, loading, error, reload } = useRequiredApi(() => getNationalOverview(), []);

  const kpis = overview?.kpis;
  const unavailable = overview ? unavailableCards(overview) : ({} as Record<string, KpiCard>);

  const kpiCards: KpiCard[] = kpis
    ? [
        { label: "Active Projects", value: String(kpis.activeProjects), subtext: `Across ${kpis.stateCount} states & UTs` },
        { label: "Total Projects", value: kpis.totalProjects.toLocaleString("en-IN"), subtext: "Registered in the system" },
        { label: "Total Parcels", value: kpis.totalParcels.toLocaleString("en-IN"), subtext: "Under acquisition process" },
        { label: "States / UTs", value: String(kpis.stateCount), subtext: `${kpis.districtCount} districts on record` },
        { label: "Acquisition Area", value: `${kpis.parcelAreaHa.toLocaleString("en-IN")} Ha`, subtext: "Identified parcel area" },
        unavailable.compensationAssessedCr,
        unavailable.compensationDisbursedCr,
        unavailable.affectedFamilies,
        unavailable.rrPending,
        { label: "Delayed Projects", value: String(kpis.delayedProjects), subtext: "Exceeding statutory timelines" },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-[#0F2340]" />
            <h1 className="text-lg font-semibold tracking-tight text-[#0F2340]">National Overview</h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            National land acquisition monitoring and governance
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {overview
              ? `Live database figures · as of ${formatDateTime(overview.asOf)}`
              : loading
                ? "Loading live data…"
                : "Live data unavailable — retry below"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/app/admin/monitoring">
              View Projects <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/app/admin/gis">
              National GIS <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
            </Link>
          </Button>
        </div>
      </div>

      {error && !overview && <ApiErrorState error={error} onRetry={reload} />}
      {!error && !overview && loading && <ApiLoadingState label="Loading national overview…" />}

      {overview && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {kpiCards.map((kpi, i) => {
              const Icon = KPI_ICONS[i] ?? Files;
              return (
                <Card key={kpi.label}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-medium text-muted-foreground">{kpi.label}</p>
                      <Icon className="h-4 w-4 text-slate-500" />
                    </div>
                    <p className="mt-1 text-xl font-bold text-[#0F2340]">{kpi.value}</p>
                    <p className="text-[11px] text-muted-foreground">{kpi.subtext}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Pipeline */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-[#0F2340]">National Acquisition Pipeline</h2>
                  <p className="text-[11px] text-muted-foreground">Projects/parcels distributed across the statutory lifecycle (RFCTLARR, 2013)</p>
                </div>
                <Badge variant="secondary" className="text-[11px]">{kpis?.totalProjects ?? 0} projects</Badge>
              </div>

              {/* Pipeline visualization */}
              <div className="space-y-1.5">
                {overview.pipeline.map((ps) => {
                  const groupColor = stageGroupColor(ps.group);
                  return (
                    <div key={ps.stage} className="flex items-center gap-2">
                      <span className="w-[120px] shrink-0 text-[11px] font-medium text-slate-700 truncate">
                        {stageShortLabel(ps.stage as LifecycleStage)}
                      </span>
                      <div className="flex-1 h-5 bg-slate-100 rounded-sm overflow-hidden relative">
                        <div
                          className={`h-full ${groupColor} rounded-sm transition-all`}
                          style={{ width: `${Math.max(ps.percentage * 2.5, 2)}%`, opacity: 0.85 }}
                        />
                      </div>
                      <span className="w-[40px] shrink-0 text-right text-[11px] font-medium text-slate-700">
                        {ps.count}
                      </span>
                      <span className="w-[40px] shrink-0 text-right text-[11px] text-muted-foreground">
                        {ps.percentage}%
                      </span>
                      {ps.attention && (
                        <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" title={`${ps.delayedCount} delayed project(s) in this stage`} />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Group legend */}
              <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t">
                {[
                  { label: "Initiation", color: "bg-slate-600" },
                  { label: "Assessment", color: "bg-amber-600" },
                  { label: "Notification", color: "bg-blue-600" },
                  { label: "Adjudication", color: "bg-violet-600" },
                  { label: "Settlement", color: "bg-emerald-600" },
                  { label: "Closure", color: "bg-zinc-700" },
                ].map((g) => (
                  <span key={g.label} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className={`w-2.5 h-2.5 rounded-sm ${g.color}`} />
                    {g.label}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick links grid */}
          <div className="grid gap-3 md:grid-cols-3">
            <Link to="/app/admin/risk" className="group">
              <Card className="transition-colors hover:bg-slate-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
                      <AlertTriangle className="h-5 w-5 text-[#B42318]" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[#0F2340]">Risk & Delay Monitor</p>
                      <p className="text-[11px] text-muted-foreground">{kpis?.attentionProjects ?? 0} projects requiring attention</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link to="/app/admin/audit" className="group">
              <Card className="transition-colors hover:bg-slate-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                      <Clock3 className="h-5 w-5 text-blue-600" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[#0F2340]">System Audit Trail</p>
                      <p className="text-[11px] text-muted-foreground">{kpis?.auditEventsLast7Days ?? 0} events in last 7 days</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link to="/app/admin/integrations" className="group">
              <Card className="transition-colors hover:bg-slate-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
                      <TrendingUp className="h-5 w-5 text-emerald-600" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[#0F2340]">Integration Health</p>
                      <p className="text-[11px] text-muted-foreground">No external systems connected in this build</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Live data provenance */}
          <p className="text-[11px] text-muted-foreground">
            Figures aggregated live from the connected PostgreSQL database — no sample rows are shown on this page.
          </p>
        </>
      )}
    </div>
  );
}
