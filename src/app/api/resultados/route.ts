import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg } from "@/lib/requireOrg";

export async function GET(req: NextRequest) {  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }

  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const start = from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = to ? new Date(to + "T23:59:59.999Z") : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59, 999);

    const dateRange = { gte: start, lte: end };

    const [salesAgg, incomeRows, expenseRows, supplierPaymentRows, timeLogs, employees, salePayments, saleItems] =
      await Promise.all([
        prisma.sale.aggregate({ _sum: { total: true }, where: { organizationId: orgId, date: dateRange } }),
        prisma.incomeEntry.findMany({ where: { organizationId: orgId, date: dateRange } }),
        prisma.expense.findMany({ include: { category: true }, where: { organizationId: orgId, date: dateRange } }),
        prisma.supplierPayment.findMany({
          where: { organizationId: orgId, date: dateRange },
          include: { supplier: { select: { name: true } } },
        }),
        prisma.timeLog.findMany({
          where: { organizationId: orgId, checkIn: dateRange, checkOut: { not: null } },
          select: { employeeId: true, duration: true },
        }),
        prisma.employee.findMany({
          where: { organizationId: orgId },
          select: { id: true, firstName: true, lastName: true, hourlyRate: true },
        }),
        prisma.salePayment.groupBy({
          by: ["paymentMethod"],
          _sum: { amount: true },
          where: { sale: { organizationId: orgId, date: dateRange } },
        }),
        prisma.saleItem.findMany({
          where: { sale: { organizationId: orgId, date: dateRange, orderStatus: { not: "CANCELADO" } } },
          select: { quantity: true, product: { select: { costPrice: true } } },
        }),
      ]);

    // ── Ingresos ──────────────────────────────────────────────────────────────
    const totalSales = Number(salesAgg._sum.total ?? 0);
    const totalOtherIncome = incomeRows.reduce((sum, r) => sum + Number(r.amount), 0);
    const totalIngresos = totalSales + totalOtherIncome;

    // ── Costos — gastos ───────────────────────────────────────────────────────
    const totalExpenses = expenseRows.reduce((sum, r) => sum + Number(r.amount), 0);

    // Breakdown por categoría
    const categoryMap = new Map<string, number>();
    for (const e of expenseRows) {
      const cat = e.category?.name ?? "Sin categoría";
      categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + Number(e.amount));
    }
    const expenseCategories = Array.from(categoryMap.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);

    // ── Costos — proveedores ──────────────────────────────────────────────────
    const totalSupplierPayments = supplierPaymentRows.reduce((sum, r) => sum + Number(r.amount), 0);
    const supplierMap = new Map<string, number>();
    for (const p of supplierPaymentRows) {
      const name = p.supplier.name;
      supplierMap.set(name, (supplierMap.get(name) ?? 0) + Number(p.amount));
    }
    const supplierPayments = Array.from(supplierMap.entries())
      .map(([supplier, amount]) => ({ supplier, amount }))
      .sort((a, b) => b.amount - a.amount);

    // ── Costos — sueldos ──────────────────────────────────────────────────────
    const employeeMap = new Map(employees.map((e) => [e.id, e]));
    const salaryMap = new Map<string, { name: string; hours: number; amount: number }>();

    for (const log of timeLogs) {
      const emp = employeeMap.get(log.employeeId);
      if (!emp) continue;
      const rate = Number(emp.hourlyRate);
      if (rate === 0) continue;
      const hours = Number(log.duration ?? 0);
      const existing = salaryMap.get(log.employeeId);
      if (existing) {
        existing.hours += hours;
        existing.amount += hours * rate;
      } else {
        salaryMap.set(log.employeeId, {
          name: `${emp.firstName} ${emp.lastName}`,
          hours,
          amount: hours * rate,
        });
      }
    }
    const salaries = Array.from(salaryMap.values()).sort((a, b) => b.amount - a.amount);
    const totalSalaries = salaries.reduce((sum, s) => sum + s.amount, 0);

    // ── Costos — mercadería (COGS) ────────────────────────────────────────────
    const cogs = saleItems.reduce(
      (sum, i) => sum + Number(i.quantity) * Number(i.product.costPrice),
      0
    );

    // ── Totales ───────────────────────────────────────────────────────────────
    const totalCostos = totalExpenses + totalSupplierPayments + totalSalaries + cogs;
    const resultado = totalIngresos - totalCostos;

    // ── Breakdown pagos por método ─────────────────────────────────────────────
    const paymentMethods = salePayments
      .map((p) => ({ method: p.paymentMethod, amount: Number(p._sum.amount ?? 0) }))
      .sort((a, b) => b.amount - a.amount);

    return NextResponse.json({
      ingresos: { totalSales, totalOtherIncome, total: totalIngresos },
      costos: { totalExpenses, totalSupplierPayments, totalSalaries, cogs, total: totalCostos },
      resultado,
      breakdowns: { paymentMethods, expenseCategories, salaries, supplierPayments },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al calcular resultados", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
