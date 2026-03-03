import { prisma } from "@/lib/prisma";

export interface CajaSummary {
  incomeByPaymentMethod: { method: string; total: number }[];
  expensesByCategory: { categoryId: string | null; category: string; color: string; total: number }[];
  supplierPaymentsTotal: number;
  totalSales: number;
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  openingBalance?: number;
}

export interface CajaDiariaSummary {
  incomeByPaymentMethod: { method: string; total: number }[];
  expensesByCategory: { categoryId: string | null; category: string; color: string; total: number }[];
  totalSales: number;
  totalExpenses: number;
  netBalance: number;
  openingBalance: number;
}

// ── Caja del día (session-isolated) ──────────────────────────────────────────
// Income = SalePayments only for the session window.
// Expenses = only expenses linked to this session.
// No IncomeEntries, no SupplierPayments.
export async function buildCajaDiariaSummary(session: {
  id: string;
  openedAt: Date;
  closedAt: Date | null;
  openingBalance: number | string;
}): Promise<CajaDiariaSummary> {
  const dateFilter = {
    gte: session.openedAt,
    lte: session.closedAt ?? new Date(),
  };

  const [salePayments, expenses] = await Promise.all([
    prisma.salePayment.findMany({
      where: { sale: { date: dateFilter } },
      select: { paymentMethod: true, amount: true },
    }),
    prisma.expense.findMany({
      where: { cashSessionId: session.id },
      select: {
        amount: true,
        categoryId: true,
        category: { select: { name: true, color: true } },
      },
    }),
  ]);

  // Group income by payment method
  const methodMap = new Map<string, number>();
  for (const p of salePayments) {
    methodMap.set(p.paymentMethod, (methodMap.get(p.paymentMethod) ?? 0) + Number(p.amount));
  }
  const incomeByPaymentMethod = Array.from(methodMap.entries())
    .map(([method, total]) => ({ method, total: Math.round(total * 100) / 100 }))
    .sort((a, b) => b.total - a.total);

  // Group expenses by category
  const catMap = new Map<string, { categoryId: string | null; category: string; color: string; total: number }>();
  for (const e of expenses) {
    const key = e.categoryId ?? "__none__";
    const existing = catMap.get(key);
    if (existing) {
      existing.total += Number(e.amount);
    } else {
      catMap.set(key, {
        categoryId: e.categoryId,
        category: e.category?.name ?? "Sin categoría",
        color: e.category?.color ?? "#6B7280",
        total: Number(e.amount),
      });
    }
  }

  const expensesByCategory = Array.from(catMap.values())
    .map((c) => ({ ...c, total: Math.round(c.total * 100) / 100 }))
    .sort((a, b) => b.total - a.total);

  const totalSales = Math.round(
    salePayments.reduce((s, p) => s + Number(p.amount), 0) * 100
  ) / 100;
  const totalExpenses = Math.round(
    expenses.reduce((s, e) => s + Number(e.amount), 0) * 100
  ) / 100;
  const netBalance = Math.round((totalSales - totalExpenses) * 100) / 100;

  return {
    incomeByPaymentMethod,
    expensesByCategory,
    totalSales,
    totalExpenses,
    netBalance,
    openingBalance: Number(session.openingBalance),
  };
}

// ── Caja general (period-based) ───────────────────────────────────────────────
// Expenses linked to an OPEN session are excluded while the session is active.
// Once the session closes they appear here automatically.
export async function buildCajaSummary(from: Date, to: Date, openingBalance?: number): Promise<CajaSummary> {
  const dateFilter = { gte: from, lte: to };

  // Fetch open session IDs to exclude their expenses from the general view
  const [salePayments, incomeEntries, allExpenses, saleTotals, supplierPayments, openSessions] =
    await Promise.all([
      prisma.salePayment.findMany({
        where: { sale: { date: dateFilter } },
        select: { paymentMethod: true, amount: true },
      }),
      prisma.incomeEntry.findMany({
        where: { date: dateFilter },
        select: { paymentMethod: true, amount: true },
      }),
      prisma.expense.findMany({
        where: { date: dateFilter },
        select: {
          amount: true,
          categoryId: true,
          cashSessionId: true,
          category: { select: { name: true, color: true } },
        },
      }),
      prisma.sale.aggregate({
        where: { date: dateFilter },
        _sum: { total: true },
      }),
      prisma.supplierPayment.findMany({
        where: { date: dateFilter },
        select: { amount: true },
      }),
      prisma.cashSession.findMany({
        where: { closedAt: null },
        select: { id: true },
      }),
    ]);

  // Exclude expenses belonging to still-open sessions
  const openSessionIds = new Set(openSessions.map((s) => s.id));
  const expenses = allExpenses.filter(
    (e) => !e.cashSessionId || !openSessionIds.has(e.cashSessionId)
  );

  // Group income by payment method (sale payments + income entries)
  const methodMap = new Map<string, number>();
  for (const p of salePayments) {
    methodMap.set(p.paymentMethod, (methodMap.get(p.paymentMethod) ?? 0) + Number(p.amount));
  }
  for (const e of incomeEntries) {
    methodMap.set(e.paymentMethod, (methodMap.get(e.paymentMethod) ?? 0) + Number(e.amount));
  }
  const incomeByPaymentMethod = Array.from(methodMap.entries())
    .map(([method, total]) => ({ method, total: Math.round(total * 100) / 100 }))
    .sort((a, b) => b.total - a.total);

  // Group expenses by category
  const catMap = new Map<string, { categoryId: string | null; category: string; color: string; total: number }>();
  for (const e of expenses) {
    const key = e.categoryId ?? "__none__";
    const existing = catMap.get(key);
    if (existing) {
      existing.total += Number(e.amount);
    } else {
      catMap.set(key, {
        categoryId: e.categoryId,
        category: e.category?.name ?? "Sin categoría",
        color: e.category?.color ?? "#6B7280",
        total: Number(e.amount),
      });
    }
  }

  const supplierPaymentsTotal = Math.round(
    supplierPayments.reduce((s, p) => s + Number(p.amount), 0) * 100
  ) / 100;

  if (supplierPaymentsTotal > 0) {
    catMap.set("__suppliers__", {
      categoryId: null,
      category: "Pagos a proveedores",
      color: "#7C3AED",
      total: supplierPaymentsTotal,
    });
  }

  const expensesByCategory = Array.from(catMap.values())
    .map((c) => ({ ...c, total: Math.round(c.total * 100) / 100 }))
    .sort((a, b) => b.total - a.total);

  const totalSales = Math.round((Number(saleTotals._sum.total) ?? 0) * 100) / 100;
  const totalIncome = Math.round(incomeEntries.reduce((s, e) => s + Number(e.amount), 0) * 100) / 100;
  const totalExpenses = Math.round(
    (expenses.reduce((s, e) => s + Number(e.amount), 0) + supplierPaymentsTotal) * 100
  ) / 100;
  const netBalance = Math.round((totalSales + totalIncome - totalExpenses) * 100) / 100;

  return {
    incomeByPaymentMethod,
    expensesByCategory,
    supplierPaymentsTotal,
    totalSales,
    totalIncome,
    totalExpenses,
    netBalance,
    ...(openingBalance !== undefined ? { openingBalance } : {}),
  };
}
