/**
 * Deterministic development seed.
 *
 * Proves the real database path: Supabase PostgreSQL (local PostGIS container
 * in development) ← migrations ← this seed ← Fastify API ← frontend.
 *
 * Everything here is small and deterministic (fixed UUIDs, ON CONFLICT
 * DO NOTHING) so it is safe to re-run. No fabricated national statistics and
 * no fabricated audit history: the audit rows written below are REAL events
 * describing the actual seeding of these exact records.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sql } from "drizzle-orm";
import { getDb, getPool, closePool } from "./client.js";
import {
  auditEvents,
  datasets,
  jurisdictions,
  organizations,
  parcels,
  projects,
  users,
  workflowInstances,
  workflowTransitions,
} from "./schema.js";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

const JURIS = {
  india: id(1),
  maharashtra: id(2),
  odisha: id(3),
  tamilNadu: id(4),
  pune: id(5),
  nagpur: id(6),
  khordha: id(7),
  chennai: id(8),
  haveli: id(9),
  baramati: id(10),
  hingna: id(11),
  jatni: id(12),
  pargaon: id(13),
  kondhurd: id(14),
  mihan: id(15),
  balianta: id(16),
} as const;

const ORG = {
  dolr: id(101),
  morth: id(102),
  nhai: id(103),
  madc: id(104),
  collectoratePune: id(105),
  wrdOdisha: id(106),
  revenueMh: id(107),
} as const;

const USER = {
  nationalAdmin: id(201),
  stateNodal: id(202),
  collector: id(203),
  requiringOrg: id(204),
  tehsilSdo: id(205),
  fieldOfficer: id(206),
} as const;

const PROJECT = {
  puneRingRoad: id(301),
  jatniCanal: id(302),
  mihanSez: id(303),
} as const;

const DATASET = { puneCadastral: id(401) } as const;

export const SEED_ACTOR_IDS = USER;

export async function seed(): Promise<void> {
  const db = getDb();

  // ── Jurisdictions: national → state → district → tehsil → village ─────────
  await db
    .insert(jurisdictions)
    .values([
      { id: JURIS.india, level: "national", name: "India", code: "IN" },
      { id: JURIS.maharashtra, level: "state", name: "Maharashtra", code: "IN-MH", parentId: JURIS.india, stateCode: "IN-MH" },
      { id: JURIS.odisha, level: "state", name: "Odisha", code: "IN-OD", parentId: JURIS.india, stateCode: "IN-OD" },
      { id: JURIS.tamilNadu, level: "state", name: "Tamil Nadu", code: "IN-TN", parentId: JURIS.india, stateCode: "IN-TN" },
      { id: JURIS.pune, level: "district", name: "Pune District", code: "IN-MH-PUN", parentId: JURIS.maharashtra, stateCode: "IN-MH", districtCode: "IN-MH-PUN" },
      { id: JURIS.nagpur, level: "district", name: "Nagpur District", code: "IN-MH-NGP", parentId: JURIS.maharashtra, stateCode: "IN-MH", districtCode: "IN-MH-NGP" },
      { id: JURIS.khordha, level: "district", name: "Khordha District", code: "IN-OD-KHD", parentId: JURIS.odisha, stateCode: "IN-OD", districtCode: "IN-OD-KHD" },
      { id: JURIS.chennai, level: "district", name: "Chennai District", code: "IN-TN-CHN", parentId: JURIS.tamilNadu, stateCode: "IN-TN", districtCode: "IN-TN-CHN" },
      { id: JURIS.haveli, level: "tehsil", name: "Haveli Tehsil", code: "IN-MH-PUN-HAV", parentId: JURIS.pune, stateCode: "IN-MH", districtCode: "IN-MH-PUN", tehsilCode: "IN-MH-PUN-HAV" },
      { id: JURIS.baramati, level: "tehsil", name: "Baramati Tehsil", code: "IN-MH-PUN-BAR", parentId: JURIS.pune, stateCode: "IN-MH", districtCode: "IN-MH-PUN", tehsilCode: "IN-MH-PUN-BAR" },
      { id: JURIS.hingna, level: "tehsil", name: "Hingna Tehsil", code: "IN-MH-NGP-HIN", parentId: JURIS.nagpur, stateCode: "IN-MH", districtCode: "IN-MH-NGP", tehsilCode: "IN-MH-NGP-HIN" },
      { id: JURIS.jatni, level: "tehsil", name: "Jatni Tehsil", code: "IN-OD-KHD-JAT", parentId: JURIS.khordha, stateCode: "IN-OD", districtCode: "IN-OD-KHD", tehsilCode: "IN-OD-KHD-JAT" },
      { id: JURIS.pargaon, level: "village", name: "Pargaon", code: "IN-MH-PUN-HAV-PAR", parentId: JURIS.haveli, stateCode: "IN-MH", districtCode: "IN-MH-PUN", tehsilCode: "IN-MH-PUN-HAV" },
      { id: JURIS.kondhurd, level: "village", name: "Kondhurd", code: "IN-MH-PUN-HAV-KON", parentId: JURIS.haveli, stateCode: "IN-MH", districtCode: "IN-MH-PUN", tehsilCode: "IN-MH-PUN-HAV" },
      { id: JURIS.mihan, level: "village", name: "Mihan", code: "IN-MH-NGP-HIN-MIH", parentId: JURIS.hingna, stateCode: "IN-MH", districtCode: "IN-MH-NGP", tehsilCode: "IN-MH-NGP-HIN" },
      { id: JURIS.balianta, level: "village", name: "Balianta", code: "IN-OD-KHD-JAT-BAL", parentId: JURIS.jatni, stateCode: "IN-OD", districtCode: "IN-OD-KHD", tehsilCode: "IN-OD-KHD-JAT" },
    ])
    .onConflictDoNothing();

  // ── Organizations ─────────────────────────────────────────────────────────
  await db
    .insert(organizations)
    .values([
      { id: ORG.dolr, name: "Department of Land Resources", code: "DOLR", orgType: "central_ministry", jurisdictionLabel: "National" },
      { id: ORG.morth, name: "Ministry of Road Transport & Highways", code: "MORTH", orgType: "central_ministry", parentId: ORG.dolr, jurisdictionLabel: "National" },
      { id: ORG.nhai, name: "National Highways Authority of India", code: "NHAI", orgType: "requiring_org", parentId: ORG.morth, jurisdictionLabel: "National" },
      { id: ORG.madc, name: "Maharashtra Airport Development Co. Ltd.", code: "MADC", orgType: "implementing_agency", jurisdictionLabel: "Maharashtra" },
      { id: ORG.collectoratePune, name: "Collectorate, Pune", code: "COL-PUNE", orgType: "district_auth", jurisdictionLabel: "Pune District" },
      { id: ORG.wrdOdisha, name: "Water Resources Dept., Odisha", code: "WRD-OD", orgType: "state_dept", jurisdictionLabel: "Odisha" },
      { id: ORG.revenueMh, name: "Revenue Dept., Maharashtra", code: "REV-MH", orgType: "state_dept", jurisdictionLabel: "Maharashtra" },
    ])
    .onConflictDoNothing();

  // ── Users (roles resolved server-side from these rows) ────────────────────
  await db
    .insert(users)
    .values([
      { id: USER.nationalAdmin, name: "Smt. Meera Joshi, IAS", email: "meera.joshi@dolr.gov.in", designation: "National Admin", roleId: "national_admin", organizationId: ORG.dolr, jurisdictionId: JURIS.india, status: "active" },
      { id: USER.stateNodal, name: "Shri. R. K. Sable, IAS", email: "rk.sable@maharashtra.gov.in", designation: "State Nodal Officer", roleId: "state_nodal", organizationId: ORG.revenueMh, jurisdictionId: JURIS.maharashtra, status: "active" },
      { id: USER.collector, name: "Dr. Suhas Diwase, IAS", email: "collector.pune@maharashtra.gov.in", designation: "District Collector / CALA", roleId: "collector_cala", organizationId: ORG.collectoratePune, jurisdictionId: JURIS.pune, status: "active" },
      { id: USER.requiringOrg, name: "Shri. A. Deshmukh", email: "a.deshmukh@nhai.org", designation: "CGM (T) NHAI-RO Pune", roleId: "requiring_org", organizationId: ORG.nhai, jurisdictionId: JURIS.india, status: "active" },
      { id: USER.tehsilSdo, name: "Smt. Kavita Patil", email: "sdo.haveli@maharashtra.gov.in", designation: "SDO, Haveli", roleId: "tehsil_sdo", organizationId: ORG.collectoratePune, jurisdictionId: JURIS.haveli, status: "active" },
      { id: USER.fieldOfficer, name: "Shri. M. Kamble", email: "m.kamble@maharashtra.gov.in", designation: "Field Officer / VAO", roleId: "field_officer", organizationId: ORG.collectoratePune, jurisdictionId: JURIS.haveli, status: "active" },
    ])
    .onConflictDoNothing();

  // ── Dataset placeholder (no real cadastral data ingested yet) ─────────────
  await db
    .insert(datasets)
    .values([
      {
        id: DATASET.puneCadastral,
        name: "Pune cadastral extract (placeholder)",
        source: "manual_development_seed",
        format: "none",
        status: "registered",
        recordCount: 0,
        notes: "Demonstration placeholder only — no cadastral dataset has been acquired or ingested.",
        createdBy: USER.fieldOfficer,
      },
    ])
    .onConflictDoNothing();

  // ── Projects ──────────────────────────────────────────────────────────────
  await db
    .insert(projects)
    .values([
      {
        id: PROJECT.puneRingRoad,
        projectCode: "MH/PUNE/NHAI/2025-26/042",
        projectName: "Pune Ring Road — Phase 2 (Eastern Spur)",
        requiringOrganizationId: ORG.nhai,
        projectCategory: "infrastructure",
        applicableAct: "RFCTLARR",
        purpose: "Greenfield eastern spur connecting Wagholi–Urali Kanchan–Hadapsar bypass under Bharatmala Phase-II.",
        description: "34 km greenfield eastern spur of Pune Ring Road.",
        status: "active",
        currentWorkflowStage: "compensation",
        jurisdictionId: JURIS.pune,
        state: "Maharashtra",
        district: "Pune",
        ministry: "Ministry of Road Transport & Highways",
        budgetCr: "3420.00",
        requiredAreaHa: "480.0000",
        targetDate: "2027-03-31",
        createdBy: USER.requiringOrg,
      },
      {
        id: PROJECT.jatniCanal,
        projectCode: "OD/KHORDHA/WRD/2024-25/003",
        projectName: "Jatni Canal Modernisation — Right Bank Distributary",
        requiringOrganizationId: ORG.wrdOdisha,
        projectCategory: "irrigation",
        applicableAct: "RFCTLARR",
        purpose: "Widening and lining of the right bank distributary.",
        description: "Modernisation covering 52 ha across Khordha district.",
        status: "active",
        currentWorkflowStage: "sia",
        jurisdictionId: JURIS.khordha,
        state: "Odisha",
        district: "Khordha",
        ministry: "Ministry of Jal Shakti",
        budgetCr: "210.00",
        requiredAreaHa: "52.0000",
        targetDate: "2026-12-31",
        createdBy: USER.requiringOrg,
      },
      {
        id: PROJECT.mihanSez,
        projectCode: "MH/NAG/MADC/2024-25/018",
        projectName: "MIHAN SEZ — Phase 3 Industrial Expansion",
        requiringOrganizationId: ORG.madc,
        projectCategory: "industrial",
        applicableAct: "RFCTLARR",
        purpose: "Additional land for logistics and manufacturing zone.",
        description: "420 Ha expansion of the Multi-modal International Hub Airport at Nagpur.",
        status: "active",
        currentWorkflowStage: "preliminary_notification",
        jurisdictionId: JURIS.nagpur,
        state: "Maharashtra",
        district: "Nagpur",
        ministry: "Ministry of Civil Aviation",
        budgetCr: "1875.00",
        requiredAreaHa: "420.0000",
        targetDate: "2027-06-30",
        createdBy: USER.requiringOrg,
      },
    ])
    .onConflictDoNothing();

  // ── Parcels (two demonstration geometries prove the PostGIS column works) ─
  await db
    .insert(parcels)
    .values([
      {
        id: id(501),
        projectId: PROJECT.puneRingRoad,
        surveyNumber: "78/3",
        subdivisionNumber: "3",
        ulpin: "MH2715001P0078R0003",
        state: "Maharashtra",
        district: "Pune",
        taluk: "Haveli",
        village: "Pargaon",
        areaHa: "4.5200",
        landType: "agricultural",
        geometry: sql`ST_GeomFromText('POLYGON((73.8700 18.5200, 73.8720 18.5200, 73.8720 18.5216, 73.8700 18.5216, 73.8700 18.5200))', 4326)`,
        classificationStatus: "classified",
        routingStatus: "routed",
        currentWorkflowStage: "compensation",
        sourceDatasetId: DATASET.puneCadastral,
      },
      {
        id: id(502),
        projectId: PROJECT.puneRingRoad,
        surveyNumber: "79/1",
        state: "Maharashtra",
        district: "Pune",
        taluk: "Haveli",
        village: "Kondhurd",
        areaHa: "2.3100",
        landType: "barren",
        classificationStatus: "classified",
        routingStatus: "routed",
        currentWorkflowStage: "compensation",
        sourceDatasetId: DATASET.puneCadastral,
      },
      {
        id: id(503),
        projectId: PROJECT.jatniCanal,
        surveyNumber: "112/4",
        ulpin: "OD1819004P0112R0004",
        state: "Odisha",
        district: "Khordha",
        taluk: "Jatni",
        village: "Balianta",
        areaHa: "1.8500",
        landType: "agricultural",
        geometry: sql`ST_GeomFromText('POLYGON((85.7000 20.1800, 85.7015 20.1800, 85.7015 20.1812, 85.7000 20.1812, 85.7000 20.1800))', 4326)`,
        classificationStatus: "classified",
        routingStatus: "routed",
        currentWorkflowStage: "field_verification",
        sourceDatasetId: DATASET.puneCadastral,
      },
      {
        id: id(504),
        projectId: PROJECT.jatniCanal,
        surveyNumber: "113/1",
        state: "Odisha",
        district: "Khordha",
        taluk: "Jatni",
        village: "Balianta",
        areaHa: "3.2000",
        landType: "government",
        classificationStatus: "unclassified",
        routingStatus: "unrouted",
        currentWorkflowStage: "field_verification",
      },
      {
        id: id(505),
        projectId: PROJECT.mihanSez,
        surveyNumber: "42/7",
        ulpin: "MH2731002P0042R0007",
        state: "Maharashtra",
        district: "Nagpur",
        taluk: "Hingna",
        village: "Mihan",
        areaHa: "12.4000",
        landType: "industrial",
        classificationStatus: "unclassified",
        routingStatus: "unrouted",
        currentWorkflowStage: "preliminary_notification",
      },
      {
        id: id(506),
        projectId: PROJECT.mihanSez,
        surveyNumber: "43/2",
        state: "Maharashtra",
        district: "Nagpur",
        taluk: "Hingna",
        village: "Mihan",
        areaHa: "8.7500",
        landType: "barren",
        classificationStatus: "unclassified",
        routingStatus: "unrouted",
        currentWorkflowStage: "preliminary_notification",
      },
    ])
    .onConflictDoNothing();

  // ── Workflow instances + their creation transition ────────────────────────
  const workflowRows = [
    { entityId: PROJECT.puneRingRoad, stage: "compensation", ownerRole: "collector_cala", actor: USER.requiringOrg },
    { entityId: PROJECT.jatniCanal, stage: "sia", ownerRole: "sia_expert", actor: USER.requiringOrg },
    { entityId: PROJECT.mihanSez, stage: "preliminary_notification", ownerRole: "collector_cala", actor: USER.requiringOrg },
  ];

  const instanceIdByEntity = new Map<string, string>();
  let instanceSeq = 601;

  for (const row of workflowRows) {
    const instanceId = id(instanceSeq++);
    instanceIdByEntity.set(row.entityId, instanceId);
    await db
      .insert(workflowInstances)
      .values({
        id: instanceId,
        entityType: "project",
        entityId: row.entityId,
        currentStage: row.stage,
        status: "active",
        ownerRoleId: row.ownerRole,
      })
      .onConflictDoNothing();
  }

  let transitionSeq = 701;
  for (const row of workflowRows) {
    await db
      .insert(workflowTransitions)
      .values({
        id: id(transitionSeq++),
        workflowInstanceId: instanceIdByEntity.get(row.entityId)!,
        fromStage: null,
        toStage: row.stage,
        action: "create",
        actorUserId: row.actor,
        actorRole: "requiring_org",
        isAllowed: true,
        reason: "Workflow instance created during development seed.",
        afterState: { stage: row.stage },
      })
      .onConflictDoNothing();
  }

  // ── Real audit events describing these exact seed operations ──────────────
  let auditSeq = 801;
  const projectSeedEvents = [
    { entityId: PROJECT.puneRingRoad, code: "MH/PUNE/NHAI/2025-26/042", stage: "compensation" },
    { entityId: PROJECT.jatniCanal, code: "OD/KHORDHA/WRD/2024-25/003", stage: "sia" },
    { entityId: PROJECT.mihanSez, code: "MH/NAG/MADC/2024-25/018", stage: "preliminary_notification" },
  ];

  for (const event of projectSeedEvents) {
    await db
      .insert(auditEvents)
      .values({
        id: id(auditSeq++),
        actorUserId: USER.requiringOrg,
        actorRole: "requiring_org",
        action: "PROJECT_CREATED",
        entityType: "project",
        entityId: event.entityId,
        beforeState: null,
        afterState: { projectCode: event.code, currentWorkflowStage: event.stage },
        reason: "Development seed — record created by `npm run seed`.",
        ip: null,
      })
      .onConflictDoNothing();
  }
}

async function main(): Promise<void> {
  try {
    await seed();
    const pool = getPool();
    const tables = [
      "roles",
      "jurisdictions",
      "organizations",
      "users",
      "projects",
      "parcels",
      "workflow_instances",
      "workflow_transitions",
      "audit_events",
      "datasets",
    ];
    console.log("seed complete:");
    for (const table of tables) {
      const result = await pool.query<{ n: string }>(`SELECT count(*)::text AS n FROM ${table}`);
      console.log(`  ${table}: ${result.rows[0].n}`);
    }
  } finally {
    await closePool();
  }
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
