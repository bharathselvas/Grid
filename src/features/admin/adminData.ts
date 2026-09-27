import type { LifecycleStage } from "@/types/domain";

/**
 * STATIC DEMO DATASET.
 *
 * These rows are illustrative UI fixtures only — they are not the system of
 * record. The admin directory pages (Organizations, Users & Roles, Audit
 * Trail) read live data from the Fastify API (`src/services/api`) and fall
 * back to these constants only when the API is unreachable, flagging that
 * state with a "Demo data — API offline" badge. Do not present this data as
 * live or as a connected external system.
 */

// ── National KPI Data ──
export type NationalKPI = {
  label: string;
  value: string;
  subtext: string;
  trend?: string;
  color?: string;
};

export const NATIONAL_KPIS: NationalKPI[] = [
  { label: "Active Projects", value: "247", subtext: "Across 28 States & 8 UTs", color: "#0F2340" },
  { label: "Total Projects", value: "1,842", subtext: "Since 2014", color: "#0F2340" },
  { label: "Total Parcels", value: "1,34,892", subtext: "Under acquisition process", color: "#1A3560" },
  { label: "States / UTs", value: "36", subtext: "28 States + 8 UTs", color: "#1A3560" },
  { label: "Acquisition Area", value: "2,84,560 Ha", subtext: "National total", color: "#243E6B" },
  { label: "Compensation Assessed", value: "₹ 48,320 Cr", subtext: "Across all stages", color: "#0F7A5A" },
  { label: "Compensation Disbursed", value: "₹ 31,450 Cr", subtext: "65.1% disbursement rate", color: "#0F7A5A" },
  { label: "Affected Families", value: "2,14,680", subtext: "Registered in system", color: "#2E4A7A" },
  { label: "R&R Pending", value: "1,240", subtext: "Rehabilitation pending", color: "#9A6B00" },
  { label: "Delayed Projects", value: "38", subtext: "Exceeding statutory timelines", color: "#B42318" },
];

// ── Pipeline Data ──
export type PipelineStage = {
  stage: LifecycleStage;
  count: number;
  percentage: number;
  attention: boolean;
};

export const PIPELINE_DATA: PipelineStage[] = [
  { stage: "project_proposal", count: 42, percentage: 8.2, attention: false },
  { stage: "land_requirement", count: 28, percentage: 5.5, attention: false },
  { stage: "gis_identification", count: 35, percentage: 6.9, attention: false },
  { stage: "submission", count: 19, percentage: 3.7, attention: false },
  { stage: "scrutiny", count: 31, percentage: 6.1, attention: true },
  { stage: "sia", count: 24, percentage: 4.7, attention: true },
  { stage: "preliminary_notification", count: 38, percentage: 7.5, attention: false },
  { stage: "public_disclosure", count: 22, percentage: 4.3, attention: false },
  { stage: "objections_hearing", count: 18, percentage: 3.5, attention: true },
  { stage: "declaration", count: 26, percentage: 5.1, attention: false },
  { stage: "field_verification", count: 33, percentage: 6.5, attention: false },
  { stage: "compensation", count: 45, percentage: 8.8, attention: true },
  { stage: "award", count: 29, percentage: 5.7, attention: false },
  { stage: "payment", count: 37, percentage: 7.3, attention: true },
  { stage: "possession", count: 21, percentage: 4.1, attention: false },
  { stage: "r_and_r", count: 15, percentage: 2.9, attention: true },
  { stage: "closed", count: 147, percentage: 28.8, attention: false },
];

// ── Monitoring Projects ──
export type MonitoringProject = {
  id: string;
  projectName: string;
  ministry: string;
  implementingAgency: string;
  state: string;
  district: string;
  parcels: number;
  currentStage: LifecycleStage;
  progress: number;
  risk: "critical" | "high" | "medium" | "low" | "on_track";
  lastActivity: string;
  budgetCr: number;
};

