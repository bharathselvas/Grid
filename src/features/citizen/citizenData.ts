// Citizen / Landowner Portal — data types and mock data
// All data is fictional. MOCK / SANDBOX values only.

export type AcquisitionStage =
  | "proposal"
  | "gis_identification"
  | "scrutiny"
  | "sia"
  | "section_11"
  | "disclosure"
  | "objections"
  | "declaration"
  | "field_verification"
  | "award"
  | "compensation"
  | "possession"
  | "r_and_r";

export type NoticeType =
  | "section_11_preliminary"
  | "disclosure"
  | "hearing"
  | "section_19_declaration"
  | "other";

export type ObjectionStatus =
  | "submitted"
  | "under_review"
  | "hearing_scheduled"
  | "decision_recorded"
  | "closed";

export type ObjectionCategory =
  | "land_ownership"
  | "parcel_boundary"
  | "land_area"
  | "land_use"
  | "livelihood_impact"
  | "public_property"
  | "residential_impact"
  | "other";

export type GrievanceCategory =
  | "status_issue"
  | "document_issue"
  | "payment_issue"
  | "ownership_discrepancy"
  | "field_verification_issue"
  | "rr_issue"
  | "other";

export type GrievanceStatus =
  | "submitted"
  | "under_review"
  | "awaiting_information"
  | "response_provided"
  | "resolved"
  | "escalated";

export type PaymentStatus = "pending" | "initiated" | "completed" | "failed" | "returned";

export type PossessionStatus = "pending" | "scheduled" | "recorded";

export type RnRComponentStatus = "planned" | "in_progress" | "delivered" | "not_applicable";

export type CitizenStageStatus = "completed" | "in_progress" | "not_started" | "attention_required";

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

export type CitizenProfile = {
  caseId: string;
  name: string;
  fatherName: string;
  village: string;
  tehsil: string;
  district: string;
  state: string;
  parcelRef: string;
  ulpin: string;
  project: string;
  projectId: string;
  areaAcres: number;
  landClassification: string;
  mobile: string;
};

export type CitizenProject = {
  projectId: string;
  name: string;
  purpose: string;
  requiringOrg: string;
  implementingAgency: string;
  state: string;
  district: string;
  affectedVillages: string[];
  currentStage: AcquisitionStage;
  publishedNotices: number;
  objectionsReceived: number;
  importantDates: { label: string; date: string }[];
};

export type CitizenNotice = {
  noticeId: string;
  type: NoticeType;
  title: string;
  referenceNo: string;
  projectId: string;
  project: string;
  village: string;
  district: string;
  publicationDate: string;
  effectiveDate: string;
  objectionDeadline: string;
  affectedVillages: string[];
  authority: string;
  description: string;
  documentName: string;
};

export type CitizenObjection = {
  objectionId: string;
  caseId: string;
  projectId: string;
  project: string;
  parcelRef: string;
  category: ObjectionCategory;
  description: string;
  submittedDate: string;
  status: ObjectionStatus;
  hearingDate?: string;
  hearingTime?: string;
  hearingVenue?: string;
  decision?: string;
  decisionDate?: string;
  decisionAuthority?: string;
  decisionDocument?: string;
  nextAction: string;
};

export type CitizenGrievance = {
  grievanceId: string;
  caseId: string;
  category: GrievanceCategory;
  description: string;
  submittedDate: string;
  status: GrievanceStatus;
  assignedAuthority: string;
  lastUpdate: string;
  response?: string;
  responseDate?: string;
};

export type CitizenDocument = {
  docId: string;
  name: string;
  reference: string;
  date: string;
  category: "notice" | "sia" | "field_verification" | "award" | "compensation" | "payment" | "possession" | "rr" | "grievance";
  status: "available" | "pending" | "missing";
};

export type CitizenNotification = {
  id: string;
  title: string;
  message: string;
  date: string;
  read: boolean;
  link: string;
  type: "notice" | "objection" | "award" | "payment" | "rr" | "document" | "grievance";
};

export type StageTimeline = {
  stage: AcquisitionStage;
  label: string;
  status: CitizenStageStatus;
  date?: string;
  reference?: string;
  document?: string;
};

export type CompensationBreakdown = {
  component: string;
  amount: number;
};

// ═══════════════════════════════════════════════════════════════════════
// MOCK DATA
// ═══════════════════════════════════════════════════════════════════════

