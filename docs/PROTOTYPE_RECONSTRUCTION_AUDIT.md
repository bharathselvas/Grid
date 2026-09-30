# PROTOTYPE RECONSTRUCTION AUDIT — Terranex

> Generated: 2026-09-10
> Scope: Complete forensic audit of the Terranex repository before reconstruction

---

## EXECUTIVE SUMMARY

Terranex V2 is a **frontend-only React SPA** with no backend, no database, no authentication, and no real API connectivity. All data is hardcoded in TypeScript mock files and managed via Zustand client-side stores. The application has **~310+ routes** across **11 role-based portals**, each with its own complete navigation and page set.

### Critical Findings

| Finding | Severity | Detail |
|---------|----------|--------|
| No backend | CRITICAL | No server, no API, no database, no PostGIS |
| No authentication | CRITICAL | Role switching is a client-side Zustand store toggle |
| All data is mocked | HIGH | Hardcoded TypeScript objects, not generated from seed scripts |
| Two duplicate workflow engines | HIGH | `src/lib/stages.ts` AND `src/features/demo/workflowTypes.ts` define parallel stage systems |
| No server-side RBAC | CRITICAL | `canAccess()` in rbac.ts is frontend-only; any user can bypass via DevTools |
| Massive route count | MEDIUM | ~310+ routes, many underutilized or near-duplicate pages |
| No file uploads | MEDIUM | Documents shown as metadata only; no upload/download functionality |
| No GIS geometry operations | HIGH | Leaflet map shows point markers only; no polygon drawing, spatial intersection, or PostGIS queries |
| No project creation backend | HIGH | CreateProjectPage is a multi-step form that submits to nothing |

---

## 1. EXISTING FRONTEND ANALYSIS

### 1.1 Technology Stack

- **Framework**: React 18.3 + TypeScript 5.6
- **Build**: Vite 5
- **Styling**: Tailwind CSS 3.4 + shadcn/ui (Radix primitives)
- **State**: Zustand 4.5 (client-side stores)
- **Routing**: React Router 6 (createBrowserRouter)
- **Maps**: Leaflet 1.9 + React-Leaflet 4
- **Charts**: Recharts 2.12
- **Icons**: lucide-react

### 1.2 Route Map (by portal)

| Portal | Route Prefix | # Routes | Notes |
|--------|-------------|----------|-------|
| Shared/Common | `/app/overview`, `/app/cases`, etc. | 8 | Generic pages shown to roles without dedicated nav |
| National Admin | `/app/admin/*` | 14 | Full admin dashboard |
| Ministry Nodal | `/app/ministry/*` | 18 | Ministry monitoring |
| Requiring Org | `/app/ro/*` | 16 | Project proponent |
| State Nodal | `/app/state-nodal/*` | 24 | State coordination |
| District Collector/CALA | `/app/collector/*` | 26 | District acquisition authority |
| Tehsil/SDO | `/app/tehsil/*` | 25 | Sub-division operations |
| Field Officer | `/app/fo/*` | 27 | Mobile-first field tasks |
| SIA Expert | `/app/sia/*` | 22 | Social Impact Assessment |
| R&R Officer | `/app/rr/*` | 27 | Rehabilitation & Resettlement |
| Finance Officer | `/app/finance/*` | 20 | Payment operations |
| Citizen Portal | `/citizen/*` | 20 | Separate shell |
| **Total** | | **~310+** | |

### 1.3 Navigation Architecture

The `Sidebar.tsx` component (860 lines) contains **10 separate navigation configuration objects** — one per role. Each is a complete object literal with grouped sections. The sidebar renders the correct nav based on `useSessionStore().roleId` via a chain of if/else conditions.

**Problem**: Massive code duplication. Each nav object duplicates similar patterns. The sidebar alone is a maintenance burden.

### 1.4 Data Flow

```
Hardcoded TypeScript objects (mocks/*.ts, features/*/xxxData.ts)
        ↓
Zustand stores (stores/sessionStore.ts, stores/caseStore.ts, features/demo/demoStore.ts)
        ↓
React components read directly from stores
        ↓
No API calls anywhere in the codebase
```

