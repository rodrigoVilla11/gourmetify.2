import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CreateProductSchema } from "@/lib/validators";
import { ZodError } from "zod";
import { buildExcel, excelResponse } from "@/utils/excel";
import { convertUnit } from "@/utils/units";
import type { Unit } from "@/types";

function tryConvert(qty: number, from: string, to: string): number {
  try { return convertUnit(qty, from as Unit, to as Unit); } catch { return 0; }
}

async function computeProductCost(
  ingredients: { ingredientId: string; qty: number; unit: string; wastagePct: number }[],
  preparations: { preparationId: string; qty: number; unit: string; wastagePct: number }[],
): Promise<number> {
  const [ingRecords, prepRecords] = await Promise.all([
    ingredients.length > 0
      ? prisma.ingredient.findMany({ where: { id: { in: ingredients.map((i) => i.ingredientId) } }, select: { id: true, costPerUnit: true, unit: true } })
      : [],
    preparations.length > 0
      ? prisma.preparation.findMany({ where: { id: { in: preparations.map((p) => p.preparationId) } }, select: { id: true, costPrice: true, unit: true } })
      : [],
  ]);

  const ingMap = new Map(ingRecords.map((i) => [i.id, i]));
  const prepMap = new Map(prepRecords.map((p) => [p.id, p]));

  let total = 0;
  for (const item of ingredients) {
    const ing = ingMap.get(item.ingredientId);
    if (!ing) continue;
    const effectiveQty = item.qty * (1 + item.wastagePct / 100);
    total += Number(ing.costPerUnit) * tryConvert(effectiveQty, item.unit, ing.unit);
  }
  for (const item of preparations) {
    const prep = prepMap.get(item.preparationId);
    if (!prep) continue;
    const effectiveQty = item.qty * (1 + item.wastagePct / 100);
    total += Number(prep.costPrice) * tryConvert(effectiveQty, item.unit, prep.unit);
  }
  return total;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const isActive = searchParams.get("isActive");
    const format = searchParams.get("format");

    const categoryId = searchParams.get("categoryId");

    const products = await prisma.product.findMany({
      where: {
        ...(isActive !== null ? { isActive: isActive === "true" } : {}),
        ...(categoryId ? { categoryId } : {}),
      },
      include: {
        category: { select: { id: true, name: true, color: true } },
        ingredients: { include: { ingredient: { select: { id: true, name: true, unit: true } } } },
        preparations: { include: { preparation: { select: { id: true, name: true, unit: true } } } },
      },
      orderBy: { name: "asc" },
    });

    if (format === "xlsx") {
      const rows: (string | number | null)[][] = [];
      for (const p of products) {
        if (p.ingredients.length === 0) {
          rows.push([p.name, p.sku ?? "", p.salePrice.toNumber(), p.currency, "", "", "", ""]);
        } else {
          for (const bom of p.ingredients) {
            rows.push([
              p.name, p.sku ?? "", p.salePrice.toNumber(), p.currency,
              bom.ingredient.name, bom.qty.toNumber(), bom.unit, bom.wastagePct.toNumber(),
            ]);
          }
        }
      }
      const buf = buildExcel(
        ["Producto", "SKU", "Precio de Venta", "Moneda", "Ingrediente", "Cantidad BOM", "Unidad BOM", "Merma%"],
        rows
      );
      return excelResponse(buf, "productos.xlsx");
    }

    return NextResponse.json({ data: products });
  } catch {
    return NextResponse.json({ error: "Error al obtener productos", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ingredients, preparations, ...productData } = CreateProductSchema.parse(body);

    const costPrice = await computeProductCost(ingredients, preparations);

    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          ...productData,
          costPrice,
          ingredients: {
            create: ingredients.map((item) => ({
              ingredientId: item.ingredientId,
              qty: item.qty,
              unit: item.unit,
              wastagePct: item.wastagePct ?? 0,
            })),
          },
          preparations: {
            create: preparations.map((item) => ({
              preparationId: item.preparationId,
              qty: item.qty,
              unit: item.unit,
              wastagePct: item.wastagePct ?? 0,
            })),
          },
        },
        include: {
          category: { select: { id: true, name: true, color: true } },
          ingredients: { include: { ingredient: { select: { id: true, name: true, unit: true } } } },
          preparations: { include: { preparation: { select: { id: true, name: true, unit: true } } } },
        },
      });
      return created;
    });

    return NextResponse.json(product, { status: 201 });
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: e.issues[0].message, code: "VALIDATION_ERROR" }, { status: 400 });
    }
    console.error("[products POST]", e);
    return NextResponse.json({ error: "Error al crear producto", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
