-- ============================================================================
-- Terranex — 0001_init.sql
-- Canonical schema for the modular monolith (Fastify + Drizzle + PostgreSQL).
--
-- Design rules:
--   * One canonical role model (`roles`) — no parallel role enums.
--   * One canonical jurisdiction hierarchy (national → state → district →
--     tehsil → village) used for parcels, officer routing, role scope and
--     project visibility.
--   * One canonical workflow model (`workflow_instances` + `workflow_transitions`).
--   * `audit_events` is append-only (enforced by trigger).
--   * Documents are metadata only — binary content belongs in Supabase Storage
--     (bucket / storage_path / mime_type / size / checksum columns are ready).
--   * Parcels carry a PostGIS geometry column (SRID 4326). No polygon drawing
--     in the application: geometry arrives via dataset ingestion later.
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 0. Legacy cleanup (previous un-versioned ad-hoc attempt, all tables empty)
--    Guarded: refuses to drop a table that contains rows.
-- ────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  t   text;
  cnt bigint;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'acquisition_cases', 'audit_logs', 'awards', 'compensation_assessments',
    'documents', 'field_evidence', 'field_structures', 'field_vegetation',
    'field_verifications', 'jurisdictions', 'objections', 'parcels',
    'payments', 'projects', 'users', 'workflow_transitions'
  ] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('SELECT count(*) FROM public.%I', t) INTO cnt;
      IF cnt > 0 THEN
        RAISE EXCEPTION 'Legacy table public.% contains % row(s); refusing to drop it automatically.', t, cnt;
      END IF;
      EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', t);
    END IF;
  END LOOP;
END
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- 1. PostGIS
-- ────────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS postgis;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. updated_at maintenance
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. Canonical role model (single source of truth for RBAC)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE roles (
  id          text PRIMARY KEY,
  label       text NOT NULL,
  short_label text NOT NULL,
  description text NOT NULL DEFAULT '',
  level       integer NOT NULL,
  scope       text NOT NULL,
  UNIQUE (level),
  UNIQUE (label)
);

-- ────────────────────────────────────────────────────────────────────────────
-- 4. Jurisdiction hierarchy (national → state → district → tehsil → village)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE jurisdictions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level        text NOT NULL
               CHECK (level IN ('national', 'state', 'district', 'tehsil', 'village')),
  name         text NOT NULL,
  code         text NOT NULL UNIQUE,
  parent_id    uuid REFERENCES jurisdictions(id) ON DELETE CASCADE,
  state_code   text,
  district_code text,
  tehsil_code  text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX jurisdictions_parent_idx ON jurisdictions (parent_id);
CREATE INDEX jurisdictions_level_idx  ON jurisdictions (level);

-- ────────────────────────────────────────────────────────────────────────────
-- 5. Organizations
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE organizations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text NOT NULL,
  code              text UNIQUE,
  org_type          text NOT NULL
                    CHECK (org_type IN ('central_ministry', 'state_dept', 'requiring_org',
                                        'implementing_agency', 'district_auth', 'other')),
  parent_id         uuid REFERENCES organizations(id) ON DELETE SET NULL,
  jurisdiction_label text NOT NULL DEFAULT '',
  status            text NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'pending', 'suspended')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX organizations_parent_idx ON organizations (parent_id);
CREATE INDEX organizations_type_idx   ON organizations (org_type);

-- ────────────────────────────────────────────────────────────────────────────
-- 6. Users (role + organization + jurisdiction — authorization context lives
--    server-side, never in the browser)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE users (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  email           text UNIQUE,
  phone           text,
  designation     text,
  role_id         text NOT NULL REFERENCES roles(id),
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  jurisdiction_id uuid REFERENCES jurisdictions(id) ON DELETE SET NULL,
  auth_subject    text UNIQUE,
  status          text NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'pending', 'suspended')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX users_role_idx    ON users (role_id);