export const MONITORING_PROJECTS: MonitoringProject[] = [
  { id: "PRJ-NH-544", projectName: "NH-544 Expansion (Kanyakumari–Bengaluru)", ministry: "MoRTH", implementingAgency: "NHAI", state: "Tamil Nadu", district: "Kanyakumari", parcels: 842, currentStage: "compensation", progress: 72, risk: "medium", lastActivity: "2026-09-05", budgetCr: 4200 },
  { id: "PRJ-PUNE-RR", projectName: "Pune Ring Road — Phase 2", ministry: "MoRTH", implementingAgency: "NHAI", state: "Maharashtra", district: "Pune", parcels: 1240, currentStage: "field_verification", progress: 65, risk: "high", lastActivity: "2026-09-03", budgetCr: 3420 },
  { id: "PRJ-WDFC", projectName: "Western Dedicated Freight Corridor", ministry: "Railways", implementingAgency: "DFCCIL", state: "Maharashtra", district: "Nagpur", parcels: 2180, currentStage: "sia", progress: 38, risk: "critical", lastActivity: "2026-08-28", budgetCr: 12800 },
  { id: "PRJ-SOLAR", projectName: "Solar Transmission Corridor", ministry: "Power", implementingAgency: "PGCIL", state: "Rajasthan", district: "Jodhpur", parcels: 560, currentStage: "declaration", progress: 55, risk: "low", lastActivity: "2026-09-01", budgetCr: 2100 },
  { id: "PRJ-IRR-MP", projectName: "Irrigation Modernisation Project", ministry: "Jal Shakti", implementingAgency: "WRD-MP", state: "Madhya Pradesh", district: "Indore", parcels: 320, currentStage: "award", progress: 82, risk: "on_track", lastActivity: "2026-09-04", budgetCr: 540 },
  { id: "PRJ-MIHAN", projectName: "MIHAN SEZ — Phase 3", ministry: "Civil Aviation", implementingAgency: "MADC", state: "Maharashtra", district: "Nagpur", parcels: 680, currentStage: "preliminary_notification", progress: 42, risk: "medium", lastActivity: "2026-08-30", budgetCr: 1875 },
  { id: "PRJ-JALNA", projectName: "Jalna Dry Port & Rail Siding", ministry: "Ports & Shipping", implementingAgency: "JNPT", state: "Maharashtra", district: "Jalna", parcels: 186, currentStage: "objections_hearing", progress: 52, risk: "high", lastActivity: "2026-09-02", budgetCr: 640 },
  { id: "PRJ-PURANDAR", projectName: "Purandar Greenfield Airport", ministry: "Civil Aviation", implementingAgency: "MADC", state: "Maharashtra", district: "Pune", parcels: 3200, currentStage: "possession", progress: 88, risk: "on_track", lastActivity: "2026-09-05", budgetCr: 5200 },
  { id: "PRJ-UDHNA", projectName: "Udhna–Bardoli Expressway", ministry: "MoRTH", implementingAgency: "NHAI", state: "Gujarat", district: "Surat", parcels: 420, currentStage: "scrutiny", progress: 28, risk: "medium", lastActivity: "2026-08-25", budgetCr: 1860 },
  { id: "PRJ-KALYANI", projectName: "Kalyani Industrial Township", ministry: "DPIIT", implementingAgency: "WBIDC", state: "West Bengal", district: "Nadia", parcels: 290, currentStage: "project_proposal", progress: 8, risk: "low", lastActivity: "2026-08-20", budgetCr: 780 },
  { id: "PRJ-BANGUR", projectName: "Bangur Nagar Housing Project", ministry: "Housing", implementingAgency: "MHADA", state: "Maharashtra", district: "Mumbai", parcels: 150, currentStage: "payment", progress: 78, risk: "on_track", lastActivity: "2026-09-04", budgetCr: 920 },
  { id: "PRJ-VIZAG", projectName: "Vizag Steel Plant Expansion", ministry: "Steel", implementingAgency: "VSP", state: "Andhra Pradesh", district: "Visakhapatnam", parcels: 980, currentStage: "sia", progress: 35, risk: "high", lastActivity: "2026-08-27", budgetCr: 6400 },
  { id: "PRJ-CHENNAI", projectName: "Chennai Metro Phase 3", ministry: "Urban", implementingAgency: "CMRL", state: "Tamil Nadu", district: "Chennai", parcels: 420, currentStage: "declaration", progress: 58, risk: "medium", lastActivity: "2026-09-01", budgetCr: 8900 },
  { id: "PRJ-BENGALURU", projectName: "Bengaluru Suburban Rail", ministry: "Railways", implementingAgency: "K-RIDE", state: "Karnataka", district: "Bengaluru Urban", parcels: 310, currentStage: "field_verification", progress: 62, risk: "on_track", lastActivity: "2026-09-03", budgetCr: 15200 },
  { id: "PRJ-DELHI-METRO", projectName: "Delhi Metro Phase 4 Extension", ministry: "Urban", implementingAgency: "DMRC", state: "Delhi", district: "New Delhi", parcels: 180, currentStage: "award", progress: 85, risk: "on_track", lastActivity: "2026-09-05", budgetCr: 4500 },
  { id: "PRJ-ODISHA-IRR", projectName: "Odisha Irrigation Grid", ministry: "Jal Shakti", implementingAgency: "WRD-OD", state: "Odisha", district: "Khordha", parcels: 520, currentStage: "compensation", progress: 70, risk: "medium", lastActivity: "2026-08-31", budgetCr: 1240 },
  { id: "PRJ-KERALA-RAIL", projectName: "Kerala High-Speed Rail Corridor", ministry: "Railways", implementingAgency: "KRRC", state: "Kerala", district: "Ernakulam", parcels: 380, currentStage: "land_requirement", progress: 12, risk: "low", lastActivity: "2026-08-18", budgetCr: 28000 },
  { id: "PRJ-UP-EXPRESS", projectName: "Lucknow–Agra Expressway Extension", ministry: "MoRTH", implementingAgency: "NHAI", state: "Uttar Pradesh", district: "Agra", parcels: 640, currentStage: "submission", progress: 22, risk: "low", lastActivity: "2026-08-22", budgetCr: 3100 },
];

// ── Risk Projects ──
export type RiskProject = {
  projectName: string;
  state: string;
  district: string;
  currentStage: LifecycleStage;
  daysInStage: number;
  expectedDuration: number;
  risk: "critical" | "high";
  reason: string;
  lastActivity: string;
};

export const RISK_PROJECTS: RiskProject[] = [
  { projectName: "WDFC — Nagpur Section", state: "Maharashtra", district: "Nagpur", currentStage: "sia", daysInStage: 245, expectedDuration: 180, risk: "critical", reason: "SIA approaching deadline — public consultation pending in 3 villages", lastActivity: "2026-08-28" },
  { projectName: "Jalna Dry Port", state: "Maharashtra", district: "Jalna", currentStage: "objections_hearing", daysInStage: 52, expectedDuration: 60, risk: "high", reason: "Objection window nearing closure — 2 unfiled objections expected", lastActivity: "2026-09-02" },
  { projectName: "Vizag Steel Expansion", state: "Andhra Pradesh", district: "Visakhapatnam", currentStage: "sia", daysInStage: 210, expectedDuration: 180, risk: "critical", reason: "SIA deadline exceeded by 30 days — expert group pending reconstitution", lastActivity: "2026-08-27" },
  { projectName: "Pune Ring Road Phase 2", state: "Maharashtra", district: "Pune", currentStage: "field_verification", daysInStage: 42, expectedDuration: 30, risk: "high", reason: "Field verification pending beyond expected period — 3 parcels outstanding", lastActivity: "2026-09-03" },
  { projectName: "Irrigation Modernisation MP", state: "Madhya Pradesh", district: "Indore", currentStage: "award", daysInStage: 35, expectedDuration: 30, risk: "high", reason: "Award declaration delayed — compensation verification pending for 12 parcels", lastActivity: "2026-09-04" },
  { projectName: "Chennai Metro Phase 3", state: "Tamil Nadu", district: "Chennai", currentStage: "declaration", daysInStage: 28, expectedDuration: 30, risk: "high", reason: "Section 19 declaration pending — objection disposal incomplete", lastActivity: "2026-09-01" },
  { projectName: "Udhna–Bardoli Expressway", state: "Gujarat", district: "Surat", currentStage: "scrutiny", daysInStage: 25, expectedDuration: 21, risk: "high", reason: "Scrutiny pending beyond expected period — land schedule discrepancy", lastActivity: "2026-08-25" },
];

