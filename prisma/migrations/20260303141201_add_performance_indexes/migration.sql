-- CreateIndex
CREATE INDEX "cash_sessions_closedAt_idx" ON "cash_sessions"("closedAt");

-- CreateIndex
CREATE INDEX "employees_isActive_idx" ON "employees"("isActive");

-- CreateIndex
CREATE INDEX "expenses_date_idx" ON "expenses"("date");

-- CreateIndex
CREATE INDEX "expenses_categoryId_idx" ON "expenses"("categoryId");

-- CreateIndex
CREATE INDEX "expenses_cash_session_id_idx" ON "expenses"("cash_session_id");

-- CreateIndex
CREATE INDEX "income_entries_date_idx" ON "income_entries"("date");

-- CreateIndex
CREATE INDEX "ingredients_isActive_idx" ON "ingredients"("isActive");

-- CreateIndex
CREATE INDEX "ingredients_supplierId_idx" ON "ingredients"("supplierId");

-- CreateIndex
CREATE INDEX "products_isActive_idx" ON "products"("isActive");

-- CreateIndex
CREATE INDEX "sale_items_productId_idx" ON "sale_items"("productId");

-- CreateIndex
CREATE INDEX "sales_date_idx" ON "sales"("date");

-- CreateIndex
CREATE INDEX "stock_movements_type_createdAt_idx" ON "stock_movements"("type", "createdAt");

-- CreateIndex
CREATE INDEX "stock_movements_ingredientId_type_idx" ON "stock_movements"("ingredientId", "type");

-- CreateIndex
CREATE INDEX "supplier_invoices_supplierId_idx" ON "supplier_invoices"("supplierId");

-- CreateIndex
CREATE INDEX "supplier_invoices_status_idx" ON "supplier_invoices"("status");

-- CreateIndex
CREATE INDEX "supplier_payments_supplierId_idx" ON "supplier_payments"("supplierId");

-- CreateIndex
CREATE INDEX "supplier_payments_date_idx" ON "supplier_payments"("date");

-- CreateIndex
CREATE INDEX "time_logs_employeeId_checkIn_idx" ON "time_logs"("employeeId", "checkIn");
