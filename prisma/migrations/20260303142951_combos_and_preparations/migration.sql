-- CreateTable
CREATE TABLE "preparations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "yieldQty" DECIMAL(65,30) NOT NULL DEFAULT 1,
    "onHand" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "preparations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preparation_ingredients" (
    "preparationId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "qty" DECIMAL(65,30) NOT NULL,
    "unit" TEXT NOT NULL,
    "wastagePct" DECIMAL(65,30) NOT NULL DEFAULT 0,

    CONSTRAINT "preparation_ingredients_pkey" PRIMARY KEY ("preparationId","ingredientId")
);

-- CreateTable
CREATE TABLE "preparation_movements" (
    "id" TEXT NOT NULL,
    "preparationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "delta" DECIMAL(65,30) NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "preparation_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_preparations" (
    "productId" TEXT NOT NULL,
    "preparationId" TEXT NOT NULL,
    "qty" DECIMAL(65,30) NOT NULL,
    "unit" TEXT NOT NULL,
    "wastagePct" DECIMAL(65,30) NOT NULL DEFAULT 0,

    CONSTRAINT "product_preparations_pkey" PRIMARY KEY ("productId","preparationId")
);

-- CreateTable
CREATE TABLE "combos" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "salePrice" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "combos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "combo_products" (
    "comboId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL DEFAULT 1,

    CONSTRAINT "combo_products_pkey" PRIMARY KEY ("comboId","productId")
);

-- CreateTable
CREATE TABLE "sale_combos" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "comboId" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL DEFAULT 1,
    "price" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "sale_combos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "preparations_isActive_idx" ON "preparations"("isActive");

-- CreateIndex
CREATE INDEX "preparation_movements_preparationId_type_idx" ON "preparation_movements"("preparationId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "combos_sku_key" ON "combos"("sku");

-- CreateIndex
CREATE INDEX "combos_isActive_idx" ON "combos"("isActive");

-- CreateIndex
CREATE INDEX "sale_combos_saleId_idx" ON "sale_combos"("saleId");

-- AddForeignKey
ALTER TABLE "preparation_ingredients" ADD CONSTRAINT "preparation_ingredients_preparationId_fkey" FOREIGN KEY ("preparationId") REFERENCES "preparations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preparation_ingredients" ADD CONSTRAINT "preparation_ingredients_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preparation_movements" ADD CONSTRAINT "preparation_movements_preparationId_fkey" FOREIGN KEY ("preparationId") REFERENCES "preparations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_preparations" ADD CONSTRAINT "product_preparations_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_preparations" ADD CONSTRAINT "product_preparations_preparationId_fkey" FOREIGN KEY ("preparationId") REFERENCES "preparations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combo_products" ADD CONSTRAINT "combo_products_comboId_fkey" FOREIGN KEY ("comboId") REFERENCES "combos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combo_products" ADD CONSTRAINT "combo_products_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_combos" ADD CONSTRAINT "sale_combos_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_combos" ADD CONSTRAINT "sale_combos_comboId_fkey" FOREIGN KEY ("comboId") REFERENCES "combos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