export const DEMO_CITIZEN: CitizenProfile = {
  caseId: "LA-2026-00421",
  name: "Demo Landowner",
  fatherName: "Shri. Baban R. Khomane",
  village: "Kharpudi",
  tehsil: "Purandar",
  district: "Jalna",
  state: "Maharashtra",
  parcelRef: "PAR-JLN-00421",
  ulpin: "ULPIN-MOCK-00421",
  project: "Eastern Freight Corridor Expansion — Package 04",
  projectId: "PRJ-2025-00187",
  areaAcres: 2.4,
  landClassification: "Agricultural (Class II)",
  mobile: "******4821",
};

export const CITIZEN_PROJECTS: CitizenProject[] = [
  {
    projectId: "PRJ-2025-00187",
    name: "Eastern Freight Corridor Expansion — Package 04",
    purpose: "Doubling of railway track and associated infrastructure for freight movement between Bhusawal and Kalyan",
    requiringOrg: "Ministry of Railways",
    implementingAgency: "National Highways Authority of India (NHAI)",
    state: "Maharashtra",
    district: "Jalna",
    affectedVillages: ["Kharpudi", "Varvand", "Bhose", "Pimpalner", "Nandur"],
    currentStage: "compensation",
    publishedNotices: 6,
    objectionsReceived: 14,
    importantDates: [
      { label: "Section 11 Notification", date: "15 Mar 2026" },
      { label: "Objection Deadline", date: "14 Apr 2026" },
      { label: "Public Hearing", date: "20 Apr 2026" },
      { label: "Section 19 Declaration", date: "15 May 2026" },
      { label: "Award Date", date: "15 Aug 2026" },
    ],
  },
  {
    projectId: "PRJ-2025-00192",
    name: "Nagpur Metro Expansion — Phase 02",
    purpose: "Extension of Nagpur Metro rail network to cover additional corridors",
    requiringOrg: "Maharashtra Metro Rail Corporation",
    implementingAgency: "Maharashtra Metro Rail Corporation",
    state: "Maharashtra",
    district: "Nagpur",
    affectedVillages: ["Mankapur", "Hingna", "Wanadongri", "Butibori"],
    currentStage: "declaration",
    publishedNotices: 5,
    objectionsReceived: 8,
    importantDates: [
      { label: "Section 11 Notification", date: "01 Aug 2026" },
      { label: "Objection Deadline", date: "31 Aug 2026" },
      { label: "Section 19 Declaration", date: "15 Sep 2026" },
    ],
  },
];

export const CITIZEN_NOTICES: CitizenNotice[] = [
  {
    noticeId: "NOT-2026-0421",
    type: "section_11_preliminary",
    title: "Section 11(1) Preliminary Notification — Land Acquisition",
    referenceNo: "Govt. Notification No. MH/2026/LA/0421",
    projectId: "PRJ-2025-00187",
    project: "Eastern Freight Corridor Expansion — Package 04",
    village: "Kharpudi",
    district: "Jalna",
    publicationDate: "15 Mar 2026",
    effectiveDate: "15 Mar 2026",
    objectionDeadline: "14 Apr 2026",
    affectedVillages: ["Kharpudi", "Varvand", "Bhose"],
    authority: "District Collector, Jalna",
    description: "Notice is hereby given that the Government of Maharashtra has identified the land described in the schedule below for the purpose of public purpose — Eastern Freight Corridor Expansion. All persons having interest in the said land are informed.",
    documentName: "Section_11_Notification_MH2026_0421.pdf",
  },
  {
    noticeId: "NOT-2026-0422",
    type: "disclosure",
    title: "Public Disclosure — Social Impact Assessment Report",
    referenceNo: "SIA/Disclosure/2026/0421",
    projectId: "PRJ-2025-00187",
    project: "Eastern Freight Corridor Expansion — Package 04",
    village: "Kharpudi",
    district: "Jalna",
    publicationDate: "01 Apr 2026",
    effectiveDate: "01 Apr 2026",
    objectionDeadline: "14 Apr 2026",
    affectedVillages: ["Kharpudi", "Varvand", "Bhose", "Pimpalner", "Nandur"],
    authority: "District Collector, Jalna",
    description: "The Social Impact Assessment Report for the above project has been completed and is now available for public inspection. Interested persons may review the report and submit objections within the prescribed period.",
    documentName: "SIA_Report_PRJ2025_00187.pdf",
  },
  {
    noticeId: "NOT-2026-0423",
    type: "hearing",
    title: "Public Hearing — Objection Hearing Notice",
    referenceNo: "Hearing/2026/0421",
    projectId: "PRJ-2025-00187",
    project: "Eastern Freight Corridor Expansion — Package 04",
    village: "Kharpudi",
    district: "Jalna",
    publicationDate: "15 Apr 2026",
    effectiveDate: "20 Apr 2026",
    objectionDeadline: "14 Apr 2026",
    affectedVillages: ["Kharpudi", "Varvand"],
    authority: "District Collector, Jalna",
    description: "A public hearing will be held on 20 April 2026 at 11:00 AM at the Talathidi Office, Kharpudi to hear objections from affected persons. All interested parties are invited to attend.",
    documentName: "Hearing_Notice_0421.pdf",
  },
  {
    noticeId: "NOT-2026-0424",
    type: "section_19_declaration",
    title: "Section 19(1) Declaration — Land Acquisition for Public Purpose",
    referenceNo: "Govt. Declaration No. MH/2026/LA/0421",
    projectId: "PRJ-2025-00187",
    project: "Eastern Freight Corridor Expansion — Package 04",
    village: "Kharpudi",
    district: "Jalna",
    publicationDate: "15 May 2026",
    effectiveDate: "15 May 2026",
    objectionDeadline: "",
    affectedVillages: ["Kharpudi", "Varvand", "Bhose", "Pimpalner", "Nandur"],
    authority: "Government of Maharashtra",
    description: "After considering the objections received and the recommendations of the Collector, the Government hereby declares that the land described in the schedule is required for a public purpose.",
    documentName: "Section_19_Declaration_MH2026_0421.pdf",
  },
];

