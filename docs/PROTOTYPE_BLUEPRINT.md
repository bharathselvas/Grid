# BHOOMI SETU — PROTOTYPE RECONSTRUCTION BLUEPRINT

> Generated: 2026-09-10
> Statutory Basis: Right to Fair Compensation and Transparency in Land Acquisition, Rehabilitation and Resettlement Act, 2013 (RFCTLARR Act)
> Status: DRAFT — Requires approval before implementation

---

## TABLE OF CONTENTS

1. [What Exists Today](#1-what-exists-today)
2. [Current 11 Roles](#2-current-11-roles)
3. [Corrected Role Hierarchy](#3-corrected-role-hierarchy)
4. [Portal Structure](#4-portal-structure)
5. [Complete Real-World Workflow](#5-complete-real-world-workflow)
6. [Workflow Gates](#6-workflow-gates)
7. [Role → Permission Matrix](#7-role--permission-matrix)
8. [Role → Workflow Stage Matrix](#8-role--workflow-stage-matrix)
9. [Entity & Data Model](#9-entity--data-model)
10. [Feature Disposition](#10-feature-disposition)
11. [Backend Modules](#11-backend-modules)
12. [Mobile Field App Modules](#12-mobile-field-app-modules)
13. [Public Portal Modules](#13-public-portal-modules)
14. [GIS Architecture](#14-gis-architecture)
15. [Document Architecture](#15-document-architecture)
16. [Compensation Architecture](#16-compensation-architecture)
17. [Audit Architecture](#17-audit-architecture)
18. [Notification Architecture](#18-notification-architecture)
19. [Testing Strategy](#19-testing-strategy)
20. [Prototype Implementation Order](#20-prototype-implementation-order)

---

## 1. WHAT EXISTS TODAY

### 1.1 Repository State

Bhoomi Setu V2 is a **frontend-only React SPA**. There is no backend, no database, no authentication, no API, and no server-side logic. Every page reads from hardcoded TypeScript mock objects.

**Tech Stack (Frontend Only)**:
- React 18.3 + TypeScript 5.6 + Vite 5
- Tailwind CSS 3.4 + shadcn/ui (Radix primitives)
- Zustand 4.5 (client-side state)
- React Router 6 (client-side routing)
- Leaflet 1.9 + React-Leaflet 4 (point markers only)
- Recharts 2.12 (dashboards)
- lucide-react (icons)

**What Works**:
- 11 role-based portals render correctly with distinct navigation
- Role switching via Zustand store (no auth)
- Mock data displays realistic land acquisition scenarios
- GIS page renders Leaflet map with point markers
- Dashboard pages show KPIs, charts, work queues
- Citizen portal has separate shell and public-facing design
- Workflow stepper shows lifecycle stages

**What Does Not Work**:
- Any URL is accessible by any role (no route guards)
- All data is hardcoded — no persistence, no API calls
- Two inconsistent workflow type systems coexist
- Three duplicate RBAC systems with naming mismatches
- GIS is marker-only — no polygon geometry, no spatial operations
- Document pages show metadata only — no upload/download
- Project creation form submits to nothing
- No offline support despite field officer pages
- SLA Watch widget has hardcoded text per role

### 1.2 Quantitative Inventory

| Metric | Count | Notes |
|--------|-------|-------|
| Total routes | ~310+ | Across 11 portals + citizen |
| Page components | ~250+ | Many near-duplicates across roles |
| Navigation configs | 10 | Separate object per role in Sidebar.tsx |
| Workflow systems | 2 | Incompatible stage enums |
| RBAC systems | 3 | Incompatible role name mappings |
| Mock data files | ~30+ | Per-role hardcoded TypeScript objects |
| API calls | 0 | Zero fetch/axios usage anywhere |
| Database tables | 0 | No backend exists |
| Test files | 0 | No tests exist |
| Git commits | 9 | Role-by-role development |

### 1.3 Critical Inconsistencies

**Workflow System A** (`src/lib/stages.ts`):
- Type: `LifecycleStage` (17 values like `preliminary_notification`, `public_disclosure`, `objections_hearing`)
- Used by: domain types, mock data, parcels, cases, documents
- Has stage metadata: statutory references, SLA days, responsible roles

**Workflow System B** (`src/features/demo/workflowTypes.ts`):
- Type: `WorkflowStage` (17 values like `section_11`, `disclosure`, `objections`)
- Used by: demo store, demo pages, project workspace
- Has gate-based transitions with prerequisites and owners

**These are the same 17 stages with different names.** System A uses statutory-accurate names; System B uses shorthand. The two systems cannot interoperate without a mapping layer.

**RBAC System 1** (`src/types/rbac.ts`): `canAccess()` + `jurisdictionFilter()` — uses `RoleId` from rbac.ts
**RBAC System 2** (`src/features/demo/demoPermissions.ts`): `hasDemoPermission()` — uses `DemoRole` (different names: `collector` vs `collector_cala`, `finance` vs `finance_officer`)
**RBAC System 3** (`src/features/demo/workflowEngine.ts`): `canRoleAdvance()` — uses `StageOwner` (yet another naming scheme: `cala`, `ro_ia`, `finance`)

---

## 2. CURRENT 11 ROLES

### 2.1 Role Inventory

| # | Role ID (rbac.ts) | Label | Level | Scope | Pages | Primary Function |
|---|-------------------|-------|-------|-------|-------|-----------------|
| 1 | `national_admin` | National Admin / DoLR | 1 | National | 14 | Cross-ministry oversight, audit, org management |
| 2 | `ministry_nodal` | Ministry Nodal Officer | 2 | Ministry | 18 | Ministry-level project monitoring, sanctions |
| 3 | `requiring_org` | Requiring Organization | 3 | Project | 16 | Project creation, submission, acquisition tracking |
| 4 | `state_nodal` | State Nodal Officer | 4 | State | 24 | State coordination, district routing |
| 5 | `collector_cala` | District Collector / CALA | 5 | District | 26 | Central statutory authority — scrutiny through closure |
| 6 | `tehsil_sdo` | Tehsil / SDO | 6 | Tehsil | 25 | Sub-division field coordination |
| 7 | `field_officer` | Field Officer / VAO | 7 | Village | 27 | Field verification, evidence, possession |
| 8 | `sia_expert` | SIA Expert Group | 8 | District | 22 | Independent Social Impact Assessment |
| 9 | `rnr_officer` | R&R Officer | 9 | District | 27 | Rehabilitation & Resettlement |
| 10 | `finance_officer` | Finance / Payment Officer | 10 | District | 20 | Compensation payment processing |
| 11 | `citizen` | Citizen / Landowner | 11 | Village | 20 | Track status, file objections, view notices |

### 2.2 Login Experience

There is **no login**. The landing page (`/`) shows a role gallery — clicking any role card switches the Zustand session store and redirects to `/app/overview`. The citizen portal (`/citizen`) has a separate shell with a mock login page that accepts any input.

### 2.3 Page Count by Portal

| Portal | Pages | Largest Category |
|--------|-------|-----------------|
| Admin | 14 | Dashboard, monitoring, org management |
| Ministry | 18 | Dashboard, monitoring, operational oversight |
| Requiring Org | 16 | Project creation, workspace, monitoring |
| State Nodal | 24 | Dashboard, district routing, operational monitoring |
| Collector | 26 | Command centre, statutory workflow, parcels |
| Tehsil | 25 | Work queue, field coordination, village records |
| Field Officer | 27 | Task flow, evidence capture, GPS/photo |
| SIA Expert | 22 | Assessment workflow, consultations, findings |
| R&R Officer | 27 | Case management, entitlements, sites |
| Finance | 20 | Payment processing, awards, reconciliation |
| Citizen | 20 | Public portal, case tracking, objections |

---

## 3. CORRECTED ROLE HIERARCHY

### 3.1 Statutory Authority Chain (RFCTLARR Act)

The RFCTLARR Act defines a clear chain of authority:

```
Central Government (DoLR)
  └── Ministry / Department (Requiring Ministry)
        └── Requiring Organisation (Project Proponent)
              └── State Government
                    └── State Nodal Officer (State Revenue Dept)
                          └── District Collector (as Land Acquisition Authority)
                                ├── Tehsil / SDO (Sub-divisional Officer)
                                │     └── Field Officer / VAO (Village Administrative Officer)
                                ├── SIA Expert Group (Independent)
                                ├── R&R Officer (District R&R Authority)
                                └── Finance Officer (District Treasury / PFMS)
```

**Citizens/Landowners** sit outside this chain — they are rights-holders, not administrators.

### 3.2 Hierarchy Levels

| Level | Role | Scope | Key Statutory Reference |
|-------|------|-------|------------------------|
| 1 | National Admin (DoLR) | National | RFCTLARR §48 — Monitoring by Central Govt |
| 2 | Ministry Nodal | Ministry | RFCTLARR §6 — Requiring Ministry involvement |
| 3 | Requiring Org | Project | RFCTLARR §4–§6 — Project proponent duties |
| 4 | State Nodal | State | RFCTLARR §48 — State monitoring |
| 5 | District Collector / CALA | District | RFCTLARR §7, §11, §19, §23, §31, §38 — Central authority |
| 6 | Tehsil / SDO | Tehsil | RFCTLARR §7(2) — Scrutiny support |
| 7 | Field Officer / VAO | Village | RFCTLARR §20 — Survey & measurement |
| 8 | SIA Expert Group | District | RFCTLARR Ch. II — Independent SIA |
| 9 | R&R Officer | District | RFCTLARR Ch. V–VI — R&R scheme |
| 10 | Finance Officer | District | RFCTLARR §31–§33 — Payment processing |
| 11 | Citizen / Landowner | Village | RFCTLARR §15, §17, §30 — Rights |

### 3.3 Key Correction: SIA Expert Group

The SIA Expert Group is **not** part of the government hierarchy. Under RFCTLARR §4, the SIA is conducted by an **independent expert group** appointed by the appropriate government. In the current prototype, `sia_expert` is placed at level 8 in the hierarchy, but it should be treated as an **external role** with time-bound access to a specific project during the SIA stage only.

**Correction**: SIA Expert Group gets project-scoped, stage-limited access. They do not see other projects. They cannot advance workflow stages beyond their own.

---

## 4. PORTAL STRUCTURE

### 4.1 Target Portal Map

```
┌─────────────────────────────────────────────────────────────────┐
│                    BHOOMI SETU PLATFORM                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐     │
│  │  OVERSIGHT    │  │  PROJECT     │  │  STATE           │     │
│  │  PORTAL       │  │  PROPONENT   │  │  PORTAL          │     │
│  │               │  │  PORTAL      │  │                  │     │
│  │  Admin +      │  │              │  │  State Nodal     │     │
│  │  Ministry     │  │  Requiring   │  │  Officer         │     │
│  │  (shared,     │  │  Org         │  │                  │     │
│  │  scope-filter)│  │              │  │                  │     │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘     │
│         │                 │                    │                │
│  ┌──────┴─────────────────┴────────────────────┴─────────┐     │
│  │              DISTRICT PORTAL (COLLECTOR)                │     │
│  │     Central Operational Hub — all statutory actions     │     │
│  └──────┬─────────────────┬──────────────────────────┬────┘     │
│         │                 │                          │          │
│  ┌──────┴───────┐  ┌─────┴────────┐  ┌──────────────┴──┐      │
│  │  TEHSIL      │  │  FIELD       │  │  SPECIALIST     │      │
│  │  PORTAL      │  │  OFFICER APP │  │  PORTALS        │      │
│  │              │  │  (Mobile)    │  │                  │      │
│  │  Coordination│  │              │  │  SIA / R&R /     │      │
│  │  & Oversight │  │  Task-first  │  │  Finance         │      │
│  └──────────────┘  │  PWA         │  └─────────────────┘      │
│                     └──────────────┘                            │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  CITIZEN PORTAL (Public)                  │  │
│  │       Separate shell — no government login required       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Portal Definitions

#### Portal 1: Oversight Portal (Admin + Ministry merged)

**Roles**: `national_admin`, `ministry_nodal`
**Route prefix**: `/app/oversight/*`
**Pages** (target: 8):

| Page | Purpose | Data Source |
|------|---------|-------------|
| OversightDashboardPage | National KPIs, project counts by stage | API aggregation |
| OversightProjectsPage | All projects with filters (ministry, state, stage) | API |
| OversightGisPage | National GIS — all projects, all parcels | PostGIS |
| OversightRiskPage | SLA violations, delays, risk flags | Computed from workflow state |
| OversightOrganizationsPage | Org hierarchy, user management | API |
| OversightAuditPage | National audit trail | Audit log |
| OversightDocumentsPage | Document repository across all projects | API |
| OversightReportsPage | MIS reports, PDF generation | API |

**Key difference from today**: Admin and Ministry share the same pages but with different scope filters. Admin sees all ministries; Ministry sees only their projects.

#### Portal 2: Requiring Organisation Portal

**Role**: `requiring_org`
**Route prefix**: `/app/ro/*`
**Pages** (target: 8):

| Page | Purpose | Data Source |
|------|---------|-------------|
| RoDashboardPage | My projects, work queue, KPIs | API |
| RoProjectsPage | Project list with status | API |
| RoCreateProjectPage | Multi-step project creation wizard | API (POST) |
| RoProjectWorkspacePage | Project detail with tabs (overview, workflow, parcels, documents, timeline) | API |
| RoGisPage | Project-specific GIS with parcel boundaries | PostGIS |
| RoDocumentsPage | Project documents, upload | File API |
| RoAuditPage | Project audit trail | Audit API |
| RoNotificationsPage | Project notifications | Notification API |

**Key difference from today**: CreateProjectPage actually persists to the backend. ProjectWorkspacePage uses tabs, not separate routes per sub-page.

#### Portal 3: State Portal

**Role**: `state_nodal`
**Route prefix**: `/app/state/*`
**Pages** (target: 10):

| Page | Purpose | Data Source |
|------|---------|-------------|
| StateDashboardPage | State KPIs, pipeline, district health | API |
| StateProjectsPage | Projects across all districts | API (state-scoped) |
| StateProjectDetailPage | Single project drill-down | API |
| StateDistrictPage | District-level monitoring | API |
| StateGisPage | State-wide GIS | PostGIS |
| StateTimelinePage | Statutory timeline monitoring | Computed |
| StateAuditPage | State audit trail | Audit API |
| StateDocumentsPage | State document repository | API |
| StateNotificationsPage | State notifications | Notification API |
| StateReportsPage | State MIS reports | API |

**Key difference from today**: State Nodal is a **monitoring** portal, not an operational duplicate. State cannot advance workflow stages (except routing). No SIA monitoring, no objection monitoring, no compensation monitoring — those are Collector's domain.

#### Portal 4: District Portal (Collector / CALA) — CENTRAL HUB

**Role**: `collector_cala`
**Route prefix**: `/app/collector/*`
**Pages** (target: 14):

| Page | Purpose | Data Source |
|------|---------|-------------|
| CollectorDashboardPage | Command centre — district KPIs, critical items | API |
| CollectorProjectsPage | District projects with pipeline | API |
| CollectorProjectWorkspacePage | Project detail — workflow, parcels, cases | API |
| CollectorScrutinyPage | Scrutiny review (§7) | API |
| CollectorNotificationPage | Issue Section 11(1) notification | API (POST) |
| CollectorObjectionsPage | Objection hearing management (§15) | API |
| CollectorDeclarationPage | Issue Section 19(1) declaration | API (POST) |
| CollectorFieldVerificationPage | Monitor field verification (§20) | API |
| CollectorCompensationPage | Compensation assessment (§26–§30) | API |
| CollectorAwardPage | Award order (§23/§37) | API |
| CollectorPossessionPage | Taking possession (§38) | API |
| CollectorGrievancePage | Grievance management | API |
| CollectorGisPage | District GIS with parcel polygons | PostGIS |
| CollectorAuditPage | District audit trail | Audit API |

**Key difference from today**: Collector is the **statutory authority** for the majority of workflow stages. This portal is the central operational hub. Pages are grouped by workflow stage, not by entity type.

#### Portal 5: Tehsil Portal

**Role**: `tehsil_sdo`
**Route prefix**: `/app/tehsil/*`
**Pages** (target: 8):

| Page | Purpose | Data Source |
|------|---------|-------------|
| TehsilDashboardPage | Tehsil KPIs, assigned work | API |
| TehsilProjectsPage | Projects in tehsil | API (tehsil-scoped) |
| TehsilFieldOfficersPage | FO assignment, coordination | API |
| TehsilVillagePage | Village register, land records | API |
| TehsilVerificationPage | Support field verification | API |
| TehsilGisPage | Tehsil GIS | PostGIS |
| TehsilDocumentsPage | Tehsil documents | API |
| TehsilAuditPage | Tehsil audit trail | Audit API |

**Key difference from today**: Tehsil is a **coordination** portal. Tehsil SDO oversees field officers and supports the Collector. No duplicate operational pages for compensation, possession, R&R — those are Collector's domain.

#### Portal 6: Field Officer App (Mobile PWA)

**Role**: `field_officer`
**Route prefix**: `/app/fo/*`
**Pages** (target: 8):

| Page | Purpose | Data Source |
|------|---------|-------------|
| FoHomePage | Today's tasks, quick stats | API |
| FoTasksPage | Task list (assigned, pending, completed) | API |
| FoTaskDetailPage | Task detail with sections: overview, GPS, photos, measurements, observations, owner verification, evidence, submit | API |
| FoMapPage | Field map with assigned parcels | PostGIS |
| FoDocumentsPage | Document upload per task | File API |
| FoNotificationsPage | Task notifications | Notification API |
| FoSyncPage | Offline sync status | LocalStorage + API |
| FoProfilePage | Profile, role info | API |

**Key difference from today**: 27 pages → 8 pages. The task detail page is a **tabbed workspace** containing: Overview, GPS Capture, Photo Gallery, Measurements, Observations, Owner Verification, Evidence, Submit. All are tabs within a single page, not separate routes.

**Mobile-first design**: Touch-friendly, large tap targets, camera integration, GPS auto-capture, offline queue with sync.

#### Portal 7: SIA Expert Portal

**Role**: `sia_expert`
**Route prefix**: `/app/sia/*`
**Pages** (target: 10):

| Page | Purpose | Data Source |
|------|---------|-------------|
| SiaDashboardPage | Assigned assessments, KPIs | API |
| SiaAssessmentsPage | Assessment list | API (project-scoped) |
| SiaAssessmentWorkspacePage | Assessment detail with tabs: Context, Families, Livelihood, Vulnerable, Consultations, Evidence, GIS, Findings, Report, Submit | API |
| SiaFamiliesPage | Affected family survey data | API |
| SiaConsultationPage | Gram Sabha / public consultation records | API |
| SiaGisMapPage | SIA-specific GIS overlay | PostGIS |
| SiaFindingsPage | Impact findings, mitigation measures | API |
| SiaReportPage | Draft report, version history, submission | API |
| SiaDocumentsPage | SIA documents | File API |
| SiaAuditPage | SIA audit trail | Audit API |

**Key difference from today**: 22 pages → 10 pages. AssessmentWorkspacePage uses tabs. SIA gets project-scoped, stage-limited access.

#### Portal 8: R&R Portal

**Role**: `rnr_officer`
**Route prefix**: `/app/rr/*`
**Pages** (target: 6):

| Page | Purpose | Data Source |
|------|---------|-------------|
| RrDashboardPage | R&R KPIs, active cases | API |
| RrCasesPage | R&R case list | API |
| RrCaseWorkspacePage | Case detail with tabs: Families, Entitlements (Housing, Subsistence, Transport, Livelihood, Employment, Skill Dev, Special Support), Sites, Field Coordination, Evidence, Submit | API |
| RrGisPage | Resettlement site GIS | PostGIS |
| RrDocumentsPage | R&R documents | File API |
| RrAuditPage | R&R audit trail | Audit API |

**Key difference from today**: 27 pages → 6 pages. CaseWorkspacePage consolidates all entitlement types as tabs within a single case workspace.

#### Portal 9: Finance Portal

**Role**: `finance_officer`
**Route prefix**: `/app/finance/*`
**Pages** (target: 8):

| Page | Purpose | Data Source |
|------|---------|-------------|
| FinDashboardPage | Payment KPIs, pending, failed | API |
| FinAwardsPage | Award orders to process | API |
| FinAwardDetailPage | Single award review, initiate payment | API |
| FinPaymentsPage | Payment states: pending, initiated, completed, failed | API |
| FinPaymentDetailPage | Single payment detail, retry | API |
| FinReconciliationPage | Reconciliation with PFMS stub | API |
| FinBeneficiariesPage | Beneficiary list, verification | API |
| FinAuditPage | Finance audit trail | Audit API |

**Key difference from today**: 20 pages → 8 pages. Payment state machine is clear: Award → Initiate → Pending → Completed/Failed.

#### Portal 10: Citizen Portal (Public)

**Route prefix**: `/citizen/*`
**Shell**: Separate `CitizenShell` (no government AppShell)
**Pages** (target: 16):

| Page | Purpose | Data Source |
|------|---------|-------------|
| CitizenHomePage | Public landing — search, status check, file objection | API |
| CitizenLoginPage | Aadhaar-based or phone OTP login | Auth API |
| CitizenSearchPage | Search projects by location/name | API (public) |
| CitizenProjectPage | Project details, timeline, notices | API (public) |
| CitizenNoticesPage | Published notices (§11, §19) | API (public) |
| CitizenNoticeDetailPage | Individual notice with parcel details | API |
| CitizenStatusPage | Case status tracker — lifecycle stepper | API (citizen-scoped) |
| CitizenMyCasePage | My case dashboard — parcels, compensation, payment | API (citizen-scoped) |
| CitizenMyLandPage | My land details, map, measurements | API (citizen-scoped) |
| CitizenCompensationPage | Compensation details, award, payment status | API (citizen-scoped) |
| CitizenObjectionPage | File objection (§15) | API (POST) |
| CitizenObjectionTrackPage | Track objection status | API (citizen-scoped) |
| CitizenGrievancePage | File grievance | API (POST) |
| CitizenGrievanceTrackPage | Track grievance status | API (citizen-scoped) |
| CitizenTransparencyPage | Public transparency data, RTI info | API (public) |
| CitizenHelpPage | FAQ, helpline numbers | Static |

**Key difference from today**: 20 pages → 16 pages (removed separate login, separate tracking pages). Citizen portal is the **public face** of the system — it must work without any government authentication.

### 4.3 Portal Page Count Summary

| Portal | Current Pages | Target Pages | Reduction |
|--------|--------------|-------------|-----------|
| Oversight (Admin + Ministry) | 32 | 8 | -75% |
| Requiring Org | 16 | 8 | -50% |
| State | 24 | 10 | -58% |
| District (Collector) | 26 | 14 | -46% |
| Tehsil | 25 | 8 | -68% |
| Field Officer | 27 | 8 | -70% |
| SIA Expert | 22 | 10 | -55% |
| R&R Officer | 27 | 6 | -78% |
| Finance | 20 | 8 | -60% |
| Citizen | 20 | 16 | -20% |
| **Total** | **~310+** | **~86** | **-72%** |

---

## 5. COMPLETE REAL-WORLD WORKFLOW

### 5.1 Canonical Stage Definitions

The workflow follows the RFCTLARR Act 2013. Each stage has a statutory reference, SLA target, and responsible authority.

| # | Stage ID | Label | Statutory Ref | SLA (days) | Responsible |
|---|----------|-------|---------------|------------|-------------|
| 1 | `project_proposal` | Project Proposal | RFCTLARR §4 | 14 | Requiring Org |
| 2 | `land_requirement` | Land Requirement | RFCTLARR §4(1) | 7 | Requiring Org |
| 3 | `gis_identification` | GIS Land Identification | DoLR GIS Guidelines | 14 | Collector + Field |
| 4 | `submission` | Submission to Collector | RFCTLARR §6 | 7 | Requiring Org |
| 5 | `scrutiny` | Scrutiny by Collector | RFCTLARR §7 | 21 | Collector (CALA) |
| 6 | `sia` | Social Impact Assessment | RFCTLARR Ch. II (§4–§9) | 180 | SIA Expert Group |
| 7 | `preliminary_notification` | Section 11(1) Preliminary Notification | RFCTLARR §11 | 14 | Collector |
| 8 | `public_disclosure` | Public Disclosure / Section 11(3) | RFCTLARR §11(3) | 30 | Collector + Tehsil + Field |
| 9 | `objections_hearing` | Objections & Hearing | RFCTLARR §15 | 60 | Collector |
| 10 | `declaration` | Section 19(1) Declaration | RFCTLARR §19 | 30 | Collector |
| 11 | `section_21_notice` | Section 21 Individual Notice | RFCTLARR §21 | 14 | Collector |
| 12 | `field_verification` | Field Verification & Survey | RFCTLARR §20 | 30 | Field Officer |
| 13 | `compensation` | Compensation Assessment | RFCTLARR §26–§30 | 45 | Collector + Finance |
| 14 | `award` | Award Order | RFCTLARR §23/§37 | 30 | Collector (as LAA) |
| 15 | `payment` | Payment | RFCTLARR §31–§33 | 30 | Finance Officer |
| 16 | `possession` | Taking Possession | RFCTLARR §38 | 14 | Collector + Field |
| 17 | `r_and_r` | Rehabilitation & Resettlement | RFCTLARR Ch. V–VI | 90 | R&R Officer |
| 18 | `closed` | Closed / Completed | RFCTLARR §49 | — | Collector |

**Note**: Stage 11 (`section_21_notice`) is **new** — it exists in the Act but is missing from the current prototype. Section 21 requires the Collector to serve individual notice to every affected person after the Section 19(1) declaration.

### 5.2 Stage Groups

| Group | Stages | Purpose |
|-------|--------|---------|
| **Initiation** | 1–4 | Project setup, land identification, submission |
| **Assessment** | 5–6 | Scrutiny, SIA |
| **Notification** | 7–8 | Preliminary notification, public disclosure |
| **Adjudication** | 9–12 | Objections, declaration, Section 21, field verification |
| **Settlement** | 13–16 | Compensation, award, payment, possession |
| **Closure** | 17–18 | R&R, completion |

### 5.3 Workflow Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        INITIATION                                │
│  [1. Proposal] ──→ [2. Requirement] ──→ [3. GIS ID] ──→ [4. Submit]
│     RO                RO                  Collector+FO          RO→Collector
└─────────────────────────────────┬───────────────────────────────┘
                                  │
┌─────────────────────────────────▼───────────────────────────────┐
│                       ASSESSMENT                                 │
│  [5. Scrutiny] ──→ [6. SIA]                                     │
│     Collector         SIA Expert (180 days)                     │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
┌─────────────────────────────────▼───────────────────────────────┐
│                      NOTIFICATION                                │
│  [7. §11(1) Notice] ──→ [8. Public Disclosure]                  │
│     Collector              Collector + Field                     │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
┌─────────────────────────────────▼───────────────────────────────┐
│                     ADJUDICATION                                 │
│  [9. Objections] ──→ [10. §19 Declaration] ──→ [11. §21 Notice]│
│     Collector            Collector                Collector       │
│         ──→ [12. Field Verification]                              │
│              Field Officer (30 days)                              │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
┌─────────────────────────────────▼───────────────────────────────┐
│                       SETTLEMENT                                 │
│  [13. Compensation] ──→ [14. Award] ──→ [15. Payment] ──→ [16. Possession]
│     Collector+Finance     Collector       Finance              Collector+Field
└─────────────────────────────────┬───────────────────────────────┘
                                  │
┌─────────────────────────────────▼───────────────────────────────┐
│                         CLOSURE                                  │
│  [17. R&R] ──→ [18. Closed]                                     │
│     R&R Officer           Collector                              │
└─────────────────────────────────────────────────────────────────┘
```

### 5.4 Parallel Processes

Not all stages are strictly sequential:

- **R&R (17)** can run **in parallel** with Compensation (13) through Possession (16) — R&R eligibility is determined early, implementation happens concurrently
- **SIA (6)** can begin during Scrutiny (5) — the SIA process is initiated after scrutiny identifies the need
- **Public Disclosure (8)** runs automatically after Preliminary Notification (7) — 30-day display period
- **Objections (9)** has a fixed window (60 days from disclosure) — citizens can file at any time during this window
- **Field Verification (12)** happens after Declaration (10) and Section 21 Notice (11) — individual parcel surveys

---

## 6. WORKFLOW GATES

### 6.1 Gate Definition

Each stage transition requires:
1. **Prerequisites**: Previous stages must be completed
2. **Authority**: Only specific roles can advance to/from a stage
3. **Documents**: Required documents must be uploaded and verified
4. **Time**: SLA windows must be tracked

### 6.2 Gate Matrix

| Stage | Prerequisites | Authority | Required Documents | SLA |
|-------|--------------|-----------|-------------------|-----|
| `project_proposal` | None | Requiring Org | Project proposal document | 14d |
| `land_requirement` | `project_proposal` | Requiring Org | Land requirement schedule | 7d |
| `gis_identification` | `land_requirement` | Collector + Field | GIS report with parcel boundaries | 14d |
| `submission` | `gis_identification` | Requiring Org | Complete submission package | 7d |
| `scrutiny` | `submission` | Collector (CALA) | Scrutiny order | 21d |
| `sia` | `scrutiny` | SIA Expert Group | SIA report | 180d |
| `preliminary_notification` | `sia` | Collector | §11(1) notification draft | 14d |
| `public_disclosure` | `preliminary_notification` | System (auto) | Public notice for display | 30d |
| `objections_hearing` | `public_disclosure` | Collector | Hearing records | 60d |
| `declaration` | `objections_hearing` | Collector | §19(1) declaration order | 30d |
| `section_21_notice` | `declaration` | Collector | Individual §21 notices | 14d |
| `field_verification` | `section_21_notice` | Field Officer | Field verification report, photos, GPS | 30d |
| `compensation` | `field_verification` | Collector + Finance | Compensation assessment sheet | 45d |
| `award` | `compensation` | Collector (LAA) | Award order | 30d |
| `payment` | `award` | Finance Officer | Payment challan, PFMS reference | 30d |
| `possession` | `payment` | Collector + Field | Possession certificate, panchanama | 14d |
| `r_and_r` | `possession` | R&R Officer | R&R entitlement documents | 90d |
| `closed` | `r_and_r` | Collector | Completion order | — |

### 6.3 Server-Side Enforcement

**Critical**: In the current prototype, gates are checked client-side only. The reconstruction must enforce gates **server-side**:

```typescript
// Server-side gate check (backend)
async function advanceWorkflowStage(
  projectId: string,
  targetStage: LifecycleStage,
  actorId: string,
  actorRole: RoleId,
): Promise<{ ok: boolean; reason?: string }> {
  const project = await db.getProject(projectId);
  const gate = GATE_MATRIX[targetStage];
  
  // 1. Check prerequisites
  const missing = gate.prerequisites.filter(s => !project.completedStages.includes(s));
  if (missing.length > 0) {
    return { ok: false, reason: `Missing prerequisites: ${missing.join(', ')}` };
  }
  
  // 2. Check authority
  if (!gate.authorities.includes(actorRole)) {
    return { ok: false, reason: `Role ${actorRole} cannot advance to ${targetStage}` };
  }
  
  // 3. Check required documents
  const docs = await db.getDocuments(projectId, targetStage);
  const missingDocs = gate.requiredDocuments.filter(d => !docs.some(dd => dd.type === d));
  if (missingDocs.length > 0) {
    return { ok: false, reason: `Missing documents: ${missingDocs.join(', ')}` };
  }
  
  // 4. Advance stage
  await db.advanceProjectStage(projectId, targetStage, actorId);
  await auditLog(projectId, actorId, 'stage_advance', project.currentStage, targetStage);
  
  return { ok: true };
}
```

---

## 7. ROLE → PERMISSION MATRIX

### 7.1 Action Definitions

| Action | Description | Statutory Basis |
|--------|-------------|-----------------|
| `create_project` | Create a new land acquisition project | §4 |
| `submit_project` | Submit project to Collector | §6 |
| `advance_stage` | Advance workflow to next stage | Various |
| `issue_notification` | Issue §11(1) preliminary notification | §11 |
| `conduct_sia` | Conduct Social Impact Assessment | Ch. II |
| `file_objection` | File objection to acquisition | §15 |
| `hear_objections` | Hear and decide on objections | §15 |
| `issue_declaration` | Issue §19(1) declaration | §19 |
| `serve_notice` | Serve §21 individual notices | §21 |
| `verify_field` | Conduct field verification and survey | §20 |
| `assess_compensation` | Assess compensation amount | §26–§30 |
| `pass_award` | Pass award order | §23/§37 |
| `initiate_payment` | Initiate compensation payment | §31–§33 |
| `take_possession` | Take possession of land | §38 |
| `implement_rr` | Implement R&R scheme | Ch. V–VI |
| `file_grievance` | File a grievance | §42 |
| `view_audit` | View audit trail | §48 |
| `upload_document` | Upload documents | Various |
| `view_project` | View project details | Various |
| `view_parcels` | View parcel details | Various |
| `manage_users` | Manage user accounts | §48 |

### 7.2 Full Permission Matrix

```
Action                    Admin  Ministry  RO   State  Collector  Tehsil  FO   SIA   R&R  Finance  Citizen
─────────────────────────────────────────────────────────────────────────────────────────────────────────
create_project             ·       ·       ✓      ·       ·        ·      ·    ·     ·      ·       ·
submit_project             ·       ·       ✓      ·       ·        ·      ·    ·     ·      ·       ·
view_project               ✓       ✓       ✓      ✓       ✓        ✓      ✓    ✓     ✓      ✓       ✓*
view_parcels               ✓       ✓       ✓      ✓       ✓        ✓      ✓    ✓     ✓      ✓       ✓*
advance_stage              ✓       ·       ✓†     ·       ✓        ·      ·†   ·†    ·†     ·†      ·
issue_notification         ·       ·       ·      ·       ✓        ·      ·    ·     ·      ·       ·
conduct_sia                ·       ·       ·      ·       ·        ·      ·    ✓     ·      ·       ·
file_objection             ·       ·       ·      ·       ·        ·      ·    ·     ·      ·       ✓
hear_objections            ·       ·       ·      ·       ✓        ✓      ·    ·     ·      ·       ·
issue_declaration          ·       ·       ·      ·       ✓        ·      ·    ·     ·      ·       ·
serve_notice               ·       ·       ·      ·       ✓        ·      ·    ·     ·      ·       ·
verify_field               ·       ·       ·      ·       ✓        ✓      ✓    ·     ·      ·       ·
assess_compensation        ·       ·       ·      ·       ✓        ·      ·    ·     ·       ✓      ·
pass_award                 ·       ·       ·      ·       ✓        ·      ·    ·     ·       ✓      ·
initiate_payment           ·       ·       ·      ·       ·        ·      ·    ·     ·       ✓      ·
take_possession            ·       ·       ·      ·       ✓        ·      ✓    ·     ·       ·      ·
implement_rr               ·       ·       ·      ·       ·        ·      ✓    ·     ✓       ·      ·
file_grievance             ·       ·       ·      ·       ·        ·      ·    ·     ·      ·       ✓
view_audit                 ✓       ✓       ✓      ✓       ✓        ✓      ✓    ✓     ✓      ✓       ·
upload_document            ·       ·       ✓      ·       ✓        ✓      ✓    ✓     ✓      ✓       ✓*
manage_users               ✓       ·       ·      ·       ·        ·      ·    ·     ·      ·       ·

† = Stage-specific (only during their workflow stages)
* = Citizen sees only their own data
```

### 7.3 Permission Enforcement Layers

```
Layer 1: Route Guard (Frontend)
  └── Prevents navigation to unauthorized pages
  └── Redirects to role-appropriate dashboard

Layer 2: API Authorization (Backend)
  └── JWT token contains role + jurisdiction
  └── RBAC middleware checks role against endpoint permissions
  └── Returns 403 if unauthorized

Layer 3: Workflow Gate (Backend)
  └── Checks stage prerequisites before allowing stage transitions
  └── Validates required documents before advancement
  └── Enforces SLA windows (warning, not blocking)

Layer 4: Data Scope (Backend)
  └── Filters queries by jurisdiction (national > state > district > tehsil > village)
  └── Citizens see only their own parcels/cases
  └── SIA experts see only assigned projects
```

---

## 8. ROLE → WORKFLOW STAGE MATRIX

### 8.1 Stage Responsibility Matrix

This shows which roles are **actively involved** at each stage (not just viewing):

| Stage | Primary Owner | Supporting Roles | External |
|-------|--------------|-----------------|----------|
| `project_proposal` | Requiring Org | Ministry Nodal | — |
| `land_requirement` | Requiring Org | Collector | — |
| `gis_identification` | Collector + Field Officer | Tehsil | — |
| `submission` | Requiring Org | Collector | — |
| `scrutiny` | Collector (CALA) | Tehsil, State Nodal | — |
| `sia` | SIA Expert Group | Collector, State Nodal | SIA Experts |
| `preliminary_notification` | Collector | State Nodal | — |
| `public_disclosure` | Collector + Field Officer | Tehsil | — |
| `objections_hearing` | Collector | Tehsil | Citizens |
| `declaration` | Collector | State Nodal | — |
| `section_21_notice` | Collector + Field Officer | Tehsil | — |
| `field_verification` | Field Officer | Tehsil, Collector | — |
| `compensation` | Collector + Finance | — | — |
| `award` | Collector (LAA) | Finance | — |
| `payment` | Finance Officer | Collector | PFMS |
| `possession` | Collector + Field Officer | Tehsil | — |
| `r_and_r` | R&R Officer | Collector, State Nodal | — |
| `closed` | Collector | National Admin | — |

### 8.2 Stage View Matrix

This shows which roles can **view** each stage (read-only):

| Stage | Viewable By |
|-------|------------|
| All stages | National Admin, State Nodal, Collector |
| Project-scoped stages | Requiring Org, Ministry Nodal |
| Tehsil-scoped stages | Tehsil SDO |
| Village-scoped stages | Field Officer |
| SIA stages | SIA Expert (assigned project only) |
| R&R stages | R&R Officer |
| Payment stages | Finance Officer |
| Public stages (7–9) | Citizen (their parcels only) |
| Post-payment stages | Citizen (their parcels only) |

---

## 9. ENTITY & DATA MODEL

### 9.1 Core Entities

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Organization   │────▶│     Project      │────▶│     Parcel      │
│                  │     │                  │     │                  │
│  id              │     │  id              │     │  id              │
│  name            │     │  code            │     │  projectId       │
│  type (ro/ministry)   │  title           │     │  surveyNo        │
│  ministry        │     │  category        │     │  village         │
│  state           │     │  requiringOrgId  │     │  tehsil          │
│  district        │     │  ministry        │     │  district        │
│                  │     │  state/district  │     │  state           │
│                  │     │  budgetCr        │     │  areaHa          │
│                  │     │  currentStage    │     │  landType        │
│                  │     │  status          │     │  owner           │
│                  │     │  createdAt       │     │  geometry (GEOM) │
│                  │     │  updatedAt       │     │  marketValue     │
└─────────────────┘     └─────────────────┘     │  compensationAmt │
                                                 │  currentStage    │
                                                 └─────────────────┘

┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  AcquisitionCase │────▶│   Objection      │     │   Document      │
│                  │     │                  │     │                  │
│  id              │     │  id              │     │  id              │
│  caseNo          │     │  caseId          │     │  caseId/projectId│
│  projectId       │     │  parcelId        │     │  stage           │
│  jurisdiction    │     │  filedBy         │     │  type            │
│  currentStage    │     │  grounds         │     │  title           │
│  status          │     │  status          │     │  fileName        │
│  priority        │     │  hearingDate     │     │  filePath        │
│  parcelsCount    │     │  decision        │     │  mimeType        │
│  areaHa          │     │  decidedBy       │     │  sizeKb          │
│  assigneeRoleId  │     │  decidedAt       │     │  uploadedBy      │
│  slaDueAt        │     └─────────────────┘     │  verified        │
└─────────────────┘                               └─────────────────┘

┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     Award        │────▶│    Payment       │     │  FieldEvidence   │
│                  │     │                  │     │                  │
│  id              │     │  id              │     │  id              │
│  caseId          │     │  awardId         │     │  caseId          │
│  parcelId        │     │  caseId          │     │  parcelId        │
│  amount          │     │  parcelId        │     │  capturedBy      │
│  awardedTo       │     │  payee           │     │  type (photo/    │
│  status          │     │  amount          │     │    video/gps/    │
│  passedBy        │     │  status          │     │    measurement)  │
│  passedAt        │     │  utr             │     │  filePath        │
│  appealDeadline  │     │  mode            │     │  gps (GEOM)      │
└─────────────────┘     │  initiatedAt     │     │  capturedAt      │
                         │  completedAt     │     └─────────────────┘
                         └─────────────────┘

┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  AuditEvent      │     │  Notification    │     │     Grievance    │
│                  │     │                  │     │                  │
│  id              │     │  id              │     │  id              │
│  entityType      │     │  entityType      │     │  caseId          │
│  entityId        │     │  entityId        │     │  filedBy         │
│  actorId         │     │  title           │     │  category        │
│  actorRole       │     │  body            │     │  subject         │
│  action          │     │  type            │     │  status          │
│  before (JSON)   │     │  targetRoles     │     │  assignedTo      │
│  after (JSON)    │     │  createdAt       │     │  createdAt       │
│  timestamp       │     │  read            │     │  resolvedAt      │
│  ipAddress       │     │  userId          │     └─────────────────┘
└─────────────────┘     └─────────────────┘

┌─────────────────┐
│     User         │
│                  │
│  id              │
│  name            │
│  email           │
│  phone           │
│  role            │
│  organizationId  │
│  jurisdiction    │
│  isActive        │
│  createdAt       │
└─────────────────┘
```

### 9.2 Database Schema (PostgreSQL + PostGIS)

```sql
-- Core tables
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('ministry', 'requiring_org', 'state', 'district', 'tehsil')),
  ministry TEXT,
  state TEXT,
  district TEXT,
  parent_id UUID REFERENCES organizations(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  role TEXT NOT NULL,
  organization_id UUID REFERENCES organizations(id),
  jurisdiction JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  requiring_org_id UUID REFERENCES organizations(id),
  ministry TEXT,
  state TEXT NOT NULL,
  district TEXT NOT NULL,
  budget_cr NUMERIC(12,2),
  current_stage TEXT NOT NULL DEFAULT 'project_proposal',
  completed_stages TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE parcels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  survey_no TEXT NOT NULL,
  village TEXT NOT NULL,
  tehsil TEXT NOT NULL,
  district TEXT NOT NULL,
  state TEXT NOT NULL,
  area_ha NUMERIC(10,4) NOT NULL,
  land_type TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  owner_khata TEXT,
  owner_aadhaar_masked TEXT,
  owner_mobile_masked TEXT,
  owner_category TEXT,
  market_value_per_ha NUMERIC(12,2),
  compensation_amount NUMERIC(12,2),
  compensation_status TEXT DEFAULT 'pending',
  current_stage TEXT NOT NULL DEFAULT 'project_proposal',
  geometry GEOMETRY(Polygon, 4326),
  centroid GEOMETRY(Point, 4326),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create spatial index
CREATE INDEX idx_parcels_geometry ON parcels USING GIST(geometry);
CREATE INDEX idx_parcels_centroid ON parcels USING GIST(centroid);

CREATE TABLE acquisition_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_no TEXT UNIQUE NOT NULL,
  project_id UUID REFERENCES projects(id),
  jurisdiction JSONB NOT NULL,
  current_stage TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  priority TEXT DEFAULT 'normal',
  parcels_count INT DEFAULT 0,
  area_ha NUMERIC(10,4) DEFAULT 0,
  assignee_role TEXT,
  assignee_name TEXT,
  sla_due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE objections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES acquisition_cases(id),
  parcel_id UUID REFERENCES parcels(id),
  filed_by TEXT NOT NULL,
  filed_by_role TEXT,
  grounds TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'filed',
  hearing_date TIMESTAMPTZ,
  decision TEXT,
  decided_by TEXT,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  stage TEXT,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  mime_type TEXT,
  size_kb INT,
  uploaded_by UUID REFERENCES users(id),
  verified BOOLEAN DEFAULT FALSE,
  verified_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES acquisition_cases(id),
  parcel_id UUID REFERENCES parcels(id),
  amount NUMERIC(12,2) NOT NULL,
  awarded_to TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  passed_by TEXT,
  passed_at TIMESTAMPTZ,
  appeal_deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  award_id UUID REFERENCES awards(id),
  case_id UUID REFERENCES acquisition_cases(id),
  parcel_id UUID REFERENCES parcels(id),
  payee TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  utr TEXT,
  mode TEXT DEFAULT 'pfms',
  initiated_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE field_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES acquisition_cases(id),
  parcel_id UUID REFERENCES parcels(id),
  captured_by UUID REFERENCES users(id),
  type TEXT NOT NULL,
  notes TEXT,
  file_path TEXT,
  gps GEOMETRY(Point, 4326),
  captured_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  actor_id UUID REFERENCES users(id),
  actor_role TEXT,
  action TEXT NOT NULL,
  before JSONB,
  after JSONB,
  ip_address INET,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_entity ON audit_events(entity_type, entity_id);
CREATE INDEX idx_audit_timestamp ON audit_events(timestamp);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT,
  entity_id UUID,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL,
  target_roles TEXT[],
  user_id UUID REFERENCES users(id),
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE grievances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES acquisition_cases(id),
  filed_by TEXT NOT NULL,
  category TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  assigned_to TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);
```

### 9.3 Entity Relationships

```
Organization 1──N User
Organization 1──N Project
Project 1──N Parcel (spatial: geometry column)
Project 1──N AcquisitionCase
AcquisitionCase 1──N Objection
AcquisitionCase 1──N Award
Award 1──1 Payment
AcquisitionCase 1──N FieldEvidence
AcquisitionCase 1──N Document (also Parcel 1──N Document)
AcquisitionCase 1──N AuditEvent (also Project, Parcel, Award, Payment)
AcquisitionCase 1──N Notification
AcquisitionCase 1──N Grievance
```

---

## 10. FEATURE DISPOSITION

### 10.1 Disposition Categories

| Category | Definition | Action |
|----------|-----------|--------|
| **KEEP** | Core workflow — required for prototype | Retain and enhance |
| **RESTRUCTURE** | Useful but wrong place/implementation | Move, refactor, consolidate |
| **SIMPLIFY** | Useful but over-complicated | Reduce scope, merge pages |
| **MOCK** | Integration boundary — stub for prototype | Create stub with interface |
| **REMOVE** | Doesn't solve the problem | Delete |
| **FUTURE** | Real-world useful but out of prototype scope | Document but don't build |

### 10.2 Feature Disposition Matrix

#### KEEP

| Feature | Current Location | Notes |
|---------|-----------------|-------|
| Project creation wizard | `CreateProjectPage.tsx` | Restructure to submit to API |
| Workflow lifecycle engine | `workflowTypes.ts` + `stages.ts` | Consolidate into single system |
| GIS parcel mapping | `GisPage.tsx` | Add polygon support |
| Field officer task system | `FoTasksPage.tsx` | Restructure as mobile-first |
| GPS/photo capture | `FoGpsCapturePage.tsx` | Integrate with camera/GPS APIs |
| Document upload | `FoDocumentsPage.tsx` | Add real file upload |
| Objection filing | `CitizenObjectionFlowPage.tsx` | Connect to API |
| Grievance filing | `CitizenGrievanceFlowPage.tsx` | Connect to API |
| Award workflow | `CollectorAwardPage.tsx` | Add approval chain |
| Payment state machine | `FinPaymentInitPage.tsx` | Mock PFMS integration |
| Possession with evidence | `CollectorPossessionPage.tsx` | Connect to field evidence |
| R&R case tracking | `RrCaseWorkspacePage.tsx` | Consolidate 27→6 pages |
| Audit trail | `AuditTrailPage.tsx` | Connect to audit event store |
| Citizen portal shell | `CitizenShell.tsx` | Keep separate shell architecture |
| Notification system | `NotificationsPage.tsx` | Connect to real notification store |
| Role gallery landing | `RoleGalleryPage.tsx` | Keep for demo mode |

#### RESTRUCTURE

| Feature | Current Issue | Target |
|---------|--------------|--------|
| Navigation configs (10 objects) | 10 separate nav objects in Sidebar.tsx | Single nav config generator |
| Two workflow engines | `stages.ts` vs `workflowTypes.ts` | Single canonical engine |
| Dashboard pages | Hardcoded mock data | Generated from API aggregation |
| Sidebar.tsx (860 lines) | Giant if/else chain | Data-driven nav component |
| Per-role data files | 30+ mock data files | Single seed data system |
| CreateProjectPage | Form state lost on navigation | Persisted multi-step with API |
| SLA Watch widget | Hardened text per role | Computed from workflow data |
| State Nodal pages | Operational duplicate of Collector | Monitoring-only portal |
| Collector command centre | Generic dashboard | Stage-specific operational hub |

#### SIMPLIFY

| Feature | Current Pages | Target Pages | Reduction |
|---------|--------------|-------------|-----------|
| Admin portal | 14 | 8 | -43% |
| Ministry portal | 18 | 8 | -56% |
| State Nodal portal | 24 | 10 | -58% |
| Collector portal | 26 | 14 | -46% |
| Tehsil portal | 25 | 8 | -68% |
| Field Officer portal | 27 | 8 | -70% |
| SIA Expert portal | 22 | 10 | -55% |
| R&R Officer portal | 27 | 6 | -78% |
| Finance portal | 20 | 8 | -60% |
| Risk/Delay pages | Multiple per role | 1 shared component | -80% |
| MIS/Reports pages | Multiple per role | 1 shared module | -80% |

#### MOCK (Integration Stubs)

| Integration | Stub Interface | Notes |
|-------------|---------------|-------|
| PFMS | `POST /api/payments/:id/initiate` → `{ utr, status }` | Simulates payment processing |
| ULPIN | `GET /api/ulpin/:parcelId` → `{ ulpin, verified }` | Simulates land UID lookup |
| e-Gazette | `POST /api/gazette/publish` → `{ gazetteId, url }` | Simulates notification publishing |
| Aadhaar | `POST /api/aadhaar/verify` → `{ verified, name }` | Simulates identity verification |
| Bhoomi Rashi | `GET /api/bhoomi-rashi/:parcelId` → `{ records }` | Simulates land record lookup |
| PM Gati Shakti | `GET /api/gati-shakti/:projectId` → `{ layers }` | Simulates spatial data overlay |

#### REMOVE

| Feature | Reason |
|---------|--------|
| `FoRoleBoundaryPage` | Informational text, not functional |
| `SiaRoleBoundaryPage` | Informational text, not functional |
| `RrRoleBoundaryPage` | Informational text, not functional |
| `FinRoleBoundaryPage` | Informational text, not functional |
| 8 separate R&R component pages | Merged into case workspace tabs |
| `DemoControls` | Development artifact |
| Duplicate `mapRoleIdToDemoRole()` | Naming mismatch bridge — consolidate RBAC |
| Separate mock data per role | Replace with seed data system |

#### FUTURE

| Feature | Notes |
|---------|-------|
| WorkflowConfigPage (admin) | Dynamic workflow customization |
| PDF generation | Award orders, compensation sheets, notices |
| Real-time WebSocket updates | Live status changes |
| Multi-language support | Hindi, regional languages |
| Native mobile app | PWA is sufficient for prototype |
| Historical analytics | Trend data over time |
| Machine learning risk prediction | Delay risk scoring |
| Blockchain audit trail | Tamper-proof records |

---

## 11. BACKEND MODULES

### 11.1 Technology Stack

- **Runtime**: Node.js 20 LTS
- **Framework**: Express.js 4 + TypeScript
- **Database**: PostgreSQL 16 + PostGIS 3.4
- **Auth**: JWT (jsonwebtoken) + bcrypt
- **File Storage**: Local filesystem (prototype) → S3 (production)
- **Validation**: Zod schemas
- **ORM**: Drizzle ORM (lightweight, type-safe)
- **Testing**: Vitest + Supertest

### 11.2 Module Structure

```
server/
├── src/
│   ├── app.ts                    # Express app setup
│   ├── server.ts                 # HTTP server entry
│   ├── config/
│   │   ├── database.ts           # PostgreSQL connection
│   │   ├── auth.ts               # JWT config
│   │   └── storage.ts            # File storage config
│   ├── middleware/
│   │   ├── auth.ts               # JWT verification
│   │   ├── rbac.ts               # Role-based access control
│   │   ├── validation.ts         # Zod schema validation
│   │   ├── audit.ts              # Audit logging middleware
│   │   └── errorHandler.ts       # Global error handler
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   └── auth.schema.ts
│   │   ├── projects/
│   │   │   ├── project.routes.ts
│   │   │   ├── project.controller.ts
│   │   │   ├── project.service.ts
│   │   │   └── project.schema.ts
│   │   ├── parcels/
│   │   │   ├── parcel.routes.ts
│   │   │   ├── parcel.controller.ts
│   │   │   ├── parcel.service.ts
│   │   │   └── parcel.schema.ts
│   │   ├── workflow/
│   │   │   ├── workflow.routes.ts
│   │   │   ├── workflow.controller.ts
│   │   │   ├── workflow.service.ts
│   │   │   ├── gates.ts          # Gate definitions
│   │   │   └── workflow.schema.ts
│   │   ├── objections/
│   │   │   ├── objection.routes.ts
│   │   │   ├── objection.controller.ts
│   │   │   └── objection.service.ts
│   │   ├── documents/
│   │   │   ├── document.routes.ts
│   │   │   ├── document.controller.ts
│   │   │   └── document.service.ts
│   │   ├── awards/
│   │   │   ├── award.routes.ts
│   │   │   ├── award.controller.ts
│   │   │   └── award.service.ts
│   │   ├── payments/
│   │   │   ├── payment.routes.ts
│   │   │   ├── payment.controller.ts
│   │   │   ├── payment.service.ts
│   │   │   └── pfms-stub.ts      # PFMS mock integration
│   │   ├── possession/
│   │   │   ├── possession.routes.ts
│   │   │   ├── possession.controller.ts
│   │   │   └── possession.service.ts
│   │   ├── rnr/
│   │   │   ├── rnr.routes.ts
│   │   │   ├── rnr.controller.ts
│   │   │   └── rnr.service.ts
│   │   ├── field-evidence/
│   │   │   ├── evidence.routes.ts
│   │   │   ├── evidence.controller.ts
│   │   │   └── evidence.service.ts
│   │   ├── notifications/
│   │   │   ├── notification.routes.ts
│   │   │   ├── notification.controller.ts
│   │   │   └── notification.service.ts
│   │   ├── audit/
│   │   │   ├── audit.routes.ts
│   │   │   ├── audit.controller.ts
│   │   │   └── audit.service.ts
│   │   ├── grievances/
│   │   │   ├── grievance.routes.ts
│   │   │   ├── grievance.controller.ts
│   │   │   └── grievance.service.ts
│   │   ├── users/
│   │   │   ├── user.routes.ts
│   │   │   ├── user.controller.ts
│   │   │   └── user.service.ts
│   │   ├── gis/
│   │   │   ├── gis.routes.ts
│   │   │   ├── gis.controller.ts
│   │   │   └── gis.service.ts     # PostGIS spatial queries
│   │   └── dashboard/
│   │       ├── dashboard.routes.ts
│   │       ├── dashboard.controller.ts
│   │       └── dashboard.service.ts  # Aggregation queries
│   ├── db/
│   │   ├── schema.ts             # Drizzle schema definitions
│   │   ├── migrations/           # Database migrations
│   │   └── seed.ts               # Seed data script
│   └── utils/
│       ├── errors.ts             # Custom error classes
│       ├── pagination.ts         # Pagination helpers
│       └── jurisdiction.ts       # Jurisdiction scoping helpers
├── package.json
├── tsconfig.json
├── drizzle.config.ts
└── .env.example
```

### 11.3 API Endpoint Summary

#### Auth
- `POST /api/auth/login` — Login with credentials → JWT
- `POST /api/auth/refresh` — Refresh JWT
- `GET /api/auth/me` — Get current user profile

#### Projects
- `GET /api/projects` — List projects (scope-filtered by role)
- `POST /api/projects` — Create project (RO only)
- `GET /api/projects/:id` — Get project detail
- `PUT /api/projects/:id` — Update project (RO, early stages)
- `GET /api/projects/:id/parcels` — Get project parcels
- `GET /api/projects/:id/cases` — Get project cases
- `GET /api/projects/:id/timeline` — Get project timeline

#### Parcels
- `GET /api/parcels` — List parcels (jurisdiction-scoped)
- `GET /api/parcels/:id` — Get parcel detail
- `PUT /api/parcels/:id/verify` — Verify parcel (Field Officer)
- `GET /api/parcels/:id/geometry` — Get parcel GeoJSON

#### GIS
- `GET /api/gis/projects` — Project locations (GeoJSON)
- `GET /api/gis/parcels` — Parcel geometries (GeoJSON, jurisdiction-scoped)
- `GET /api/gis/parcels/bbox` — Parcels in bounding box
- `POST /api/gis/parcels/:id/geometry` — Set parcel geometry (Collector)

#### Workflow
- `POST /api/workflow/:projectId/advance` — Advance project stage
- `POST /api/workflow/:projectId/parcels/:parcelId/advance` — Advance parcel stage
- `GET /api/workflow/:projectId/status` — Get workflow status

#### Objections
- `GET /api/objections` — List objections (scope-filtered)
- `POST /api/objections` — File objection (Citizen)
- `PUT /api/objections/:id/decide` — Decide objection (Collector)

#### Documents
- `GET /api/documents` — List documents (entity-scoped)
- `POST /api/documents/upload` — Upload document
- `GET /api/documents/:id/download` — Download document

#### Awards
- `GET /api/awards` — List awards
- `POST /api/awards` — Create award (Collector)
- `PUT /api/awards/:id/approve` — Approve award (Collector LAA)

#### Payments
- `GET /api/payments` — List payments
- `POST /api/payments/initiate` — Initiate payment (Finance)
- `POST /api/payments/:id/retry` — Retry failed payment

#### Possession
- `POST /api/possession` — Record possession (Collector + Field)
- `GET /api/possession` — List possession records

#### R&R
- `GET /api/rnr/cases` — List R&R cases
- `GET /api/rnr/cases/:id` — Get R&R case detail
- `PUT /api/rnr/cases/:id/components/:componentId` — Update entitlement

#### Field Evidence
- `POST /api/evidence` — Upload field evidence (Field Officer)
- `GET /api/evidence` — List evidence (entity-scoped)

#### Notifications
- `GET /api/notifications` — List notifications (user-scoped)
- `PUT /api/notifications/:id/read` — Mark as read
- `POST /api/notifications/mark-all-read` — Mark all as read

#### Audit
- `GET /api/audit` — List audit events (scope-filtered)
- `GET /api/audit/:entityType/:entityId` — Entity audit trail

#### Grievances
- `GET /api/grievances` — List grievances
- `POST /api/grievances` — File grievance (Citizen)
- `PUT /api/grievances/:id/assign` — Assign grievance (Collector)

#### Dashboard
- `GET /api/dashboard/oversight` — National/Ministry KPIs
- `GET /api/dashboard/state` — State KPIs
- `GET /api/dashboard/district` — District KPIs
- `GET /api/dashboard/tehsil` — Tehsil KPIs
- `GET /api/dashboard/field` — Field Officer tasks

---

## 12. MOBILE FIELD APP MODULES

### 12.1 Design Principles

- **Task-first**: Everything revolves around assigned tasks
- **Offline-capable**: Queue actions when offline, sync when online
- **Camera-integrated**: Direct photo/video capture
- **GPS-auto**: Auto-capture location on evidence capture
- **Touch-friendly**: Large tap targets, minimal text input
- **Progressive**: Work through task sections in order

### 12.2 Page Architecture

```
FoApp (Mobile Shell)
├── FoHomePage              — Today's tasks, stats, quick actions
├── FoTasksPage             — Task list (filterable: all/pending/completed/overdue)
├── FoTaskDetailPage        — Task workspace (tabbed):
│   ├── Tab: Overview       — Task info, parcel details, instructions
│   ├── Tab: GPS            — GPS capture with map overlay
│   ├── Tab: Photos         — Photo/video gallery, camera capture
│   ├── Tab: Measurements   — Area, boundary measurements
│   ├── Tab: Observations   — Text observations, field notes
│   ├── Tab: Verify Owner   — Owner identity verification
│   ├── Tab: Evidence       — All evidence summary
│   └── Tab: Submit         — Review and submit task completion
├── FoMapPage               — Field map with assigned parcels
├── FoDocumentsPage         — Document upload per task
├── FoNotificationsPage     — Task notifications
├── FoSyncPage              — Offline sync status
└── FoProfilePage           — Profile, role info
```

### 12.3 Offline Strategy

```
┌─────────────────────────────────────────────┐
│              OFFLINE QUEUE                    │
│                                               │
│  1. User performs action (GPS, photo, submit) │
│  2. Action queued in IndexedDB                │
│  3. Background sync when online               │
│  4. Conflict resolution: server wins          │
│  5. User notified of sync status              │
└─────────────────────────────────────────────┘
```

**Offline-capable actions**:
- GPS coordinate capture
- Photo/video capture
- Observation text entry
- Measurement recording
- Task status updates (partial)

**Online-required actions**:
- Task assignment/reassignment
- Document upload (large files)
- Task submission (final)
- Notification receive

### 12.4 PWA Requirements

- Service worker for offline caching
- App manifest for install prompt
- Cache-first strategy for static assets
- Network-first for API calls with offline fallback
- IndexedDB for offline data storage

---

## 13. PUBLIC PORTAL MODULES

### 13.1 Citizen Portal Architecture

The citizen portal is a **separate shell** (`CitizenShell`) with its own navigation, styling, and authentication flow. It does not share the government AppShell.

### 13.2 Citizen Authentication

**Approach**: Phone OTP-based authentication (no password)

```
1. Citizen enters phone number
2. System sends OTP via SMS stub
3. Citizen enters OTP
4. System returns JWT with citizen scope
5. JWT contains: userId, role: "citizen", parcels: [parcelIds]
```

**For prototype**: OTP verification is mocked — any 6-digit code works.

### 13.3 Citizen Pages

| Page | Purpose | Auth Required |
|------|---------|---------------|
| HomePage | Public landing — search, status check | No |
| LoginPage | Phone OTP login | No |
| SearchPage | Search projects by location/name | No |
| ProjectPage | Project details, timeline, notices | No |
| NoticesPage | Published notices (§11, §19) | No |
| NoticeDetailPage | Individual notice | No |
| StatusPage | Case status tracker | Yes |
| MyCasePage | My case dashboard | Yes |
| MyLandPage | My land details, map | Yes |
| CompensationPage | Compensation details | Yes |
| ObjectionPage | File objection | Yes |
| ObjectionTrackPage | Track objection | Yes |
| GrievancePage | File grievance | Yes |
| GrievanceTrackPage | Track grievance | Yes |
| TransparencyPage | Public data, RTI info | No |
| HelpPage | FAQ, helpline | No |

### 13.4 Transparency Data

The citizen portal publishes:
- All projects in the district (public)
- Published notices (§11, §19) with parcel details
- Objection statistics (anonymized)
- Compensation ranges by land type
- R&R entitlement information
- Contact details for all authorities
- RTI information and procedures

---

## 14. GIS ARCHITECTURE

### 14.1 Current State

The current GIS implementation uses Leaflet with point markers only. Parcels are shown as single `[lat, lng]` coordinates. There is no polygon geometry, no spatial intersection, no corridor/buffer operations.

### 14.2 Target Architecture

```
┌─────────────────────────────────────────────────────┐
│                    GIS STACK                          │
│                                                       │
│  Frontend:                                            │
│    React-Leaflet 4                                    │
│    ├── Tile layers (OpenStreetMap, revenue maps)      │
│    ├── Polygon layers (parcel boundaries)             │
│    ├── Marker layers (field evidence, offices)        │
│    ├── Drawing tools (Collector: draw parcel boundary)│
│    └── Spatial queries (click parcel → details)       │
│                                                       │
│  Backend:                                             │
│    PostGIS 3.4                                        │
│    ├── Geometry columns (parcel polygons)             │
│    ├── Spatial indexes (GIST)                         │
│    ├── ST_Contains, ST_Intersects, ST_Buffer          │
│    ├── ST_Area (auto-calculate area from geometry)    │
│    └── GeoJSON API endpoints                          │
│                                                       │
│  Data Sources:                                        │
│    ├── Revenue maps (imported as GeoJSON)             │
│    ├── Survey boundaries                              │
│    ├── Project impact zones                           │
│    └── Field officer GPS tracks                       │
└─────────────────────────────────────────────────────┘
```

### 14.3 Spatial Operations

| Operation | Use Case | PostGIS Function |
|-----------|----------|-----------------|
| Parcel lookup by point | Click map → find parcel | `ST_Contains(geometry, point)` |
| Parcels in bbox | Map viewport → load parcels | `ST_Intersects(geometry, bbox)` |
| Buffer zone | Impact zone around corridor | `ST_Buffer(geometry, distance)` |
| Area calculation | Auto-compute area from geometry | `ST_Area(geometry)` |
| Intersection check | Does project affect this parcel? | `ST_Intersects(project_geom, parcel_geom)` |
| Corridor definition | Linear infrastructure path | `ST_MakeLine(points)` → `ST_Buffer(line, width)` |

### 14.4 Map Layers

| Layer | Content | Source | Update |
|-------|---------|--------|--------|
| Base map | OpenStreetMap tiles | External CDN | Always current |
| Revenue maps | Survey boundaries | Imported GeoJSON | Per project |
| Project parcels | Parcel polygons | PostGIS | Real-time |
| Project footprint | Project area polygon | PostGIS | Per project |
| Evidence markers | GPS points from field | PostGIS | Real-time |
| Office locations | Collector, Tehsil, FO offices | Static GeoJSON | Rare |

### 14.5 GIS Page Per Portal

| Portal | GIS Page | Key Features |
|--------|----------|-------------|
| Oversight | National GIS | All projects, zoom to state/district |
| RO | Project GIS | Project parcels, draw boundaries |
| State | State GIS | All state projects, district overlay |
| Collector | District GIS | District parcels, drawing tools, evidence |
| Tehsil | Tehsil GIS | Tehsil parcels, FO locations |
| Field Officer | Field Map | Assigned parcels, GPS navigation |
| SIA | SIA GIS | Impact zone overlay |
| R&R | R&R GIS | Resettlement sites |
| Citizen | Parcel Map | Own parcels, project locations |

---

## 15. DOCUMENT ARCHITECTURE

### 15.1 Document Types by Stage

| Stage | Required Documents | Creator |
|-------|-------------------|---------|
| `project_proposal` | Project proposal, feasibility report | Requiring Org |
| `land_requirement` | Land requirement schedule, revenue extracts | Requiring Org |
| `gis_identification` | GIS report, parcel map | Collector + Field |
| `submission` | Complete submission package | Requiring Org |
| `scrutiny` | Scrutiny order, compliance checklist | Collector |
| `sia` | SIA report, consultation records | SIA Expert |
| `preliminary_notification` | §11(1) notification draft, e-Gazette copy | Collector |
| `public_disclosure` | Public notice, display evidence | Collector |
| `objections_hearing` | Hearing records, objection decisions | Collector |
| `declaration` | §19(1) declaration order | Collector |
| `section_21_notice` | Individual §21 notices, service proof | Collector |
| `field_verification` | Field report, photos, GPS data, measurements | Field Officer |
| `compensation` | Compensation assessment sheet, market value report | Collector + Finance |
| `award` | Award order, appeal deadline notice | Collector |
| `payment` | Payment challan, PFMS reference, bank details | Finance |
| `possession` | Possession certificate, panchanama, photos | Collector + Field |
| `r_and_r` | R&R entitlement documents, site allocation | R&R Officer |

### 15.2 Document Storage

```
Prototype (Local):
  uploads/
  ├── projects/{projectId}/
  │   ├── documents/{docId}-{filename}
  │   └── evidence/{evidenceId}-{filename}
  └── public/
      └── notices/{noticeId}-{filename}

Production (S3):
  s3://bhoomisetu-{env}/
  ├── projects/{projectId}/
  │   ├── documents/
  │   └── evidence/
  └── public/
      └── notices/
```

### 15.3 Document Access Control

| Role | Can Upload | Can Download | Can Delete |
|------|-----------|-------------|-----------|
| Requiring Org | Project documents | Project documents | Own uploads |
| Collector | Any district document | Any district document | Any district document |
| Field Officer | Evidence only | Own evidence | Own evidence |
| SIA Expert | SIA documents | SIA documents | Own uploads |
| R&R Officer | R&R documents | R&R documents | Own uploads |
| Finance | Payment documents | Payment documents | Own uploads |
| Citizen | Objections, grievances | Own documents | No |
| Admin/Ministry | Any | Any | Any |

---

## 16. COMPENSATION ARCHITECTURE

### 16.1 Compensation Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Market Value │────▶│  Assessment  │────▶│    Award     │
│  Determination│     │  (Collector) │     │  (Collector) │
│              │     │              │     │              │
│  - Revenue   │     │  - solatium  │     │  - Order     │
│    records   │     │  - 100%      │     │  - Appeal    │
│  - Recent    │     │  - R&R       │     │    window    │
│    sales     │     │  - Total     │     │  (30 days)   │
│  - Circle    │     │              │     │              │
│    rate      │     └──────────────┘     └──────┬───────┘
└──────────────┘                                 │
                                                  │
┌──────────────┐     ┌──────────────┐     ┌──────▼───────┐
│  Possession  │◀────│   Payment    │◀────│   PFMS       │
│              │     │  (Finance)   │     │  Integration │
│  - Certificate│     │              │     │              │
│  - Panchanama│     │  - DBT/Cheque│     │  - Validate  │
│  - Photos    │     │  - UTR track │     │  - Process   │
│  - GPS       │     │  - Reconcile │     │  - Confirm   │
└──────────────┘     └──────────────┘     └──────────────┘
```

### 16.2 Compensation Calculation

Per RFCTLARR §26–§30:

```
Compensation = Market Value + Solatium (100% of Market Value)

Market Value determined by:
  1. Average of sale deeds in vicinity (last 3 years)
  2. Revenue circle rate (if no sale deeds)
  3. Any other relevant factor

Additional Entitlements (R&R, separate from compensation):
  - Housing allowance
  - Subsistence allowance (1 year)
  - Transportation allowance
  - Livelihood support (2 years for farmers)
  - Employment (1 member per family for project-affected families)
  - Skill development training
  - Special support for vulnerable groups (SC/ST, widows, disabled)
```

### 16.3 Payment State Machine

```
INITIATED → PENDING → SANCTIONED → DISBURSED
                                  → FAILED → RETRY → PENDING
                                  → ON_HOLD → RETRY → PENDING
```

**PFMS Stub Behavior** (for prototype):
- `POST /api/payments/initiate` → 80% success, 20% random failure
- Success returns `{ utr: "PFMS{random}", status: "sanctioned" }`
- Failure returns `{ status: "failed", reason: "Insufficient funds" }`
- After 3 retries, payment moves to `on_hold`

---

## 17. AUDIT ARCHITECTURE

### 17.1 Audit Event Schema

```typescript
type AuditEvent = {
  id: string;
  entityType: 'project' | 'parcel' | 'case' | 'objection' | 'award' | 'payment' | 'document' | 'grievance';
  entityId: string;
  actorId: string;
  actorName: string;
  actorRole: RoleId;
  action: string;           // e.g., 'stage_advance', 'document_upload', 'objection_filed'
  stage: LifecycleStage | null;
  before: Record<string, any> | null;  // State before change
  after: Record<string, any> | null;   // State after change
  ipAddress: string;
  timestamp: Date;
};
```

### 17.2 Audit Logging Strategy

**Every write operation** generates an audit event:

| Action | Audit Event | Before/After |
|--------|------------|-------------|
| Stage advance | `stage_advance` | `{ stage: before }` → `{ stage: after }` |
| Document upload | `document_upload` | null → `{ title, type, fileName }` |
| Objection filed | `objection_filed` | null → `{ grounds, status }` |
| Objection decided | `objection_decided` | `{ status: "under_review" }` → `{ status: "allowed"/"rejected" }` |
| Award passed | `award_passed` | `{ status: "draft" }` → `{ status: "approved" }` |
| Payment initiated | `payment_initiated` | null → `{ amount, mode }` |
| Payment completed | `payment_completed` | `{ status: "pending" }` → `{ status: "disbursed", utr }` |
| Possession recorded | `possession_recorded` | null → `{ date, method }` |
| Field evidence captured | `evidence_captured` | null → `{ type, gps }` |
| User login | `user_login` | null → `{ method }` |

### 17.3 Audit Trail Access

| Role | Scope | Can View |
|------|-------|---------|
| National Admin | National | All events |
| Ministry Nodal | Ministry | Ministry projects |
| State Nodal | State | State projects |
| Collector | District | District events |
| Tehsil | Tehsil | Tehsil events |
| Field Officer | Own | Own events only |
| SIA Expert | Assigned | Assigned project events |
| R&R Officer | Own | Own events only |
| Finance | Own | Own events only |
| Citizen | Own parcels | Own parcel/case events only |

### 17.4 Audit Log Retention

- **Prototype**: In-memory (demoStore) — lost on refresh
- **Production**: PostgreSQL `audit_events` table — retained for 7 years (RFCTLARR compliance)
- **Archive**: After 7 years, compress and move to cold storage

---

## 18. NOTIFICATION ARCHITECTURE

### 18.1 Notification Types

| Type | Trigger | Target | Priority |
|------|---------|--------|----------|
| `stage_advance` | Workflow stage completed | Related roles | info |
| `sla_warning` | SLA 80% elapsed | Responsible role | warning |
| `sla_breach` | SLA exceeded | Responsible role + supervisor | critical |
| `objection_filed` | Citizen files objection | Collector, Tehsil | action_required |
| `hearing_scheduled` | Hearing date set | All involved parties | info |
| `award_passed` | Award order issued | Finance, Citizen | info |
| `payment_initiated` | Payment started | Citizen, Finance | info |
| `payment_completed` | Payment disbursed | Citizen | payment |
| `payment_failed` | Payment failed | Finance, Collector | critical |
| `document_uploaded` | New document uploaded | Related roles | info |
| `grievance_filed` | Citizen files grievance | Collector, Tehsil | action_required |
| `possession_scheduled` | Possession date set | Field Officer, Citizen | info |
| `rr_update` | R&R status changed | R&R Officer, Citizen | info |

### 18.2 Notification Delivery

**Prototype**: In-app notifications only (stored in `notifications` table, rendered in UI)

**Production** (documented but not implemented):
- In-app notifications (primary)
- Email notifications (for SLA breaches, payments)
- SMS notifications (for citizens: payment, hearing, possession)

### 18.3 Notification Preferences

| Role | Default Notifications | Configurable |
|------|----------------------|-------------|
| Admin | All national events | Yes |
| Ministry | Ministry project events | Yes |
| State | State project events | Yes |
| Collector | District events, SLA breaches | Yes |
| Tehsil | Tehsil events, FO updates | Yes |
| Field Officer | Assigned task updates | Limited |
| SIA Expert | Assigned assessment updates | Limited |
| R&R Officer | R&R case updates | Yes |
| Finance | Payment events | Yes |
| Citizen | Own case events only | Yes |

---

## 19. TESTING STRATEGY

### 19.1 Testing Pyramid

```
         ┌─────────────┐
         │   E2E (5%)   │  → Critical user flows
         │  Cypress/Playwright│
         ├─────────────┤
         │ Integration   │  → API endpoint tests
         │   (25%)       │  → Supertest + Vitest
         ├─────────────┤
         │  Unit Tests   │  → Business logic, utils
         │   (70%)       │  → Vitest
         └─────────────┘
```

### 19.2 Test Coverage Targets

| Area | Coverage Target | Key Tests |
|------|----------------|-----------|
| Workflow engine | 100% | Gate validation, stage transitions, prerequisite checks |
| RBAC middleware | 100% | Role permissions, jurisdiction scoping, unauthorized access |
| Compensation calculation | 100% | Market value, solatium, R&R entitlements |
| Payment state machine | 100% | State transitions, retry logic, PFMS mock |
| API endpoints | 90% | CRUD, authorization, validation, error handling |
| GIS spatial queries | 80% | Point-in-polygon, bbox queries, area calculation |
| Frontend components | 70% | Render, interaction, state changes |
| E2E flows | Critical paths | Login → create project → advance workflow → payment → closure |

### 19.3 Critical Test Scenarios

1. **Workflow Gate Enforcement**: Cannot skip stages, cannot advance without prerequisites
2. **RBAC Bypass**: Cannot access unauthorized endpoints, cannot escalate privileges
3. **Jurisdiction Scoping**: State user cannot see other states' data
4. **Citizen Isolation**: Citizen can only see own parcels/cases
5. **Payment Integrity**: Payment cannot be initiated without approved award
6. **Document Upload**: File type validation, size limits, virus scan stub
7. **Concurrent Access**: Two users cannot approve the same award
8. **SLA Tracking**: SLA warnings fire at 80%, breaches at 100%
9. **Audit Completeness**: Every write operation generates audit event
10. **Offline Queue**: Field officer actions queue correctly, sync on reconnect

### 19.4 Test Data

- **Seed script**: `server/src/db/seed.ts` — creates 8 projects, 24 parcels, sample cases
- **Test fixtures**: Vitest factories for each entity
- **Mock integrations**: PFMS stub, Aadhaar stub, e-Gazette stub

---

## 20. PROTOTYPE IMPLEMENTATION ORDER

### 20.1 Phase Overview

The implementation follows 15 phases, ordered by dependency and risk. Each phase produces a working increment.

```
Phase 1:  Backend Foundation        (Week 1)
Phase 2:  Database & Auth           (Week 1)
Phase 3:  Workflow Engine           (Week 2)
Phase 4:  Core API Modules          (Week 2-3)
Phase 5:  GIS Foundation            (Week 3)
Phase 6:  Document System           (Week 3)
Phase 7:  Frontend — Auth & Nav     (Week 4)
Phase 8:  Frontend — Connect APIs   (Week 4-5)
Phase 9:  Collector Portal          (Week 5-6)
Phase 10: Field Officer App         (Week 6)
Phase 11: Citizen Portal            (Week 6-7)
Phase 12: Specialist Portals        (Week 7)
Phase 13: Dashboards & Analytics    (Week 7-8)
Phase 14: Testing & Polish          (Week 8)
Phase 15: Seed Data & Demo          (Week 8)
```

### 20.2 Detailed Phase Plan

#### Phase 1: Backend Foundation
**Goal**: Express server running with TypeScript, health check endpoint

- [ ] Initialize `server/` directory with package.json
- [ ] Configure TypeScript, ESLint, Prettier
- [ ] Set up Express app with middleware stack
- [ ] Create health check endpoint `GET /api/health`
- [ ] Set up environment configuration (.env)
- [ ] Configure CORS for frontend dev server

**Files**: `server/src/app.ts`, `server/src/server.ts`, `server/package.json`

#### Phase 2: Database & Auth
**Goal**: PostgreSQL + PostGIS running, JWT auth working

- [ ] Set up PostgreSQL + PostGIS (Docker Compose)
- [ ] Create Drizzle schema from entity model (Section 9)
- [ ] Run initial migration
- [ ] Implement auth module: login, refresh, me
- [ ] Implement JWT middleware
- [ ] Implement RBAC middleware
- [ ] Create seed script with sample data

**Files**: `server/src/db/schema.ts`, `server/src/modules/auth/`, `server/src/middleware/auth.ts`, `server/src/middleware/rbac.ts`

#### Phase 3: Workflow Engine
**Goal**: Server-enforced workflow gates

- [ ] Consolidate `stages.ts` + `workflowTypes.ts` into single canonical engine
- [ ] Implement gate matrix in `server/src/modules/workflow/gates.ts`
- [ ] Implement `POST /api/workflow/:projectId/advance` endpoint
- [ ] Add prerequisite validation
- [ ] Add authority validation
- [ ] Add document requirement validation
- [ ] Add SLA tracking
- [ ] Generate audit events on stage transitions

**Files**: `server/src/modules/workflow/`, `src/lib/workflow.ts` (consolidated frontend)

#### Phase 4: Core API Modules
**Goal**: CRUD for all entities

- [ ] Projects API (CRUD, scope-filtered)
- [ ] Parcels API (CRUD, jurisdiction-scoped)
- [ ] Cases API (CRUD)
- [ ] Objections API (file, decide, track)
- [ ] Awards API (create, approve)
- [ ] Payments API (initiate, retry, reconcile)
- [ ] Possession API (record, list)
- [ ] R&R API (cases, components, update)
- [ ] Grievances API (file, assign, resolve)
- [ ] Users API (CRUD, admin only)

**Files**: `server/src/modules/projects/`, `server/src/modules/parcels/`, etc.

#### Phase 5: GIS Foundation
**Goal**: PostGIS spatial queries working, GeoJSON API

- [ ] Add geometry columns to parcels table
- [ ] Create spatial indexes
- [ ] Implement `GET /api/gis/parcels` (GeoJSON)
- [ ] Implement `GET /api/gis/parcels/bbox` (bounding box query)
- [ ] Implement `POST /api/gis/parcels/:id/geometry` (set geometry)
- [ ] Import sample parcel geometries (from mock coordinates → polygons)
- [ ] Test spatial queries (ST_Contains, ST_Intersects)

**Files**: `server/src/modules/gis/`, database migration

#### Phase 6: Document System
**Goal**: File upload/download working

- [ ] Set up local file storage (`uploads/` directory)
- [ ] Implement `POST /api/documents/upload` (multipart)
- [ ] Implement `GET /api/documents/:id/download`
- [ ] Add file type validation
- [ ] Add file size limits
- [ ] Implement field evidence upload (`POST /api/evidence`)
- [ ] Link documents to entities

**Files**: `server/src/modules/documents/`, `server/src/modules/field-evidence/`

#### Phase 7: Frontend — Auth & Navigation
**Goal**: Login working, navigation generated from config

- [ ] Create auth context/provider
- [ ] Implement login page (connect to API)
- [ ] Create route guards (redirect unauthorized)
- [ ] Consolidate 10 nav configs into single nav generator
- [ ] Refactor Sidebar.tsx to use nav config
- [ ] Update session store to use JWT
- [ ] Remove mock role switching

**Files**: `src/contexts/AuthContext.tsx`, `src/components/shell/Sidebar.tsx`, `src/config/nav.ts`

#### Phase 8: Frontend — Connect APIs
**Goal**: Replace all mock data imports with API calls

- [ ] Create API client (`src/lib/api.ts`) with JWT interceptor
- [ ] Create React Query hooks for each entity
- [ ] Replace mock data in dashboard pages
- [ ] Replace mock data in list pages
- [ ] Replace mock data in detail pages
- [ ] Remove all `*Data.ts` mock files
- [ ] Update Zustand stores to use API data

**Files**: `src/lib/api.ts`, `src/hooks/useProjects.ts`, etc.

#### Phase 9: Collector Portal
**Goal**: Collector portal fully functional with real workflow

- [ ] Collector Dashboard (API-connected)
- [ ] Project workspace with workflow stepper
- [ ] Scrutiny page (review and approve)
- [ ] Notification management (issue §11(1))
- [ ] Objection hearing (file decision)
- [ ] Declaration (issue §19(1))
- [ ] Field verification monitoring
- [ ] Compensation assessment
- [ ] Award approval
- [ ] Possession recording
- [ ] Grievance management
- [ ] GIS page with polygon support

**Files**: `src/features/collector-cala/*` (refactored)

#### Phase 10: Field Officer App
**Goal**: Mobile-first task app with offline support

- [ ] PWA configuration (manifest, service worker)
- [ ] FoHomePage (API-connected)
- [ ] FoTasksPage (API-connected)
- [ ] FoTaskDetailPage (tabbed workspace)
- [ ] GPS capture (browser Geolocation API)
- [ ] Photo capture (camera API)
- [ ] Measurement recording
- [ ] Owner verification
- [ ] Task submission
- [ ] Offline queue (IndexedDB)
- [ ] Sync page

**Files**: `src/features/field-officer/*` (refactored to 8 pages)

#### Phase 11: Citizen Portal
**Goal**: Public portal with citizen auth and case tracking

- [ ] Citizen Shell (keep existing)
- [ ] Phone OTP login (mock)
- [ ] Project search (API-connected)
- [ ] Notice display
- [ ] Case status tracker
- [ ] My case dashboard
- [ ] My land details with map
- [ ] Compensation details
- [ ] Objection filing
- [ ] Grievance filing
- [ ] Transparency data

**Files**: `src/features/citizen/*` (refactored to 16 pages)

#### Phase 12: Specialist Portals
**Goal**: SIA, R&R, Finance portals functional

- [ ] SIA Expert: Assessment workspace (tabbed)
- [ ] R&R Officer: Case workspace (tabbed, 6 pages)
- [ ] Finance: Award review, payment processing
- [ ] Tehsil: Coordination, field oversight
- [ ] State Nodal: Monitoring-only dashboard
- [ ] Oversight: Admin + Ministry merged

**Files**: `src/features/sia-expert/*`, `src/features/rr-officer/*`, `src/features/finance-officer/*`, etc.

#### Phase 13: Dashboards & Analytics
**Goal**: All dashboards generated from real data

- [ ] National dashboard (API aggregation)
- [ ] State dashboard (state-scoped aggregation)
- [ ] District dashboard (district-scoped aggregation)
- [ ] Tehsil dashboard (tehsil-scoped aggregation)
- [ ] Role-specific KPIs computed from workflow state
- [ ] SLA tracking widgets (computed, not hardcoded)
- [ ] Risk indicators (computed from data)

**Files**: `src/features/*/Dashboard*Page.tsx` (all refactored)

#### Phase 14: Testing & Polish
**Goal**: Critical paths tested, UI polished

- [ ] Workflow gate tests (100% coverage)
- [ ] RBAC tests (100% coverage)
- [ ] API endpoint tests (90% coverage)
- [ ] E2E: Login → Create Project → Advance Workflow → Payment → Close
- [ ] E2E: Citizen → File Objection → Track Status
- [ ] E2E: Field Officer → Complete Task → Sync
- [ ] UI polish: loading states, error states, empty states
- [ ] Responsive design audit (mobile, tablet, desktop)

#### Phase 15: Seed Data & Demo
**Goal**: Rich demo data for hackathon presentation

- [ ] Seed 8 projects across 3 states
- [ ] Seed 24 parcels with realistic data
- [ ] Seed cases at various stages
- [ ] Seed objections, awards, payments
- [ ] Seed audit trail
- [ ] Demo mode: role gallery → instant access
- [ ] Presentation flow: key scenarios to demonstrate

---

## APPENDIX A: STATUTORY REFERENCE MAP

| RFCTLARR Section | Workflow Stage | Action |
|-----------------|---------------|--------|
| §4 | Project Proposal | SIA preparation |
| §4(1) | Land Requirement | Land identification |
| §6 | Submission | Submit to Collector |
| §7 | Scrutiny | Collector scrutiny |
| §7(2) | Scrutiny | Tehsil support |
| §11 | Preliminary Notification | §11(1) notification |
| §11(3) | Public Disclosure | Public display |
| §15 | Objections | Hearing of objections |
| §17 | Objections | Citizen right to be heard |
| §19 | Declaration | §19(1) declaration |
| §20 | Field Verification | Survey & measurement |
| §21 | Section 21 Notice | Individual notice |
| §23 | Award | Award enquiry |
| §26–§30 | Compensation | Determination of compensation |
| §30 | Compensation | R&R entitlements |
| §31–§33 | Payment | Payment & possession |
| §37 | Award | Award by LAA |
| §38 | Possession | Taking possession |
| §42 | Grievance | Grievance redressal |
| §48 | Monitoring | Central/State monitoring |
| §49 | Closed | Completion |
| Ch. II (§4–§9) | SIA | Social Impact Assessment |
| Ch. V–VI | R&R | Rehabilitation & Resettlement |

---

## APPENDIX B: MOCK INTEGRATION INTERFACES

### PFMS Stub
```typescript
// POST /api/payments/:id/initiate
// Simulates: Public Financial Management System
// Behavior: 80% success, 20% random failure
interface PFMSResponse {
  utr: string;           // "PFMS20260910XXXXX"
  status: 'sanctioned' | 'failed';
  reason?: string;       // "Insufficient funds", "Account frozen"
  timestamp: string;
}
```

### ULPIN Stub
```typescript
// GET /api/ulpin/:parcelId
// Simulates: Unique Land Parcel Identification Number
interface ULPINResponse {
  ulpin: string;         // "MH1234567890"
  verified: boolean;
  village: string;
  surveyNo: string;
  areaHa: number;
}
```

### e-Gazette Stub
```typescript
// POST /api/gazette/publish
// Simulates: Electronic Gazette notification
interface GazetteResponse {
  gazetteId: string;     // "GAZETTE/2026/MH/1234"
  url: string;           // "https://egazette.gov.in/..."
  publishedAt: string;
}
```

### Aadhaar Stub
```typescript
// POST /api/aadhaar/verify
// Simulates: Aadhaar identity verification
interface AadhaarResponse {
  verified: boolean;
  name: string;
  masked: string;        // "XXXX-XXXX-1234"
}
```

---

*End of Blueprint*