There is **zero** `fetch()`, `axios`, or any HTTP client usage in the entire codebase. Every page reads directly from mock data imports or Zustand stores.

---

## 2. EXISTING 11 ROLES

### 2.1 Role Definition Table

| # | Role ID | Label | Level | Scope | Login Experience | Real Responsibility | Required? | Changes |
|---|---------|-------|-------|-------|-----------------|---------------------|-----------|---------|
| 1 | `national_admin` | National Admin / DoLR | 1 | National | Full admin dashboard with 14 pages | National oversight, audit, organization mgmt | YES — merge with Ministry into "Oversight" portal or keep separate | Simplify admin pages; many show mock data |
| 2 | `ministry_nodal` | Ministry Nodal Officer | 2 | Ministry | Full ministry dashboard with 18 pages | Ministry-level sanctions, monitoring | YES — but significantly overlap with Admin | MERGE with National Admin into shared oversight portal with different scope |
| 3 | `requiring_org` | Requiring Organization | 3 | Project | Full RO dashboard with 16 pages + project workspace | Create projects, submit for acquisition | YES | Keep but restructure project creation |
| 4 | `state_nodal` | State Nodal Officer | 4 | State | Full state dashboard with 24 pages | State coordination, district routing | YES — but overlaps with Collector | Keep as monitoring/routing; remove operational pages that duplicate Collector |
| 5 | `collector_cala` | District Collector / CALA | 5 | District | Full collector dashboard with 26 pages | SCRUTINY, NOTIFICATIONS, OBJECTIONS, AWARDS, COMPENSATION — the central statutory authority | YES — CORE ROLE | Keep as central operational hub |
| 6 | `tehsil_sdo` | Tehsil / SDO | 6 | Tehsil | Full tehsil dashboard with 25 pages | Sub-division scrutiny, field coordination | YES but OVERBUILT | Reduce to essential coordination + field oversight pages |
| 7 | `field_officer` | Field Officer / VAO | 7 | Village | Full FO dashboard with 27 pages | Field verification, evidence capture, possession | YES — CORE ROLE | Restructure as mobile-first task app; remove desktop-only pages |
| 8 | `sia_expert` | SIA Expert Group | 8 | District | Full SIA dashboard with 22 pages | Independent SIA | YES | Keep but simplify; consolidate assessment workflow pages |
| 9 | `rnr_officer` | R&R Officer | 9 | District | Full R&R dashboard with 27 pages | Rehabilitation & Resettlement | YES | Consolidate; too many separate component pages |
| 10 | `finance_officer` | Finance / Payment Officer | 10 | District | Full finance dashboard with 20 pages | Compensation payment processing | YES | Keep but simplify; mock PFMS integration |
| 11 | `citizen` | Citizen / Landowner | 11 | Village | Separate citizen portal with 20 pages | Track status, file objections, view notices | YES | Separate shell is CORRECT; simplify some pages |

### 2.2 Role Overlap Analysis

**National Admin ↔ Ministry Nodal**: Both are oversight/monitoring roles. The Ministry Nodal Officer monitors specific ministry projects; National Admin (DoLR) has cross-ministry oversight. They should share a portal with different scope filters.

**State Nodal ↔ District Collector**: State Nodal currently has 24 pages covering many operational functions (SIA monitoring, notification monitoring, objections monitoring, compensation, possession, R&R) that are actually the Collector's responsibility. State Nodal should be a **monitoring/routing** portal, not an operational duplicate.

**Tehsil SDO ↔ Collector**: Tehsil SDO has 25 pages that heavily overlap with the Collector's pages (field verification, objection support, compensation support, possession, R&R). Tehsil should be simplified to: overview, assigned work, field officer coordination, and village-level records.

**R&R Officer ↔ Collector**: R&R Officer has 27 pages — the most of any role. Many are one-component-per-page (housing, subsistence, transportation, livelihood, employment, skill dev, special support). These should be consolidated into a single R&R case workspace.

