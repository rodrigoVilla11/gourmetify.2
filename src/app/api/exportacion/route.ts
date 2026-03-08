export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildMultiSheetExcel, type SheetSpec } from "@/utils/excelMultisheet";
import { excelResponse } from "@/utils/excel";
import { requireOrg } from "@/lib/requireOrg";

export async function GET(req: NextRequest) {
  let orgId: string;
  try {
    orgId = requireOrg(req);
  } catch (e) {
    return e as Response;
  }

  try {
    const [ingredients, preparations, products, combos] = await Promise.all([
      prisma.ingredient.findMany({
        where: { organizationId: orgId, isActive: true },
        include: { supplier: { select: { name: true } } },
        orderBy: { name: "asc" },
      }),
      prisma.preparation.findMany({
        where: { organizationId: orgId, isActive: true },
        include: {
          ingredients: {
            include: { ingredient: { select: { name: true } } },
          },
          subPreparations: {
            include: { subPrep: { select: { name: true } } },
          },
        },
        orderBy: { name: "asc" },
      }),
      prisma.product.findMany({
        where: { organizationId: orgId, isActive: true },
        include: {
          category: { select: { name: true } },
          ingredients: {
            include: { ingredient: { select: { name: true } } },
          },
          preparations: {
            include: { preparation: { select: { name: true } } },
          },
        },
        orderBy: { name: "asc" },
      }),
      prisma.combo.findMany({
        where: { organizationId: orgId, isActive: true },
        include: {
          products: { include: { product: { select: { name: true } } } },
        },
        orderBy: { name: "asc" },
      }),
    ]);

    // ── Sheet: Ingredientes ─────────────────────────────────────────────────
    const ingSheet: SheetSpec = {
      name: "Ingredientes",
      headers: [
        "Nombre",
        "Unidad",
        "Stock_Actual",
        "Stock_Minimo",
        "Costo_Por_Unidad",
        "Moneda",
        "Proveedor",
      ],
      rows: ingredients.map((i) => [
        i.name,
        i.unit,
        i.onHand.toNumber(),
        i.minQty.toNumber(),
        i.costPerUnit.toNumber(),
        i.currency,
        i.supplier?.name ?? "",
      ]),
      colWidths: [24, 10, 14, 14, 18, 10, 22],
    };

    // ── Sheet: Preparaciones ────────────────────────────────────────────────
    const prepSheet: SheetSpec = {
      name: "Preparaciones",
      headers: ["Nombre", "Unidad", "Rendimiento", "Merma_Pct", "Notas"],
      rows: preparations.map((p) => [
        p.name,
        p.unit,
        p.yieldQty.toNumber(),
        p.wastagePct.toNumber(),
        p.notes ?? "",
      ]),
      colWidths: [24, 10, 14, 12, 30],
    };

    // ── Sheet: Preparaciones_Detalle ────────────────────────────────────────
    const prepDetRows: (string | number)[][] = [];
    for (const prep of preparations) {
      for (const line of prep.ingredients) {
        prepDetRows.push([
          prep.name,
          "ingrediente",
          line.ingredient.name,
          line.qty.toNumber(),
          line.unit,
          line.wastagePct.toNumber(),
        ]);
      }
      for (const line of prep.subPreparations) {
        prepDetRows.push([
          prep.name,
          "preparacion",
          line.subPrep.name,
          line.qty.toNumber(),
          line.unit,
          line.wastagePct.toNumber(),
        ]);
      }
    }
    const prepDetSheet: SheetSpec = {
      name: "Preparaciones_Detalle",
      headers: [
        "Preparacion",
        "Tipo",
        "Referencia",
        "Cantidad",
        "Unidad",
        "Merma_Pct",
      ],
      rows: prepDetRows,
      colWidths: [24, 14, 24, 10, 10, 12],
    };

    // ── Sheet: Productos ────────────────────────────────────────────────────
    const prodSheet: SheetSpec = {
      name: "Productos",
      headers: [
        "Nombre",
        "SKU",
        "Precio_Venta",
        "Moneda",
        "Categoria",
        "Descripcion",
      ],
      rows: products.map((p) => [
        p.name,
        p.sku ?? "",
        p.salePrice.toNumber(),
        p.currency,
        p.category?.name ?? "",
        p.description ?? "",
      ]),
      colWidths: [24, 14, 14, 10, 16, 32],
    };

    // ── Sheet: Productos_Detalle ────────────────────────────────────────────
    const prodDetRows: (string | number)[][] = [];
    for (const prod of products) {
      for (const line of prod.ingredients) {
        prodDetRows.push([
          prod.name,
          "ingrediente",
          line.ingredient.name,
          line.qty.toNumber(),
          line.unit,
          line.wastagePct.toNumber(),
        ]);
      }
      for (const line of prod.preparations) {
        prodDetRows.push([
          prod.name,
          "preparacion",
          line.preparation.name,
          line.qty.toNumber(),
          line.unit,
          line.wastagePct.toNumber(),
        ]);
      }
    }
    const prodDetSheet: SheetSpec = {
      name: "Productos_Detalle",
      headers: [
        "Producto",
        "Tipo",
        "Referencia",
        "Cantidad",
        "Unidad",
        "Merma_Pct",
      ],
      rows: prodDetRows,
      colWidths: [24, 14, 24, 10, 10, 12],
    };

    // ── Sheet: Combos ───────────────────────────────────────────────────────
    const comboSheet: SheetSpec = {
      name: "Combos",
      headers: ["Nombre", "SKU", "Precio_Venta", "Moneda", "Notas"],
      rows: combos.map((c) => [
        c.name,
        c.sku ?? "",
        c.salePrice.toNumber(),
        c.currency,
        c.notes ?? "",
      ]),
      colWidths: [24, 14, 14, 10, 30],
    };

    // ── Sheet: Combos_Detalle ───────────────────────────────────────────────
    const comboDetRows: (string | number)[][] = [];
    for (const combo of combos) {
      for (const line of combo.products) {
        comboDetRows.push([
          combo.name,
          line.product.name,
          line.quantity.toNumber(),
        ]);
      }
    }
    const comboDetSheet: SheetSpec = {
      name: "Combos_Detalle",
      headers: ["Combo", "Producto", "Cantidad"],
      rows: comboDetRows,
      colWidths: [24, 24, 12],
    };

    const buf = buildMultiSheetExcel([
      ingSheet,
      prepSheet,
      prepDetSheet,
      prodSheet,
      prodDetSheet,
      comboSheet,
      comboDetSheet,
    ]);

    const date = new Date().toISOString().slice(0, 10);
    return excelResponse(buf, `exportacion_${date}.xlsx`);
  } catch {
    return new Response(JSON.stringify({ error: "Error al exportar" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
