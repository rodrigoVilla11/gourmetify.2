import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UpdateProductSchema } from "@/lib/validators";
import { ZodError } from "zod";
import { convertUnit } from "@/utils/units";
import type { Unit } from "@/types";

type Params = { params: { id: string } };

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

const PRODUCT_INCLUDE = {
  ingredients: { include: { ingredient: { select: { id: true, name: true, unit: true } } } },
  preparations: { include: { preparation: { select: { id: true, name: true, unit: true } } } },
};

export async function GET(_: NextRequest, { params }: Params) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: PRODUCT_INCLUDE,
    });
    if (!product) {
      return NextResponse.json({ error: "Producto no encontrado", code: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json(product);
  } catch {
    return NextResponse.json({ error: "Error interno", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const body = await req.json();
    const { ingredients, preparations, ...productData } = UpdateProductSchema.parse(body);

    // Recalculate cost whenever BOM changes
    let costPrice: number | undefined;
    if (ingredients !== undefined || preparations !== undefined) {
      const current = await prisma.product.findUnique({
        where: { id: params.id },
        include: { ingredients: true, preparations: true },
      });
      const finalIngredients = ingredients ?? (current?.ingredients.map((i) => ({
        ingredientId: i.ingredientId, qty: Number(i.qty), unit: i.unit, wastagePct: Number(i.wastagePct),
      })) ?? []);
      const finalPreparations = preparations ?? (current?.preparations.map((p) => ({
        preparationId: p.preparationId, qty: Number(p.qty), unit: p.unit, wastagePct: Number(p.wastagePct),
      })) ?? []);
      costPrice = await computeProductCost(finalIngredients, finalPreparations);
    }

    const product = await prisma.$transaction(async (tx) => {
      if (ingredients !== undefined) {
        await tx.productIngredient.deleteMany({ where: { productId: params.id } });
      }
      if (preparations !== undefined) {
        await tx.productPreparation.deleteMany({ where: { productId: params.id } });
      }

      const updated = await tx.product.update({
        where: { id: params.id },
        data: {
          ...productData,
          ...(costPrice !== undefined ? { costPrice } : {}),
          ...(ingredients !== undefined
            ? {
                ingredients: {
                  create: ingredients.map((item) => ({
                    ingredientId: item.ingredientId,
                    qty: item.qty,
                    unit: item.unit,
                    wastagePct: item.wastagePct ?? 0,
                  })),
                },
              }
            : {}),
          ...(preparations !== undefined
            ? {
                preparations: {
                  create: preparations.map((item) => ({
                    preparationId: item.preparationId,
                    qty: item.qty,
                    unit: item.unit,
                    wastagePct: item.wastagePct ?? 0,
                  })),
                },
              }
            : {}),
        },
        include: PRODUCT_INCLUDE,
      });
      return updated;
    });

    return NextResponse.json(product);
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: e.issues[0].message, code: "VALIDATION_ERROR" }, { status: 400 });
    }
    console.error("[products PUT]", e);
    return NextResponse.json({ error: "Error al actualizar producto", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: Params) {
  try {
    await prisma.product.update({
      where: { id: params.id },
      data: { isActive: false },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Error al eliminar producto", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
