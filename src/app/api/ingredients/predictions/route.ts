import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [movements, ingredients] = await Promise.all([
      prisma.stockMovement.groupBy({
        by: ["ingredientId"],
        where: { type: "SALE", createdAt: { gte: sevenDaysAgo } },
        _sum: { delta: true },
      }),
      prisma.ingredient.findMany({
        where: { isActive: true },
        select: { id: true, onHand: true },
      }),
    ]);

    const consumptionMap = new Map(
      movements.map((m) => [
        m.ingredientId,
        Math.abs(Number(m._sum.delta ?? 0)),
      ])
    );

    const predictions = ingredients.map((ing) => {
      const totalConsumed = consumptionMap.get(ing.id) ?? 0;
      const avgDailyConsumption = totalConsumed / 7;
      const onHand = Number(ing.onHand);
      const daysRemaining =
        avgDailyConsumption > 0 ? onHand / avgDailyConsumption : null;

      return {
        ingredientId: ing.id,
        avgDailyConsumption,
        daysRemaining,
      };
    });

    return NextResponse.json(predictions);
  } catch {
    return NextResponse.json(
      { error: "Error interno", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
