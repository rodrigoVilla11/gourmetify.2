import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg } from "@/lib/requireOrg";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; invoiceId: string } }
) {
  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }

  // Verify order belongs to org
  const order = await prisma.purchaseOrder.findFirst({
    where: { id: params.id, organizationId: orgId },
    select: { id: true },
  });
  if (!order) return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });

  const invoice = await prisma.purchaseOrderInvoice.findFirst({
    where: { id: params.invoiceId, purchaseOrderId: params.id },
  });
  if (!invoice) return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 });

  await prisma.purchaseOrderInvoice.delete({ where: { id: params.invoiceId } });
  return NextResponse.json({ ok: true });
}
