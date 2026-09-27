import { useState } from "react";
import {
  Building2,
  ExternalLink,
  Users,
  Files,
  CheckCircle2,
  Clock3,
  Ban,
  Eye,
  Edit,
  GitBranch,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ORGANIZATIONS, type Organization } from "@/features/admin/adminData";
import { listOrganizations, toOrganizationRow, useApiData } from "@/services/api";

const TYPE_LABELS: Record<string, string> = {
  central_ministry: "Central Ministry",
  state_dept: "State Department",
  requiring_org: "Requiring Organization",
  implementing_agency: "Implementing Agency",
  district_auth: "District Authority",
};

const STATUS_VARIANT: Record<string, "success" | "warning" | "danger"> = {
  active: "success",
  pending: "warning",
  suspended: "danger",
};

export function OrganizationsPage() {
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);

  const { data: organizations, source } = useApiData(
    async () => (await listOrganizations()).items.map(toOrganizationRow),
    ORGANIZATIONS,
  );

  const filtered = organizations.filter((o) => {
    if (typeFilter !== "all" && o.type !== typeFilter) return false;
    return true;
  });

  const totalActive = organizations.filter((o) => o.status === "active").length;
  const totalPending = organizations.filter((o) => o.status === "pending").length;
  const totalSuspended = organizations.filter((o) => o.status === "suspended").length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-[#0F2340]">Organizations</h1>
          <p className="text-xs text-muted-foreground">Manage government organizations, agencies, and authorities</p>
        </div>
        {source === "demo" && (
          <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-300 bg-amber-50">
            Demo data — API offline
          </Badge>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Total Organizations</p>
              <Building2 className="h-4 w-4 text-slate-500" />
            </div>
            <p className="mt-1 text-2xl font-bold text-[#0F2340]">{organizations.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Active</p>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="mt-1 text-2xl font-bold text-emerald-600">{totalActive}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Pending</p>
              <Clock3 className="h-4 w-4 text-amber-600" />
            </div>
            <p className="mt-1 text-2xl font-bold text-amber-600">{totalPending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Suspended</p>
              <Ban className="h-4 w-4 text-[#B42318]" />
            </div>
            <p className="mt-1 text-2xl font-bold text-[#B42318]">{totalSuspended}</p>
          </CardContent>
        </Card>
      </div>

      {/* Type filter */}
      <div className="flex gap-2 flex-wrap">
        {[
          { value: "all", label: "All" },
          { value: "central_ministry", label: "Central Ministries" },
          { value: "state_dept", label: "State Departments" },
          { value: "requiring_org", label: "Requiring Orgs" },
          { value: "implementing_agency", label: "Implementing Agencies" },
          { value: "district_auth", label: "District Authorities" },
        ].map((f) => (
          <Button
            key={f.value}
            variant={typeFilter === f.value ? "default" : "outline"}
            size="sm"
            onClick={() => setTypeFilter(f.value)}
            className="h-8 text-xs"
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b">
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Organization</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Type</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Parent</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Jurisdiction</th>
                  <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Projects</th>
                  <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Users</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((org) => (
                  <tr key={org.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-slate-800">{org.name}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge variant="secondary" className="text-[10px]">{TYPE_LABELS[org.type]}</Badge>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-slate-700">{org.parentOrg}</td>
                    <td className="px-3 py-2.5 text-xs text-slate-700">{org.jurisdiction}</td>
                    <td className="px-3 py-2.5 text-right text-xs font-medium">{org.projects}</td>
                    <td className="px-3 py-2.5 text-right text-xs font-medium">{org.users}</td>
                    <td className="px-3 py-2.5">
                      <Badge variant={STATUS_VARIANT[org.status]} className="text-[10px] capitalize">{org.status}</Badge>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px]" onClick={() => setSelectedOrg(org)}>
                          <Eye className="h-3 w-3 mr-1" /> View
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Detail dialog */}
      <Dialog open={!!selectedOrg} onOpenChange={() => setSelectedOrg(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm">{selectedOrg?.name}</DialogTitle>
          </DialogHeader>
          {selectedOrg && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] text-muted-foreground">Type</p>
                  <p className="font-medium">{TYPE_LABELS[selectedOrg.type]}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Status</p>
                  <Badge variant={STATUS_VARIANT[selectedOrg.status]} className="capitalize">{selectedOrg.status}</Badge>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Parent Organization</p>
                  <p className="font-medium">{selectedOrg.parentOrg}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Jurisdiction</p>
                  <p className="font-medium">{selectedOrg.jurisdiction}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Active Projects</p>
                  <p className="font-medium">{selectedOrg.projects}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Registered Users</p>
                  <p className="font-medium">{selectedOrg.users}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
