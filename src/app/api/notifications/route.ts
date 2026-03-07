export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg } from "@/lib/requireOrg";

export async function GET(req: NextRequest) {
  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [candidates, openLogs, pendingOrders] = await Promise.all([
      prisma.ingredient.findMany({
        where: { isActive: true, minQty: { gt: 0 }, organizationId: orgId },
        select: { id: true, name: true, onHand: true, minQty: true },
      }),
      prisma.timeLog.findMany({
        where: { checkOut: null, checkIn: { lt: startOfToday }, organizationId: orgId },
        include: { employee: { select: { firstName: true, lastName: true } } },
        orderBy: { checkIn: "asc" },
        take: 5,
      }),
      prisma.sale.findMany({
        where: { orderStatus: "NUEVO", organizationId: orgId },
        select: { id: true, customerName: true, customer: { select: { name: true } } },
        orderBy: { date: "asc" },
        take: 10,
      }),
    ]);

    const lowStock = candidates.filter((i) => Number(i.onHand) < Number(i.minQty));

    type NotificationItem = {
      type: "LOW_STOCK" | "OPEN_TIMELOG" | "PENDING_ORDERS";
      title: string;
      description: string;
      href: string;
      count: number;
      names: string[];
    };

    const items: NotificationItem[] = [];

    if (pendingOrders.length > 0) {
      items.push({
        type: "PENDING_ORDERS",
        title: "Pedidos sin preparar",
        description: `${pendingOrders.length} pedido${pendingOrders.length !== 1 ? "s" : ""} esperando`,
        href: "/comandas",
        count: pendingOrders.length,
        names: pendingOrders.slice(0, 3).map(o => o.customer?.name ?? o.customerName ?? "Anónimo"),
      });
    }

    if (lowStock.length > 0) {
      items.push({
        type: "LOW_STOCK",
        title: "Stock bajo",
        description: `${lowStock.length} ingrediente${lowStock.length !== 1 ? "s" : ""} bajo el mínimo`,
        href: "/ingredients",
        count: lowStock.length,
        names: lowStock.slice(0, 3).map((i) => i.name),
      });
    }

    if (openLogs.length > 0) {
      items.push({
        type: "OPEN_TIMELOG",
        title: "Fichajes sin cerrar",
        description: `${openLogs.length} empleado${openLogs.length !== 1 ? "s" : ""} no ficharon salida`,
        href: "/time-logs",
        count: openLogs.length,
        names: openLogs.map((l) => `${l.employee.firstName} ${l.employee.lastName}`),
      });
    }

    const total = pendingOrders.length + lowStock.length + openLogs.length;
    return NextResponse.json({ total, items });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al obtener notificaciones", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
