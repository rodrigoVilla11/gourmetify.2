ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS payment_adjustment_type   VARCHAR(20)   DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS payment_adjustment_pct    DECIMAL(10,4) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS payment_adjustment_amount DECIMAL(10,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS payment_method_snapshot   JSONB         DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS stock_impacted            BOOLEAN       NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stock_impacted_at         TIMESTAMP     DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cash_impacted             BOOLEAN       NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS cash_impacted_at          TIMESTAMP     DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cancel_stock_decision     VARCHAR(20)   DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cancel_cash_decision      VARCHAR(20)   DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cancelled_at              TIMESTAMP     DEFAULT NULL;
