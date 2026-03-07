CREATE TABLE discounts (
  id TEXT NOT NULL PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  discount_type VARCHAR(20) NOT NULL DEFAULT 'PERCENTAGE',
  value DECIMAL(10,2) NOT NULL DEFAULT 0,
  priority INT NOT NULL DEFAULT 0,
  label VARCHAR(255),
  date_from DATE,
  date_to DATE,
  time_from VARCHAR(5),
  time_to VARCHAR(5),
  weekdays JSONB,
  applies_to VARCHAR(20) NOT NULL DEFAULT 'ORDER',
  product_ids JSONB,
  category_ids JSONB,
  payment_methods JSONB,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE extras (
  id TEXT NOT NULL PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_free BOOLEAN NOT NULL DEFAULT FALSE,
  affects_stock BOOLEAN NOT NULL DEFAULT FALSE,
  ingredient_id TEXT REFERENCES ingredients(id),
  ingredient_qty DECIMAL(10,4),
  applies_to VARCHAR(20) NOT NULL DEFAULT 'ALL',
  product_ids JSONB,
  category_ids JSONB,
  max_quantity INT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE sale_extras (
  id TEXT NOT NULL PRIMARY KEY,
  sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  extra_id TEXT REFERENCES extras(id),
  quantity INT NOT NULL DEFAULT 1,
  name_snapshot VARCHAR(255) NOT NULL,
  price_snapshot DECIMAL(10,2) NOT NULL,
  is_free_snapshot BOOLEAN NOT NULL DEFAULT FALSE,
  affects_stock_snapshot BOOLEAN NOT NULL DEFAULT FALSE,
  ingredient_id TEXT,
  ingredient_qty_snapshot DECIMAL(10,4)
);

CREATE INDEX idx_discounts_org ON discounts(organization_id, is_active);
CREATE INDEX idx_extras_org ON extras(organization_id, is_active);
CREATE INDEX idx_sale_extras_sale ON sale_extras(sale_id);

ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS extras_amount DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS discounts_snapshot JSONB;
