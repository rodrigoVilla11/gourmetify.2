import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CreatePreparationSchema } from "@/lib/validators";
import { ZodError } from "zod";
import { convertUnit } from "@/utils/units";
import type { Unit } from "@/types";
import { requireOrg, requireFeature } from "@/lib/requireOrg";

function tryConvert(qty: number, from: string, to: string): number {
  try { return convertUnit(qty, from as Unit, to as Unit); } catch { return 0; }
}

async function computeCostPrice(
  ingredients: { ingredientId: string; qty: number; unit: string; wastagePct: number }[],
  subPreparations: { subPrepId: string; qty: number; unit: string; wastagePct: number }[],
  yieldQty: number,
  wastagePct: number = 0
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

  const effectiveYield = yieldQty * (1 - wastagePct / 100);
  return effectiveYield > 0 ? totalBatchCost / effectiveYield : 0;
}

export async function GET(req: NextRequest) {  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }

  try {
    const { searchParams } = new URL(req.url);
    const isActive = searchParams.get("isActive");

    const preparations = await prisma.preparation.findMany({
      where: {
        organizationId: orgId,
        ...(isActive !== null ? { isActive: isActive === "true" } : {}),
      },
      include: {
        ingredients: {
          include: { ingredient: { select: { id: true, name: true, unit: true } } },
        },
        subPreparations: {
          include: { subPrep: { select: { id: true, name: true, unit: true } } },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ data: preparations });
  } catch {
    return NextResponse.json({ error: "Error al obtener preparaciones", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }
  try { requireFeature(req, "combos"); } catch (e) { return e as Response; }

  try {
    const body = await req.json();
    const { ingredients, subPreparations, ...prepData } = CreatePreparationSchema.parse(body);

    const costPrice = await computeCostPrice(ingredients, subPreparations, prepData.yieldQty ?? 1, prepData.wastagePct ?? 0);

    const preparation = await prisma.$transaction(async (tx) => {
      const created = await tx.preparation.create({
        data: {
          ...prepData,
          organizationId: orgId,
          costPrice,
          ingredients: {
            create: ingredients.map((item) => ({
              ingredientId: item.ingredientId,
              qty: item.qty,
              unit: item.unit,
              wastagePct: item.wastagePct ?? 0,
            })),
          },
          subPreparations: {
            create: subPreparations.map((item) => ({
              subPrepId: item.subPrepId,
              qty: item.qty,
              unit: item.unit,
              wastagePct: item.wastagePct ?? 0,
            })),
          },
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
      return created;
    });

    return NextResponse.json(preparation, { status: 201 });
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: e.issues[0].message, code: "VALIDATION_ERROR" }, { status: 400 });
    }
    console.error("[preparations POST]", e);
    return NextResponse.json({ error: "Error al crear preparación", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
