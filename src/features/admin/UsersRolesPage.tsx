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
import {
  ApiError,
  createUser,
  listJurisdictions,
  listOrganizations,
  listRoles,
  listUsers,
  toAdminUserRow,
  useApiData,
} from "@/services/api";
import type { JurisdictionDto, OrganizationDto, RoleDto } from "@/services/api";
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

  // ── Provisioning (Task #4: real POST /api/users, validated server-side) ──
  const emptyForm = {
    name: "",
    email: "",
    designation: "",
    roleId: "",
    organizationId: "",
    jurisdictionId: "",
    status: "active",
  };
  const [provisionForm, setProvisionForm] = useState(emptyForm);
  const [referenceData, setReferenceData] = useState<{
    roles: RoleDto[];
    organizations: OrganizationDto[];
    jurisdictions: JurisdictionDto[];
  } | null>(null);
  const [referenceLoading, setReferenceLoading] = useState(false);
  const [provisioning, setProvisioning] = useState(false);
  const [provisionError, setProvisionError] = useState<string | null>(null);
  const [provisioned, setProvisioned] = useState<string | null>(null);
  const [extraUsers, setExtraUsers] = useState<AdminUser[]>([]);

  const { data: baseUsers, source } = useApiData(
    async () => (await listUsers()).items.map(toAdminUserRow),
    ADMIN_USERS,
  );
  // Newly provisioned users join the list immediately (their rows are live).
  const adminUsers = extraUsers.length
    ? [...extraUsers, ...baseUsers.filter((b) => !extraUsers.some((e) => e.id === b.id))]
    : baseUsers;

  const openProvision = async () => {
    setProvisionError(null);
    setShowProvision(true);
    if (referenceData || referenceLoading) return;
    setReferenceLoading(true);
    try {
      const [rolesRes, orgsRes, jurisdictionsRes] = await Promise.all([
        listRoles(),
        listOrganizations(),
        listJurisdictions(),
      ]);
      setReferenceData({
        roles: rolesRes.items,
        organizations: orgsRes.items.filter((o) => o.status === "active"),
        jurisdictions: jurisdictionsRes.items,
      });
    } catch {
      setProvisionError("Unable to load roles, organizations and jurisdictions from the API. Close and reopen to retry.");
    } finally {
      setReferenceLoading(false);
    }
  };

  const runProvision = async () => {
    const f = provisionForm;
    if (!f.name.trim() || !f.email.trim() || !f.roleId || !f.organizationId || !f.jurisdictionId) {
      setProvisionError("Name, email, role, organization and jurisdiction are all required.");
      return;
    }
    setProvisioning(true);
    setProvisionError(null);
    try {
      const user = await createUser({
        name: f.name.trim(),
        email: f.email.trim(),
        designation: f.designation.trim() || undefined,
        roleId: f.roleId,
        organizationId: f.organizationId,
        jurisdictionId: f.jurisdictionId,
        status: f.status as "active" | "pending" | "suspended",
      });
      setExtraUsers((prev) => [toAdminUserRow(user), ...prev]);
      setShowProvision(false);
      setProvisionForm({ ...emptyForm });
      setProvisioned(
        `${user.name} provisioned — user row, role/organization/jurisdiction links and the USER_PROVISIONED audit event were written together.`,
      );
    } catch (error) {
      setProvisionError(
        error instanceof ApiError ? error.message : "Unable to provision the user right now. Please try again.",
      );
    } finally {
      setProvisioning(false);
    }
  };

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
          <Button size="sm" onClick={openProvision}>
            <Plus className="h-4 w-4 mr-1" /> Provision User
          </Button>
        </div>
      </div>

      {provisioned && (
        <div
          className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 flex items-start justify-between gap-3"
          role="status"
        >
          <span>{provisioned}</span>
          <button type="button" className="underline text-[11px] shrink-0" onClick={() => setProvisioned(null)}>
            Dismiss
          </button>
        </div>
      )}

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

      {/* Provision User Dialog — POST /api/users; every reference row is validated server-side */}
      <Dialog
        open={showProvision}
        onOpenChange={(open) => {
          if (provisioning) return;
          setShowProvision(open);
          if (!open) setProvisionError(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm">Provision New User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Name</Label>
              <Input
                placeholder="e.g. Shri. A. Kumar, IAS"
                className="h-9 text-sm mt-1"
                value={provisionForm.name}
                onChange={(e) => setProvisionForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input
                placeholder="e.g. a.kumar@gov.in"
                className="h-9 text-sm mt-1"
                value={provisionForm.email}
                onChange={(e) => setProvisionForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">Designation (optional)</Label>
              <Input
                placeholder="e.g. Tehsildar, Haveli"
                className="h-9 text-sm mt-1"
                value={provisionForm.designation}
                onChange={(e) => setProvisionForm((f) => ({ ...f, designation: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Organization</Label>
                <Select
                  value={provisionForm.organizationId}
                  onValueChange={(v) => setProvisionForm((f) => ({ ...f, organizationId: v }))}
                >
                  <SelectTrigger className="h-9 text-sm mt-1">
                    <SelectValue
                      placeholder={referenceLoading ? "Loading…" : "Select organization"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {referenceData?.organizations.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Role</Label>
                <Select
                  value={provisionForm.roleId}
                  onValueChange={(v) => setProvisionForm((f) => ({ ...f, roleId: v }))}
                >
                  <SelectTrigger className="h-9 text-sm mt-1">
                    <SelectValue placeholder={referenceLoading ? "Loading…" : "Select role"} />
                  </SelectTrigger>
                  <SelectContent>
                    {referenceData?.roles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Jurisdiction</Label>
              <Select
                value={provisionForm.jurisdictionId}
                onValueChange={(v) => setProvisionForm((f) => ({ ...f, jurisdictionId: v }))}
              >
                <SelectTrigger className="h-9 text-sm mt-1">
                  <SelectValue placeholder={referenceLoading ? "Loading…" : "Select jurisdiction"} />
                </SelectTrigger>
                <SelectContent>
                  {referenceData?.jurisdictions.map((j) => (
                    <SelectItem key={j.id} value={j.id}>
                      {j.name} ({j.level})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select
                value={provisionForm.status}
                onValueChange={(v) => setProvisionForm((f) => ({ ...f, status: v }))}
              >
                <SelectTrigger className="h-9 text-sm mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-[11px] text-muted-foreground bg-slate-50 p-2 rounded">
              Role, organization and jurisdiction must already exist — the server validates each link and writes
              the user row together with a USER_PROVISIONED audit event. Parent authority is derived from the
              organization hierarchy, not entered by hand.
            </p>
            {provisionError && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-[#B42318]" role="alert">
                {provisionError}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              disabled={provisioning}
              onClick={() => {
                setShowProvision(false);
                setProvisionError(null);
              }}
            >
              Cancel
            </Button>
            <Button size="sm" disabled={provisioning || referenceLoading} onClick={runProvision}>
              {provisioning ? "Provisioning…" : "Provision User"}
            </Button>
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