**Finance Officer**: Has 20 pages for payment operations. This is reasonable but could be consolidated.

### 2.3 Recommended Portal Structure (Post-Reconstruction)

```
1. OVERSIGHT PORTAL       — National Admin + Ministry Nodal (shared, scope-filtered)
2. REQUIRING ORG PORTAL   — Project proponent (create, submit, monitor)
3. STATE PORTAL           — State Nodal (monitoring, routing, oversight)
4. DISTRICT PORTAL        — Collector/CALA (central operational hub)
5. TEHSIL PORTAL          — Tehsil/SDO (coordination, field oversight)
6. FIELD OFFICER APP      — Mobile-first PWA (task-oriented)
7. SIA PORTAL             — SIA Expert (assessment workflow)
8. R&R PORTAL             — R&R Officer (case management)
9. FINANCE PORTAL         — Finance Officer (payment processing)
10. CITIZEN PORTAL        — Public-facing (separate shell, no govt login)
```

**Reduction: 11 → 10 portals** (merge Admin + Ministry). Some portals can share components.

---

## 3. WORKFLOW ENGINE ANALYSIS

### 3.1 Two Competing Workflow Systems

**System A** (`src/lib/stages.ts`):
- 17 stages defined in `STAGES` array
- Uses `LifecycleStage` type from `domain.ts`
- Has `STAGE_ORDER`, `STAGE_BY_ID`, `nextStage()`, `prevStage()`
- Referenced by: mock data, parcels, cases, documents

**System B** (`src/features/demo/workflowTypes.ts`):
- 17 stages defined in `STAGE_ORDER` array
- Uses `WorkflowStage` type
- Has `STAGE_GATES` with prerequisites and owners
- Has `getStageStatus()`, `canAdvanceStage()`
- Referenced by: demo store, demo pages, project workspace

**These two systems use different stage names:**

| System A (stages.ts) | System B (workflowTypes.ts) |
|----------------------|----------------------------|
| `project_proposal` | `proposal` |
| `land_requirement` | `requirement` |
| `gis_identification` | `gis_identification` |
| `submission` | `submission` |
| `scrutiny` | `scrutiny` |
| `sia` | `sia` |
| `preliminary_notification` | `section_11` |
| `public_disclosure` | `disclosure` |
| `objections_hearing` | `objections` |
| `declaration` | `section_19` |
| `field_verification` | `field_verification` |
| `compensation` | `compensation` |
| `award` | `award` |
| `payment` | `payment` |
| `possession` | `possession` |
| `r_and_r` | `r_and_r` |
| `closed` | `closed` |

**Impact**: Domain types use System A's `LifecycleStage`. Demo workflow uses System B's `WorkflowStage`. This means the parcel-level workflow (`DemoParcel.currentStage`) uses different stage names than the project-level workflow. This is a fundamental inconsistency.

### 3.2 Workflow Gate System (System B)

The demo workflow engine in `workflowTypes.ts` defines gates:

```typescript
section_11: { requires: ["sia"], owner: "cala", label: "Section 11 Notification" }
```

This means: "To advance to Section 11, SIA must be completed, and only CALA can advance."

**However**: This gate system exists only in the frontend. There is no server to enforce it. A user could modify the Zustand store via DevTools and skip any gate.

The `workflowEngine.ts` provides `canRoleAdvance()` which checks gates — but this is purely client-side.

### 3.3 Correct Workflow (per RFCTLARR Act)

The actual statutory workflow should be:

```
1.  Project Proposal (RO creates)
2.  Land Requirement (RO defines)
3.  GIS Identification (Collector/Field)
4.  Submission to Collector (RO submits)
5.  Scrutiny by Collector (CALA reviews)
6.  SIA (Independent expert group)
7.  Section 11(1) Preliminary Notification (Collector issues)
8.  Public Disclosure / Section 11(3) (System/Collector)
9.  Objection Window (Citizen files, Collector hears)
10. Section 19(1) Declaration (Collector declares)
11. Section 21 Notice (Collector serves individual notice)
12. Field Verification & Survey (Field Officer)
13. Compensation Assessment (Collector + Finance)
14. Award (Collector as LAA)
15. Payment (Finance/PFMS)
16. Possession (Collector + Field)
17. R&R (R&R Officer)
18. Closure (Collector)
```

