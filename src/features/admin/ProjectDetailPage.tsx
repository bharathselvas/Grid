import { useRef, useState } from "react";
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
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ApiError,
  advanceWorkflowStage,
  createAssignment,
  getProject,
  getWorkflowInstance,
  listAssignments,
  listAuditEvents,
  listDocuments,
  listParcels,
  listUsers,
  listWorkflowStages,
  releaseAssignment,
  useRequiredApi,
} from "@/services/api";
import type { UserDto } from "@/services/api";
import { ApiErrorState, ApiLoadingState } from "@/components/domain/ApiStates";
import { stageShortLabel, formatDate } from "@/lib/format";
import { stageProgress } from "@/lib/stages";
import { StageStepper } from "@/components/domain/StageStepper";
import { useSessionStore } from "@/stores/sessionStore";
import { roleLabel, type RoleId } from "@/types/rbac";
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

/**
 * Ownership role sets — mirrors server `assignments.service.ts`. The UI uses
 * them only to show/hide controls; every action is validated server-side.
 */
const ASSIGNOR_ROLES = ["national_admin", "state_nodal", "collector_cala", "tehsil_sdo"];
const PROJECT_OWNER_ROLES = ["state_nodal", "collector_cala", "tehsil_sdo"];

/**
 * Map a failed transition to safe, user-facing copy. Backend messages are
 * authored server-side (no stack traces); 403/404/5xx use fixed text.
 * `refresh` marks conflicts where the local view may be stale (409/404).
 */
