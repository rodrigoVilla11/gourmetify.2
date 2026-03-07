export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg } from "@/lib/requireOrg";

type Params = { params: { id: string } };

function calcInvoiceStatus(totalPaid: number, invoiceAmount: number): string {
  if (totalPaid >= invoiceAmount) return "PAID";
  if (totalPaid > 0) return "PARTIAL";
  return "PENDING";
}

export async function DELETE(req: NextRequest, { params }: Params) {
  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }
  try {
    await prisma.$transaction(async (tx) => {
      const payment = await tx.supplierPayment.findUnique({ where: { id: params.id, organizationId: orgId } });
      if (!payment) return;

      await tx.supplierPayment.delete({ where: { id: params.id, organizationId: orgId } });

      if (payment.invoiceId) {
        const invoice = await tx.supplierInvoice.findUnique({
          where: { id: payment.invoiceId, organizationId: orgId },
          include: { supplierPayments: true },
        });
        if (invoice) {
          const totalPaid = invoice.supplierPayments
            .filter((p) => p.id !== params.id)
            .reduce((s, p) => s + Number(p.amount), 0);
          await tx.supplierInvoice.update({
            where: { id: payment.invoiceId },
            data: { status: calcInvoiceStatus(totalPaid, Number(invoice.amount)) },
          });
        }
      }
    });

    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Error al eliminar pago", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