**Note**: The current workflow is missing `Section 21 Notice` as a distinct stage. This is a legally required step between Declaration and Field Verification.

---

## 4. MOCK DATA INVENTORY

### 4.1 Data Files

| File | Lines | Content | Quality |
|------|-------|---------|---------|
| `mocks/projects.ts` | 148 | 8 projects across MH, MP, OD | Good realistic data |
| `mocks/parcels.ts` | 485 | 24 parcels with owners, coords, amounts | Good realistic data |
| `mocks/cases.ts` | — | Case records | Exists |
| `mocks/audit.ts` | — | Audit events | Exists |
| `mocks/officers.ts` | — | Officer records | Exists |
| `features/demo/demoData.ts` | 279 | Demo project, parcels, SIA, objections, awards, payments, possession, R&R, documents, audit, notifications | Good but uses WorkflowStage (System B) |
| `features/*/xxxData.ts` | Various | Per-role hardcoded data | Each role has its own data file |

### 4.2 Data Consistency Issues

- `MOCK_PARCELS` (system A types) and `INITIAL_DEMO_PARCELS` (system B types) are **separate datasets** with different schemas
- Parcel coordinates are roughly realistic but single-point markers, not polygon geometries
- No GeoJSON, no shapefiles, no spatial data formats
- No database seeding scripts — all data is TypeScript imports

---

## 5. PAGE-BY-PAGE ASSESSMENT

### 5.1 National Admin Pages (14 pages)

| Page | File | Data Source | Real Functionality | Verdict |
|------|------|-------------|-------------------|---------|
| NationalOverviewPage | Mock data | KPIs, charts | Dashboard with hardcoded numbers | RESTRUCTURE — generate from data |
| NationalMonitoringPage | Mock data | Project list | Shows mock projects | KEEP but connect to data |
| NationalGisPage | Leaflet map | Mock parcels | Map with markers | RESTRUCTURE — needs polygon support |
| RiskDelayMonitorPage | Mock data | Risk indicators | Risk cards | SIMPLIFY |
| OrganizationsPage | Mock data | Org list | Organization management | MOCK — needs backend |
| UsersRolesPage | Mock data | User list | User management | MOCK — needs backend |
| HierarchyViewPage | Mock data | Hierarchy tree | Org hierarchy | SIMPLIFY |
| WorkflowConfigPage | Mock data | Config | Workflow configuration | FUTURE |
| DocumentRepositoryPage | Mock data | Document list | Document repository | RESTRUCTURE — needs upload |
| AuditTrailPage | Mock data | Audit events | Audit trail | KEEP but connect to audit store |
| IntegrationsPage | Mock data | Integration status | External system status | MOCK — integration boundaries |
| AlertsPage | Mock data | Alerts | Alert management | SIMPLIFY |
| ReportsPage | Mock data | Reports | Report generation | FUTURE |
| ProjectDetailPage | Mock data | Project detail | Single project view | KEEP |

### 5.2 Field Officer Pages (27 pages)

