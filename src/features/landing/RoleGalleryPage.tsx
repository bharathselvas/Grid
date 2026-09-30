import { useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  Shield,
  Building2,
  Briefcase,
  MapPinned,
  Scale,
  Landmark,
  ClipboardCheck,
  Users2,
  Home,
  IndianRupee,
  User,
  ArrowRight,
  Info,
} from "lucide-react";
import { ROLES, ROLE_BY_ID, type RoleId } from "@/types/rbac";
import { STAGES } from "@/lib/stages";
import { useSessionStore } from "@/stores/sessionStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Shield,
  Building2,
  Briefcase,
  MapPinned,
  Scale,
  Landmark,
  ClipboardCheck,
  Users2,
  Home,
  IndianRupee,
  User,
};

export function RoleGalleryPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { roleId: activeRoleId, switchRole } = useSessionStore();

  // Convenience: /?role=collector_cala or /?roleId=collector_cala redirects after setting session.
  useEffect(() => {
    const via = (searchParams.get("role") ?? searchParams.get("roleId") ?? "") as RoleId;
    if (via && ROLE_BY_ID[via]) {
      switchRole(via);
      navigate("/app/overview", { replace: true });
    }
    // run once on mount / param change
  }, [searchParams, switchRole, navigate]);

  function enterAs(roleId: RoleId) {
    switchRole(roleId);
    navigate("/app/overview");
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <div className="gov-tricolor" aria-hidden />
      {/* Govt strip — institutional, not SaaS header */}
      <div className="bg-[#0F2340] text-white">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-4 py-2 text-[11px] sm:px-6 sm:py-2.5">
          <span className="hidden sm:inline opacity-90">
            भारत सरकार — Government of India &nbsp;|&nbsp; भूमि संसाधन विभाग — Department of Land Resources
          </span>
          <span className="sm:hidden opacity-90">Govt. of India — DoLR</span>
          <span className="hidden sm:inline opacity-60">RFCTLARR Act, 2013</span>
        </div>
      </div>

      <div className="mx-auto max-w-[1200px] px-4 pb-6 pt-6 sm:px-6 sm:pt-8">
        {/* Hero — emblem lockup + title block */}
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          {/* tricolor accent bar */}
          <div className="gov-tricolor" aria-hidden />
          <div className="p-5 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex gap-4">
                {/* DoLR emblem lockup — Shield stands in for Ashoka/emblem silhouette */}
                <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#0F2340] text-white sm:flex">
                  <Shield className="h-7 w-7" />
                </span>
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-[#0F2340] sm:text-2xl">TERRANEX</h1>
                  <p className="text-sm font-medium text-slate-700">National Land Acquisition Operating System</p>
                  <p className="mt-1 max-w-[640px] text-xs leading-relaxed text-muted-foreground">
                    End-to-end acquisition lifecycle under the Right to Fair Compensation and Transparency in Land
                    Acquisition, Rehabilitation &amp; Resettlement Act, 2013 — from project proposal to possession and
                    R&amp;R.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="secondary" className="text-[11px]">
                      SIH 2026 • Problem Statement 26016 • Frontend Mock V2
                    </Badge>
                    <Badge variant="muted" className="hidden text-[11px] sm:inline-flex">
                      One national platform · 11 roles · shared cases
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="hidden text-right lg:block">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Jurisdiction model</p>
                <p className="text-xs text-slate-700">National → State → District → Tehsil → Village</p>
                <p className="text-[11px] text-muted-foreground">RBAC · hierarchy · workflow · audit — designed together</p>
              </div>
            </div>

            {/* Golden Path banner — horizontal mini-dots stepper, per spec */}
            <div className="mt-6 rounded-lg border bg-slate-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <Info className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                <p className="text-xs font-semibold text-slate-700">
                  Golden Path — One shared case moves through this pipeline — every role acts on the same record.
                </p>
              </div>
              <div className="mt-3 overflow-x-auto pb-1">
                <ol className="flex min-w-max items-center gap-0">
                  {STAGES.map((s, i) => (
                    <li key={s.id} className="flex items-center">
                      {i > 0 && <span className="h-px w-3 shrink-0 bg-slate-300 sm:w-4" aria-hidden />}
                      <span
                        className="group relative flex flex-col items-center gap-1"
                        title={`${s.label} — ${s.statutoryRef} · SLA ${s.slaDays}d`}
                      >
                        <span className="h-2 w-2 shrink-0 rounded-full bg-[#0F2340] ring-1 ring-white" aria-hidden />
                        <span className="whitespace-nowrap text-[9px] font-medium leading-none tracking-wide text-slate-600 sm:text-[10px]">
                          {s.shortLabel}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                17 statutory stages from Project Proposal to Closed. Dots above are the same stepper used inside case
                detail. Current stage is highlighted there; this banner shows the full pipeline.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          <span className="hidden text-center sm:inline">
            Choose a role to enter its workspace — all roles share the same cases, parcels, documents &amp; audit trail
          </span>
          <span className="sm:hidden">Choose a role — shared case registry</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        {/* 11 role cards — 3 cols desktop, per spec */}
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ROLES.map((role) => {
            const Icon = ICON_MAP[role.icon] ?? Shield;
            const isActive = role.id === activeRoleId;
            return (
              <Card
                key={role.id}
                className={"group relative overflow-hidden transition-shadow hover:shadow-md " + (isActive ? "ring-2 ring-[#0F2340] ring-offset-1" : "")}
                style={{ borderLeft: `4px solid ${role.color}` }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-white"
                      style={{ background: role.color }}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold leading-tight text-[#0F2340]">{role.label}</p>
                      <p className="line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">{role.description}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <Badge variant="secondary" className="text-[10px]">
                          {role.scope}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">{role.jurisdictionHint}</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => enterAs(role.id)}
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    className="mt-3 w-full justify-between"
                  >
                    Enter workspace <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Citizen Portal Banner */}
        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-center">
          <p className="text-sm font-semibold text-amber-900">Public Citizen Portal</p>
          <p className="text-xs text-amber-700 mt-1">Landowner? Track your acquisition, file objections, submit grievances.</p>
          <Link
            to="/citizen"
            className="inline-block mt-2 px-4 py-2 bg-[#0F2340] text-white text-sm rounded hover:bg-[#1a365d]"
          >
            Enter Citizen Portal
          </Link>
        </div>

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          Mock data — Maharashtra (Pune, Nagpur, Jalna, Satara), Madhya Pradesh, Odisha. No backend. State is in-memory
          via Zustand.
        </p>
      </div>
    </div>
  );
}
