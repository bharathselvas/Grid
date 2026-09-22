import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, MapPin, Calendar, User, FileText, AlertTriangle, CheckCircle2, Clock, ShieldAlert } from "lucide-react";
import { useCaseStore } from "@/stores/caseStore";
import type { AdvanceResult } from "@/stores/caseStore";
import { useSessionStore } from "@/stores/sessionStore";
import { STAGE_BY_ID, nextStage } from "@/lib/stages";
import { formatDate, formatINR, slaBadge } from "@/lib/format";
import { MOCK_PARCELS } from "@/mocks/parcels";
import { MOCK_AUDIT, MOCK_DOCUMENTS, MOCK_OBJECTIONS } from "@/mocks/audit";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StageStepper } from "@/components/domain/StageStepper";

export function CaseDetailPage() {
  const { caseId } = useParams();
  const { cases, audit, advanceStage, completeSia, siaCompleted } = useCaseStore();
  const { user } = useSessionStore();
  const c = cases.find((x) => x.id === caseId);
  const [refusal, setRefusal] = useState<Extract<AdvanceResult, { ok: false }> | null>(null);

  if (!c) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/app/cases">
            <ArrowLeft className="h-4 w-4" /> Back to cases
          </Link>
        </Button>
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">Case not found.</CardContent>
        </Card>
      </div>
    );
  }

  const stageMeta = STAGE_BY_ID[c.stage];
  const nxt = nextStage(c.stage);
  const parcels = MOCK_PARCELS.filter((p) => p.caseId === c.id);
  const docs = MOCK_DOCUMENTS.filter((d) => d.caseId === c.id);
  const objections = MOCK_OBJECTIONS.filter((o) => o.caseId === c.id);
  const caseAudit = [...audit.filter((a) => a.caseId === c.id), ...MOCK_AUDIT.filter((a) => a.caseId === c.id && !audit.some((x) => x.id === a.id))]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 5);
  const sla = slaBadge(c.slaStatus);
  const siaIncomplete = c.stage === "sia" && !siaCompleted[c.id];

  return (
    <div className="space-y-4">
      <Dialog open={refusal !== null} onOpenChange={(open) => !open && setRefusal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#B42318]">
              <ShieldAlert className="h-5 w-5" /> ACTION BLOCKED
            </DialogTitle>
            <DialogDescription>
              {refusal?.code === "sia_gate" ? (
                <span className="space-y-2 block">
                  <span className="block text-sm font-medium text-slate-800">
                    Required prerequisite: <span className="gov-mono">SIA</span>
                  </span>
                  <span className="block text-sm font-medium text-[#B42318]">
                    Status: <span className="gov-mono">INCOMPLETE</span>
                  </span>
                  <span className="block text-sm text-muted-foreground">
                    Complete the required SIA assessment before advancing this case.
                  </span>
                </span>
              ) : (
                refusal?.reason
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            {refusal?.code === "sia_gate" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  completeSia(c.id, user.name, user.roleId);
                  setRefusal(null);
                }}
              >
                Complete SIA prerequisite
              </Button>
            )}
            <Button size="sm" onClick={() => setRefusal(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Button variant="ghost" size="sm" asChild>
        <Link to="/app/cases">
          <ArrowLeft className="h-4 w-4" /> Back to cases
        </Link>
      </Button>

      {/* Top: CaseNo + Project title, jurisdiction line, StageStepper */}
      <div className="rounded-lg border bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="gov-mono text-[#0F2340]">{c.caseNo}</p>
            <h1 className="text-base font-semibold text-slate-900">{c.title}</h1>
            <p className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {c.jurisdiction.state} · {c.jurisdiction.district} · {c.jurisdiction.tehsil} ·{" "}
                {c.jurisdiction.village}
              </span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> Created {formatDate(c.createdAt)} · Updated {formatDate(c.updatedAt)}
              </span>
              <span className="inline-flex items-center gap-1">
                <User className="h-3.5 w-3.5" /> Assignee: {c.assigneeName}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="capitalize">
              {c.stage.replace(/_/g, " ")}
            </Badge>
            <Badge variant={sla.variant as never}>{sla.label}</Badge>
            <Badge variant="outline" className="capitalize">
              {c.status}
            </Badge>
          </div>
        </div>
        <StageStepper currentStageId={c.stage} className="mt-4" />
        {stageMeta && (
          <p className="mt-2 text-xs text-muted-foreground">
            Current: <span className="font-medium text-slate-700">{stageMeta.label}</span> — {stageMeta.statutoryRef} · SLA {stageMeta.slaDays} days · Responsible:{" "}
            {stageMeta.responsibleRoles.join(", ").replace(/_/g, " ")}
          </p>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left 2/3 — stage panel + parcels + objections/documents */}
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Stage Action (mock)</CardTitle>
              <CardDescription>
                {stageMeta?.label} — {stageMeta?.statutoryRef}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-700">
                This is a <span className="font-medium">stateful mock</span>: advancing the stage updates the case, writes an audit event, and is
                visible across every role&apos;s workspace. Use it to walk the golden path.
              </p>
              <div className="flex flex-wrap gap-2">
                {nxt ? (
                  <Button
                    size="sm"
                    onClick={() => {
                      const result = advanceStage(c.id, user.name, user.roleId);
                      if (!result.ok) setRefusal(result);
                    }}
                  >
                    Advance to {STAGE_BY_ID[nxt].shortLabel} (mock) →
                  </Button>
                ) : (
                  <Badge variant="success" className="gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Closed — no further transitions
                  </Badge>
                )}
                {siaIncomplete && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => completeSia(c.id, user.name, user.roleId)}
                  >
                    Complete SIA prerequisite
                  </Button>
                )}
                <Button variant="outline" size="sm" disabled>
                  Request clarification (later)
                </Button>
              </div>
              {siaIncomplete && (
                <p className="text-xs text-[#B42318]">
                  Gate active: advancing beyond SIA requires the SIA assessment prerequisite.
                </p>
              )}
              {nxt && (
                <p className="text-xs text-muted-foreground">
                  Next: {STAGE_BY_ID[nxt].label} — {STAGE_BY_ID[nxt].statutoryRef}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-sm">
                Parcels <Badge variant="muted">{parcels.length}</Badge>
              </CardTitle>
              <CardDescription>
                {c.areaHa} Ha total · {c.parcelsCount} parcels · {parcels.length ? `${parcels[0].village} + others` : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Survey No</th>
                      <th className="px-3 py-2 text-left font-medium">Village</th>
                      <th className="px-3 py-2 text-left font-medium">Owner</th>
                      <th className="px-3 py-2 text-right font-medium">Area</th>
                      <th className="px-3 py-2 text-left font-medium">Type</th>
                      <th className="px-3 py-2 text-right font-medium">Compensation</th>
                      <th className="px-3 py-2 text-left font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {parcels.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 gov-mono text-[#0F2340]">{p.surveyNo}</td>
                        <td className="px-3 py-2 text-xs">{p.village}</td>
                        <td className="px-3 py-2">
                          <span className="text-sm font-medium text-slate-800">{p.owner.name}</span>
                          <span className="block gov-mono text-xs text-muted-foreground">{p.owner.khataNo}</span>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-xs">{p.areaHa} Ha</td>
                        <td className="px-3 py-2 text-xs capitalize">{p.landType}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-xs">{formatINR(p.compensationAmount)}</td>
                        <td className="px-3 py-2">
                          <Badge
                            variant={p.compensationStatus === "paid" ? "success" : p.compensationStatus === "awarded" ? "info" : "muted"}
                            className="text-[11px] capitalize"
                          >
                            {p.compensationStatus}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                    {parcels.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-3 py-8 text-center text-sm text-muted-foreground">
                          No parcels linked (mock data gap).
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-slate-500" /> Documents
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {docs.map((d) => (
                  <div key={d.id} className="rounded-md border px-3 py-2">
                    <p className="line-clamp-1 text-xs font-medium text-slate-800">{d.title}</p>
                    <p className="gov-mono text-[11px] text-muted-foreground">
                      {d.fileName} · {d.sizeKb} KB
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatDate(d.date)} · {d.uploadedBy}
                      {d.verified ? (
                        <Badge variant="success" className="ml-2 text-[10px]">
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="warning" className="ml-2 text-[10px]">
                          Pending
                        </Badge>
                      )}
                    </p>
                  </div>
                ))}
                {docs.length === 0 && <p className="text-xs text-muted-foreground">No documents for this stage yet.</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-amber-600" /> Objections
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {objections.map((o) => (
                  <div key={o.id} className="rounded-md border px-3 py-2">
                    <p className="text-xs font-medium text-slate-800">{o.filedBy}</p>
                    <p className="line-clamp-2 text-xs text-slate-700">{o.grounds}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatDate(o.date)} ·{" "}
                      <Badge variant="muted" className="text-[10px] capitalize">
                        {o.status.replace(/_/g, " ")}
                      </Badge>
                    </p>
                  </div>
                ))}
                {objections.length === 0 && <p className="text-xs text-muted-foreground">No objections filed.</p>}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right 1/3 — metadata + audit preview + actions */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Case Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Case No</span> <span className="gov-mono font-medium">{c.caseNo}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Project</span> <span className="font-medium">{c.projectId}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Area</span> <span>{c.areaHa} Ha</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Amount sanctioned</span>{" "}
                <span>{c.amountSanctionedCr != null ? `₹ ${c.amountSanctionedCr} Cr` : "—"}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Priority</span>{" "}
                <Badge variant={c.priority === "critical" ? "danger" : c.priority === "urgent" ? "warning" : "muted"} className="text-[11px] capitalize">
                  {c.priority}
                </Badge>
              </div>
              <Separator />
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" /> SLA due {c.slaDueAt ? formatDate(c.slaDueAt) : "—"}
              </p>
              <div className="rounded-md border bg-slate-50 px-3 py-2">
                <p className="text-[11px] font-medium text-slate-700">Assignee</p>
                <p className="text-xs text-slate-800">{c.assigneeName}</p>
                <p className="gov-mono text-[11px] text-muted-foreground">{c.assigneeRoleId.replace(/_/g, " ")}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Audit Trail — last 5</CardTitle>
              <CardDescription>Shared ledger preview</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {caseAudit.map((e) => (
                <div key={e.id} className="border-l-2 border-slate-200 pl-3">
                  <p className="line-clamp-2 text-xs font-medium text-slate-800">{e.action}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {e.actorName} · {e.actorRole.replace(/_/g, " ")} · {formatDate(e.at.slice(0, 10))}
                  </p>
                  {e.before && e.after && <p className="gov-mono text-[11px] text-muted-foreground">{e.before} → {e.after}</p>}
                </div>
              ))}
              <Button asChild variant="ghost" size="sm" className="w-full">
                <Link to="/app/audit">View full audit</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                <Link to="/app/documents">Open documents vault →</Link>
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                <Link to="/app/gis">View parcels on GIS map →</Link>
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                <Link to="/app/audit">View audit trail →</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
