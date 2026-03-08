/**
 * importacionPlan.ts
 * Core logic for bulk import: parse → validate → preview → apply.
 * Order of operations on apply: Ingredientes → Preparaciones → Productos → Combos
 */
import { prisma } from "@/lib/prisma";
import { convertUnit } from "@/utils/units";
import type { Unit } from "@/types";
import type { SheetRows } from "@/utils/excelMultisheet";

const VALID_UNITS = ["KG", "G", "L", "ML", "UNIT"] as const;
const VALID_CURRENCIES = ["ARS", "EUR", "USD"] as const;

function cell(v: unknown): string {
  return v != null ? String(v).trim() : "";
}
function num(v: unknown): number {
  const n = parseFloat(cell(v).replace(",", "."));
  return isNaN(n) ? 0 : n;
}
function tryConvert(qty: number, from: string, to: string): number {
  try {
    return convertUnit(qty, from as Unit, to as Unit);
  } catch {
    return 0;
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ParseError {
  sheet: string;
  row: number;
  message: string;
}

export interface BomLine {
  tipo: "ingrediente" | "preparacion";
  referencia: string; // name of ingredient or preparation
  cantidad: number;
  unidad: string;
  merma: number;
}

export interface IngRow {
  row: number;
  action: "create" | "update";
  nombre: string;
  unidad: string;
  stockActual: number;
  stockMinimo: number;
  costo: number;
  moneda: string;
  proveedor: string;
  existingId?: string;
  supplierId?: string | null;
  stockDelta: number;
}

export interface PrepRow {
  row: number;
  action: "create" | "update";
  nombre: string;
  unidad: string;
  rendimiento: number;
  merma: number;
  notas: string;
  existingId?: string;
  bom: BomLine[];
  bomErrors: string[];
}

export interface ProdRow {
  row: number;
  action: "create" | "update";
  nombre: string;
  sku: string;
  precioVenta: number;
  moneda: string;
  categoria: string;
  descripcion: string;
  existingId?: string;
  categoryId?: string | null;
  bom: BomLine[];
  bomErrors: string[];
}

export interface ComboProductLine {
  producto: string;
  cantidad: number;
}

export interface ComboRow {
  row: number;
  action: "create" | "update";
  nombre: string;
  sku: string;
  precioVenta: number;
  moneda: string;
  notas: string;
  existingId?: string;
  productos: ComboProductLine[];
  productErrors: string[];
}

export interface ImportPlan {
  ingredientes: IngRow[];
  preparaciones: PrepRow[];
  productos: ProdRow[];
  combos: ComboRow[];
  errors: ParseError[];
}

// ─── Build plan (dry run, no DB writes) ───────────────────────────────────────

export async function buildPlan(
  sheets: Record<string, SheetRows>,
  orgId: string
): Promise<ImportPlan> {
  const errors: ParseError[] = [];

  const [dbIngs, dbPreps, dbProds, dbCombos, dbSuppliers, dbCats] =
    await Promise.all([
      prisma.ingredient.findMany({
        where: { organizationId: orgId, isActive: true },
        select: { id: true, name: true, onHand: true },
      }),
      prisma.preparation.findMany({
        where: { organizationId: orgId, isActive: true },
        select: { id: true, name: true },
      }),
      prisma.product.findMany({
        where: { organizationId: orgId, isActive: true },
        select: { id: true, name: true, sku: true },
      }),
      prisma.combo.findMany({
        where: { organizationId: orgId, isActive: true },
        select: { id: true, name: true, sku: true },
      }),
      prisma.supplier.findMany({
        where: { organizationId: orgId },
        select: { id: true, name: true },
      }),
      prisma.productCategory.findMany({
        where: { organizationId: orgId },
        select: { id: true, name: true },
      }),
    ]);

  const ingByName = new Map(dbIngs.map((i) => [i.name.toLowerCase(), i]));
  const prepByName = new Map(dbPreps.map((p) => [p.name.toLowerCase(), p]));
  const prodByName = new Map(dbProds.map((p) => [p.name.toLowerCase(), p]));
  const prodBySku = new Map(
    dbProds.filter((p) => p.sku).map((p) => [p.sku!.toLowerCase(), p])
  );
  const comboByName = new Map(dbCombos.map((c) => [c.name.toLowerCase(), c]));
  const comboBySku = new Map(
    dbCombos.filter((c) => c.sku).map((c) => [c.sku!.toLowerCase(), c])
  );
  const supplierByName = new Map(
    dbSuppliers.map((s) => [s.name.toLowerCase(), s])
  );
  const catByName = new Map(dbCats.map((c) => [c.name.toLowerCase(), c]));

  // "will exist" sets: DB + what this file adds (for cross-reference validation)
  const willHaveIng = new Set<string>(Array.from(ingByName.keys()));
  const willHavePrep = new Set<string>(Array.from(prepByName.keys()));
  const willHaveProd = new Set<string>([
    ...Array.from(prodByName.keys()),
    ...Array.from(prodBySku.keys()),
  ]);

  // ── Ingredientes ────────────────────────────────────────────────────────────
  const ingSheet = sheets["Ingredientes"] ?? [];
  const ingredientes: IngRow[] = [];

  for (let i = 1; i < ingSheet.length; i++) {
    const r = ingSheet[i];
    const rowNum = i + 1;
    const nombre = cell(r[0]);
    if (!nombre) continue;

    const unidad = cell(r[1]).toUpperCase();
    if (!VALID_UNITS.includes(unidad as (typeof VALID_UNITS)[number])) {
      errors.push({
        sheet: "Ingredientes",
        row: rowNum,
        message: `Unidad inválida "${unidad}". Válidas: ${VALID_UNITS.join(", ")}`,
      });
      continue;
    }

    const stockActual = num(r[2]);
    const stockMinimo = num(r[3]);
    const costo = num(r[4]);
    const monedaRaw = cell(r[5]).toUpperCase();
    const moneda = VALID_CURRENCIES.includes(
      monedaRaw as (typeof VALID_CURRENCIES)[number]
    )
      ? monedaRaw
      : "ARS";
    const proveedor = cell(r[6]);

    const existing = ingByName.get(nombre.toLowerCase());
    const supplierId = proveedor
      ? (supplierByName.get(proveedor.toLowerCase())?.id ?? null)
      : null;

    ingredientes.push({
      row: rowNum,
      action: existing ? "update" : "create",
      nombre,
      unidad,
      stockActual,
      stockMinimo,
      costo,
      moneda,
      proveedor,
      existingId: existing?.id,
      supplierId,
      stockDelta: existing
        ? stockActual - Number(existing.onHand)
        : stockActual,
    });
    willHaveIng.add(nombre.toLowerCase());
  }

  // ── Preparaciones_Detalle ────────────────────────────────────────────────
  const prepDetSheet = sheets["Preparaciones_Detalle"] ?? [];
  const prepBOMMap = new Map<
    string,
    { lines: BomLine[]; bomErrors: string[] }
  >();

  for (let i = 1; i < prepDetSheet.length; i++) {
    const r = prepDetSheet[i];
    const rowNum = i + 1;
    const prepNombre = cell(r[0]).toLowerCase();
    if (!prepNombre) continue;

    const tipo = cell(r[1]).toLowerCase();
    if (tipo !== "ingrediente" && tipo !== "preparacion") {
      errors.push({
        sheet: "Preparaciones_Detalle",
        row: rowNum,
        message: `Tipo inválido "${tipo}". Use "ingrediente" o "preparacion"`,
      });
      continue;
    }

    const referencia = cell(r[2]);
    if (!referencia) {
      errors.push({
        sheet: "Preparaciones_Detalle",
        row: rowNum,
        message: "Referencia vacía",
      });
      continue;
    }

    const cantidad = num(r[3]);
    if (cantidad <= 0) {
      errors.push({
        sheet: "Preparaciones_Detalle",
        row: rowNum,
        message: "Cantidad debe ser > 0",
      });
      continue;
    }

    const unidad = cell(r[4]).toUpperCase();
    if (!VALID_UNITS.includes(unidad as (typeof VALID_UNITS)[number])) {
      errors.push({
        sheet: "Preparaciones_Detalle",
        row: rowNum,
        message: `Unidad inválida "${unidad}"`,
      });
      continue;
    }

    const merma = Math.min(Math.max(num(r[5]), 0), 100);

    if (!prepBOMMap.has(prepNombre))
      prepBOMMap.set(prepNombre, { lines: [], bomErrors: [] });
    const entry = prepBOMMap.get(prepNombre)!;
    const refLower = referencia.toLowerCase();

    let bomError: string | null = null;
    if (tipo === "ingrediente" && !willHaveIng.has(refLower)) {
      bomError = `Ingrediente "${referencia}" no existe`;
    } else if (tipo === "preparacion" && !willHavePrep.has(refLower)) {
      bomError = `Sub-preparación "${referencia}" no existe`;
    }

    if (bomError) {
      entry.bomErrors.push(bomError);
    } else {
      entry.lines.push({
        tipo: tipo as "ingrediente" | "preparacion",
        referencia,
        cantidad,
        unidad,
        merma,
      });
    }
  }

  // ── Preparaciones ────────────────────────────────────────────────────────
  const prepSheet = sheets["Preparaciones"] ?? [];
  const preparaciones: PrepRow[] = [];

  for (let i = 1; i < prepSheet.length; i++) {
    const r = prepSheet[i];
    const rowNum = i + 1;
    const nombre = cell(r[0]);
    if (!nombre) continue;

    const unidad = cell(r[1]).toUpperCase();
    if (!VALID_UNITS.includes(unidad as (typeof VALID_UNITS)[number])) {
      errors.push({
        sheet: "Preparaciones",
        row: rowNum,
        message: `Unidad inválida "${unidad}"`,
      });
      continue;
    }

    const rendimiento = num(r[2]) || 1;
    const merma = Math.min(Math.max(num(r[3]), 0), 100);
    const notas = cell(r[4]);
    const existing = prepByName.get(nombre.toLowerCase());
    const bomEntry = prepBOMMap.get(nombre.toLowerCase()) ?? {
      lines: [],
      bomErrors: [],
    };

    preparaciones.push({
      row: rowNum,
      action: existing ? "update" : "create",
      nombre,
      unidad,
      rendimiento,
      merma,
      notas,
      existingId: existing?.id,
      bom: bomEntry.lines,
      bomErrors: bomEntry.bomErrors,
    });
    willHavePrep.add(nombre.toLowerCase());
  }

  // ── Productos_Detalle ────────────────────────────────────────────────────
  const prodDetSheet = sheets["Productos_Detalle"] ?? [];
  const prodBOMMap = new Map<
    string,
    { lines: BomLine[]; bomErrors: string[] }
  >();

  for (let i = 1; i < prodDetSheet.length; i++) {
    const r = prodDetSheet[i];
    const rowNum = i + 1;
    const prodKey = cell(r[0]).toLowerCase();
    if (!prodKey) continue;

    const tipo = cell(r[1]).toLowerCase();
    if (tipo !== "ingrediente" && tipo !== "preparacion") {
      errors.push({
        sheet: "Productos_Detalle",
        row: rowNum,
        message: `Tipo inválido "${tipo}". Use "ingrediente" o "preparacion"`,
      });
      continue;
    }

    const referencia = cell(r[2]);
    if (!referencia) {
      errors.push({
        sheet: "Productos_Detalle",
        row: rowNum,
        message: "Referencia vacía",
      });
      continue;
    }

    const cantidad = num(r[3]);
    if (cantidad <= 0) {
      errors.push({
        sheet: "Productos_Detalle",
        row: rowNum,
        message: "Cantidad debe ser > 0",
      });
      continue;
    }

    const unidad = cell(r[4]).toUpperCase();
    if (!VALID_UNITS.includes(unidad as (typeof VALID_UNITS)[number])) {
      errors.push({
        sheet: "Productos_Detalle",
        row: rowNum,
        message: `Unidad inválida "${unidad}"`,
      });
      continue;
    }

    const merma = Math.min(Math.max(num(r[5]), 0), 100);

    if (!prodBOMMap.has(prodKey))
      prodBOMMap.set(prodKey, { lines: [], bomErrors: [] });
    const entry = prodBOMMap.get(prodKey)!;
    const refLower = referencia.toLowerCase();

    let bomError: string | null = null;
    if (tipo === "ingrediente" && !willHaveIng.has(refLower)) {
      bomError = `Ingrediente "${referencia}" no existe`;
    } else if (tipo === "preparacion" && !willHavePrep.has(refLower)) {
      bomError = `Preparación "${referencia}" no existe`;
    }

    if (bomError) {
      entry.bomErrors.push(bomError);
    } else {
      entry.lines.push({
        tipo: tipo as "ingrediente" | "preparacion",
        referencia,
        cantidad,
        unidad,
        merma,
      });
    }
  }

  // ── Productos ────────────────────────────────────────────────────────────
  const prodSheet = sheets["Productos"] ?? [];
  const productos: ProdRow[] = [];

  for (let i = 1; i < prodSheet.length; i++) {
    const r = prodSheet[i];
    const rowNum = i + 1;
    const nombre = cell(r[0]);
    if (!nombre) continue;

    const sku = cell(r[1]);
    const precioVenta = num(r[2]);
    const monedaRaw = cell(r[3]).toUpperCase();
    const moneda = VALID_CURRENCIES.includes(
      monedaRaw as (typeof VALID_CURRENCIES)[number]
    )
      ? monedaRaw
      : "ARS";
    const categoria = cell(r[4]);
    const descripcion = cell(r[5]);

    const existing = sku
      ? (prodBySku.get(sku.toLowerCase()) ??
          prodByName.get(nombre.toLowerCase()))
      : prodByName.get(nombre.toLowerCase());

    const categoryId = categoria
      ? (catByName.get(categoria.toLowerCase())?.id ?? null)
      : null;

    // BOM lookup by name first, SKU as fallback key
    const bomEntry =
      prodBOMMap.get(nombre.toLowerCase()) ??
      (sku ? prodBOMMap.get(sku.toLowerCase()) : undefined) ?? {
        lines: [],
        bomErrors: [],
      };

    productos.push({
      row: rowNum,
      action: existing ? "update" : "create",
      nombre,
      sku,
      precioVenta,
      moneda,
      categoria,
      descripcion,
      existingId: existing?.id,
      categoryId,
      bom: bomEntry.lines,
      bomErrors: bomEntry.bomErrors,
    });
    willHaveProd.add(nombre.toLowerCase());
    if (sku) willHaveProd.add(sku.toLowerCase());
  }

  // ── Combos_Detalle ───────────────────────────────────────────────────────
  const comboDetSheet = sheets["Combos_Detalle"] ?? [];
  const comboProdMap = new Map<
    string,
    { lines: ComboProductLine[]; productErrors: string[] }
  >();

  for (let i = 1; i < comboDetSheet.length; i++) {
    const r = comboDetSheet[i];
    const rowNum = i + 1;
    const comboKey = cell(r[0]).toLowerCase();
    if (!comboKey) continue;

    const producto = cell(r[1]);
    if (!producto) {
      errors.push({
        sheet: "Combos_Detalle",
        row: rowNum,
        message: "Producto vacío",
      });
      continue;
    }

    const cantidad = num(r[2]) || 1;

    if (!comboProdMap.has(comboKey))
      comboProdMap.set(comboKey, { lines: [], productErrors: [] });
    const entry = comboProdMap.get(comboKey)!;

    if (!willHaveProd.has(producto.toLowerCase())) {
      entry.productErrors.push(`Producto "${producto}" no existe`);
    } else {
      entry.lines.push({ producto, cantidad });
    }
  }

  // ── Combos ───────────────────────────────────────────────────────────────
  const comboSheet = sheets["Combos"] ?? [];
  const combos: ComboRow[] = [];

  for (let i = 1; i < comboSheet.length; i++) {
    const r = comboSheet[i];
    const rowNum = i + 1;
    const nombre = cell(r[0]);
    if (!nombre) continue;

    const sku = cell(r[1]);
    const precioVenta = num(r[2]);
    const monedaRaw = cell(r[3]).toUpperCase();
    const moneda = VALID_CURRENCIES.includes(
      monedaRaw as (typeof VALID_CURRENCIES)[number]
    )
      ? monedaRaw
      : "ARS";
    const notas = cell(r[4]);

    const existing = sku
      ? (comboBySku.get(sku.toLowerCase()) ??
          comboByName.get(nombre.toLowerCase()))
      : comboByName.get(nombre.toLowerCase());

    const prodEntry =
      comboProdMap.get(nombre.toLowerCase()) ??
      (sku ? comboProdMap.get(sku.toLowerCase()) : undefined) ?? {
        lines: [],
        productErrors: [],
      };

    combos.push({
      row: rowNum,
      action: existing ? "update" : "create",
      nombre,
      sku,
      precioVenta,
      moneda,
      notas,
      existingId: existing?.id,
      productos: prodEntry.lines,
      productErrors: prodEntry.productErrors,
    });
  }

  return { ingredientes, preparaciones, productos, combos, errors };
}

// ─── Apply plan (writes to DB) ────────────────────────────────────────────────

export interface ApplyResult {
  ingredientes: { created: number; updated: number };
  preparaciones: { created: number; updated: number };
  productos: { created: number; updated: number };
  combos: { created: number; updated: number };
  errors: ParseError[];
}

export async function applyPlan(
  plan: ImportPlan,
  orgId: string
): Promise<ApplyResult> {
  const result: ApplyResult = {
    ingredientes: { created: 0, updated: 0 },
    preparaciones: { created: 0, updated: 0 },
    productos: { created: 0, updated: 0 },
    combos: { created: 0, updated: 0 },
    errors: [...plan.errors],
  };

  // Running maps: name.lower → DB id (built up as we create/update)
  const freshIngById = new Map<string, string>();
  const freshPrepById = new Map<string, string>();
  const freshProdById = new Map<string, string>();

  // ── Phase 1: Ingredientes ─────────────────────────────────────────────────
  for (const row of plan.ingredientes) {
    try {
      if (row.action === "update" && row.existingId) {
        await prisma.ingredient.update({
          where: { id: row.existingId },
          data: {
            unit: row.unidad as "KG" | "G" | "L" | "ML" | "UNIT",
            onHand: row.stockActual,
            minQty: row.stockMinimo,
            costPerUnit: row.costo,
            currency: row.moneda as "ARS" | "EUR" | "USD",
            ...(row.supplierId !== undefined
              ? { supplierId: row.supplierId }
              : {}),
          },
        });
        if (Math.abs(row.stockDelta) > 0.0001) {
          await prisma.stockMovement.create({
            data: {
              ingredientId: row.existingId,
              organizationId: orgId,
              type: "ADJUSTMENT",
              delta: row.stockDelta,
              reason: "Ajuste por importación masiva",
            },
          });
        }
        freshIngById.set(row.nombre.toLowerCase(), row.existingId);
        result.ingredientes.updated++;
      } else {
        const created = await prisma.ingredient.create({
          data: {
            organizationId: orgId,
            name: row.nombre,
            unit: row.unidad as "KG" | "G" | "L" | "ML" | "UNIT",
            onHand: row.stockActual,
            minQty: row.stockMinimo,
            costPerUnit: row.costo,
            currency: row.moneda as "ARS" | "EUR" | "USD",
            supplierId: row.supplierId ?? null,
          },
        });
        if (row.stockActual > 0) {
          await prisma.stockMovement.create({
            data: {
              ingredientId: created.id,
              organizationId: orgId,
              type: "ADJUSTMENT",
              delta: row.stockActual,
              reason: "Stock inicial (importación masiva)",
            },
          });
        }
        freshIngById.set(row.nombre.toLowerCase(), created.id);
        result.ingredientes.created++;
      }
    } catch {
      result.errors.push({
        sheet: "Ingredientes",
        row: row.row,
        message: `Error al guardar "${row.nombre}"`,
      });
    }
  }

  // Enrich fresh map with ALL existing ingredients (for BOM resolution below)
  const allIngs = await prisma.ingredient.findMany({
    where: { organizationId: orgId, isActive: true },
    select: { id: true, name: true },
  });
  for (const i of allIngs) {
    if (!freshIngById.has(i.name.toLowerCase()))
      freshIngById.set(i.name.toLowerCase(), i.id);
  }

  // ── Phase 2: Preparaciones ────────────────────────────────────────────────
  for (const row of plan.preparaciones) {
    try {
      const ingBom = row.bom
        .filter((l) => l.tipo === "ingrediente")
        .map((l) => ({
          ingredientId: freshIngById.get(l.referencia.toLowerCase()) ?? "",
          qty: l.cantidad,
          unit: l.unidad,
          wastagePct: l.merma,
        }))
        .filter((b) => b.ingredientId);

      const subPrepBom = row.bom
        .filter((l) => l.tipo === "preparacion")
        .map((l) => ({
          subPrepId: freshPrepById.get(l.referencia.toLowerCase()) ?? "",
          qty: l.cantidad,
          unit: l.unidad,
          wastagePct: l.merma,
        }))
        .filter((b) => b.subPrepId);

      const costPrice = await computePrepCost(
        ingBom,
        subPrepBom,
        row.rendimiento,
        row.merma
      );

      if (row.action === "update" && row.existingId) {
        await prisma.$transaction([
          prisma.preparationIngredient.deleteMany({
            where: { preparationId: row.existingId },
          }),
          prisma.preparationSubPrep.deleteMany({
            where: { preparationId: row.existingId },
          }),
          prisma.preparation.update({
            where: { id: row.existingId },
            data: {
              name: row.nombre,
              unit: row.unidad as "KG" | "G" | "L" | "ML" | "UNIT",
              yieldQty: row.rendimiento,
              wastagePct: row.merma,
              notes: row.notas || null,
              costPrice,
              ingredients: {
                create: ingBom.map((b) => ({
                  ingredientId: b.ingredientId,
                  qty: b.qty,
                  unit: b.unit,
                  wastagePct: b.wastagePct,
                })),
              },
              subPreparations: {
                create: subPrepBom.map((b) => ({
                  subPrepId: b.subPrepId,
                  qty: b.qty,
                  unit: b.unit,
                  wastagePct: b.wastagePct,
                })),
              },
            },
          }),
        ]);
        freshPrepById.set(row.nombre.toLowerCase(), row.existingId);
        result.preparaciones.updated++;
      } else {
        const created = await prisma.preparation.create({
          data: {
            organizationId: orgId,
            name: row.nombre,
            unit: row.unidad as "KG" | "G" | "L" | "ML" | "UNIT",
            yieldQty: row.rendimiento,
            wastagePct: row.merma,
            notes: row.notas || null,
            costPrice,
            ingredients: {
              create: ingBom.map((b) => ({
                ingredientId: b.ingredientId,
                qty: b.qty,
                unit: b.unit,
                wastagePct: b.wastagePct,
              })),
            },
            subPreparations: {
              create: subPrepBom.map((b) => ({
                subPrepId: b.subPrepId,
                qty: b.qty,
                unit: b.unit,
                wastagePct: b.wastagePct,
              })),
            },
          },
        });
        freshPrepById.set(row.nombre.toLowerCase(), created.id);
        result.preparaciones.created++;
      }
    } catch {
      result.errors.push({
        sheet: "Preparaciones",
        row: row.row,
        message: `Error al guardar "${row.nombre}"`,
      });
    }
  }

  const allPreps = await prisma.preparation.findMany({
    where: { organizationId: orgId, isActive: true },
    select: { id: true, name: true },
  });
  for (const p of allPreps) {
    if (!freshPrepById.has(p.name.toLowerCase()))
      freshPrepById.set(p.name.toLowerCase(), p.id);
  }

  // ── Phase 3: Productos ────────────────────────────────────────────────────
  for (const row of plan.productos) {
    try {
      const ingBom = row.bom
        .filter((l) => l.tipo === "ingrediente")
        .map((l) => ({
          ingredientId: freshIngById.get(l.referencia.toLowerCase()) ?? "",
          qty: l.cantidad,
          unit: l.unidad,
          wastagePct: l.merma,
        }))
        .filter((b) => b.ingredientId);

      const prepBom = row.bom
        .filter((l) => l.tipo === "preparacion")
        .map((l) => ({
          preparationId: freshPrepById.get(l.referencia.toLowerCase()) ?? "",
          qty: l.cantidad,
          unit: l.unidad,
          wastagePct: l.merma,
        }))
        .filter((b) => b.preparationId);

      const costPrice = await computeProdCost(ingBom, prepBom);

      if (row.action === "update" && row.existingId) {
        await prisma.$transaction([
          prisma.productIngredient.deleteMany({
            where: { productId: row.existingId },
          }),
          prisma.productPreparation.deleteMany({
            where: { productId: row.existingId },
          }),
          prisma.product.update({
            where: { id: row.existingId },
            data: {
              name: row.nombre,
              sku: row.sku || null,
              salePrice: row.precioVenta,
              currency: row.moneda as "ARS" | "EUR" | "USD",
              categoryId: row.categoryId ?? undefined,
              description: row.descripcion || null,
              costPrice,
              ingredients: {
                create: ingBom.map((b) => ({
                  ingredientId: b.ingredientId,
                  qty: b.qty,
                  unit: b.unit,
                  wastagePct: b.wastagePct,
                })),
              },
              preparations: {
                create: prepBom.map((b) => ({
                  preparationId: b.preparationId,
                  qty: b.qty,
                  unit: b.unit,
                  wastagePct: b.wastagePct,
                })),
              },
            },
          }),
        ]);
        freshProdById.set(row.nombre.toLowerCase(), row.existingId);
        if (row.sku) freshProdById.set(row.sku.toLowerCase(), row.existingId);
        result.productos.updated++;
      } else {
        const created = await prisma.product.create({
          data: {
            organizationId: orgId,
            name: row.nombre,
            sku: row.sku || null,
            salePrice: row.precioVenta,
            currency: row.moneda as "ARS" | "EUR" | "USD",
            categoryId: row.categoryId ?? null,
            description: row.descripcion || null,
            costPrice,
            ingredients: {
              create: ingBom.map((b) => ({
                ingredientId: b.ingredientId,
                qty: b.qty,
                unit: b.unit,
                wastagePct: b.wastagePct,
              })),
            },
            preparations: {
              create: prepBom.map((b) => ({
                preparationId: b.preparationId,
                qty: b.qty,
                unit: b.unit,
                wastagePct: b.wastagePct,
              })),
            },
          },
        });
        freshProdById.set(row.nombre.toLowerCase(), created.id);
        if (row.sku) freshProdById.set(row.sku.toLowerCase(), created.id);
        result.productos.created++;
      }
    } catch {
      result.errors.push({
        sheet: "Productos",
        row: row.row,
        message: `Error al guardar "${row.nombre}"`,
      });
    }
  }

  const allProds = await prisma.product.findMany({
    where: { organizationId: orgId, isActive: true },
    select: { id: true, name: true, sku: true },
  });
  for (const p of allProds) {
    if (!freshProdById.has(p.name.toLowerCase()))
      freshProdById.set(p.name.toLowerCase(), p.id);
    if (p.sku && !freshProdById.has(p.sku.toLowerCase()))
      freshProdById.set(p.sku.toLowerCase(), p.id);
  }

  // ── Phase 4: Combos ───────────────────────────────────────────────────────
  for (const row of plan.combos) {
    try {
      const products = row.productos
        .map((p) => ({
          productId: freshProdById.get(p.producto.toLowerCase()) ?? "",
          quantity: p.cantidad,
        }))
        .filter((p) => p.productId);

      if (products.length === 0 && row.productos.length > 0) {
        result.errors.push({
          sheet: "Combos",
          row: row.row,
          message: `"${row.nombre}": ningún producto pudo resolverse`,
        });
        continue;
      }

      if (row.action === "update" && row.existingId) {
        await prisma.$transaction([
          prisma.comboProduct.deleteMany({
            where: { comboId: row.existingId },
          }),
          prisma.combo.update({
            where: { id: row.existingId },
            data: {
              name: row.nombre,
              sku: row.sku || null,
              salePrice: row.precioVenta,
              currency: row.moneda as "ARS" | "EUR" | "USD",
              notes: row.notas || null,
              products: {
                create: products.map((p) => ({
                  productId: p.productId,
                  quantity: p.quantity,
                })),
              },
            },
          }),
        ]);
        result.combos.updated++;
      } else {
        await prisma.combo.create({
          data: {
            organizationId: orgId,
            name: row.nombre,
            sku: row.sku || null,
            salePrice: row.precioVenta,
            currency: row.moneda as "ARS" | "EUR" | "USD",
            notes: row.notas || null,
            products: {
              create: products.map((p) => ({
                productId: p.productId,
                quantity: p.quantity,
              })),
            },
          },
        });
        result.combos.created++;
      }
    } catch {
      result.errors.push({
        sheet: "Combos",
        row: row.row,
        message: `Error al guardar "${row.nombre}"`,
      });
    }
  }

  return result;
}

// ─── Cost helpers (mirrors logic from preparations/route.ts & products/route.ts) ──

async function computePrepCost(
  ingBom: { ingredientId: string; qty: number; unit: string; wastagePct: number }[],
  subPrepBom: { subPrepId: string; qty: number; unit: string; wastagePct: number }[],
  yieldQty: number,
  wastagePct: number
): Promise<number> {
  const [ings, preps] = await Promise.all([
    ingBom.length > 0
      ? prisma.ingredient.findMany({
          where: { id: { in: ingBom.map((b) => b.ingredientId) } },
          select: { id: true, costPerUnit: true, unit: true },
        })
      : [],
    subPrepBom.length > 0
      ? prisma.preparation.findMany({
          where: { id: { in: subPrepBom.map((b) => b.subPrepId) } },
          select: { id: true, costPrice: true, unit: true },
        })
      : [],
  ]);
  const ingMap = new Map(ings.map((i) => [i.id, i]));
  const prepMap = new Map(preps.map((p) => [p.id, p]));
  let total = 0;
  for (const b of ingBom) {
    const ing = ingMap.get(b.ingredientId);
    if (!ing) continue;
    total +=
      Number(ing.costPerUnit) *
      tryConvert(b.qty * (1 + b.wastagePct / 100), b.unit, ing.unit);
  }
  for (const b of subPrepBom) {
    const prep = prepMap.get(b.subPrepId);
    if (!prep) continue;
    total +=
      Number(prep.costPrice) *
      tryConvert(b.qty * (1 + b.wastagePct / 100), b.unit, prep.unit);
  }
  const effectiveYield = yieldQty * (1 - wastagePct / 100);
  return effectiveYield > 0 ? total / effectiveYield : 0;
}

async function computeProdCost(
  ingBom: { ingredientId: string; qty: number; unit: string; wastagePct: number }[],
  prepBom: { preparationId: string; qty: number; unit: string; wastagePct: number }[]
): Promise<number> {
  const [ings, preps] = await Promise.all([
    ingBom.length > 0
      ? prisma.ingredient.findMany({
          where: { id: { in: ingBom.map((b) => b.ingredientId) } },
          select: { id: true, costPerUnit: true, unit: true },
        })
      : [],
    prepBom.length > 0
      ? prisma.preparation.findMany({
          where: { id: { in: prepBom.map((b) => b.preparationId) } },
          select: { id: true, costPrice: true, unit: true },
        })
      : [],
  ]);
  const ingMap = new Map(ings.map((i) => [i.id, i]));
  const prepMap = new Map(preps.map((p) => [p.id, p]));
  let total = 0;
  for (const b of ingBom) {
    const ing = ingMap.get(b.ingredientId);
    if (!ing) continue;
    total +=
      Number(ing.costPerUnit) *
      tryConvert(b.qty * (1 + b.wastagePct / 100), b.unit, ing.unit);
  }
  for (const b of prepBom) {
    const prep = prepMap.get(b.preparationId);
    if (!prep) continue;
    total +=
      Number(prep.costPrice) *
      tryConvert(b.qty * (1 + b.wastagePct / 100), b.unit, prep.unit);
  }
  return total;
}