function transitionFailure(error: unknown): { message: string; refresh: boolean } {
  if (error instanceof ApiError) {
    if (error.status === 403) {
      return { message: "You are not authorized to advance this workflow stage.", refresh: false };
    }
    if (error.status === 409) {
      return {
        message: error.message || "This workflow cannot be advanced from the current stage. Refresh the project and try again.",
        refresh: true,
      };
    }
    if (error.status === 400) {
      return { message: error.message || "The transition request was invalid. Refresh and try again.", refresh: false };
    }
    if (error.status === 404) {
      return { message: "Workflow instance not found. Refresh the project and try again.", refresh: true };
    }
  }
  return { message: "Unable to advance the workflow right now. Please try again.", refresh: false };
}

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
  // Canonical workflow definition from the backend — next stage + stage
  // ownership are derived from this, never invented client-side.
  const stageDefs = useRequiredApi(() => listWorkflowStages(), []);
  const sessionRole = useSessionStore((s) => s.roleId);
  const sessionUser = useSessionStore((s) => s.user);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Synchronous guard: React state batches, so a double-click inside one task
  // could slip past `submitting`. A ref flips immediately — at most one
  // transition request is ever in flight.
  const advanceInFlight = useRef(false);
  const [actionError, setActionError] = useState<{ message: string; refresh: boolean } | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // ── Operational ownership (Task #4) ────────────────────────────────────────
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState("");
  const [assignReason, setAssignReason] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [ownershipMessage, setOwnershipMessage] = useState<string | null>(null);
  const [targetUsers, setTargetUsers] = useState<UserDto[] | null>(null);
  const [targetsLoading, setTargetsLoading] = useState(false);
  const [releaseConfirm, setReleaseConfirm] = useState(false);

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

  // ── Advance Stage derivation — backend workflow definition is authoritative ──
  const defs = stageDefs.data?.stages ?? [];
  const instance = workflow.data;
  const currentDef = instance ? defs.find((s) => s.id === instance.currentStage) : undefined;
  const nextDef = currentDef ? defs.find((s) => s.order === currentDef.order + 1) : undefined;
  const ownerLabels = currentDef ? currentDef.ownerRoles.map((r) => roleLabel(r as RoleId)).join(", ") : "—";
  const workflowComplete = instance?.status === "completed" || (!!currentDef && defs.length > 0 && !nextDef);
  const ownsCurrentStage = !!currentDef && currentDef.ownerRoles.includes(sessionRole);
  const canAdvance =
    !!instance &&
    !!currentDef &&
    !!nextDef &&
    instance.status === "active" &&
    ownsCurrentStage &&
    !stageDefs.loading &&
    !workflow.loading &&
    !submitting;

  const refreshProjectData = () => {
    detail.reload();
    workflow.reload();
    audit.reload();
  };

  const canAssign = ASSIGNOR_ROLES.includes(sessionRole);

  const openAssign = async () => {
    setAssignError(null);
    setAssignOpen(true);
    if (targetUsers) return;
    setTargetsLoading(true);
    try {
      const res = await listUsers({ status: "active", limit: 200 });
      setTargetUsers(res.items.filter((u) => PROJECT_OWNER_ROLES.includes(u.roleId)));
    } catch {
      setAssignError("Unable to load eligible users. Close and reopen the dialog to retry.");
    } finally {
      setTargetsLoading(false);
    }
  };

  const runAssign = async () => {
    if (!assignTarget || assigning) return;
    setAssigning(true);
    setAssignError(null);
    try {
      const created = await createAssignment({
        entityType: "project",
        entityId: project.id,
        assignedToUserId: assignTarget,
        reason: assignReason.trim() || undefined,
      });
      setAssignOpen(false);
      setAssignTarget("");
      setAssignReason("");
      setOwnershipMessage(
        `Operational ownership assigned to ${created.assignedToName} (${created.assignedRoleLabel}) — assignment row and audit event committed together.`,
      );
      detail.reload();
    } catch (error) {
      setAssignError(
        error instanceof ApiError ? error.message : "Unable to assign ownership right now. Please try again.",
      );
    } finally {
      setAssigning(false);
    }
  };

  const runRelease = async () => {
    if (assigning) return;
    setAssigning(true);
    setAssignError(null);
    try {
      const active = await listAssignments({
        entityType: "project",
        entityId: project.id,
        status: "active",
        limit: 1,
      });
      const row = active.items[0];
      if (!row) {
        setReleaseConfirm(false);
        detail.reload();
        return;
      }
      await releaseAssignment(row.id, "Operational ownership released from the project detail page.");
      setReleaseConfirm(false);
      setOwnershipMessage(
        `Operational ownership released — ${row.assignedToName} no longer owns this project. The history is preserved in the audit trail.`,
      );
      detail.reload();
    } catch (error) {
      setAssignError(
        error instanceof ApiError ? error.message : "Unable to release ownership right now. Please try again.",
      );
    } finally {
      setAssigning(false);
    }
  };

  const runAdvance = async () => {
    if (advanceInFlight.current || submitting || !instance || !nextDef) return;
    advanceInFlight.current = true;
    setSubmitting(true);
    setActionError(null);
    try {
      await advanceWorkflowStage(instance.id, { toStage: nextDef.id });
      setConfirmOpen(false);
      setSuccessMessage(
        `Stage advanced to ${nextDef.label}. Project record, stage history and audit trail reloaded from the database.`,
      );
      refreshProjectData();
    } catch (error) {
      setActionError(transitionFailure(error));
    } finally {
      advanceInFlight.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Advance stage confirmation — statutory transitions are never one-click */}
      <Dialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (submitting) return;
          setConfirmOpen(open);
          if (!open) setActionError(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Advance Workflow Stage</DialogTitle>
            <DialogDescription>
              <span className="block space-y-1.5">
                <span className="block text-sm text-slate-700">
                  Current stage: <span className="font-medium">{currentDef?.label ?? stageShortLabel(stage)}</span>
                </span>
                <span className="block text-sm text-slate-700">
                  Next stage: <span className="font-medium">{nextDef?.label ?? "—"}</span>
                </span>
                <span className="block text-xs text-muted-foreground">
                  This will move the project workflow forward and create an auditable workflow transition.
                </span>
              </span>
            </DialogDescription>
          </DialogHeader>
          {actionError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-[#B42318]" role="alert">
              {actionError.message}
            </div>
          )}
          <DialogFooter className="gap-2 sm:justify-end">
            {actionError?.refresh && (
              <Button
                variant="ghost"
                size="sm"
                disabled={submitting}
                onClick={() => {
                  setConfirmOpen(false);
                  setActionError(null);
                  refreshProjectData();
                }}
              >
                Refresh data
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={submitting}
              onClick={() => {
                setConfirmOpen(false);
                setActionError(null);
              }}
            >
              Cancel
            </Button>
            <Button size="sm" disabled={submitting} onClick={runAdvance}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Advancing…
                </>
              ) : (
                "Advance Stage"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign operational ownership — assignment + audit commit server-side */}
      <Dialog
        open={assignOpen}
        onOpenChange={(open) => {
          if (assigning) return;
          setAssignOpen(open);
          if (!open) setAssignError(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Operational Ownership</DialogTitle>
            <DialogDescription>
              The assignment row and its audit event are written in one transaction. Organization and
              jurisdiction are resolved from the target user&apos;s database record, not from this form.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Eligible officer</Label>
              <Select value={assignTarget} onValueChange={setAssignTarget}>
                <SelectTrigger className="h-9 text-sm mt-1">
                  <SelectValue
                    placeholder={
                      targetsLoading ? "Loading eligible users…" : "Select a state nodal / collector / SDO"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {targetUsers?.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} — {u.role} · {u.jurisdiction}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {targetUsers && targetUsers.length === 0 && !targetsLoading && (
                <p className="text-xs text-muted-foreground mt-1">No eligible officers are available.</p>
              )}
            </div>
            <div>
              <Label className="text-xs">Reason (optional)</Label>
              <Input
                placeholder="e.g. Collector assumes ownership before the hearing"
                className="h-9 text-sm mt-1"
                value={assignReason}
                onChange={(e) => setAssignReason(e.target.value)}
                maxLength={500}
              />
            </div>
            {assignError && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-[#B42318]" role="alert">
                {assignError}
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              variant="outline"
              size="sm"
              disabled={assigning}
              onClick={() => {
                setAssignOpen(false);
                setAssignError(null);
              }}
            >
              Cancel
            </Button>
            <Button size="sm" disabled={assigning || !assignTarget || targetsLoading} onClick={runAssign}>
              {assigning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Assigning…
                </>
              ) : (
                "Assign Owner"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

            {/* Responsibility & operational ownership — real assignment rows (Task #4) */}
            <Card className="md:col-span-2">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm">Responsibility &amp; Ownership</CardTitle>
                {project.operationalOwner ? (
                  <Badge variant="success" className="text-[10px]">Operational owner assigned</Badge>
                ) : (
                  <Badge variant="warning" className="text-[10px]">No operational owner</Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Land required by</span>
                    <span className="font-medium text-right">{project.requiringOrganizationName ?? "—"}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Work jurisdiction</span>
                    <span className="font-medium text-right">
                      {project.jurisdictionName ?? `${project.district}, ${project.state}`}
                    </span>
                  </div>
                </div>

                {project.operationalOwner ? (
                  <div className="rounded-md border border-emerald-200 bg-emerald-50/60 px-3 py-2.5 space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Operational owner
                    </p>
                    <p className="text-sm font-medium text-slate-800">
                      {project.operationalOwner.name}
                      <span className="font-normal text-muted-foreground"> — {project.operationalOwner.roleLabel}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {project.operationalOwner.organization ?? "—"} · {project.operationalOwner.jurisdiction ?? "—"} ·
                      assigned {formatDate(project.operationalOwner.assignedAt)}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed px-3 py-2.5">
                    <p className="text-sm font-medium text-slate-700">No operational owner yet</p>
                    <p className="text-xs text-muted-foreground">
                      Monitoring is still available to oversight roles — assign an officer to make ownership
                      explicit in the audit trail.
                    </p>
                  </div>
                )}

                {ownershipMessage && (
                  <div
                    className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800"
                    role="status"
                  >
                    {ownershipMessage}
                  </div>
                )}
                {assignError && !assignOpen && (
                  <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-[#B42318]" role="alert">
                    {assignError}
                  </div>
                )}

                {canAssign ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {!project.operationalOwner ? (
                      <Button size="sm" onClick={openAssign} disabled={targetsLoading && assignOpen}>
                        <Users className="h-4 w-4 mr-1" /> Assign owner…
                      </Button>
                    ) : releaseConfirm ? (
                      <>
                        <Button variant="outline" size="sm" disabled={assigning} onClick={() => setReleaseConfirm(false)}>
                          Cancel
                        </Button>
                        <Button size="sm" disabled={assigning} onClick={runRelease}>
                          {assigning ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" /> Releasing…
                            </>
                          ) : (
                            "Confirm release"
                          )}
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setReleaseConfirm(true);
                          setAssignError(null);
                        }}
                      >
                        Release ownership
                      </Button>
                    )}
                    <p className="text-[11px] text-muted-foreground">
                      Assignors: National Admin, State Nodal, Collector/CALA, Tehsil SDO — enforced server-side.
                    </p>
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    Your role cannot change operational ownership — ask an assigning authority (National Admin,
                    State Nodal, Collector/CALA or Tehsil SDO).
                  </p>
                )}
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
                  <span>SLA: <span className="font-medium text-slate-700">{project.stageSlaDays}d</span></span>
                  <span>Days in stage: <span className="font-medium text-slate-700">{Math.round(project.daysInStage)}d</span></span>
                </div>

                {successMessage && (
                  <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800" role="status">
                    {successMessage}
                  </div>
                )}

                {/* Advance Stage action — validated by the backend, never locally */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-slate-50 px-3 py-2.5">
                  <div className="space-y-0.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Next Stage</p>
                    {stageDefs.error ? (
                      <p className="text-xs text-[#B42318]">
                        Workflow definition unavailable — cannot determine the next stage.{" "}
                        <button type="button" className="underline" onClick={stageDefs.reload}>
                          Retry
                        </button>
                      </p>
                    ) : nextDef ? (
                      <p className="text-sm font-medium text-[#0F2340]">
                        {nextDef.label}
                        <span className="ml-2 text-[11px] font-normal text-muted-foreground">SLA {nextDef.slaDays}d</span>
                      </p>
                    ) : (
                      <p className="text-sm font-medium text-slate-500">—</p>
                    )}
                    <p className="text-[11px] text-muted-foreground">
                      Responsible: {ownerLabels} · Current actor: {sessionUser.name} ({roleLabel(sessionRole)})
                    </p>
                  </div>
                  <div>
                    {workflowComplete ? (
                      <Badge variant="success" className="gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Workflow Complete
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        disabled={!canAdvance}
                        onClick={() => {
                          setActionError(null);
                          setSuccessMessage(null);
                          setConfirmOpen(true);
                        }}
                      >
                        {nextDef ? `Advance to ${nextDef.shortLabel}` : "Advance Stage"}
                      </Button>
                    )}
                  </div>
                </div>
                {!workflowComplete && instance && nextDef && !ownsCurrentStage && (
                  <p className="text-xs text-muted-foreground">
                    Only {ownerLabels} can advance the current stage — your session role ({roleLabel(sessionRole)}) is not
                    an owner. The backend rejects unauthorized transitions as well.
                  </p>
                )}

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
