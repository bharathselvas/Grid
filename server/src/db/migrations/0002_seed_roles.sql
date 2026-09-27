-- ============================================================================
-- Bhoomi Setu — 0002_seed_roles.sql
-- Canonical role reference data (the ONE role model for the whole system).
-- Mirrors src/types/rbac.ts RoleId on the frontend; the database is the
-- authoritative copy for the backend.
-- ============================================================================

INSERT INTO roles (id, label, short_label, description, level, scope) VALUES
  ('national_admin',  'National Admin / DoLR',        'DoLR Admin',    'Department of Land Resources — national oversight & audit', 1,  'national'),
  ('ministry_nodal',  'Ministry Nodal Officer',       'Ministry Nodal','Sponsoring ministry — sanctions & monitors projects',      2,  'ministry'),
  ('requiring_org',   'Requiring Organization',       'Requiring Org', 'Project proponent — NHAI, Railways, state PWD, etc.',       3,  'project'),
  ('state_nodal',     'State Nodal Officer',          'State Nodal',   'State revenue department — coordinates all districts',      4,  'state'),
  ('collector_cala',  'District Collector / CALA',    'Collector/CALA','Competent Authority — statutory decision-maker for acquisition', 5, 'district'),
  ('tehsil_sdo',      'Tehsil / Sub-Divisional Officer','Tehsil / SDO','Sub-division & tehsil-level scrutiny and hearings',        6,  'tehsil'),
  ('field_officer',   'Field Officer / VAO',          'Field Officer', 'Village-level verification, measurement, evidence capture', 7,  'village'),
  ('sia_expert',      'SIA Expert Group',             'SIA Expert',    'Independent social impact assessment team',                 8,  'district'),
  ('rnr_officer',     'R&R Officer',                  'R&R Officer',   'Rehabilitation & Resettlement entitlements',                9,  'district'),
  ('finance_officer', 'Finance / Payment Officer',    'Finance Officer','Compensation computation, sanction & disbursement',        10, 'district'),
  ('citizen',         'Citizen / Landowner',          'Citizen',       'Affected landholder — notices, objections, compensation tracking', 11, 'village')
ON CONFLICT (id) DO NOTHING;