// ── Organizations ──
export type Organization = {
  id: string;
  name: string;
  type: "central_ministry" | "state_dept" | "requiring_org" | "implementing_agency" | "district_auth";
  parentOrg: string;
  jurisdiction: string;
  projects: number;
  users: number;
  status: "active" | "pending" | "suspended";
};

export const ORGANIZATIONS: Organization[] = [
  { id: "org-001", name: "Ministry of Road Transport & Highways", type: "central_ministry", parentOrg: "Government of India", jurisdiction: "National", projects: 86, users: 24, status: "active" },
  { id: "org-002", name: "Ministry of Railways", type: "central_ministry", parentOrg: "Government of India", jurisdiction: "National", projects: 42, users: 18, status: "active" },
  { id: "org-003", name: "Ministry of Jal Shakti", type: "central_ministry", parentOrg: "Government of India", jurisdiction: "National", projects: 34, users: 12, status: "active" },
  { id: "org-004", name: "Ministry of Civil Aviation", type: "central_ministry", parentOrg: "Government of India", jurisdiction: "National", projects: 12, users: 8, status: "active" },
  { id: "org-005", name: "Dept. of Promotion of Industry & Internal Trade", type: "central_ministry", parentOrg: "Government of India", jurisdiction: "National", projects: 18, users: 6, status: "active" },
  { id: "org-006", name: "Water Resources Dept., Maharashtra", type: "state_dept", parentOrg: "Government of Maharashtra", jurisdiction: "Maharashtra", projects: 28, users: 45, status: "active" },
  { id: "org-007", name: "Water Resources Dept., Odisha", type: "state_dept", parentOrg: "Government of Odisha", jurisdiction: "Odisha", projects: 14, users: 22, status: "active" },
  { id: "org-008", name: "Revenue Dept., Madhya Pradesh", type: "state_dept", parentOrg: "Government of Madhya Pradesh", jurisdiction: "Madhya Pradesh", projects: 20, users: 32, status: "active" },
  { id: "org-009", name: "National Highways Authority of India", type: "requiring_org", parentOrg: "MoRTH", jurisdiction: "National", projects: 64, users: 86, status: "active" },
  { id: "org-010", name: "DFCCIL", type: "requiring_org", parentOrg: "Railways", jurisdiction: "National", projects: 12, users: 24, status: "active" },
  { id: "org-011", name: "PGCIL", type: "requiring_org", parentOrg: "Power", jurisdiction: "National", projects: 8, users: 14, status: "active" },
  { id: "org-012", name: "Maharashtra Airport Development Co.", type: "implementing_agency", parentOrg: "Civil Aviation", jurisdiction: "Maharashtra", projects: 6, users: 16, status: "active" },
  { id: "org-013", name: "Jawaharlal Nehru Port Trust", type: "implementing_agency", parentOrg: "Ports & Shipping", jurisdiction: "Maharashtra", projects: 4, users: 10, status: "active" },
  { id: "org-014", name: "MP Industrial Development Corporation", type: "implementing_agency", parentOrg: "DPIIT", jurisdiction: "Madhya Pradesh", projects: 8, users: 12, status: "active" },
  { id: "org-015", name: "Collectorate, Pune", type: "district_auth", parentOrg: "Revenue Dept., Maharashtra", jurisdiction: "Pune District", projects: 12, users: 18, status: "active" },
  { id: "org-016", name: "Collectorate, Nagpur", type: "district_auth", parentOrg: "Revenue Dept., Maharashtra", jurisdiction: "Nagpur District", projects: 8, users: 14, status: "active" },
  { id: "org-017", name: "Collectorate, Jalna", type: "district_auth", parentOrg: "Revenue Dept., Maharashtra", jurisdiction: "Jalna District", projects: 3, users: 8, status: "active" },
  { id: "org-018", name: "K-RIDE (Karnataka Rail infra Dev Corp)", type: "implementing_agency", parentOrg: "Railways", jurisdiction: "Karnataka", projects: 2, users: 6, status: "pending" },
  { id: "org-019", name: "CMRL (Chennai Metro Rail Ltd)", type: "implementing_agency", parentOrg: "Urban", jurisdiction: "Tamil Nadu", projects: 3, users: 8, status: "active" },
  { id: "org-020", name: "DMRC (Delhi Metro Rail Corp)", type: "implementing_agency", parentOrg: "Urban", jurisdiction: "Delhi", projects: 4, users: 10, status: "active" },
];

// ── Users ──
export type AdminUser = {
  id: string;
  name: string;
  role: string;
  organization: string;
  jurisdiction: string;
  parentAuthority: string;
  assignedProjects: number;
  status: "active" | "pending" | "suspended";
  lastActivity: string;
};

