ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS address_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS address_lng DOUBLE PRECISION;

CREATE TABLE IF NOT EXISTS delivery_zones (
  id               TEXT NOT NULL PRIMARY KEY,
  organization_id  TEXT NOT NULL REFERENCES organizations(id),
  name             TEXT NOT NULL,
  price            DECIMAL(65,30) NOT NULL DEFAULT 0,
  zone_type        TEXT NOT NULL DEFAULT 'radius',
  radius_km        DOUBLE PRECISION,
  polygon          JSONB,
  color            TEXT NOT NULL DEFAULT '#3B82F6',
  sort_order       INTEGER NOT NULL DEFAULT 0,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS dz_org_active_idx ON delivery_zones(organization_id, is_active);
