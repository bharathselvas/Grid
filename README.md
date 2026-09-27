# Bhoomi Setu V2 — National Land Acquisition Operating System

**SIH 2026 · Problem Statement 26016 · Department of Land Resources (DoLR), Government of India**

> **Current Status**: Frontend-first prototype (MVP). No backend is currently implemented; all data is served via realistic mocked state using Zustand stores.

## 1. Overview

Bhoomi Setu is a national operating system designed to digitize and streamline the **complete land acquisition lifecycle** under the Right to Fair Compensation and Transparency in Land Acquisition, Rehabilitation and Resettlement (RFCTLARR) Act, 2013.

It serves as a single source of truth across the administrative hierarchy, connecting project proponents, national and state ministries, district collectors (CALA), field officers, and affected citizens. It transforms a heavily paper-based, fragmented process into a transparent, auditable, and time-bound digital workflow.

## 2. Problem Statement

Land acquisition in India under the RFCTLARR Act involves multiple stakeholders, complex statutory timelines, massive documentation, and coordination across national, state, district, and village levels. Currently, the lack of a unified digital platform leads to:
- Significant delays in project execution due to communication gaps.
- Opaque processes resulting in grievances and litigation from landowners.
- Challenges in monitoring progress at the national/state level.
- Disconnected systems for land records (DILRMP), project planning (PM Gati Shakti), and payments (PFMS).

## 3. Goals

- Provide a single unified platform for 11 distinct roles across the land acquisition lifecycle.
- Enforce statutory timelines (SLAs) with automated alerts and risk monitoring.
- Ensure transparent access to information and compensation tracking for citizens/landowners.
- Enable spatial visibility of land parcels through GIS integration.
- Maintain a strict, immutable audit trail of all decisions and document uploads.

## 4. Non-Goals

- This project is **not** a replacement for the core national land records database (DILRMP); it is a consumer of that data via ULPIN.
- It does **not** handle internal accounting for Requiring Organizations, only the compensation disbursement workflow.

## 5. Key Features

### ✅ Implemented (Frontend Mock MVP)
- **Role-Based Access Control (RBAC)**: 11 distinct user roles with jurisdiction-scoped workspaces.
- **Hierarchical Workflows**: Shared state workflow engine advancing cases from proposal to closure.
- **GIS Visualization**: Interactive map interfaces with parcel overlays (via Leaflet).
- **Citizen Portal**: Dedicated interface for landowners to track notices, objections, and payments.
- **Document Vault**: Mocked document repository for storing statutory notices and reports.
- **Audit Trail**: Action logging for accountability.

### 🚧 In Progress / 📋 Planned (National Scale)
- 📋 **Backend & Database**: Migration from Zustand mock stores to a robust relational database and API layer.
- 📋 **DILRMP / ULPIN Integration**: Real-time fetching of ownership data using ULPIN.
- 📋 **PFMS Integration**: Automated direct benefit transfer (DBT) for compensation.
- 📋 **PM Gati Shakti Integration**: Ingesting alignment data for infrastructure projects.
- 📋 **Bhoomi Rashi Integration**: Interoperability for MoRTH highway projects.

## 6. User Roles & Access Model

The system enforces a strict National → State → District → Tehsil → Village hierarchy. Jurisdiction determines data visibility and workflow responsibilities.

| Role | Scope | Purpose & Permissions |
| ---- | ----- | --------------------- |
| **National Admin / DoLR** | National | Apex oversight, audit, and monitoring across all states. |
| **Ministry Nodal Officer** | Ministry | Sponsoring ministry monitoring (e.g., MoRTH, MoD) for sanctioned projects. |
| **Requiring Organization** | Project | Project proponent (NHAI, Railways, PWD) submitting land requirements and depositing funds. |
| **State Nodal Officer** | State | Coordinates acquisition across districts; monitors SLAs for the state. |
| **District Collector / CALA** | District | Statutory decision-maker (Competent Authority). Issues notices, hears objections, declares awards. |
| **Tehsil / SDO** | Tehsil | Sub-divisional scrutiny, verification, and localized coordination. |
| **Field Officer / VAO** | Village | Ground-level verification, measurement, panchnama, and GPS evidence capture. |
| **SIA Expert Group** | District | Independent body conducting Social Impact Assessment and public hearings. |
| **R&R Officer** | District | Manages Rehabilitation & Resettlement entitlements and colony development. |
| **Finance Officer** | District | Computes compensation, processes awards, and initiates disbursement (PFMS). |
| **Citizen / Landowner** | Village (Own) | Affected individual tracking notices, filing objections, and receiving compensation. |

## 7. System Architecture