export const ADMIN_USERS: AdminUser[] = [
  { id: "usr-001", name: "Smt. Meera Joshi, IAS", role: "National Admin / DoLR", organization: "Dept. of Land Resources", jurisdiction: "National", parentAuthority: "DoLR", assignedProjects: 247, status: "active", lastActivity: "2026-09-05" },
  { id: "usr-002", name: "Shri. Rajiv Malhotra, IAS", role: "Ministry Nodal Officer", organization: "MoRTH", jurisdiction: "National — MoRTH", parentAuthority: "DoLR", assignedProjects: 86, status: "active", lastActivity: "2026-09-04" },
  { id: "usr-003", name: "Shri. A. Deshmukh", role: "Requiring Organization", organization: "NHAI", jurisdiction: "Pune Region", parentAuthority: "MoRTH", assignedProjects: 4, status: "active", lastActivity: "2026-09-03" },
  { id: "usr-004", name: "Shri. R. K. Sable, IAS", role: "State Nodal Officer", organization: "Revenue Dept., Maharashtra", jurisdiction: "Maharashtra", parentAuthority: "DoLR", assignedProjects: 28, status: "active", lastActivity: "2026-09-05" },
  { id: "usr-005", name: "Dr. Suhas Diwase, IAS", role: "District Collector / CALA", organization: "Collectorate, Pune", jurisdiction: "Pune District", parentAuthority: "State Nodal — Maharashtra", assignedProjects: 12, status: "active", lastActivity: "2026-09-05" },
  { id: "usr-006", name: "Smt. Kavita Patil", role: "Tehsil / SDO", organization: "Tehsil Office, Haveli", jurisdiction: "Haveli Tehsil", parentAuthority: "Collector, Pune", assignedProjects: 6, status: "active", lastActivity: "2026-09-04" },
  { id: "usr-007", name: "Shri. M. Kamble", role: "Field Officer / VAO", organization: "Tehsil Office, Haveli", jurisdiction: "Mulshi Circle", parentAuthority: "SDO, Haveli", assignedProjects: 3, status: "active", lastActivity: "2026-09-03" },
  { id: "usr-008", name: "Prof. S. Mishra", role: "SIA Expert Group", organization: "SIA Panel — Odisha", jurisdiction: "Khordha District", parentAuthority: "State Nodal — Odisha", assignedProjects: 2, status: "active", lastActivity: "2026-08-28" },
  { id: "usr-009", name: "Smt. Asha Khedkar", role: "R&R Officer", organization: "Collectorate, Pune", jurisdiction: "Pune — R&R Division", parentAuthority: "Collector, Pune", assignedProjects: 4, status: "active", lastActivity: "2026-09-02" },
  { id: "usr-010", name: "Smt. R. Kulkarni", role: "Finance / Payment Officer", organization: "PFMS Cell, Pune", jurisdiction: "Pune — PFMS Cell", parentAuthority: "Collector, Pune", assignedProjects: 5, status: "active", lastActivity: "2026-09-04" },
  { id: "usr-011", name: "Shri. Baban R. Khomane", role: "Citizen / Landowner", organization: "—", jurisdiction: "Pargaon, Purandar", parentAuthority: "—", assignedProjects: 1, status: "active", lastActivity: "2026-08-20" },
  { id: "usr-012", name: "Dr. Vipin Itankar, IAS", role: "District Collector / CALA", organization: "Collectorate, Nagpur", jurisdiction: "Nagpur District", parentAuthority: "State Nodal — Maharashtra", assignedProjects: 8, status: "active", lastActivity: "2026-09-01" },
  { id: "usr-013", name: "Shri. Asheesh Singh, IAS", role: "District Collector / CALA", organization: "Collectorate, Indore", jurisdiction: "Indore District", parentAuthority: "State Nodal — MP", assignedProjects: 6, status: "active", lastActivity: "2026-09-02" },
  { id: "usr-014", name: "Shri. Jitendra Dudi, IAS", role: "District Collector / CALA", organization: "Collectorate, Satara", jurisdiction: "Satara District", parentAuthority: "State Nodal — Maharashtra", assignedProjects: 4, status: "active", lastActivity: "2026-08-30" },
  { id: "usr-015", name: "Shri. B. Mohanty, EE", role: "Field Officer / VAO", organization: "WRD, Khordha", jurisdiction: "Khordha District", parentAuthority: "State Nodal — Odisha", assignedProjects: 2, status: "pending", lastActivity: "2026-08-15" },
];

// ── Hierarchy Tree ──
export type HierarchyNode = {
  id: string;
  label: string;
  type: "national" | "ministry" | "state" | "district" | "tehsil" | "field";
  children?: HierarchyNode[];
  projects?: number;
  officials?: string[];
  pendingWork?: number;
};