CREATE INDEX users_org_idx     ON users (organization_id);
CREATE INDEX users_juris_idx   ON users (jurisdiction_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 7. Datasets (future cadastral ingestion — foundation only, no ingestion logic)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE datasets (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  source       text NOT NULL,
  format       text,
  status       text NOT NULL DEFAULT 'registered'
               CHECK (status IN ('registered', 'ingesting', 'ready', 'failed')),
  record_count integer NOT NULL DEFAULT 0,
  notes        text,
  created_by   uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE dataset_records (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id   uuid NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  external_ref text,
  payload      jsonb NOT NULL DEFAULT '{}'::jsonb,
  geometry     geometry(Geometry, 4326),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX dataset_records_dataset_idx ON dataset_records (dataset_id);
CREATE INDEX dataset_records_geom_idx    ON dataset_records USING GIST (geometry);

-- ────────────────────────────────────────────────────────────────────────────
-- 8. Projects
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE projects (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_code             text NOT NULL UNIQUE,
  project_name             text NOT NULL,
  requiring_organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  project_category         text NOT NULL
                           CHECK (project_category IN ('industrial', 'infrastructure', 'irrigation',
                                                       'defence', 'housing', 'mining')),
  applicable_act           text NOT NULL DEFAULT 'RFCTLARR',
  purpose                  text,
  description              text,
  status                   text NOT NULL DEFAULT 'active'
                           CHECK (status IN ('draft', 'active', 'on_hold', 'closed', 'cancelled')),
  current_workflow_stage   text NOT NULL DEFAULT 'project_proposal',
  jurisdiction_id          uuid REFERENCES jurisdictions(id) ON DELETE SET NULL,
  state                    text NOT NULL,
  district                 text NOT NULL,
  ministry                 text,
  budget_cr                numeric(12, 2),
  required_area_ha         numeric(14, 4),
  target_date              date,
  created_by               uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX projects_org_idx     ON projects (requiring_organization_id);
CREATE INDEX projects_state_idx   ON projects (state);
CREATE INDEX projects_stage_idx   ON projects (current_workflow_stage);
CREATE INDEX projects_status_idx  ON projects (status);
CREATE INDEX projects_juris_idx   ON projects (jurisdiction_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 9. Parcels (PostGIS geometry; fed later by dataset ingestion, not by drawing)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE parcels (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id           uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  survey_number         text NOT NULL,
  subdivision_number   text,
  ulpin                text,
  state                text NOT NULL,
  district             text NOT NULL,
  taluk                text NOT NULL,
  village              text NOT NULL,
  area_ha              numeric(14, 4) NOT NULL,
  land_type            text NOT NULL
                       CHECK (land_type IN ('agricultural', 'barren', 'commercial', 'residential',
                                            'forest', 'government', 'industrial')),
  geometry             geometry(Geometry, 4326),
  classification_status text NOT NULL DEFAULT 'unclassified'
                       CHECK (classification_status IN ('unclassified', 'classified', 'disputed', 'exempted')),
  routing_status       text NOT NULL DEFAULT 'unrouted'
                       CHECK (routing_status IN ('unrouted', 'routed', 'acknowledged', 'returned')),
  current_workflow_stage text NOT NULL DEFAULT 'gis_identification',
  source_dataset_id    uuid REFERENCES datasets(id) ON DELETE SET NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX parcels_project_idx  ON parcels (project_id);
CREATE INDEX parcels_district_idx ON parcels (district);
CREATE INDEX parcels_stage_idx    ON parcels (current_workflow_stage);
CREATE INDEX parcels_geom_idx     ON parcels USING GIST (geometry);

-- ────────────────────────────────────────────────────────────────────────────
-- 10. Parcel assignments (officer routing foundation)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE parcel_assignments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id    uuid NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
  assigned_to  uuid REFERENCES users(id) ON DELETE SET NULL,
  assigned_role text REFERENCES roles(id) ON DELETE SET NULL,
  assigned_by  uuid REFERENCES users(id) ON DELETE SET NULL,
  status       text NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'accepted', 'completed', 'reassigned')),
  due_date     date,
  notes        text,
  assigned_at  timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX parcel_assignments_parcel_idx ON parcel_assignments (parcel_id);
CREATE INDEX parcel_assignments_assignee_idx ON parcel_assignments (assigned_to);

-- ────────────────────────────────────────────────────────────────────────────
-- 11. Workflow (canonical, backend-authoritative)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE workflow_instances (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type    text NOT NULL CHECK (entity_type IN ('project', 'parcel', 'case')),
  entity_id      uuid NOT NULL,
  current_stage  text NOT NULL,
  status         text NOT NULL DEFAULT 'active'
                 CHECK (status IN ('active', 'completed', 'cancelled')),
  owner_role_id  text REFERENCES roles(id) ON DELETE SET NULL,
  owner_user_id  uuid REFERENCES users(id) ON DELETE SET NULL,
  started_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  completed_at   timestamptz,
  UNIQUE (entity_type, entity_id)
);

CREATE INDEX workflow_instances_entity_idx ON workflow_instances (entity_type, entity_id);
CREATE INDEX workflow_instances_stage_idx  ON workflow_instances (current_stage);

CREATE TABLE workflow_transitions (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_instance_id uuid NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
  from_stage           text,
  to_stage             text NOT NULL,
  action               text NOT NULL,
  actor_user_id        uuid REFERENCES users(id) ON DELETE SET NULL,
  actor_role           text REFERENCES roles(id) ON DELETE SET NULL,
  is_allowed           boolean NOT NULL DEFAULT true,
  reason               text,
  before_state         jsonb,
  after_state          jsonb,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX workflow_transitions_instance_idx ON workflow_transitions (workflow_instance_id);
CREATE INDEX workflow_transitions_created_idx  ON workflow_transitions (created_at DESC);

-- ────────────────────────────────────────────────────────────────────────────
-- 12. Documents (metadata only — bytes go to Supabase Storage later)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE documents (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type          text NOT NULL CHECK (entity_type IN ('project', 'parcel', 'case')),
  entity_id            uuid NOT NULL,
  stage                text,
  document_type        text NOT NULL,
  title                text NOT NULL,
  bucket               text,
  storage_path         text,
  filename             text NOT NULL,
  mime_type            text,
  size_bytes           bigint,
  checksum             text,
  verification_status  text NOT NULL DEFAULT 'pending'
                       CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  uploaded_by          uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX documents_entity_idx ON documents (entity_type, entity_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 13. Audit events (append-only, real — never seeded with fabricated history)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE audit_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  actor_role    text,
  action        text NOT NULL,
  entity_type   text NOT NULL,
  entity_id     text NOT NULL,
  before_state  jsonb,
  after_state   jsonb,
  reason        text,
  ip            text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX audit_events_created_idx ON audit_events (created_at DESC);
CREATE INDEX audit_events_entity_idx   ON audit_events (entity_type, entity_id);
CREATE INDEX audit_events_actor_idx    ON audit_events (actor_user_id);

CREATE OR REPLACE FUNCTION audit_events_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_events is append-only: % is not permitted', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_events_append_only
  BEFORE UPDATE OR DELETE ON audit_events
  FOR EACH ROW EXECUTE FUNCTION audit_events_append_only();

-- ────────────────────────────────────────────────────────────────────────────
-- 14. Notifications
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE notifications (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES users(id) ON DELETE CASCADE,
  role_id      text REFERENCES roles(id) ON DELETE SET NULL,
  title        text NOT NULL,
  body         text,
  type         text NOT NULL DEFAULT 'info'
               CHECK (type IN ('info', 'action_required', 'sla_warning', 'payment', 'hearing')),
  entity_type  text,
  entity_id    text,
  is_read      boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX notifications_user_idx  ON notifications (user_id);
CREATE INDEX notifications_role_idx  ON notifications (role_id);
CREATE INDEX notifications_read_idx  ON notifications (is_read);

-- ────────────────────────────────────────────────────────────────────────────
-- 15. updated_at triggers
-- ────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'jurisdictions', 'organizations', 'users', 'datasets', 'projects',
    'parcels', 'workflow_instances', 'documents'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t);
  END LOOP;
END
$$;
