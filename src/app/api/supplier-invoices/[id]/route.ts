import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UpdateSupplierInvoiceSchema } from "@/lib/validators";
import { ZodError } from "zod";
import { requireOrg } from "@/lib/requireOrg";

type Params = { params: { id: string } };

export async function GET(req: NextRequest, { params }: Params) {
  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }
  try {
    const invoice = await prisma.supplierInvoice.findUnique({
      where: { id: params.id, organizationId: orgId },
      include: {
        supplier: true,
        supplierPayments: { orderBy: { date: "asc" } },
      },
    });
    if (!invoice) return NextResponse.json({ error: "Factura no encontrada", code: "NOT_FOUND" }, { status: 404 });
    return NextResponse.json(invoice);
  } catch {
    return NextResponse.json({ error: "Error interno", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }

  try {
    const body = await req.json();
    const data = UpdateSupplierInvoiceSchema.parse(body);
    const invoice = await prisma.supplierInvoice.update({
      where: { id: params.id, organizationId: orgId },
      data: {
        ...data,
        date: data.date ? new Date(data.date) : undefined,
        dueDate: data.dueDate ? new Date(data.dueDate) : data.dueDate === null ? null : undefined,
      },
      include: { supplier: { select: { id: true, name: true } } },
    });
    return NextResponse.json(invoice);
  } catch (e) {
    if (e instanceof ZodError) return NextResponse.json({ error: e.issues[0].message, code: "VALIDATION_ERROR" }, { status: 400 });
    return NextResponse.json({ error: "Error al actualizar factura", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