export const HIERARCHY_TREE: HierarchyNode = {
  id: "dolr",
  label: "DoLR — Department of Land Resources",
  type: "national",
  projects: 247,
  officials: ["Smt. Meera Joshi, IAS — National Admin"],
  pendingWork: 38,
  children: [
    {
      id: "morth",
      label: "MoRTH — Ministry of Road Transport & Highways",
      type: "ministry",
      projects: 86,
      officials: ["Shri. Rajiv Malhotra, IAS — Ministry Nodal"],
      pendingWork: 12,
      children: [
        {
          id: "mh",
          label: "Maharashtra",
          type: "state",
          projects: 28,
          officials: ["Shri. R. K. Sable, IAS — State Nodal"],
          pendingWork: 5,
          children: [
            {
              id: "pune",
              label: "Pune District",
              type: "district",
              projects: 12,
              officials: ["Dr. Suhas Diwase, IAS — Collector / CALA"],
              pendingWork: 2,
              children: [
                {
                  id: "haveli",
                  label: "Haveli Tehsil",
                  type: "tehsil",
                  projects: 6,
                  officials: ["Smt. Kavita Patil — SDO"],
                  pendingWork: 1,
                  children: [
                    { id: "mulshi", label: "Mulshi Circle", type: "field", projects: 3, officials: ["Shri. M. Kamble — Field Officer"], pendingWork: 0 },
                    { id: "purandar", label: "Purandar Circle", type: "field", projects: 2, officials: ["Shri. R. Bhosale — Field Officer"], pendingWork: 0 },
                  ],
                },
                {
                  id: "baramati",
                  label: "Baramati Tehsil",
                  type: "tehsil",
                  projects: 4,
                  officials: ["Smt. P. Deshmukh — SDO"],
                  pendingWork: 1,
                  children: [
                    { id: "indapur", label: "Indapur Circle", type: "field", projects: 2, officials: ["Shri. S. Jadhav — Field Officer"], pendingWork: 0 },
                  ],
                },
              ],
            },
            {
              id: "nagpur",
              label: "Nagpur District",
              type: "district",
              projects: 8,
              officials: ["Dr. Vipin Itankar, IAS — Collector / CALA"],
              pendingWork: 3,
              children: [
                {
                  id: "hinjewadi",
                  label: "Hingna Tehsil",
                  type: "tehsil",
                  projects: 4,
                  officials: ["Smt. N. Wankhede — SDO"],
                  pendingWork: 2,
                  children: [
                    { id: "transfer", label: "Transfer Circle", type: "field", projects: 2, officials: ["Shri. A. Raut — Field Officer"], pendingWork: 1 },
                  ],
                },
              ],
            },
            {
              id: "satara",
              label: "Satara District",
              type: "district",
              projects: 4,
              officials: ["Shri. Jitendra Dudi, IAS — Collector / CALA"],
              pendingWork: 0,
              children: [],
            },
          ],
        },
        {
          id: "tn",
          label: "Tamil Nadu",
          type: "state",
          projects: 14,
          officials: ["Smt. K. Ramanujam, IAS — State Nodal"],
          pendingWork: 3,
          children: [
            {
              id: "chennai",
              label: "Chennai District",
              type: "district",
              projects: 8,
              officials: ["Dr. A. Shanmugam, IAS — Collector"],
              pendingWork: 2,
              children: [],
            },
            {
              id: "kanyakumari",
              label: "Kanyakumari District",
              type: "district",
              projects: 6,
              officials: ["Shri. V. Senthil, IAS — Collector"],
              pendingWork: 1,
              children: [],
            },
          ],
        },
      ],
    },
    {
      id: "railways",
      label: "Ministry of Railways",
      type: "ministry",
      projects: 42,
      officials: ["Shri. V. Verma, IRS — Ministry Nodal"],
      pendingWork: 8,
      children: [
        {
          id: "mh-rail",
          label: "Maharashtra",
          type: "state",
          projects: 12,
          officials: ["Shri. R. K. Sable, IAS — State Nodal"],
          pendingWork: 3,
          children: [
            {
              id: "nagpur-rail",
              label: "Nagpur District",
              type: "district",
              projects: 6,
              officials: ["Dr. Vipin Itankar, IAS — Collector / CALA"],
              pendingWork: 2,
              children: [],
            },
          ],
        },
        {
          id: "ka-rail",
          label: "Karnataka",
          type: "state",
          projects: 8,
          officials: ["Shri. T. M. Vijay Bhaskar, IAS — State Nodal"],
          pendingWork: 1,
          children: [],
        },
      ],
    },
    {
      id: "jal-shakti",
      label: "Ministry of Jal Shakti",
      type: "ministry",
      projects: 34,
      officials: ["Shri. A. K. Singh, IAS — Ministry Nodal"],
      pendingWork: 6,
      children: [
        {
          id: "mp-jal",
          label: "Madhya Pradesh",
          type: "state",
          projects: 14,
          officials: ["Shri. B. S. Nandan, IAS — State Nodal"],
          pendingWork: 2,
          children: [],
        },
        {
          id: "od-jal",
          label: "Odisha",
          type: "state",
          projects: 10,
          officials: ["Smt. R. S. Shulka, IAS — State Nodal"],
          pendingWork: 3,
          children: [],
        },
      ],
    },
    {
      id: "civil-av",
      label: "Ministry of Civil Aviation",
      type: "ministry",
      projects: 12,
      officials: ["Shri. K. Raju, IAS — Ministry Nodal"],
      pendingWork: 2,
      children: [],
    },
  ],
};

// ── Integrations ──
export type Integration = {
  id: string;
  name: string;
  status: "connected" | "mock" | "error";
  lastSync: string;
  transactions: number;
  failed: number;
  description: string;
};

export const INTEGRATIONS: Integration[] = [
  { id: "int-001", name: "DILRMP / ULPIN", status: "connected", lastSync: "2026-09-05T08:30:00+05:30", transactions: 134892, failed: 12, description: "Digital India Land Records Modernisation Programme — Unique Land Parcel Identification" },
  { id: "int-002", name: "PFMS", status: "mock", lastSync: "2026-09-05T08:32:00+05:30", transactions: 18421, failed: 3, description: "Public Financial Management System — compensation disbursement" },
  { id: "int-003", name: "e-Gazette", status: "mock", lastSync: "2026-09-04T14:15:00+05:30", transactions: 2840, failed: 0, description: "Electronics & IT Ministry — statutory gazette notifications" },
  { id: "int-004", name: "PM Gati Shakti", status: "connected", lastSync: "2026-09-05T06:00:00+05:30", transactions: 4820, failed: 8, description: "National Master Plan for Multi-modal Connectivity" },
  { id: "int-005", name: "State Land Records", status: "mock", lastSync: "2026-09-04T22:00:00+05:30", transactions: 92400, failed: 45, description: "State-level land records integration (7 states)" },
  { id: "int-006", name: "Bhuvan / ISRO GIS", status: "connected", lastSync: "2026-09-05T07:45:00+05:30", transactions: 36200, failed: 2, description: "ISRO Bhuvan satellite imagery and GIS services" },
];

