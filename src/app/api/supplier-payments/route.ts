import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CreateSupplierPaymentSchema } from "@/lib/validators";
import { ZodError } from "zod";

function calcInvoiceStatus(totalPaid: number, invoiceAmount: number): string {
  if (totalPaid >= invoiceAmount) return "PAID";
  if (totalPaid > 0) return "PARTIAL";
  return "PENDING";
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const supplierId = searchParams.get("supplierId");
    const invoiceId = searchParams.get("invoiceId");

    const where = {
      ...(supplierId ? { supplierId } : {}),
      ...(invoiceId ? { invoiceId } : {}),
    };

    const payments = await prisma.supplierPayment.findMany({
      where,
      orderBy: { date: "desc" },
    });

    return NextResponse.json(payments);
  } catch {
    return NextResponse.json({ error: "Error al obtener pagos", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = CreateSupplierPaymentSchema.parse(body);

    const result = await prisma.$transaction(async (tx) => {
      const paymentDate = data.date ? new Date(data.date) : new Date();
      const paymentBase = {
        supplierId: data.supplierId,
        currency: data.currency,
        date: paymentDate,
        paymentMethod: data.paymentMethod,
        notes: data.notes ?? null,
      };

      // ── Case A: specific invoice provided — simple single payment ─────────────
      if (data.invoiceId) {
        const newPayment = await tx.supplierPayment.create({
          data: { ...paymentBase, invoiceId: data.invoiceId, amount: data.amount },
        });

        const invoice = await tx.supplierInvoice.findUnique({
          where: { id: data.invoiceId },
          include: { supplierPayments: { select: { amount: true } } },
        });
        if (invoice) {
          const totalPaid =
            invoice.supplierPayments.reduce((s, p) => s + Number(p.amount), 0) + data.amount;
          await tx.supplierInvoice.update({
            where: { id: data.invoiceId },
            data: { status: calcInvoiceStatus(totalPaid, Number(invoice.amount)) },
          });
        }
        return { payments: [newPayment], autoAllocated: false };
      }

      // ── Case B: no invoice — FIFO auto-allocation across oldest invoices ──────
      // Load all unpaid/partial invoices for this supplier, oldest first
      const openInvoices = await tx.supplierInvoice.findMany({
        where: { supplierId: data.supplierId, status: { in: ["PENDING", "PARTIAL"] } },
        include: { supplierPayments: { select: { amount: true } } },
        orderBy: { date: "asc" },
      });

      if (openInvoices.length === 0) {
        // No open invoices — create a free payment with no invoice link
        const newPayment = await tx.supplierPayment.create({
          data: { ...paymentBase, invoiceId: null, amount: data.amount },
        });
        return { payments: [newPayment], autoAllocated: false };
      }

      let remaining = data.amount;
      const createdPayments = [];

      for (const invoice of openInvoices) {
        if (remaining <= 0.001) break;

        const alreadyPaid = invoice.supplierPayments.reduce((s, p) => s + Number(p.amount), 0);
        const owed = Number(invoice.amount) - alreadyPaid;

        if (owed <= 0.001) continue; // already fully covered, skip

        const apply = Math.min(remaining, owed);
        remaining = Math.round((remaining - apply) * 100) / 100;

        const p = await tx.supplierPayment.create({
          data: { ...paymentBase, invoiceId: invoice.id, amount: apply },
        });
        createdPayments.push(p);

        const newTotalPaid = alreadyPaid + apply;
        await tx.supplierInvoice.update({
          where: { id: invoice.id },
          data: { status: calcInvoiceStatus(newTotalPaid, Number(invoice.amount)) },
        });
      }

      // If there's leftover amount after covering all open invoices
      if (remaining > 0.001) {
        const p = await tx.supplierPayment.create({
          data: { ...paymentBase, invoiceId: null, amount: remaining },
        });
        createdPayments.push(p);
      }

      return { payments: createdPayments, autoAllocated: true };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    if (e instanceof ZodError) return NextResponse.json({ error: e.issues[0].message, code: "VALIDATION_ERROR" }, { status: 400 });
    return NextResponse.json({ error: "Error al registrar pago", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