export const CITIZEN_OBJECTIONS: CitizenObjection[] = [
  {
    objectionId: "OBJ-2026-00881",
    caseId: "LA-2026-00421",
    projectId: "PRJ-2025-00187",
    project: "Eastern Freight Corridor Expansion — Package 04",
    parcelRef: "PAR-JLN-00421",
    category: "land_area",
    description: "The area shown in the notification (2.4 acres) includes a portion of my agricultural land that is not part of the proposed acquisition boundary. The actual affected area should be 1.8 acres as per the survey measurements.",
    submittedDate: "10 Apr 2026",
    status: "decision_recorded",
    hearingDate: "20 Apr 2026",
    hearingTime: "11:00 AM",
    hearingVenue: "Talathidi Office, Kharpudi",
    decision: "Partially Upheld — Area reduced to 2.0 acres after field verification",
    decisionDate: "25 Apr 2026",
    decisionAuthority: "District Collector, Jalna",
    decisionDocument: "Decision_OBJ2026_00881.pdf",
    nextAction: "Decision recorded — awaiting award modification",
  },
  {
    objectionId: "OBJ-2026-00882",
    caseId: "LA-2026-00421",
    projectId: "PRJ-2025-00187",
    project: "Eastern Freight Corridor Expansion — Package 04",
    parcelRef: "PAR-JLN-00421",
    category: "livelihood_impact",
    description: "The acquired land is my primary agricultural holding. Without adequate compensation and R&R, my family's livelihood will be severely affected. I request enhanced compensation and livelihood support under R&R.",
    submittedDate: "12 Apr 2026",
    status: "closed",
    decision: "Rejected — Compensation and R&R provisions already adequate under LARR Act",
    decisionDate: "30 Apr 2026",
    decisionAuthority: "District Collector, Jalna",
    decisionDocument: "Decision_OBJ2026_00882.pdf",
    nextAction: "Closed — citizen may appeal to High Court if dissatisfied",
  },
];

export const CITIZEN_GRIEVANCES: CitizenGrievance[] = [
  {
    grievanceId: "GRV-2026-01428",
    caseId: "LA-2026-00421",
    category: "payment_issue",
    description: "My compensation payment of ₹4,82,500 was shown as initiated but I have not received it in my bank account. Please check the status and resolve.",
    submittedDate: "10 Sep 2026",
    status: "under_review",
    assignedAuthority: "Finance Officer, Jalna",
    lastUpdate: "11 Sep 2026",
  },
  {
    grievanceId: "GRV-2026-01429",
    caseId: "LA-2026-00421",
    category: "document_issue",
    description: "I need a certified copy of the Section 11 notification for my personal records. The document section shows it as available but I cannot download it.",
    submittedDate: "05 Sep 2026",
    status: "resolved",
    assignedAuthority: "Document Cell, Jalna",
    lastUpdate: "08 Sep 2026",
    response: "The document has been made available for download. Please check your document centre.",
    responseDate: "08 Sep 2026",
  },
];

