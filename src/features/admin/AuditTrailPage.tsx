import { useState } from "react";
import {
  Search,
  ScrollText,
  Clock,
  User,
  Shield,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ADMIN_AUDIT_TRAIL, type AdminAuditEntry } from "@/features/admin/adminData";
import { listAuditEvents, toAuditEntryRow, useApiData } from "@/services/api";
import { formatDateTime, formatDate } from "@/lib/format";

export function AuditTrailPage() {
  const [search, setSearch] = useState("");
  const [actorFilter, setActorFilter] = useState("all");
  const [selectedEvent, setSelectedEvent] = useState<AdminAuditEntry | null>(null);

  const { data: auditEvents, source } = useApiData(
    async () => (await listAuditEvents()).items.map(toAuditEntryRow),
    ADMIN_AUDIT_TRAIL,
  );

  const actors = [...new Set(auditEvents.map((e) => e.actor))].sort();

  const filtered = auditEvents.filter((e) => {
    if (search && !e.action.toLowerCase().includes(search.toLowerCase()) && !e.project.toLowerCase().includes(search.toLowerCase())) return false;
    if (actorFilter !== "all" && e.actor !== actorFilter) return false;
    return true;
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-[#0F2340]">System Audit Trail</h1>
          <p className="text-xs text-muted-foreground">Immutable log of all system actions — actor, state transition, justification</p>
        </div>
        <div className="flex items-center gap-2">
          {source === "demo" && (
            <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-300 bg-amber-50">
              Demo data — API offline
            </Badge>
          )}
          <Badge variant="secondary" className="text-[11px]">
            <ScrollText className="h-3 w-3 mr-1" /> {auditEvents.length} events
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search actions, projects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
            <Select value={actorFilter} onValueChange={setActorFilter}>
              <SelectTrigger className="w-[200px] h-9 text-sm">
                <SelectValue placeholder="Filter by actor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actors</SelectItem>
                {actors.map((a) => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Audit Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b">
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Timestamp</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Actor</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Role</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Organization</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Action</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Project</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Prev State</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">New State</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Justification</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((entry) => (
                  <tr
                    key={entry.id}
                    className="hover:bg-slate-50 cursor-pointer"
                    onClick={() => setSelectedEvent(entry)}
                  >
                    <td className="px-3 py-2.5 text-[11px] text-muted-foreground whitespace-nowrap gov-mono">
                      {formatDateTime(entry.timestamp)}
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="text-xs font-medium text-slate-800">{entry.actor}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge variant="secondary" className="text-[10px]">{entry.role}</Badge>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-slate-700">{entry.organization}</td>
                    <td className="px-3 py-2.5">
                      <p className="text-xs font-medium text-slate-800 max-w-[200px]">{entry.action}</p>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-slate-700">{entry.project}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{entry.previousState ?? "—"}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{entry.newState ?? "—"}</td>
                    <td className="px-3 py-2.5 text-[11px] text-slate-600 max-w-[200px] truncate">{entry.justification}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm">Audit Event Detail</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-lg p-4 border">
                <p className="text-xs font-semibold text-[#0F2340] mb-2">Event Summary</p>
                <p className="text-sm font-medium">{selectedEvent.action}</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {formatDateTime(selectedEvent.timestamp)} · {selectedEvent.actor}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-[11px] text-muted-foreground">Actor</p>
                  <p className="font-medium">{selectedEvent.actor}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Role</p>
                  <Badge variant="secondary">{selectedEvent.role}</Badge>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Organization</p>
                  <p className="font-medium">{selectedEvent.organization}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Timestamp</p>
                  <p className="font-medium gov-mono">{formatDateTime(selectedEvent.timestamp)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Project</p>
                  <p className="font-medium">{selectedEvent.project}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">State Transition</p>
                  <p className="font-medium">
                    {selectedEvent.previousState ?? "—"}
                    {selectedEvent.previousState && selectedEvent.newState && (
                      <span className="text-muted-foreground"> → </span>
                    )}
                    {selectedEvent.newState ?? "—"}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-[11px] text-muted-foreground mb-1">Justification</p>
                <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-md border">
                  {selectedEvent.justification}
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                <p className="text-[11px] font-semibold text-amber-800 flex items-center gap-1">
                  <Shield className="h-3.5 w-3.5" /> Immutable Record
                </p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  This audit entry is permanent and cannot be modified or deleted. It forms part of the statutory compliance record.
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
