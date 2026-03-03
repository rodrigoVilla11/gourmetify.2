import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

const getDashboardData = unstable_cache(
  async () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // All queries run in parallel; no $transaction needed for cached reads
    const [
      totalIngredients,
      candidateLowStock,
      recentSales,
      totalProducts,
      todaySales,
      topItemGroups,
    ] = await Promise.all([
      prisma.ingredient.count({ where: { isActive: true } }),

      // Only candidates: active ingredients that have a minimum threshold set
      prisma.ingredient.findMany({
        where: { isActive: true, minQty: { gt: 0 } },
        select: {
          id: true,
          name: true,
          unit: true,
          onHand: true,
          minQty: true,
          supplier: { select: { name: true } },
        },
      }),

      prisma.sale.findMany({
        take: 5,
        orderBy: { date: "desc" },
        select: {
          id: true,
          date: true,
          notes: true,
          items: {
            select: {
              productId: true,
              quantity: true,
              product: { select: { name: true } },
            },
          },
        },
      }),

      prisma.product.count({ where: { isActive: true } }),

      prisma.sale.count({ where: { date: { gte: today } } }),

      // DB-level aggregation: no more loading all rows into memory
      prisma.saleItem.groupBy({
        by: ["productId"],
        where: { sale: { date: { gte: thirtyDaysAgo } } },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 5,
      }),
    ]);

    // Can't compare two columns in Prisma where, so filter in JS (only minQty>0 rows loaded)
    const lowStockIngredients = candidateLowStock.filter((i) =>
      i.onHand.lessThan(i.minQty)
    );

    // Fetch only the top 5 product details
    const topProductIds = topItemGroups.map((g) => g.productId);
    const topProductDetails =
      topProductIds.length > 0
        ? await prisma.product.findMany({
            where: { id: { in: topProductIds } },
            select: { id: true, name: true, salePrice: true, currency: true },
          })
        : [];

    const productMap = new Map(topProductDetails.map((p) => [p.id, p]));
    const topProducts = topItemGroups
      .map((g) => {
        const product = productMap.get(g.productId);
        if (!product) return null;
        return { product, total: Number(g._sum.quantity ?? 0) };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    return {
      lowStockIngredients,
      recentSales,
      topProducts,
      totalIngredients,
      totalProducts,
      totalSalesToday: todaySales,
    };
  },
  ["dashboard"],
  { revalidate: 60, tags: ["dashboard"] }
);

export async function GET() {
  try {
    const data = await getDashboardData();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Error interno", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