export const CITIZEN_DOCUMENTS: CitizenDocument[] = [
  { docId: "CD-001", name: "Section 11 Preliminary Notification", reference: "Govt. Notification No. MH/2026/LA/0421", date: "15 Mar 2026", category: "notice", status: "available" },
  { docId: "CD-002", name: "SIA Report — Public Disclosure", reference: "SIA/Disclosure/2026/0421", date: "01 Apr 2026", category: "sia", status: "available" },
  { docId: "CD-003", name: "Public Hearing Notice", reference: "Hearing/2026/0421", date: "15 Apr 2026", category: "notice", status: "available" },
  { docId: "CD-004", name: "Section 19 Declaration", reference: "Govt. Declaration No. MH/2026/LA/0421", date: "15 May 2026", category: "notice", status: "available" },
  { docId: "CD-005", name: "Field Verification Report", reference: "FV/2026/0421", date: "01 Jun 2026", category: "field_verification", status: "available" },
  { docId: "CD-006", name: "Award Order", reference: "AWD-2026-0182", date: "15 Aug 2026", category: "award", status: "available" },
  { docId: "CD-007", name: "Compensation Payment Order", reference: "PAY-2026-0091", date: "10 Sep 2026", category: "compensation", status: "available" },
  { docId: "CD-008", name: "Payment Confirmation", reference: "MOCK-PFMS-88214", date: "10 Sep 2026", category: "payment", status: "available" },
  { docId: "CD-009", name: "R&R Entitlement Letter", reference: "RR-2026-0421", date: "20 Aug 2026", category: "rr", status: "available" },
];

export const CITIZEN_NOTIFICATIONS: CitizenNotification[] = [
  { id: "CN-001", title: "Section 11 Notification Published", message: "A preliminary notification has been published for your project. Review the details.", date: "15 Mar 2026", read: true, link: "/citizen/notices/NOT-2026-0421", type: "notice" },
  { id: "CN-002", title: "Objection Hearing Scheduled", message: "Your objection hearing is scheduled for 20 April 2026 at 11:00 AM.", date: "15 Apr 2026", read: true, link: "/citizen/objections/OBJ-2026-00881", type: "objection" },
  { id: "CN-003", title: "Award Finalized", message: "Your land acquisition award has been finalized. View the award details.", date: "15 Aug 2026", read: true, link: "/citizen/my-case", type: "award" },
  { id: "CN-004", title: "Compensation Payment Initiated", message: "Your compensation payment of ₹4,82,500 has been initiated. Track the status.", date: "10 Sep 2026", read: false, link: "/citizen/my-case/compensation", type: "payment" },
  { id: "CN-005", title: "R&R Update Available", message: "Your R&R housing has been delivered. Livelihood support is in progress.", date: "08 Sep 2026", read: false, link: "/citizen/my-case/rr", type: "rr" },
  { id: "CN-006", title: "New Document Added", message: "Payment confirmation document has been added to your case.", date: "10 Sep 2026", read: false, link: "/citizen/my-case/documents", type: "document" },
];

