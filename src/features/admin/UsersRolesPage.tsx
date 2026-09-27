import { useState } from "react";
import {
  Users,
  Plus,
  Eye,
  Edit,
  Clock3,
  CheckCircle2,
  Ban,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ADMIN_USERS, type AdminUser } from "@/features/admin/adminData";
import { listUsers, toAdminUserRow, useApiData } from "@/services/api";
import { formatDate } from "@/lib/format";

const STATUS_VARIANT: Record<string, "success" | "warning" | "danger"> = {
  active: "success",
  pending: "warning",
  suspended: "danger",
};

export function UsersRolesPage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [showProvision, setShowProvision] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  const { data: adminUsers, source } = useApiData(
    async () => (await listUsers()).items.map(toAdminUserRow),
    ADMIN_USERS,
  );

  const roles = [...new Set(adminUsers.map((u) => u.role))].sort();

  const filtered = adminUsers.filter((u) => {
    if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !u.organization.toLowerCase().includes(search.toLowerCase())) return false;
    if (roleFilter !== "all" && u.role !== roleFilter) return false;
    return true;
  });

  const totalActive = adminUsers.filter((u) => u.status === "active").length;
  const totalPending = adminUsers.filter((u) => u.status === "pending").length;
  const totalSuspended = adminUsers.filter((u) => u.status === "suspended").length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-[#0F2340]">Users & Roles</h1>
          <p className="text-xs text-muted-foreground">Manage system users and hierarchical role assignments</p>
        </div>
        <div className="flex items-center gap-2">
          {source === "demo" && (
            <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-300 bg-amber-50">
              Demo data — API offline
            </Badge>
          )}
          <Button size="sm" onClick={() => setShowProvision(true)}>
            <Plus className="h-4 w-4 mr-1" /> Provision User
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Total Users</p>
              <Users className="h-4 w-4 text-slate-500" />
            </div>
            <p className="mt-1 text-2xl font-bold text-[#0F2340]">{adminUsers.length}</p>
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

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Input
              placeholder="Search by name or organization..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 min-w-[200px] h-9 text-sm"
            />
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[200px] h-9 text-sm">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {roles.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b">
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Name</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Role</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Organization</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Jurisdiction</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Parent Authority</th>
                  <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Projects</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Last Activity</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedUser(u)}>
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-slate-800">{u.name}</p>
                      <p className="text-[11px] text-muted-foreground gov-mono">{u.id}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge variant="secondary" className="text-[10px]">{u.role}</Badge>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-slate-700">{u.organization}</td>
                    <td className="px-3 py-2.5 text-xs text-slate-700">{u.jurisdiction}</td>
                    <td className="px-3 py-2.5 text-xs text-slate-700">{u.parentAuthority}</td>
                    <td className="px-3 py-2.5 text-right text-xs font-medium">{u.assignedProjects}</td>
                    <td className="px-3 py-2.5">
                      <Badge variant={STATUS_VARIANT[u.status]} className="text-[10px] capitalize">{u.status}</Badge>
                    </td>
                    <td className="px-3 py-2.5 text-[11px] text-muted-foreground">{formatDate(u.lastActivity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Provision User Dialog */}
      <Dialog open={showProvision} onOpenChange={setShowProvision}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm">Provision New User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Name</Label>
              <Input placeholder="e.g. Shri. A. Kumar, IAS" className="h-9 text-sm mt-1" />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input placeholder="e.g. a.kumar@gov.in" className="h-9 text-sm mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Organization</Label>
                <Select>
                  <SelectTrigger className="h-9 text-sm mt-1">
                    <SelectValue placeholder="Select organization" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dolr">Dept. of Land Resources</SelectItem>
                    <SelectItem value="morth">MoRTH</SelectItem>
                    <SelectItem value="nhai">NHAI</SelectItem>
                    <SelectItem value="collectorate-pune">Collectorate, Pune</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Role</Label>
                <Select>
                  <SelectTrigger className="h-9 text-sm mt-1">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="national_admin">National Admin / DoLR</SelectItem>
                    <SelectItem value="ministry_nodal">Ministry Nodal Officer</SelectItem>
                    <SelectItem value="requiring_org">Requiring Organization</SelectItem>
                    <SelectItem value="state_nodal">State Nodal Officer</SelectItem>
                    <SelectItem value="collector_cala">District Collector / CALA</SelectItem>
                    <SelectItem value="tehsil_sdo">Tehsil / SDO</SelectItem>
                    <SelectItem value="field_officer">Field Officer / VAO</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Jurisdiction</Label>
              <Input placeholder="e.g. Pune District" className="h-9 text-sm mt-1" />
            </div>
            <div>
              <Label className="text-xs">Parent Authority</Label>
              <Input placeholder="e.g. State Nodal — Maharashtra" className="h-9 text-sm mt-1" />
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select defaultValue="active">
                <SelectTrigger className="h-9 text-sm mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-[11px] text-muted-foreground bg-slate-50 p-2 rounded">
              The UI reinforces hierarchical scope — users can only be assigned jurisdictions within their parent authority's scope.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowProvision(false)}>Cancel</Button>
            <Button size="sm" onClick={() => setShowProvision(false)}>Provision User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Detail Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm">{selectedUser?.name}</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] text-muted-foreground">Role</p>
                  <Badge variant="secondary">{selectedUser.role}</Badge>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Status</p>
                  <Badge variant={STATUS_VARIANT[selectedUser.status]} className="capitalize">{selectedUser.status}</Badge>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Organization</p>
                  <p className="font-medium">{selectedUser.organization}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Jurisdiction</p>
                  <p className="font-medium">{selectedUser.jurisdiction}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Parent Authority</p>
                  <p className="font-medium">{selectedUser.parentAuthority}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Assigned Projects</p>
                  <p className="font-medium">{selectedUser.assignedProjects}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
