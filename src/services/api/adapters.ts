import type { AdminAuditEntry, AdminUser, Organization } from "@/features/admin/adminData";
import type { AuditEventDto, OrganizationDto, UserDto } from "./types";

/** API DTO → OrganizationsPage row shape. */
export function toOrganizationRow(dto: OrganizationDto): Organization {
  return {
    id: dto.id,
    name: dto.name,
    type: dto.type as Organization["type"],
    parentOrg: dto.parentOrg || "—",
    jurisdiction: dto.jurisdiction || "—",
    projects: dto.projects,
    users: dto.users,
    status: dto.status as Organization["status"],
  };
}

/** API DTO → UsersRolesPage row shape. */
export function toAdminUserRow(dto: UserDto): AdminUser {
  return {
    id: dto.id,
    name: dto.name,
    role: dto.role,
    organization: dto.organization,
    jurisdiction: dto.jurisdiction,
    parentAuthority: dto.parentAuthority,
    assignedProjects: dto.assignedProjects,
    status: dto.status as AdminUser["status"],
    lastActivity: dto.lastActivity.slice(0, 10),
  };
}

/** API DTO → AuditTrailPage row shape. */
export function toAuditEntryRow(dto: AuditEventDto): AdminAuditEntry {
  return {
    id: dto.id,
    timestamp: dto.timestamp,
    actor: dto.actor,
    role: dto.role,
    organization: dto.organization,
    action: dto.action,
    project: dto.project,
    previousState: dto.previousState,
    newState: dto.newState,
    justification: dto.justification ?? "—",
  };
}
