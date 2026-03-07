export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireOrg } from "@/lib/requireOrg";

function getDashboardData(orgId: string) {
  return unstable_cache(
    async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [
        totalIngredients,
        candidateLowStock,
        recentSales,
        totalProducts,
        todaySales,
        topItemGroups,
        kanbanGroups,
        todayRevenueAgg,
      ] = await Promise.all([
        prisma.ingredient.count({ where: { isActive: true, organizationId: orgId } }),

        prisma.ingredient.findMany({
          where: { isActive: true, minQty: { gt: 0 }, organizationId: orgId },
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
          where: { organizationId: orgId },
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

        prisma.product.count({ where: { isActive: true, organizationId: orgId } }),

        prisma.sale.count({ where: { date: { gte: today }, organizationId: orgId } }),

        prisma.saleItem.groupBy({
          by: ["productId"],
          where: { sale: { date: { gte: thirtyDaysAgo }, organizationId: orgId } },
          _sum: { quantity: true },
          orderBy: { _sum: { quantity: "desc" } },
          take: 5,
        }),

        prisma.sale.groupBy({
          by: ["orderStatus"],
          where: { orderStatus: { in: ["NUEVO", "EN_PREPARACION", "LISTO"] }, organizationId: orgId },
          _count: { id: true },
        }),

        prisma.sale.aggregate({
          _sum: { total: true },
          where: { date: { gte: today }, orderStatus: { not: "CANCELADO" }, organizationId: orgId },
        }),
      ]);

      const lowStockIngredients = candidateLowStock.filter((i) =>
        i.onHand.lessThan(i.minQty)
      );

      const topProductIds = topItemGroups.map((g) => g.productId);
      const topProductDetails =
        topProductIds.length > 0
          ? await prisma.product.findMany({
              where: { id: { in: topProductIds }, organizationId: orgId },
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

      const kanbanCounts = { NUEVO: 0, EN_PREPARACION: 0, LISTO: 0 } as Record<string, number>;
      for (const g of kanbanGroups) kanbanCounts[g.orderStatus] = g._count.id;

      return {
        lowStockIngredients,
        recentSales,
        topProducts,
        totalIngredients,
        totalProducts,
        totalSalesToday: todaySales,
        kanbanCounts,
        todayRevenue: Number(todayRevenueAgg._sum.total ?? 0),
      };
    },
    ["dashboard", orgId],
    { revalidate: 60, tags: [`dashboard:${orgId}`] }
  );
}

export async function GET(req: NextRequest) {
  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }
  try {
    const data = await getDashboardData(orgId)();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Error interno", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