export const CITIZEN_TIMELINE: StageTimeline[] = [
  { stage: "proposal", label: "Project Proposal", status: "completed", date: "01 Jan 2025", reference: "Project Proposal No. 2025/00187" },
  { stage: "gis_identification", label: "Land Identification", status: "completed", date: "15 Jun 2025", reference: "GIS Identification Report" },
  { stage: "scrutiny", label: "Preliminary Scrutiny", status: "completed", date: "01 Dec 2025", reference: "Scrutiny Order" },
  { stage: "sia", label: "Social Impact Assessment", status: "completed", date: "15 Feb 2026", reference: "SIA Report No. SIA/2026/0421" },
  { stage: "section_11", label: "Section 11 Notification", status: "completed", date: "15 Mar 2026", reference: "Govt. Notification No. MH/2026/LA/0421" },
  { stage: "disclosure", label: "Public Disclosure", status: "completed", date: "01 Apr 2026", reference: "SIA/Disclosure/2026/0421" },
  { stage: "objections", label: "Objection Window", status: "completed", date: "14 Apr 2026", reference: "14 objections received" },
  { stage: "declaration", label: "Section 19 Declaration", status: "completed", date: "15 May 2026", reference: "Govt. Declaration No. MH/2026/LA/0421" },
  { stage: "field_verification", label: "Field Verification", status: "completed", date: "01 Jun 2026", reference: "FV Report No. FV/2026/0421" },
  { stage: "award", label: "Award", status: "completed", date: "15 Aug 2026", reference: "AWD-2026-0182" },
  { stage: "compensation", label: "Compensation", status: "in_progress", date: "10 Sep 2026", reference: "PAY-2026-0091" },
  { stage: "possession", label: "Possession", status: "not_started" },
  { stage: "r_and_r", label: "Rehabilitation & Resettlement", status: "in_progress", date: "20 Aug 2026", reference: "RR-2026-0421" },
];

export const COMPENSATION_BREAKDOWN: CompensationBreakdown[] = [
  { component: "Land Value (Market Rate)", amount: 320000 },
  { component: "Asset Value (Trees, Structures)", amount: 45000 },
  { component: "Solatium (30% of Land Value)", amount: 96000 },
  { component: "Interest on Delayed Payment", amount: 12500 },
  { component: "Other Approved Components", amount: 9000 },
];

export const PUBLIC_AGGREGATE = {
  totalProjects: 8,
  totalAffectedVillages: 42,
  totalNotificationsPublished: 38,
  totalObjectionsReceived: 156,
  totalObjectionsResolved: 142,
  compensationProgress: 73,
  rrProgress: 58,
  statesCovered: 3,
  projectsByStage: {
    preliminary: 1,
    notification: 1,
    objection: 1,
    declaration: 1,
    verification: 1,
    award: 1,
    compensation: 1,
    possession: 1,
  },
};

export const STAGE_LABELS: Record<AcquisitionStage, string> = {
  proposal: "Project Proposal",
  gis_identification: "Land Identification",
  scrutiny: "Preliminary Scrutiny",
  sia: "Social Impact Assessment",
  section_11: "Section 11 Notification",
  disclosure: "Public Disclosure",
  objections: "Objection Window",
  declaration: "Section 19 Declaration",
  field_verification: "Field Verification",
  award: "Award",
  compensation: "Compensation",
  possession: "Possession",
  r_and_r: "Rehabilitation & Resettlement",
};

export const FAQ_ITEMS = [
  { question: "What is land acquisition?", answer: "Land acquisition is the process by which the government acquires private land for public purposes such as infrastructure projects, under the Right to Fair Compensation and Transparency in Land Acquisition, Rehabilitation and Resettlement Act, 2013 (LARR Act)." },
  { question: "What is SIA?", answer: "Social Impact Assessment (SIA) is a study conducted to assess the social impact of a proposed land acquisition on affected families and communities. It evaluates displacement, livelihood loss, and recommends rehabilitation measures." },
  { question: "What is a Section 11 notification?", answer: "Section 11(1) of the LARR Act requires the government to publish a preliminary notification declaring its intent to acquire land. This notification triggers the objection period and starts the statutory acquisition process." },
  { question: "How do I file an objection?", answer: "If you are an affected person, you can file an objection within 30 days of the Section 11 notification through the Terranex portal or in writing to the District Collector. You can also attend the public hearing." },
  { question: "How can I track my case?", answer: "You can track your case status by entering your case reference number on the Terranex portal. For detailed personal information, you can log in using your registered mobile number." },
  { question: "What happens after an award?", answer: "After the award is finalized, the government processes compensation payment. Once compensation is paid, possession of the land is taken. R&R entitlements are provided as per the LARR Act." },
  { question: "What is compensation?", answer: "Compensation includes the market value of the land, solatium (30% additional), value of any assets on the land, and other entitlements as determined under the LARR Act." },
  { question: "What is R&R?", answer: "Rehabilitation & Resettlement (R&R) includes housing, subsistence support, transportation allowance, livelihood assistance, skill development, and other entitlements for affected families as per the LARR Act." },
  { question: "How do I submit a grievance?", answer: "You can submit a grievance through the Terranex portal by selecting the category, providing a description, and attaching any supporting evidence. Your grievance will be assigned to the relevant authority." },
];