```mermaid
flowchart TD
    User([Users / 11 Roles])
    
    subgraph Frontend [React SPA (Vite)]
        Router[React Router]
        UI[Tailwind + shadcn/ui]
        Map[Leaflet / React-Leaflet]
    end
    
    subgraph StateManagement [Zustand Stores]
        Session[Session/RBAC Store]
        Domain[Domain/Case Store]
        MockDB[(Mock JSON Data)]
    end
    
    User --> Router
    Router --> UI
    UI --> Map
    UI <--> Session
    UI <--> Domain
    Domain <--> MockDB
```

> **Note**: The current architecture is entirely client-side for the MVP. Future iterations will introduce an API Gateway, Authorization Middleware, and a PostgreSQL database.

## 8. Technology Stack

| Layer | Technology | Purpose |
|------|------------|---------|
| **Frontend Framework** | React 18, TypeScript 5, Vite 5 | Core application shell and UI rendering. |
| **Styling & UI** | Tailwind CSS 3.4, shadcn/ui, Radix UI | Accessible, institutional design system. |
| **State Management** | Zustand 4 | Lightweight global state for mocked backend data. |
| **Routing** | React Router 6 | Client-side routing and role-based redirects. |
| **Mapping / GIS** | Leaflet, React-Leaflet | Geospatial rendering of land parcels. |
| **Charts** | Recharts | Dashboards and analytics visualization. |
| **Icons** | Lucide React | Standardized iconography. |

## 9. Repository Structure

```text
bhoomisetu/
├── src/
│   ├── app/           # Router configuration and role redirect logic
│   ├── components/    # Reusable UI components (shadcn primitives, shell)
│   ├── features/      # Role-specific workspaces (e.g., admin, collector-cala, citizen)
│   ├── lib/           # Utility functions (formatting, stages definition)
│   ├── mocks/         # Mock data generators (cases, parcels, officers)
│   ├── stores/        # Zustand stores simulating the backend
│   └── types/         # TypeScript domain models and RBAC definitions
├── package.json       # Project dependencies
├── tailwind.config.ts # Tailwind CSS configuration
└── vite.config.ts     # Vite bundler configuration
```

## 10. Core Modules

### Role Workspaces (`src/features/*`)
**Purpose**: Provide customized dashboards and action queues tailored to the specific responsibilities of each of the 11 roles.
**Dependencies**: `sessionStore.ts`, `caseStore.ts`, `rbac.ts`.

### Shared Domain Store (`src/stores/caseStore.ts`)
**Purpose**: Acts as the central nervous system simulating the backend database.
**Responsibilities**: Manages the state transitions of `AcquisitionCase`, stores `Parcel` arrays, logs `AuditEvents`, and updates `Payment` statuses.

### RBAC Engine (`src/types/rbac.ts`)
**Purpose**: Controls access and data visibility.
**Responsibilities**: Provides `canAccess(roleId, stage)` and `jurisdictionFilter(roleId, case)` to ensure users only see and interact with data within their legal authority.

## 11. End-to-End Workflows

**The Standard Land Acquisition Pipeline (RFCTLARR):**

1. **Project Proposal**: Requiring Org submits a land requirement request.
2. **Scrutiny**: State/Collector reviews the requirement.
3. **SIA**: SIA Expert Group conducts Social Impact Assessment.
4. **Preliminary Notification (Sec 11)**: CALA issues notice; GIS parcels are frozen.
5. **Objections (Sec 15)**: Citizens file objections; CALA/Tehsil conducts hearings.
6. **Declaration (Sec 19)**: Final declaration of intended acquisition.
7. **Field Verification**: Field Officer captures GPS evidence and verifies ownership.
8. **Award (Sec 23)**: Finance Officer computes compensation; CALA approves.
9. **Payment**: Funds disbursed via PFMS.
10. **Possession**: State takes physical possession of the land.

## 12. Data Architecture

```mermaid
erDiagram
    Project ||--o{ AcquisitionCase : "contains"
    AcquisitionCase ||--o{ Parcel : "requires"
    AcquisitionCase ||--o{ Document : "holds"
    AcquisitionCase ||--o{ AuditEvent : "logs"
    AcquisitionCase ||--o{ Objection : "receives"
    Parcel ||--|| Landowner : "owned by"
    Parcel ||--o{ FieldEvidence : "verified via"
    Parcel ||--o{ Payment : "compensated via"
```

*Note: This diagram represents the conceptual domain model implemented via TypeScript types in `src/types/domain.ts`.*

## 13. Database

**Not currently implemented.**
The application relies on in-memory mock data populated on initial load via `src/mocks/`. Mutations are handled by Zustand stores and persist only for the duration of the browser session.

