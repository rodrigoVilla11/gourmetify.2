import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { format, getDay, getHours, startOfMonth, endOfDay } from "date-fns";
import { requireOrg } from "@/lib/requireOrg";

const DOW_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export async function GET(req: NextRequest) {  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }

  try {
    const { searchParams } = new URL(req.url);
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    const today = new Date();
    const start = fromParam ? new Date(fromParam) : startOfMonth(today);
    const end = toParam ? new Date(toParam + "T23:59:59.999Z") : endOfDay(today);

    const sales = await prisma.sale.findMany({
      where: { organizationId: orgId, date: { gte: start, lte: end } },
      select: {
        date: true,
        total: true,
        items: {
          select: {
            quantity: true,
            product: { select: { name: true, salePrice: true } },
          },
        },
        combos: {
          select: {
            quantity: true,
            price: true,
            combo: { select: { name: true } },
          },
        },
        payments: { select: { paymentMethod: true, amount: true } },
      },
      orderBy: { date: "asc" },
    });

    // ── Summary ───────────────────────────────────────────────────────────────
    const totalCount = sales.length;
    const totalRevenue = sales.reduce((sum, s) => sum + Number(s.total), 0);
    const avgTicket = totalCount > 0 ? totalRevenue / totalCount : 0;

    // ── By day ────────────────────────────────────────────────────────────────
    const dayMap = new Map<string, { total: number; count: number }>();
    for (const s of sales) {
      const key = format(new Date(s.date), "yyyy-MM-dd");
      const ex = dayMap.get(key);
      if (ex) { ex.total += Number(s.total); ex.count++; }
      else dayMap.set(key, { total: Number(s.total), count: 1 });
    }
    const byDay = Array.from(dayMap.entries()).map(([date, v]) => ({ date, ...v }));

    // ── By hour ───────────────────────────────────────────────────────────────
    const hourMap = new Map<number, { total: number; count: number }>();
    for (let h = 0; h < 24; h++) hourMap.set(h, { total: 0, count: 0 });
    for (const s of sales) {
      const h = getHours(new Date(s.date));
      const ex = hourMap.get(h)!;
      ex.total += Number(s.total);
      ex.count++;
    }
    const byHour = Array.from(hourMap.entries())
      .map(([hour, v]) => ({ hour, ...v }))
      .sort((a, b) => a.hour - b.hour);

    // ── By day of week (Mon–Sun order) ────────────────────────────────────────
    const dowMap = new Map<number, { total: number; count: number }>();
    for (let d = 0; d < 7; d++) dowMap.set(d, { total: 0, count: 0 });
    for (const s of sales) {
      const d = getDay(new Date(s.date)); // 0=Sun
      const ex = dowMap.get(d)!;
      ex.total += Number(s.total);
      ex.count++;
    }
    // Reorder Mon(1)..Sun(0)
    const dowOrder = [1, 2, 3, 4, 5, 6, 0];
    const byDayOfWeek = dowOrder.map((d) => ({
      day: d,
      label: DOW_LABELS[d],
      ...dowMap.get(d)!,
    }));

    // ── Top products (items + combos) ─────────────────────────────────────────
    const productMap = new Map<string, { quantity: number; revenue: number }>();
    for (const s of sales) {
      for (const item of s.items) {
        const name = item.product.name;
        const qty = Number(item.quantity);
        const rev = qty * Number(item.product.salePrice);
        const ex = productMap.get(name);
        if (ex) { ex.quantity += qty; ex.revenue += rev; }
        else productMap.set(name, { quantity: qty, revenue: rev });
      }
      for (const combo of s.combos) {
        const name = combo.combo.name;
        const qty = Number(combo.quantity);
        const rev = Number(combo.price);
        const ex = productMap.get(name);
        if (ex) { ex.quantity += qty; ex.revenue += rev; }
        else productMap.set(name, { quantity: qty, revenue: rev });
      }
    }
    const topProducts = Array.from(productMap.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // ── By payment method ─────────────────────────────────────────────────────
    const pmMap = new Map<string, { amount: number; count: number }>();
    for (const s of sales) {
      for (const p of s.payments) {
        const ex = pmMap.get(p.paymentMethod);
        if (ex) { ex.amount += Number(p.amount); ex.count++; }
        else pmMap.set(p.paymentMethod, { amount: Number(p.amount), count: 1 });
      }
    }
    const byPaymentMethod = Array.from(pmMap.entries())
      .map(([method, v]) => ({ method, ...v }))
      .sort((a, b) => b.amount - a.amount);

    return NextResponse.json({
      summary: { totalCount, totalRevenue, avgTicket },
      byDay,
      byHour,
      byDayOfWeek,
      topProducts,
      byPaymentMethod,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al calcular analytics", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