| Page | Purpose | Verdict |
|------|---------|---------|
| FoHomePage | Dashboard | KEEP — restructure as mobile home |
| FoTasksPage | Task list | KEEP — core function |
| FoTaskDetailPage | Task detail | KEEP — core function |
| FoFieldVisitPage | Field visit form | KEEP |
| FoGpsCapturePage | GPS capture | KEEP |
| FoPhotoCapturePage | Photo capture | KEEP |
| FoPhotoGalleryPage | Photo gallery | SIMPLIFY |
| FoDocumentsPage | Document upload | KEEP |
| FoOwnerVerifyPage | Owner verification | KEEP — core function |
| FoAssetsPage | Asset verification | KEEP |
| FoMeasurementPage | Measurement | KEEP |
| FoObservationsPage | Observations | SIMPLIFY — merge with task detail |
| FoInteractionPage | Landowner interaction | SIMPLIFY — merge with task detail |
| FoObjectionEvidencePage | Objection evidence | KEEP |
| FoPossessionPage | Possession | KEEP |
| FoRnrPage | R&R field data | KEEP |
| FoSubmitPage | Submit work | KEEP |
| FoReportPage | Reports | SIMPLIFY |
| FoReverificationPage | Re-verification | KEEP |
| FoMapPage | Field map | KEEP |
| FoCompletedPage | Completed tasks | SIMPLIFY — merge with tasks |
| FoPerformancePage | Performance metrics | FUTURE |
| FoNotificationsPage | Notifications | SIMPLIFY — use shared notifications |
| FoSyncPage | Sync center | KEEP — offline support |
| FoAuditPage | Audit trail | SIMPLIFY |
| FoRoleBoundaryPage | Role boundaries | REMOVE — informational only |
| FoOfflinePage | Offline mode | KEEP |

**Assessment**: 27 pages is too many for a field officer mobile app. The field officer needs a **task-centric** flow, not a page-per-feature. Many pages (observations, interaction, assets, measurement) should be sections within a task detail page, not separate routes.

### 5.3 R&R Officer Pages (27 pages)

| Category | Pages | Verdict |
|----------|-------|---------|
| Workspace (5) | Dashboard, Work Queue, Cases, Project Overview, Map | SIMPLIFY — 3 pages sufficient |
| Beneficiaries (3) | Families, Vulnerability, Verification | MERGE into case workspace |
| Components (8) | Housing, Subsistence, Transportation, Livelihood, Employment, Skill Dev, Special Support, All Components | MERGE into single component tracker |
| Resettlement (3) | Sites, Site Readiness, Allocation | MERGE into case workspace |
| Coordination (4) | Field Coordination, Requests, Evidence, Grievances | MERGE into case workspace |
| Records (6) | Completion, MIS, Audit, Workflow, Notifications, Role | SIMPLIFY — 2 pages sufficient |

**Assessment**: 27 pages for R&R is extreme over-engineering. The R&R officer needs: a case list, a case workspace with all components, and a map. That's 3-4 pages maximum.

### 5.4 Citizen Portal (20 pages)

| Page | Purpose | Verdict |
|------|---------|---------|
| CitizenHomePage | Landing page | KEEP — good public-facing design |
| CitizenLoginPage | Login | SIMPLIFY — use Aadhaar-based or OTP |
| CitizenProjectSearchPage | Search projects | KEEP |
| CitizenProjectPage | Project detail | KEEP |
| CitizenNoticesPage | View notices | KEEP |
| CitizenNoticeDetailPage | Notice detail | KEEP |
| CitizenCaseSearchPage | Search case status | KEEP |
| CitizenTransparencyPage | Transparency data | KEEP |
| CitizenHelpPage | Help/FAQ | KEEP |
| CitizenNotificationsPage | Notifications | KEEP |
| CitizenDashboardPage | My case dashboard | KEEP |
| CitizenMyLandPage | My land details | KEEP |
| CitizenParcelMapPage | Map view | KEEP |
| CitizenTimelinePage | Timeline view | KEEP |
| CitizenCurrentStatusPage | Current status | KEEP |
| CitizenCompensationPage | Compensation info | KEEP |
| CitizenPaymentStatusPage | Payment status | KEEP |
| CitizenDocumentsPage | My documents | KEEP |
| CitizenObjectionFlowPage | File objection | KEEP — core function |
| CitizenObjectionTrackingPage | Track objection | KEEP |
| CitizenGrievanceFlowPage | File grievance | KEEP — core function |
| CitizenGrievanceTrackingPage | Track grievance | KEEP |
| CitizenRnRPage | R&R info | KEEP |

**Assessment**: The citizen portal is the best-structured part of the application. The separate shell (`CitizenShell`) is architecturally correct. Most pages are necessary for a real public portal.

---

## 6. FEATURE DISPOSITION MATRIX

