import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UpdatePreparationSchema } from "@/lib/validators";
import { ZodError } from "zod";
import { convertUnit } from "@/utils/units";
import type { Unit } from "@/types";
import { requireOrg } from "@/lib/requireOrg";

type Params = { params: { id: string } };

function tryConvert(qty: number, from: string, to: string): number {
  try { return convertUnit(qty, from as Unit, to as Unit); } catch { return 0; }
}

async function computeCostPrice(
  ingredients: { ingredientId: string; qty: number; unit: string; wastagePct: number }[],
  subPreparations: { subPrepId: string; qty: number; unit: string; wastagePct: number }[],
  yieldQty: number
): Promise<number> {
  const [ingRecords, subPrepRecords] = await Promise.all([
    ingredients.length > 0
      ? prisma.ingredient.findMany({ where: { id: { in: ingredients.map((i) => i.ingredientId) } }, select: { id: true, costPerUnit: true, unit: true } })
      : [],
    subPreparations.length > 0
      ? prisma.preparation.findMany({ where: { id: { in: subPreparations.map((s) => s.subPrepId) } }, select: { id: true, costPrice: true, unit: true } })
      : [],
  ]);

  const ingCostMap = new Map(ingRecords.map((i) => [i.id, i]));
  const prepCostMap = new Map(subPrepRecords.map((p) => [p.id, p]));

  let totalBatchCost = 0;
  for (const item of ingredients) {
    const ing = ingCostMap.get(item.ingredientId);
    if (!ing) continue;
    const effectiveQty = item.qty * (1 + item.wastagePct / 100);
    const qtyInBase = tryConvert(effectiveQty, item.unit, ing.unit);
    totalBatchCost += Number(ing.costPerUnit) * qtyInBase;
  }
  for (const item of subPreparations) {
    const prep = prepCostMap.get(item.subPrepId);
    if (!prep) continue;
    const effectiveQty = item.qty * (1 + item.wastagePct / 100);
    const qtyInBase = tryConvert(effectiveQty, item.unit, prep.unit);
    totalBatchCost += Number(prep.costPrice) * qtyInBase;
  }

  return yieldQty > 0 ? totalBatchCost / yieldQty : 0;
}

export async function GET(req: NextRequest, { params }: Params) {
  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }

  try {
    const preparation = await prisma.preparation.findUnique({
      where: { id: params.id, organizationId: orgId },
      include: {
        ingredients: {
          include: { ingredient: { select: { id: true, name: true, unit: true } } },
        },
        subPreparations: {
          include: { subPrep: { select: { id: true, name: true, unit: true } } },
        },
        movements: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    });
    if (!preparation) {
      return NextResponse.json({ error: "Preparación no encontrada", code: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json(preparation);
  } catch {
    return NextResponse.json({ error: "Error interno", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }

  try {
    const body = await req.json();
    const { ingredients, subPreparations, ...prepData } = UpdatePreparationSchema.parse(body);

    // If BOM is being updated, recalculate cost
    let costPrice: number | undefined;
    if (ingredients !== undefined || subPreparations !== undefined) {
      // Fetch current BOM from DB for whichever side wasn't provided
      const current = await prisma.preparation.findUnique({
        where: { id: params.id, organizationId: orgId },
        include: {
          ingredients: true,
          subPreparations: true,
        },
      });
      const finalIngredients = ingredients ?? (current?.ingredients.map((i) => ({
        ingredientId: i.ingredientId, qty: Number(i.qty), unit: i.unit, wastagePct: Number(i.wastagePct),
      })) ?? []);
      const finalSubPreps = subPreparations ?? (current?.subPreparations.map((s) => ({
        subPrepId: s.subPrepId, qty: Number(s.qty), unit: s.unit, wastagePct: Number(s.wastagePct),
      })) ?? []);
      const finalYieldQty = prepData.yieldQty ?? Number(current?.yieldQty ?? 1);
      costPrice = await computeCostPrice(finalIngredients, finalSubPreps, finalYieldQty);
    }

    const preparation = await prisma.$transaction(async (tx) => {
      if (ingredients !== undefined) {
        await tx.preparationIngredient.deleteMany({ where: { preparationId: params.id } });
      }
      if (subPreparations !== undefined) {
        await tx.preparationSubPrep.deleteMany({ where: { preparationId: params.id } });
      }

      const updated = await tx.preparation.update({
        where: { id: params.id, organizationId: orgId },
        data: {
          ...prepData,
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
          ...(subPreparations !== undefined
            ? {
                subPreparations: {
                  create: subPreparations.map((item) => ({
                    subPrepId: item.subPrepId,
                    qty: item.qty,
                    unit: item.unit,
                    wastagePct: item.wastagePct ?? 0,
                  })),
                },
              }
            : {}),
        },
        include: {
          ingredients: {
            include: { ingredient: { select: { id: true, name: true, unit: true } } },
          },
          subPreparations: {
            include: { subPrep: { select: { id: true, name: true, unit: true } } },
          },
        },
      });
      return updated;
    });

    return NextResponse.json(preparation);
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: e.issues[0].message, code: "VALIDATION_ERROR" }, { status: 400 });
    }
    console.error("[preparations PUT]", e);
    return NextResponse.json({ error: "Error al actualizar preparación", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }

  try {
    await prisma.preparation.update({
      where: { id: params.id, organizationId: orgId },
      data: { isActive: false },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Error al desactivar preparación", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