// ── Alerts ──
export type AdminAlert = {
  id: string;
  category: "workflow" | "integration" | "security" | "delays" | "data_quality" | "system";
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  timestamp: string;
  acknowledged: boolean;
};

export const ADMIN_ALERTS: AdminAlert[] = [
  { id: "alr-001", category: "integration", severity: "critical", title: "PFMS adapter failure detected", description: "Public Financial Management System returned timeout on batch payment validation. 3 transactions stuck.", timestamp: "2026-09-05T08:32:00+05:30", acknowledged: false },
  { id: "alr-002", category: "delays", severity: "high", title: "12 projects approaching statutory timeline", description: "12 projects nationwide are within 7 days of exceeding their statutory timeline limits.", timestamp: "2026-09-05T07:00:00+05:30", acknowledged: false },
  { id: "alr-003", category: "integration", severity: "medium", title: "4 state integrations require synchronization", description: "State land records for Assam, Manipur, Mizoram, and Nagaland require manual sync trigger.", timestamp: "2026-09-04T22:00:00+05:30", acknowledged: false },
  { id: "alr-004", category: "data_quality", severity: "medium", title: "21 documents pending metadata verification", description: "Documents uploaded without complete stage/tag metadata — verification queue building.", timestamp: "2026-09-05T06:30:00+05:30", acknowledged: false },
  { id: "alr-005", category: "workflow", severity: "high", title: "SIA deadline exceeded — 3 projects", description: "WDFC Nagpur, Vizag Steel, and Jatni Canal SIA processes have exceeded statutory 180-day limit.", timestamp: "2026-09-05T08:00:00+05:30", acknowledged: false },
  { id: "alr-006", category: "security", severity: "medium", title: "3 failed login attempts detected", description: "Failed authentication attempts from unrecognized IP range for user usr-015.", timestamp: "2026-09-04T16:45:00+05:30", acknowledged: true },
  { id: "alr-007", category: "system", severity: "low", title: "Scheduled maintenance window", description: "System maintenance scheduled for Sunday 02:00–06:00 IST. All integrations will be paused.", timestamp: "2026-09-05T00:00:00+05:30", acknowledged: false },
  { id: "alr-008", category: "workflow", severity: "critical", title: "Payment failure — PFMS rejected 7 disbursements", description: "7 compensation payments rejected by PFMS due to IFSC code validation failure. Immediate action required.", timestamp: "2026-09-05T09:15:00+05:30", acknowledged: false },
  { id: "alr-009", category: "delays", severity: "high", title: "R&R component overdue — 5 projects", description: "Rehabilitation & Resettlement activities overdue in 5 projects across 3 states.", timestamp: "2026-09-05T07:30:00+05:30", acknowledged: false },
  { id: "alr-010", category: "data_quality", severity: "low", title: "Parcel coordinate discrepancy — 8 parcels", description: "GPS coordinates for 8 parcels in Maharashtra show centroid outside declared boundary.", timestamp: "2026-09-04T14:20:00+05:30", acknowledged: false },
];

// ── Report Definitions ──
export type ReportDef = {
  id: string;
  name: string;
  description: string;
  category: string;
};

export const REPORTS: ReportDef[] = [
  { id: "rpt-001", name: "National Acquisition Progress", description: "Overall acquisition progress across all states, ministries, and stages", category: "Progress" },
  { id: "rpt-002", name: "State-wise Progress", description: "Acquisition progress broken down by state and district", category: "Progress" },
  { id: "rpt-003", name: "Ministry-wise Progress", description: "Progress of projects grouped by sponsoring ministry", category: "Progress" },
  { id: "rpt-004", name: "Compensation Report", description: "Compensation assessment, sanction, and disbursement analysis", category: "Financial" },
  { id: "rpt-005", name: "Possession Report", description: "Land possession status across all active acquisitions", category: "Operations" },
  { id: "rpt-006", name: "R&R Report", description: "Rehabilitation & Resettlement entitlement and disbursement status", category: "Social" },
  { id: "rpt-007", name: "Delayed Project Report", description: "Projects exceeding statutory timelines with root cause analysis", category: "Compliance" },
  { id: "rpt-008", name: "Statutory Timeline Report", description: "Time taken at each stage vs statutory SLA across all projects", category: "Compliance" },
  { id: "rpt-009", name: "Grievance Report", description: "Grievance register — filed, resolved, escalated", category: "Social" },
  { id: "rpt-010", name: "Audit Report", description: "Complete audit trail with actor, action, and state transition analysis", category: "Governance" },
];

// ── National Audit Trail (extended) ──
export type AdminAuditEntry = {
  id: string;
  timestamp: string;
  actor: string;
  role: string;
  organization: string;
  action: string;
  project: string;
  previousState: string | null;
  newState: string | null;
  justification: string;
};

