-- ═══════════════════════════════════════════════════════════════════════════
-- Task #4 — Organization + User + Jurisdiction ownership & assignment layer
--
-- Adds the missing domain concepts without touching the workflow engine:
--   1. organizations gain a real jurisdiction link (was a free-text label)
--   2. users' jurisdiction scope aligned with the canonical hierarchy
--   3. `assignments` — explicit work ownership for projects AND parcels with
--      ACTIVE/RELEASED lifecycle, organization + jurisdiction context, and a
--      one-active-owner-per-entity invariant enforced by the database
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Organizations → jurisdiction (authoritative FK, not just a label) ────
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS jurisdiction_id uuid REFERENCES jurisdictions(id);

UPDATE organizations
   SET jurisdiction_id = CASE code
         WHEN 'DOLR'     THEN '00000000-0000-4000-8000-000000000001'::uuid -- India (national)
         WHEN 'MORTH'    THEN '00000000-0000-4000-8000-000000000001'::uuid
         WHEN 'NHAI'     THEN '00000000-0000-4000-8000-000000000001'::uuid
         WHEN 'MADC'     THEN '00000000-0000-4000-8000-000000000002'::uuid -- Maharashtra
         WHEN 'REV-MH'   THEN '00000000-0000-4000-8000-000000000002'::uuid
         WHEN 'WRD-MH'   THEN '00000000-0000-4000-8000-000000000002'::uuid
         WHEN 'WRD-OD'   THEN '00000000-0000-4000-8000-000000000003'::uuid -- Odisha
         WHEN 'COL-PUNE' THEN '00000000-0000-4000-8000-000000000005'::uuid -- Pune District
       END
 WHERE jurisdiction_id IS NULL
   AND code IN ('DOLR', 'MORTH', 'NHAI', 'MADC', 'REV-MH', 'WRD-MH', 'WRD-OD', 'COL-PUNE');

-- ── 2. Field officer works at village scope (role scope = village) ──────────
-- The canonical demo graph needs a village-scoped officer: Shri. M. Kamble
-- (Field Officer / VAO) is scoped to Pargaon village, Haveli tehsil.
UPDATE users
   SET jurisdiction_id = '00000000-0000-4000-8000-000000000013' -- Pargaon (village)
 WHERE id = '00000000-0000-4000-8000-000000000206'
   AND jurisdiction_id = '00000000-0000-4000-8000-000000000009'; -- Haveli (tehsil)

-- ── 3. assignments — explicit work ownership (project + parcel) ─────────────
-- Lifecycle: active → released (history is never deleted). The partial unique
-- index makes "one active owner per entity" a database invariant, so racing
-- requests cannot create duplicate operational owners.
CREATE TABLE IF NOT EXISTS assignments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type       text NOT NULL CHECK (entity_type IN ('project', 'parcel')),
  entity_id         uuid NOT NULL,
  assigned_to_user_id uuid NOT NULL REFERENCES users(id),
  assigned_role     text NOT NULL REFERENCES roles(id),
  organization_id   uuid REFERENCES organizations(id),
  jurisdiction_id   uuid REFERENCES jurisdictions(id),
  status            text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'released')),
  assigned_at       timestamptz NOT NULL DEFAULT now(),
  released_at       timestamptz,
  released_by       uuid REFERENCES users(id),
  reason            text,
  created_by        uuid REFERENCES users(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS assignments_one_active_per_entity
  ON assignments (entity_type, entity_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS assignments_entity_idx ON assignments (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS assignments_user_idx   ON assignments (assigned_to_user_id);
CREATE INDEX IF NOT EXISTS assignments_org_idx    ON assignments (organization_id);
CREATE INDEX IF NOT EXISTS assignments_juris_idx  ON assignments (jurisdiction_id);
CREATE INDEX IF NOT EXISTS assignments_status_idx ON assignments (status);