## 14. API Documentation

**Not currently implemented.**
All "API calls" are simulated as synchronous or mocked asynchronous actions directly against the Zustand stores.

## 15. Authentication & Security

**Status**: MOCKED
- **Authentication**: Simulating login via a simple role switcher on the landing page for demonstration purposes. No passwords or tokens are currently required.
- **Authorization**: RBAC is enforced on the frontend via `RoleRedirect.tsx` and jurisdiction filters in `rbac.ts`.
- **Security Limitations**: Because this is a frontend-only MVP, all data and business logic are exposed to the client. A future backend implementation will enforce these checks securely.

## 16. Configuration

Environment variables are currently standard Vite defaults. No external secrets are required to run the prototype.

## 17. Local Development Setup

**Prerequisites**:
- Node.js (v18 or higher)
- npm or pnpm

```bash
# Clone the repository
git clone <repository-url>
cd bhoomisetu

# Install dependencies
npm install

# Start the development server
npm run dev
```

## 18. Running the Application

### Frontend Development Server
```bash
npm run dev
```
The application will be available at `http://localhost:5173` (or the port specified by Vite).

### Production Build
```bash
npm run build
npm run preview
```

## 19. Testing

The repository currently utilizes static analysis for correctness:
- **Type Checking**: `npm run typecheck` (TypeScript)
- **Linting**: `npm run lint` (Oxlint)

Unit and E2E testing frameworks (e.g., Vitest, Playwright) are planned but not yet implemented.

## 20. Deployment

Deployment configuration is not currently included. The application can be built into a static SPA bundle using `npm run build` and hosted on any static file server (e.g., Vercel, Netlify, AWS S3).

## 21. External Integrations

*All integrations listed below are architecturally planned and simulated in the UI, but **not yet technically connected** via APIs.*

- **DILRMP / ULPIN**: To fetch authoritative land records (Khata/Khasra details) based on the Unique Land Parcel Identification Number.
- **PFMS (Public Financial Management System)**: For seamless, audited disbursement of compensation directly to landowner bank accounts.
- **PM Gati Shakti**: To import geospatial alignment data for infrastructure projects.
- **Bhoomi Rashi**: Interoperability for MoRTH-specific National Highway acquisition projects.

## 22. Error Handling

Currently, errors are handled gracefully in the UI using standard React error boundaries and localized toast notifications. Since there is no backend, network errors are not simulated.

## 23. Observability

**Not currently implemented.**
Logging and tracing (e.g., Sentry, DataDog) are planned for the production release.

## 24. Development Conventions

- **Typing**: Strict TypeScript interfaces defined in `src/types/`.
- **Styling**: Utility-first CSS via Tailwind, encapsulated in modular shadcn/ui components.
- **Routing**: Feature-based folder structure matching route paths.

## 25. Current Implementation Status

| Component | Status | Notes |
| :--- | :--- | :--- |
| **RBAC & Routing** | ✅ Implemented | Complete for all 11 roles. |
| **Workspaces / UI** | ✅ Implemented | Responsive dashboards for all roles. |
| **GIS Mapping** | ✅ Implemented | Leaflet integration with mock GeoJSON. |
| **Backend API** | 🚧 Planned | Currently mocked with Zustand. |
| **Database** | 🚧 Planned | Currently in-memory state. |
| **PFMS / ULPIN** | 📋 Planned | UI elements exist; API integration pending. |

## 26. Known Limitations

- **Volatile State**: Refreshing the browser will reset all case progression and uploaded documents to the initial mock state.
- **Mocked Data**: All ULPINs, PFMS transaction IDs, and citizen details are fictional.
- **Security**: RBAC is enforced purely on the client-side.
- **Performance**: Large datasets (thousands of parcels) may cause UI lag due to client-side filtering.

## 27. Roadmap

### Near Term
- Integrate a Node.js/Express backend with a PostgreSQL/PostGIS database.
- Implement proper JWT-based authentication via e-Pramaan or similar government SSO.

### Medium Term
- Establish real-time API integrations with DILRMP for fetching verified land records.
- Implement a secure payment gateway integration with PFMS.

### Long Term
- National rollout capability with multi-tenant architecture supporting distinct state rulesets.

## 28. Contributing

As this is a prototype for SIH 2026, external contributions are not currently being accepted.

## 29. License

Academic prototype for SIH 2026. No open-source license has currently been specified.

## 30. Disclaimer

This is a **prototype / proof of concept** developed for the Smart India Hackathon (SIH) 2026. It is a frontend-first simulation. The data, APIs, and integrations described are mocked for demonstration purposes and do not interact with real government databases.