export const ADMIN_AUDIT_TRAIL: AdminAuditEntry[] = [
  { id: "adm-aud-001", timestamp: "2026-09-05T09:15:00+05:30", actor: "Smt. R. Kulkarni", role: "Finance Officer", organization: "PFMS Cell, Pune", action: "Payment rejected by PFMS", project: "Pune–Nashik Elevated Corridor", previousState: "Payment Sanctioned", newState: "Payment Failed", justification: "IFSC validation failed for parcel 78/3" },
  { id: "adm-aud-002", timestamp: "2026-09-05T08:32:00+05:30", actor: "System", role: "System", organization: "DoLR", action: "PFMS adapter timeout", project: "All", previousState: "Connected", newState: "Error", justification: "Public Financial Management System unreachable — batch timeout" },
  { id: "adm-aud-003", timestamp: "2026-09-04T16:45:00+05:30", actor: "Unknown", role: "Unknown", organization: "Unknown", action: "Attempted unauthorized access", project: "—", previousState: null, newState: null, justification: "3 failed login attempts from IP 103.45.67.89 — user usr-015" },
  { id: "adm-aud-004", timestamp: "2026-09-04T14:30:00+05:30", actor: "Dr. Suhas Diwase, IAS", role: "Collector / CALA", organization: "Collectorate, Pune", action: "Returned submission for clarification", project: "Pune Ring Road Phase 2", previousState: "Submitted", newState: "Returned", justification: "Land schedule mismatch in parcels 33/4A & 33/4B" },
  { id: "adm-aud-005", timestamp: "2026-09-03T11:00:00+05:30", actor: "Smt. Kavita Patil", role: "Tehsil / SDO", organization: "Tehsil Office, Haveli", action: "Scheduled objection hearing", project: "Jalna Dry Port", previousState: null, newState: null, justification: "Hearing scheduled for 05 Sep 2026 at Haveli Tahsil Office" },
  { id: "adm-aud-006", timestamp: "2026-09-02T14:30:00+05:30", actor: "Shri. Asheesh Singh, IAS", role: "Collector / CALA", organization: "Collectorate, Indore", action: "Advanced case to Scrutiny", project: "Indore–Ujjain Corridor", previousState: "Submission", newState: "Scrutiny", justification: "All required documents received and verified" },
  { id: "adm-aud-007", timestamp: "2026-09-01T10:00:00+05:30", actor: "Prof. S. Mishra", role: "SIA Expert", organization: "SIA Panel — Odisha", action: "Uploaded draft SIA report", project: "Jatni Canal Modernisation", previousState: null, newState: null, justification: "Draft SIA report v0.3 — public consultation pending" },
  { id: "adm-aud-008", timestamp: "2026-08-30T09:15:00+05:30", actor: "Smt. R. Kulkarni", role: "Finance Officer", organization: "PFMS Cell, Pune", action: "Sanctioned payment", project: "Pune–Nashik Elevated Corridor", previousState: "Compensation Assessed", newState: "Payment Sanctioned", justification: "₹ 2.42 Cr sanctioned for parcel 78/3 — Prakash N. Borade" },
  { id: "adm-aud-009", timestamp: "2026-08-28T11:20:00+05:30", actor: "Dr. Suhas Diwase, IAS", role: "Collector / CALA", organization: "Collectorate, Pune", action: "Advanced case to Compensation Assessment", project: "Pune Ring Road Phase 2", previousState: "Field Verification", newState: "Compensation", justification: "Field verification complete for 5 parcels — area confirmed" },
  { id: "adm-aud-010", timestamp: "2026-08-26T15:40:00+05:30", actor: "Shri. M. Kamble", role: "Field Officer", organization: "Tehsil Office, Haveli", action: "Submitted field verification report", project: "Pune Ring Road Phase 2", previousState: null, newState: null, justification: "Verification report for 5 parcels — measurements and photos attached" },
  { id: "adm-aud-011", timestamp: "2026-08-24T08:00:00+05:30", actor: "System", role: "System", organization: "DoLR", action: "SLA breach notification", project: "MIHAN SEZ Phase 3", previousState: null, newState: null, justification: "Preliminary Notification SLA exceeded by 14 days" },
  { id: "adm-aud-012", timestamp: "2026-08-22T10:05:00+05:30", actor: "Smt. Kavita Patil", role: "Tehsil / SDO", organization: "Tehsil Office, Haveli", action: "Scheduled objection hearing", project: "Jalna Dry Port", previousState: null, newState: null, justification: "Hearing for D. P. Rathod — Haveli Tahsil Office" },
];

// ── National Document Repository ──
export type AdminDocument = {
  id: string;
  documentName: string;
  project: string;
  documentType: string;
  stage: LifecycleStage;
  uploadedBy: string;
  version: string;
  uploadedDate: string;
  status: "verified" | "pending" | "rejected";
};

