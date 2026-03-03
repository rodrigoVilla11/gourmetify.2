import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: { name: "asc" },
      include: {
        invoices: {
          select: { id: true, amount: true, status: true, invoiceNumber: true, date: true, dueDate: true },
          orderBy: { date: "desc" },
        },
        supplierPayments: {
          select: { amount: true },
        },
      },
    });

    const result = suppliers.map((s) => {
      const totalInvoiced = s.invoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
      const totalPaid = s.supplierPayments.reduce((sum, p) => sum + Number(p.amount), 0);
      const balance = totalInvoiced - totalPaid;
      const pendingInvoices = s.invoices.filter((inv) => inv.status !== "PAID");

      return {
        id: s.id,
        name: s.name,
        phone: s.phone,
        paymentTerms: s.paymentTerms,
        creditDays: s.creditDays,
        totalInvoiced: Math.round(totalInvoiced * 100) / 100,
        totalPaid: Math.round(totalPaid * 100) / 100,
        balance: Math.round(balance * 100) / 100,
        pendingInvoices: pendingInvoices.map((inv) => ({
          id: inv.id,
          amount: Number(inv.amount),
          status: inv.status,
          invoiceNumber: inv.invoiceNumber,
          date: inv.date,
          dueDate: inv.dueDate,
        })),
      };
    });

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Error al obtener cuentas corrientes", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
