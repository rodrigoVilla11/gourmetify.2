import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AddPurchaseOrderInvoiceSchema } from "@/lib/validators";
import { ZodError } from "zod";
import { requireOrg } from "@/lib/requireOrg";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }

  const order = await prisma.purchaseOrder.findFirst({
    where: { id: params.id, organizationId: orgId },
    select: { id: true },
  });
  if (!order) return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });

  const invoices = await prisma.purchaseOrderInvoice.findMany({
    where: { purchaseOrderId: params.id },
    orderBy: { uploadedAt: "desc" },
  });

  return NextResponse.json(invoices);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }

  try {
    const order = await prisma.purchaseOrder.findFirst({
      where: { id: params.id, organizationId: orgId },
    });
    if (!order) return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });

    const body = await req.json();
    const data = AddPurchaseOrderInvoiceSchema.parse(body);

    const invoice = await prisma.purchaseOrderInvoice.create({
      data: {
        purchaseOrderId: params.id,
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        fileType: data.fileType ?? null,
      },
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (e) {
    if (e instanceof ZodError) return NextResponse.json({ error: e.issues[0].message, code: "VALIDATION_ERROR" }, { status: 400 });
    return NextResponse.json({ error: "Error al adjuntar factura", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
