import { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { convertUnit } from "../src/utils/units";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed...");

  // ── Suppliers ──────────────────────────────────────────────────────────────
  const distribuidora = await prisma.supplier.upsert({
    where: { id: "sup_gaucho" },
    create: {
      id: "sup_gaucho",
      name: "Distribuidora El Gaucho",
      phone: "+54 11 4567-8901",
      email: "ventas@elgaucho.com.ar",
      notes: "Entrega martes y viernes. Pago a 30 días.",
    },
    update: {},
  });

  const lacteos = await prisma.supplier.upsert({
    where: { id: "sup_lacteos" },
    create: {
      id: "sup_lacteos",
      name: "Lácteos San Martín",
      phone: "+54 11 3456-7890",
      email: "pedidos@lacteossm.com.ar",
      notes: "Solo efectivo.",
    },
    update: {},
  });

  // ── Ingredients ────────────────────────────────────────────────────────────
  const harina = await prisma.ingredient.upsert({
    where: { id: "ing_harina" },
    create: {
      id: "ing_harina",
      name: "Harina 000",
      unit: "KG",
      onHand: new Decimal("25.000"),
      minQty: new Decimal("5.000"),
      costPerUnit: new Decimal("350.00"),
      currency: "ARS",
      supplierId: distribuidora.id,
    },
    update: {},
  });

  const leche = await prisma.ingredient.upsert({
    where: { id: "ing_leche" },
    create: {
      id: "ing_leche",
      name: "Leche entera",
      unit: "L",
      onHand: new Decimal("10.000"),
      minQty: new Decimal("3.000"),
      costPerUnit: new Decimal("280.00"),
      currency: "ARS",
      supplierId: lacteos.id,
    },
    update: {},
  });

  const aceite = await prisma.ingredient.upsert({
    where: { id: "ing_aceite" },
    create: {
      id: "ing_aceite",
      name: "Aceite de girasol",
      unit: "L",
      onHand: new Decimal("8.000"),
      minQty: new Decimal("2.000"),
      costPerUnit: new Decimal("950.00"),
      currency: "ARS",
      supplierId: distribuidora.id,
    },
    update: {},
  });

  const azucar = await prisma.ingredient.upsert({
    where: { id: "ing_azucar" },
    create: {
      id: "ing_azucar",
      name: "Azúcar",
      unit: "KG",
      onHand: new Decimal("12.000"),
      minQty: new Decimal("3.000"),
      costPerUnit: new Decimal("600.00"),
      currency: "ARS",
      supplierId: distribuidora.id,
    },
    update: {},
  });

  const huevos = await prisma.ingredient.upsert({
    where: { id: "ing_huevos" },
    create: {
      id: "ing_huevos",
      name: "Huevos",
      unit: "UNIT",
      onHand: new Decimal("60"),
      minQty: new Decimal("12"),
      costPerUnit: new Decimal("180.00"),
      currency: "ARS",
      supplierId: distribuidora.id,
    },
    update: {},
  });

  console.log("✅ Ingredientes creados");

  // ── Products + BOMs ────────────────────────────────────────────────────────

  // Product 1: Medialunas
  // BOM per unit: 0.08 KG harina (5% merma), 30 ML leche (2% merma), 0.01 KG azucar
  const medialunas = await prisma.product.upsert({
    where: { id: "prod_medialuna" },
    create: {
      id: "prod_medialuna",
      name: "Medialuna",
      sku: "MED-001",
      salePrice: new Decimal("250.00"),
      currency: "ARS",
      ingredients: {
        create: [
          { ingredientId: harina.id, qty: new Decimal("0.08"), unit: "KG", wastagePct: new Decimal("5") },
          { ingredientId: leche.id, qty: new Decimal("30"), unit: "ML", wastagePct: new Decimal("2") },
          { ingredientId: azucar.id, qty: new Decimal("0.01"), unit: "KG", wastagePct: new Decimal("0") },
        ],
      },
    },
    update: {},
  });

  // Product 2: Torta de Cumpleaños
  const tortaCumple = await prisma.product.upsert({
    where: { id: "prod_torta" },
    create: {
      id: "prod_torta",
      name: "Torta de Cumpleaños",
      sku: "TORTA-001",
      salePrice: new Decimal("8500.00"),
      currency: "ARS",
      ingredients: {
        create: [
          { ingredientId: harina.id, qty: new Decimal("0.5"), unit: "KG", wastagePct: new Decimal("3") },
          { ingredientId: leche.id, qty: new Decimal("400"), unit: "ML", wastagePct: new Decimal("0") },
          { ingredientId: huevos.id, qty: new Decimal("4"), unit: "UNIT", wastagePct: new Decimal("0") },
          { ingredientId: azucar.id, qty: new Decimal("0.3"), unit: "KG", wastagePct: new Decimal("2") },
        ],
      },
    },
    update: {},
  });

  // Product 3: Panqueques x10
  // BOM uses G for harina (ingredient is in KG) — tests unit conversion
  const panqueques = await prisma.product.upsert({
    where: { id: "prod_panqueques" },
    create: {
      id: "prod_panqueques",
      name: "Panqueques (x10)",
      sku: "PAN-001",
      salePrice: new Decimal("1200.00"),
      currency: "ARS",
      ingredients: {
        create: [
          { ingredientId: harina.id, qty: new Decimal("100"), unit: "G", wastagePct: new Decimal("5") },
          { ingredientId: leche.id, qty: new Decimal("250"), unit: "ML", wastagePct: new Decimal("0") },
          { ingredientId: huevos.id, qty: new Decimal("2"), unit: "UNIT", wastagePct: new Decimal("0") },
          { ingredientId: aceite.id, qty: new Decimal("30"), unit: "ML", wastagePct: new Decimal("0") },
        ],
      },
    },
    update: {},
  });

  console.log("✅ Productos creados");

  // ── Demo Sale with stock deductions ───────────────────────────────────────
  // 6 medialunas + 2 panqueques (already sold yesterday)
  const saleAlreadyExists = await prisma.sale.findFirst({ where: { id: "sale_demo" } });
  if (!saleAlreadyExists) {
    const saleDate = new Date();
    saleDate.setDate(saleDate.getDate() - 1);

    // Deductions:
    // 6 medialunas: harina 0.08*1.05*6=0.504 KG, leche 30*1.02*6=183.6 ML=0.1836 L, azucar 0.01*1*6=0.06 KG
    // 2 panqueques: harina 100*1.05*2=210 G=0.21 KG, leche 250*2=500 ML=0.5 L, huevos 2*2=4, aceite 30*2=60 ML=0.06 L

    const deductions: { ingredientId: string; delta: number }[] = [
      { ingredientId: harina.id, delta: 0.504 + 0.21 },    // 0.714 KG
      { ingredientId: leche.id, delta: 0.1836 + 0.5 },      // 0.6836 L
      { ingredientId: azucar.id, delta: 0.06 },
      { ingredientId: huevos.id, delta: 4 },
      { ingredientId: aceite.id, delta: 0.06 },
    ];

    await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.create({
        data: {
          id: "sale_demo",
          date: saleDate,
          notes: "Venta demo apertura",
          items: {
            create: [
              { productId: medialunas.id, quantity: new Decimal("6") },
              { productId: panqueques.id, quantity: new Decimal("2") },
            ],
          },
        },
      });

      for (const d of deductions) {
        await tx.ingredient.update({
          where: { id: d.ingredientId },
          data: { onHand: { decrement: d.delta } },
        });
        await tx.stockMovement.create({
          data: {
            ingredientId: d.ingredientId,
            type: "SALE",
            delta: -d.delta,
            reason: `Venta demo ${sale.id}`,
            refId: sale.id,
          },
        });
      }
    });

    console.log("✅ Venta demo creada con movimientos de stock");
  }

  console.log("🎉 Seed completado exitosamente");
  console.log("\nDatos creados:");
  console.log("  - 2 proveedores");
  console.log("  - 5 ingredientes (Harina, Leche, Aceite, Azúcar, Huevos)");
  console.log("  - 3 productos con BOM (Medialuna, Torta, Panqueques)");
  console.log("  - 1 venta demo con movimientos de stock");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
