export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg } from "@/lib/requireOrg";

export async function GET(req: NextRequest) {  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }

  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const fromDate = from ? new Date(from) : new Date();
    fromDate.setUTCHours(0, 0, 0, 0);

    const toDate = to ? new Date(to) : new Date();
    toDate.setUTCHours(23, 59, 59, 999);

    const dateFilter = { gte: fromDate, lte: toDate };

    // ── Ingredient consumption (StockMovements type=SALE) ───────────────────
    const groupedIng = await prisma.stockMovement.groupBy({
      by: ["ingredientId"],
      where: { organizationId: orgId, type: "SALE", createdAt: dateFilter },
      _sum: { delta: true },
    });

    let ingredientRows: {
      ingredientId: string; name: string; unit: string;
      costPerUnit: number; currency: string;
      totalConsumed: number; estimatedCost: number;
    }[] = [];

    if (groupedIng.length > 0) {
      const ingredients = await prisma.ingredient.findMany({
        where: { organizationId: orgId, id: { in: groupedIng.map((g) => g.ingredientId) } },
        select: { id: true, name: true, unit: true, costPerUnit: true, currency: true },
      });
      const ingMap = new Map(ingredients.map((i) => [i.id, i]));

      ingredientRows = groupedIng
        .map((g) => {
          const ing = ingMap.get(g.ingredientId);
          if (!ing) return null;
          const totalConsumed = Math.abs(Number(g._sum.delta ?? 0));
          const costPerUnit = Number(ing.costPerUnit);
          return {
            ingredientId: g.ingredientId,
            name: ing.name,
            unit: ing.unit,
            costPerUnit,
            currency: ing.currency,
            totalConsumed,
            estimatedCost: totalConsumed * costPerUnit,
          };
        })
        .filter(Boolean)
        .sort((a, b) => b!.estimatedCost - a!.estimatedCost) as typeof ingredientRows;
    }

    // ── Preparation consumption (PreparationMovements type=SALE|CONSUME) ────
    const groupedPrep = await prisma.preparationMovement.groupBy({
      by: ["preparationId"],
      where: { organizationId: orgId, type: { in: ["SALE", "CONSUME"] }, createdAt: dateFilter },
      _sum: { delta: true },
    });

    let preparationRows: {
      preparationId: string; name: string; unit: string;
      costPerUnit: number; totalConsumed: number; estimatedCost: number;
    }[] = [];

    if (groupedPrep.length > 0) {
      const preparations = await prisma.preparation.findMany({
        where: { organizationId: orgId, id: { in: groupedPrep.map((g) => g.preparationId) } },
        select: { id: true, name: true, unit: true, costPrice: true },
      });
      const prepMap = new Map(preparations.map((p) => [p.id, p]));

      preparationRows = groupedPrep
        .map((g) => {
          const prep = prepMap.get(g.preparationId);
          if (!prep) return null;
          const totalConsumed = Math.abs(Number(g._sum.delta ?? 0));
          const costPerUnit = Number(prep.costPrice);
          return {
            preparationId: g.preparationId,
            name: prep.name,
            unit: prep.unit,
            costPerUnit,
            totalConsumed,
            estimatedCost: totalConsumed * costPerUnit,
          };
        })
        .filter(Boolean)
        .sort((a, b) => b!.estimatedCost - a!.estimatedCost) as typeof preparationRows;
    }

    const totalIngCost = ingredientRows.reduce((s, r) => s + r.estimatedCost, 0);
    const totalPrepCost = preparationRows.reduce((s, r) => s + r.estimatedCost, 0);

    return NextResponse.json({
      data: ingredientRows,
      preparations: preparationRows,
      totalEstimatedCost: totalIngCost + totalPrepCost,
      totalIngCost,
      totalPrepCost,
    });
  } catch {
    return NextResponse.json({ error: "Error interno", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