### KEEP (Core workflow — required)
- Project creation wizard (restructured)
- Project workspace (restructured)
- GIS parcel map (with polygon support added)
- Workflow engine with gates (consolidated from two systems)
- Parcel-level tracking
- Field officer task assignment
- GPS/photo capture
- Document upload per entity
- Objection filing and tracking
- Grievance filing and tracking
- Award workflow (draft → approve)
- Payment state machine (mock PFMS)
- Possession with evidence
- R&R case tracking
- Audit trail generation
- Citizen portal (separate shell)
- Notification system

### RESTRUCTURE (Useful but wrong place/implementation)
- All 10 role-specific nav configs → shared nav config generator
- Two workflow engines → single consolidated engine
- 27 FO pages → 8-10 mobile-first pages
- 27 R&R pages → 4-5 case-centric pages
- Sidebar component → data-driven nav generator
- Per-role data files → single seed data system
- Dashboards → generated from actual data, not hardcoded

### SIMPLIFY (Useful but over-complicated)
- Admin pages (14 → 6)
- Ministry pages (18 → 8)
- State Nodal pages (24 → 10)
- Collector pages (26 → 14)
- Tehsil pages (25 → 10)
- Finance pages (20 → 10)
- SIA pages (22 → 10)
- Risk/Delay pages → rule-based flags, not full pages
- MIS/Reports pages → shared reporting module

### MOCK (Integration boundaries for prototype)
- PFMS integration stub
- DILRMP / ULPIN integration stub
- e-Gazette notification publishing stub
- Bhoomi Rashi interoperability stub
- PM Gati Shakti spatial data stub
- Aadhaar verification stub

### REMOVE (Doesn't solve the problem)
- FoRoleBoundaryPage (informational text, not functional)
- Multiple "Role Boundary" pages across roles (all are informational only)
- Overly granular R&R component pages (8 separate pages for 8 entitlement types)
- Duplicate navigation configs (10 separate objects doing the same thing)
- DemoControls (development artifact)

### FUTURE (Real-world useful but out of prototype scope)
- WorkflowConfigPage (admin workflow customization)
- Advanced reporting/PDF generation
- Real-time WebSocket updates
- Multi-language support
- Mobile native app (PWA is sufficient for prototype)
- Historical analytics / trend data

---

## 7. ARCHITECTURE ASSESSMENT

### What Exists
```
Frontend SPA (React)
├── 11 role-based portals (client-side switching)
├── 10 separate navigation configs
├── 2 workflow engines (inconsistent)
├── Zustand stores (session, cases, demo)
├── Mock data files (per-role)
├── Leaflet map (point markers only)
├── Recharts dashboards
└── No backend, no API, no auth, no DB
```

### What's Needed
```
Backend (Node.js/Express or Python/FastAPI)
├── PostgreSQL + PostGIS
├── Authentication (JWT + RBAC middleware)
├── Workflow engine (server-enforced gates)
├── REST API (domain modules)
├── File upload (documents, photos)
├── Audit logging
└── Seed data scripts

Frontend (Refactored React)
├── 10 portals (merged Admin+Ministry)
├── Shared nav config generator
├── Single workflow engine
├── API-connected stores (replace mocks)
├── Polygon-based GIS
├── Mobile-first FO app
└── Public citizen portal
```

---

## 8. CRITICAL PATH FORWARD

### Phase 0: Audit + Blueprint (CURRENT)
- Produce this audit ✓
- Produce reconstruction blueprint
- Review and approve

### Phase 1: Backend Foundation
- Set up Express/FastAPI + PostgreSQL + PostGIS
- Auth system with JWT
- RBAC middleware
- Database schema (all domain entities)
- Seed data scripts

### Phase 2: Workflow Engine
- Server-enforced stage transitions
- Gate validation
- Audit trail generation
- Parcel-level workflow

### Phase 3: Frontend Restructure
- Consolidate workflow engines
- Generate nav from config
- Connect to real APIs
- Remove mock data imports

### Phase 4: Feature Implementation
- Project creation with GIS
- Field officer mobile PWA
- Citizen portal
- Dashboards from real data

---

*End of Audit*