export const ADMIN_DOCUMENTS: AdminDocument[] = [
  { id: "adm-doc-001", documentName: "Project Proposal — Pune Ring Road Phase 2", project: "Pune Ring Road Phase 2", documentType: "Project Charter", stage: "project_proposal", uploadedBy: "Shri. A. Deshmukh", version: "v1.2", uploadedDate: "2025-06-15", status: "verified" },
  { id: "adm-doc-002", documentName: "GIS Parcel Identification — Haveli Cluster", project: "Pune Ring Road Phase 2", documentType: "GIS Report", stage: "gis_identification", uploadedBy: "Shri. M. Kamble", version: "v1.0", uploadedDate: "2025-08-10", status: "verified" },
  { id: "adm-doc-003", documentName: "Compensation Assessment Sheet — 5 Parcels", project: "Pune Ring Road Phase 2", documentType: "Compensation Sheet", stage: "compensation", uploadedBy: "Dr. Suhas Diwase", version: "v2.1", uploadedDate: "2026-08-28", status: "pending" },
  { id: "adm-doc-004", documentName: "Draft SIA Report — Jatni Canal", project: "Jatni Canal Modernisation", documentType: "SIA Report", stage: "sia", uploadedBy: "Prof. S. Mishra", version: "v0.3", uploadedDate: "2026-07-15", status: "pending" },
  { id: "adm-doc-005", documentName: "Preliminary Notification u/s 11(1) — MIHAN", project: "MIHAN SEZ Phase 3", documentType: "Section 11 Notification", stage: "preliminary_notification", uploadedBy: "Dr. Vipin Itankar", version: "v1.0", uploadedDate: "2026-08-10", status: "verified" },
  { id: "adm-doc-006", documentName: "Award Order u/s 23 — Kasbe Digraj", project: "Urmodi Irrigation", documentType: "Award Order", stage: "award", uploadedBy: "Shri. Jitendra Dudi", version: "v1.0", uploadedDate: "2026-08-18", status: "verified" },
  { id: "adm-doc-007", documentName: "PFMS Sanction — ₹ 2.42 Cr", project: "Pune–Nashik Elevated Corridor", documentType: "Disbursement Statement", stage: "payment", uploadedBy: "Smt. R. Kulkarni", version: "v1.0", uploadedDate: "2026-08-30", status: "verified" },
  { id: "adm-doc-008", documentName: "Objection Petition — D. P. Rathod", project: "Jalna Dry Port", documentType: "Objection Decision", stage: "objections_hearing", uploadedBy: "Dnyaneshwar P. Rathod", version: "v1.0", uploadedDate: "2026-07-20", status: "pending" },
  { id: "adm-doc-009", documentName: "Section 19 Declaration — Pune Ring Road", project: "Pune Ring Road Phase 2", documentType: "Section 19 Declaration", stage: "declaration", uploadedBy: "Dr. Suhas Diwase", version: "v1.0", uploadedDate: "2026-09-01", status: "pending" },
  { id: "adm-doc-010", documentName: "Field Verification Report — 5 Parcels", project: "Pune Ring Road Phase 2", documentType: "Verification Report", stage: "field_verification", uploadedBy: "Shri. M. Kamble", version: "v1.0", uploadedDate: "2026-08-26", status: "verified" },
  { id: "adm-doc-011", documentName: "Scrutiny Report — Indore–Ujjain Corridor", project: "Indore–Ujjain Corridor", documentType: "Scrutiny Report", stage: "scrutiny", uploadedBy: "Shri. Asheesh Singh", version: "v1.1", uploadedDate: "2026-09-02", status: "verified" },
  { id: "adm-doc-012", documentName: "Possession Certificate — Purandar Airport", project: "Purandar Airport", documentType: "Possession Certificate", stage: "possession", uploadedBy: "Dr. Suhas Diwase", version: "v1.0", uploadedDate: "2026-03-15", status: "verified" },
  { id: "adm-doc-013", documentName: "R&R Entitlement Sheet — Purandar", project: "Purandar Airport", documentType: "R&R Entitlement", stage: "r_and_r", uploadedBy: "Smt. Asha Khedkar", version: "v1.0", uploadedDate: "2026-02-28", status: "verified" },
  { id: "adm-doc-014", documentName: "Grievance Case File — Solatium Claim", project: "Pune Ring Road Phase 2", documentType: "Grievance Case File", stage: "compensation", uploadedBy: "Dr. Suhas Diwase", version: "v1.0", uploadedDate: "2026-08-25", status: "pending" },
  { id: "adm-doc-015", documentName: "Completion Report — Purandar Phase 1", project: "Purandar Airport", documentType: "Completion Report", stage: "closed", uploadedBy: "Dr. Suhas Diwase", version: "v1.0", uploadedDate: "2026-03-30", status: "verified" },
];

// ── GIS State Summary ──
export type StateSummary = {
  state: string;
  projects: number;
  parcels: number;
  activeAcquisitions: number;
  delayed: number;
  compensationDisbursed: string;
  center: [number, number];
};

export const STATE_SUMMARIES: StateSummary[] = [
  { state: "Maharashtra", projects: 24, parcels: 18421, activeAcquisitions: 17, delayed: 3, compensationDisbursed: "₹ 4,280 Cr", center: [19.7515, 75.7139] },
  { state: "Madhya Pradesh", projects: 14, parcels: 9820, activeAcquisitions: 10, delayed: 1, compensationDisbursed: "₹ 2,140 Cr", center: [22.9734, 78.6569] },
  { state: "Odisha", projects: 10, parcels: 6440, activeAcquisitions: 7, delayed: 2, compensationDisbursed: "₹ 1,860 Cr", center: [20.9517, 85.0985] },
  { state: "Tamil Nadu", projects: 14, parcels: 8200, activeAcquisitions: 11, delayed: 2, compensationDisbursed: "₹ 3,420 Cr", center: [11.1271, 78.6569] },
  { state: "Gujarat", projects: 8, parcels: 4200, activeAcquisitions: 6, delayed: 1, compensationDisbursed: "₹ 1,680 Cr", center: [22.2587, 71.1924] },
  { state: "Rajasthan", projects: 6, parcels: 3100, activeAcquisitions: 4, delayed: 0, compensationDisbursed: "₹ 920 Cr", center: [27.0238, 74.2179] },
  { state: "Karnataka", projects: 8, parcels: 5200, activeAcquisitions: 6, delayed: 1, compensationDisbursed: "₹ 2,100 Cr", center: [15.3173, 75.7139] },
  { state: "Andhra Pradesh", projects: 6, parcels: 3800, activeAcquisitions: 4, delayed: 1, compensationDisbursed: "₹ 1,420 Cr", center: [15.9129, 79.7400] },
  { state: "Uttar Pradesh", projects: 12, parcels: 7600, activeAcquisitions: 9, delayed: 2, compensationDisbursed: "₹ 2,860 Cr", center: [26.8467, 80.9462] },
  { state: "West Bengal", projects: 4, parcels: 2200, activeAcquisitions: 3, delayed: 0, compensationDisbursed: "₹ 680 Cr", center: [22.9868, 87.8550] },
  { state: "Kerala", projects: 3, parcels: 1400, activeAcquisitions: 2, delayed: 0, compensationDisbursed: "₹ 420 Cr", center: [10.8505, 76.2711] },
  { state: "Delhi", projects: 4, parcels: 1800, activeAcquisitions: 3, delayed: 0, compensationDisbursed: "₹ 1,240 Cr", center: [28.7041, 77.1025] },
];
