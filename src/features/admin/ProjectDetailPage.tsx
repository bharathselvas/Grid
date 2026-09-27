import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  MapPin,
  Building2,
  Files,
  AlertTriangle,
  IndianRupee,
  Home,
  Users,
  ScrollText,
  MessageSquareWarning,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ApiError,
  getProject,
  getWorkflowInstance,
  listAuditEvents,
  listDocuments,
  listParcels,
  useRequiredApi,
} from "@/services/api";
import { ApiErrorState, ApiLoadingState } from "@/components/domain/ApiStates";
import { stageShortLabel, formatDate } from "@/lib/format";
import { stageProgress } from "@/lib/stages";
import { StageStepper } from "@/components/domain/StageStepper";
import type { LifecycleStage } from "@/types/domain";

const RISK_VARIANT: Record<string, "danger" | "warning" | "info" | "success" | "secondary"> = {
  critical: "danger",
  high: "warning",
  medium: "info",
  low: "secondary",
  on_track: "success",
};

const CLASSIFICATION_VARIANT: Record<string, "success" | "danger" | "warning" | "secondary"> = {
  classified: "success",
  disputed: "danger",
  exempted: "warning",
  unclassified: "secondary",
};

const isNotFound = (error: Error | null): boolean => error instanceof ApiError && error.status === 404;

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [activeTab, setActiveTab] = useState("overview");

  const detail = useRequiredApi(() => getProject(projectId!), [projectId]);
  const parcels = useRequiredApi(
    () => listParcels({ projectId: projectId!, includeGeometry: true, limit: 100 }),
    [projectId],
  );
  const audit = useRequiredApi(
    () => listAuditEvents({ entityType: "project", entityId: projectId!, limit: 20 }),
    [projectId],
  );
  const workflow = useRequiredApi(() => getWorkflowInstance("project", projectId!), [projectId]);
  const documents = useRequiredApi(
    () => listDocuments({ entityType: "project", entityId: projectId!, limit: 50 }),
    [projectId],
  );

  if (detail.error && isNotFound(detail.error)) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm">
          <Link to="/app/admin/monitoring"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Monitoring</Link>
        </Button>
        <Card>
          <CardContent className="p-12 text-center">
            <Files className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-600">Project not found</p>
            <p className="text-xs text-muted-foreground mt-1">The project {projectId} does not exist in the database.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (detail.error) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm">
          <Link to="/app/admin/monitoring"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Monitoring</Link>
        </Button>
        <ApiErrorState error={detail.error} onRetry={detail.reload} label="Unable to load this project." />
      </div>
    );
  }

  if (!detail.data) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm">
          <Link to="/app/admin/monitoring"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Monitoring</Link>
        </Button>
        <ApiLoadingState label="Loading project…" />
      </div>
    );
  }

  const project = detail.data;
  const stage = project.currentWorkflowStage as LifecycleStage;
  const projectParcels = parcels.data?.items ?? [];
  const projectDocs = documents.data?.items ?? [];
  const projectAudit = audit.data?.items ?? [];
  const budget = project.budgetCr !== null ? `₹${project.budgetCr.toLocaleString("en-IN")} Cr` : "—";

  return (
    <div className="space-y-5">
      {/* Back link */}
      <Button asChild variant="ghost" size="sm">
        <Link to="/app/admin/monitoring"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Monitoring</Link>
      </Button>

      {/* Project Header */}
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="gov-mono text-muted-foreground">{project.projectCode}</span>
                <Badge variant={RISK_VARIANT[project.risk]} className="text-[10px] capitalize">
                  {project.risk === "on_track" ? "On Track" : project.risk}
                </Badge>
              </div>
              <h1 className="text-lg font-semibold tracking-tight text-[#0F2340]">{project.projectName}</h1>
              <div className="flex flex-wrap gap-4 mt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> {project.ministry ?? "—"}</span>
                <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {project.state}, {project.district}</span>
                <span className="flex items-center gap-1"><Files className="h-3.5 w-3.5" /> {project.parcelCount.toLocaleString("en-IN")} parcels</span>
                <span className="flex items-center gap-1"><IndianRupee className="h-3.5 w-3.5" /> {budget}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Current Stage</p>
              <Badge variant="secondary" className="text-xs mt-1">{stageShortLabel(stage)}</Badge>
              <p className="text-xs text-muted-foreground mt-1">Progress: {stageProgress(stage)}%</p>
            </div>
          </div>

          {/* Stage Stepper */}
          <div className="mt-4 pt-4 border-t">
            <StageStepper currentStageId={stage} size="sm" />
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-9">
          {["overview", "map", "parcels", "workflow", "documents", "stakeholders", "objections", "compensation", "possession", "rr", "grievances", "audit"].map((tab) => (
            <TabsTrigger key={tab} value={tab} className="text-[11px] capitalize px-3">
              {tab === "rr" ? "R&R" : tab}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Project Details</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Implementing Agency</span><span className="font-medium">{project.requiringOrganizationName ?? "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Ministry</span><span className="font-medium">{project.ministry ?? "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">State</span><span className="font-medium">{project.state}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">District</span><span className="font-medium">{project.district}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Budget</span><span className="font-medium">{budget}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Last Activity</span><span className="font-medium">{formatDate(project.lastActivityAt)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Days in Stage</span><span className="font-medium">{Math.round(project.daysInStage)} (SLA {project.stageSlaDays}d)</span></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Statistics</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-md bg-slate-50 p-3 text-center"><p className="text-2xl font-bold text-[#0F2340]">{project.parcelCount.toLocaleString("en-IN")}</p><p className="text-[11px] text-muted-foreground">Total Parcels</p></div>
                  <div className="rounded-md bg-slate-50 p-3 text-center"><p className="text-2xl font-bold text-emerald-600">{stageProgress(stage)}%</p><p className="text-[11px] text-muted-foreground">Progress</p></div>
                  <div className="rounded-md bg-slate-50 p-3 text-center"><p className="text-2xl font-bold text-[#B42318]">{project.risk === "critical" || project.risk === "high" ? "Yes" : "No"}</p><p className="text-[11px] text-muted-foreground">At Risk</p></div>
                  <div className="rounded-md bg-slate-50 p-3 text-center"><p className="text-2xl font-bold text-[#0F2340]">{project.budgetCr !== null ? project.budgetCr.toLocaleString("en-IN") : "—"}</p><p className="text-[11px] text-muted-foreground">Budget (₹ Cr)</p></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="parcels" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {parcels.error ? (
                <ApiErrorState error={parcels.error} onRetry={parcels.reload} label="Unable to load parcels." />
              ) : !parcels.data && parcels.loading ? (
                <ApiLoadingState label="Loading parcels…" />
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b">
                          <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase text-muted-foreground">Survey No</th>
                          <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase text-muted-foreground">Village</th>
                          <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase text-muted-foreground">Owner</th>
                          <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase text-muted-foreground">Land Type</th>
                          <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase text-muted-foreground">Area (Ha)</th>
                          <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase text-muted-foreground">Compensation</th>
                          <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase text-muted-foreground">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {projectParcels.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50">
                            <td className="px-3 py-2.5 gov-mono text-[#0F2340]">
                              {p.surveyNumber}{p.subdivisionNumber ? `/${p.subdivisionNumber}` : ""}
                              {p.ulpin && <span className="block text-[10px] text-muted-foreground">{p.ulpin}</span>}
                            </td>
                            <td className="px-3 py-2.5 text-xs">{p.village ?? "—"}</td>
                            <td className="px-3 py-2.5 text-xs text-muted-foreground" title="No owner register is connected to this system yet">—</td>
                            <td className="px-3 py-2.5"><Badge variant="secondary" className="text-[10px]">{p.landType ?? "—"}</Badge></td>
                            <td className="px-3 py-2.5 text-right text-xs">{p.areaHa ?? "—"}</td>
                            <td className="px-3 py-2.5 text-right text-xs font-medium text-muted-foreground" title="No compensation register is connected to this system yet">—</td>
                            <td className="px-3 py-2.5">
                              <Badge variant={CLASSIFICATION_VARIANT[p.classificationStatus] ?? "secondary"} className="text-[10px] capitalize">
                                {p.classificationStatus}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {projectParcels.length === 0 && (
                    <div className="p-6 text-center text-xs text-muted-foreground">No parcels are linked to this project yet.</div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workflow" className="mt-4">
          {workflow.error && isNotFound(workflow.error) ? (
            <Card>
              <CardContent className="p-12 text-center">
                <ScrollText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-600">No workflow instance recorded</p>
                <p className="text-xs text-muted-foreground mt-1">This project has no stage history in the workflow engine yet.</p>
              </CardContent>
            </Card>
          ) : workflow.error ? (
            <ApiErrorState error={workflow.error} onRetry={workflow.reload} label="Unable to load the workflow history." />
          ) : !workflow.data && workflow.loading ? (
            <ApiLoadingState label="Loading workflow history…" />
          ) : workflow.data ? (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Stage History</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                  <span>Current stage: <span className="font-medium text-slate-700">{stageShortLabel(workflow.data.currentStage as LifecycleStage)}</span></span>
                  <span>Status: <span className="font-medium text-slate-700 capitalize">{workflow.data.status}</span></span>
                  <span>Owner role: <span className="font-medium text-slate-700">{workflow.data.ownerRoleLabel ?? "—"}</span></span>
                  <span>Stage entered: <span className="font-medium text-slate-700">{formatDate(workflow.data.startedAt)}</span></span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b">
                        <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase text-muted-foreground">Timestamp</th>
                        <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase text-muted-foreground">Action</th>
                        <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase text-muted-foreground">Transition</th>
                        <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase text-muted-foreground">Actor</th>
                        <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase text-muted-foreground">Role</th>
                        <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase text-muted-foreground">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {workflow.data.transitions.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2.5 text-[11px] text-muted-foreground gov-mono">{formatDate(t.createdAt)}</td>
                          <td className="px-3 py-2.5 text-xs"><Badge variant="secondary" className="text-[10px]">{t.action}</Badge></td>
                          <td className="px-3 py-2.5 text-xs">
                            {t.fromStage ? `${stageShortLabel(t.fromStage as LifecycleStage)} → ` : ""}
                            {stageShortLabel(t.toStage as LifecycleStage)}
                          </td>
                          <td className="px-3 py-2.5 text-xs font-medium">{t.actorName ?? "—"}</td>
                          <td className="px-3 py-2.5 text-xs text-muted-foreground">{t.actorRoleLabel ?? "—"}</td>
                          <td className="px-3 py-2.5 text-xs text-muted-foreground">{t.reason ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {documents.error ? (
                <ApiErrorState error={documents.error} onRetry={documents.reload} label="Unable to load documents." />
              ) : !documents.data && documents.loading ? (
                <ApiLoadingState label="Loading documents…" />
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b">
                          <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase text-muted-foreground">Document</th>
                          <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase text-muted-foreground">Type</th>
                          <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase text-muted-foreground">Stage</th>
                          <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase text-muted-foreground">Uploaded By</th>
                          <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase text-muted-foreground">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {projectDocs.map((d) => (
                          <tr key={d.id} className="hover:bg-slate-50">
                            <td className="px-3 py-2.5 text-xs font-medium">{d.title}</td>
                            <td className="px-3 py-2.5"><Badge variant="secondary" className="text-[10px]">{d.documentType}</Badge></td>
                            <td className="px-3 py-2.5 text-xs">{d.stage ? stageShortLabel(d.stage as LifecycleStage) : "—"}</td>
                            <td className="px-3 py-2.5 text-xs">{d.uploadedByName ?? "—"}</td>
                            <td className="px-3 py-2.5"><Badge variant={d.verificationStatus === "verified" ? "success" : "warning"} className="text-[10px] capitalize">{d.verificationStatus}</Badge></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {projectDocs.length === 0 && (
                    <div className="p-6 text-center text-xs text-muted-foreground">No document metadata is recorded for this project yet.</div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {audit.error ? (
                <ApiErrorState error={audit.error} onRetry={audit.reload} label="Unable to load the audit trail." />
              ) : !audit.data && audit.loading ? (
                <ApiLoadingState label="Loading audit trail…" />
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b">
                          <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase text-muted-foreground">Timestamp</th>
                          <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase text-muted-foreground">Actor</th>
                          <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase text-muted-foreground">Action</th>
                          <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase text-muted-foreground">Prev</th>
                          <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase text-muted-foreground">New</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {projectAudit.map((a) => (
                          <tr key={a.id} className="hover:bg-slate-50">
                            <td className="px-3 py-2.5 text-[11px] text-muted-foreground gov-mono">{formatDate(a.timestamp)}</td>
                            <td className="px-3 py-2.5 text-xs font-medium">{a.actor}</td>
                            <td className="px-3 py-2.5 text-xs">{a.action}</td>
                            <td className="px-3 py-2.5 text-xs text-muted-foreground">{a.previousState ?? "—"}</td>
                            <td className="px-3 py-2.5 text-xs text-muted-foreground">{a.newState ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {projectAudit.length === 0 && (
                    <div className="p-6 text-center text-xs text-muted-foreground">No audit events are recorded for this project yet.</div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Placeholder tabs — no backing register exists in this build */}
        {["map", "stakeholders", "objections", "compensation", "possession", "rr", "grievances"].map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-4">
            <Card>
              <CardContent className="p-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 mx-auto mb-3">
                  {tab === "map" && <MapPin className="h-6 w-6 text-slate-400" />}
                  {tab === "stakeholders" && <Users className="h-6 w-6 text-slate-400" />}
                  {tab === "objections" && <MessageSquareWarning className="h-6 w-6 text-slate-400" />}
                  {tab === "compensation" && <IndianRupee className="h-6 w-6 text-slate-400" />}
                  {tab === "possession" && <Home className="h-6 w-6 text-slate-400" />}
                  {tab === "rr" && <Home className="h-6 w-6 text-slate-400" />}
                  {tab === "grievances" && <AlertTriangle className="h-6 w-6 text-slate-400" />}
                </div>
                <p className="text-sm font-medium text-slate-600 capitalize">{tab === "rr" ? "R&R" : tab}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {tab === "map" && "GIS parcel visualization — reuse national GIS for this project's parcels"}
                  {tab === "stakeholders" && "Stakeholder registry for this project"}
                  {tab === "objections" && "Objection register — view and track all filed objections"}
                  {tab === "compensation" && "Compensation assessment and disbursement details — no register connected yet"}
                  {tab === "possession" && "Possession status and certificates"}
                  {tab === "rr" && "Rehabilitation & Resettlement entitlements and status"}
                  {tab === "grievances" && "Grievance register for this project"}
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
