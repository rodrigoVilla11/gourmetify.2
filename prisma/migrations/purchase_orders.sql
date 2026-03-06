-- Migration: purchase_orders
-- Creates 4 new tables for the Purchase Orders module

CREATE TABLE "purchase_orders" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "supplier_id" TEXT NOT NULL,
  "number" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "expected_total" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "actual_total" DECIMAL(65,30),
  "notes" TEXT,
  "sent_at" TIMESTAMP(3),
  "received_at" TIMESTAMP(3),
  "is_partial" BOOLEAN NOT NULL DEFAULT false,
  "expected_delivery_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "purchase_order_items" (
  "id" TEXT NOT NULL,
  "purchase_order_id" TEXT NOT NULL,
  "ingredient_id" TEXT NOT NULL,
  "ingredient_name_snapshot" TEXT NOT NULL,
  "unit" TEXT NOT NULL,
  "expected_qty" DECIMAL(65,30) NOT NULL,
  "received_qty" DECIMAL(65,30),
  "expected_unit_cost" DECIMAL(65,30) NOT NULL,
  "actual_unit_cost" DECIMAL(65,30),
  "expected_subtotal" DECIMAL(65,30) NOT NULL,
  "actual_subtotal" DECIMAL(65,30),
  "notes" TEXT,
  CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "purchase_order_invoices" (
  "id" TEXT NOT NULL,
  "purchase_order_id" TEXT NOT NULL,
  "file_url" TEXT NOT NULL,
  "file_type" TEXT,
  "file_name" TEXT NOT NULL,
  "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "purchase_order_invoices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ingredient_cost_history" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "ingredient_id" TEXT NOT NULL,
  "supplier_id" TEXT,
  "purchase_order_id" TEXT,
  "previous_cost" DECIMAL(65,30) NOT NULL,
  "new_cost" DECIMAL(65,30) NOT NULL,
  "quantity" DECIMAL(65,30),
  "effective_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ingredient_cost_history_pkey" PRIMARY KEY ("id")
);

-- Unique constraints
CREATE UNIQUE INDEX "purchase_orders_organization_id_number_key" ON "purchase_orders"("organization_id", "number");

-- Indexes
CREATE INDEX "purchase_orders_organization_id_status_idx" ON "purchase_orders"("organization_id", "status");
CREATE INDEX "purchase_orders_supplier_id_idx" ON "purchase_orders"("supplier_id");
CREATE INDEX "purchase_order_items_purchase_order_id_idx" ON "purchase_order_items"("purchase_order_id");
CREATE INDEX "purchase_order_items_ingredient_id_idx" ON "purchase_order_items"("ingredient_id");
CREATE INDEX "purchase_order_invoices_purchase_order_id_idx" ON "purchase_order_invoices"("purchase_order_id");
CREATE INDEX "ingredient_cost_history_ingredient_id_effective_date_idx" ON "ingredient_cost_history"("ingredient_id", "effective_date");
CREATE INDEX "ingredient_cost_history_organization_id_idx" ON "ingredient_cost_history"("organization_id");

-- Foreign keys: purchase_orders
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_fkey"
  FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Foreign keys: purchase_order_items
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchase_order_id_fkey"
  FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_ingredient_id_fkey"
  FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Foreign keys: purchase_order_invoices
ALTER TABLE "purchase_order_invoices" ADD CONSTRAINT "purchase_order_invoices_purchase_order_id_fkey"
  FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Foreign keys: ingredient_cost_history
ALTER TABLE "ingredient_cost_history" ADD CONSTRAINT "ingredient_cost_history_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ingredient_cost_history" ADD CONSTRAINT "ingredient_cost_history_ingredient_id_fkey"
  FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ingredient_cost_history" ADD CONSTRAINT "ingredient_cost_history_supplier_id_fkey"
  FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ingredient_cost_history" ADD CONSTRAINT "ingredient_cost_history_purchase_order_id_fkey"
  FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
