import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    // Use setUTCHours to be timezone-independent on the server
    const fromDate = from ? new Date(from) : new Date();
    fromDate.setUTCHours(0, 0, 0, 0);

    const toDate = to ? new Date(to) : new Date();
    toDate.setUTCHours(23, 59, 59, 999);

    // Step 1: aggregate consumption in DB (much faster than JS aggregation)
    const grouped = await prisma.stockMovement.groupBy({
      by: ["ingredientId"],
      where: {
        type: "SALE",
        createdAt: { gte: fromDate, lte: toDate },
      },
      _sum: { delta: true },
    });

    if (grouped.length === 0) {
      return NextResponse.json({ data: [], totalEstimatedCost: 0 });
    }

    // Step 2: fetch ingredient details for those IDs only
    const ingredientIds = grouped.map((g) => g.ingredientId);
    const ingredients = await prisma.ingredient.findMany({
      where: { id: { in: ingredientIds } },
      select: { id: true, name: true, unit: true, costPerUnit: true, currency: true },
    });

    const ingredientMap = new Map(ingredients.map((i) => [i.id, i]));

    const rows = grouped
      .map((g) => {
        const ing = ingredientMap.get(g.ingredientId);
        if (!ing) return null;
        const totalConsumed = Math.abs(Number(g._sum.delta ?? 0));
        const costPerUnit = Number(ing.costPerUnit);
        const estimatedCost = totalConsumed * costPerUnit;
        return {
          ingredientId: g.ingredientId,
          name: ing.name,
          unit: ing.unit,
          costPerUnit,
          currency: ing.currency,
          totalConsumed,
          estimatedCost,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b!.estimatedCost - a!.estimatedCost) as {
        ingredientId: string;
        name: string;
        unit: string;
        costPerUnit: number;
        currency: string;
        totalConsumed: number;
        estimatedCost: number;
      }[];

    const totalEstimatedCost = rows.reduce((s, r) => s + r.estimatedCost, 0);

    return NextResponse.json({ data: rows, totalEstimatedCost });
  } catch {
    return NextResponse.json({ error: "Error interno", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
