export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CreateSupplierInvoiceSchema } from "@/lib/validators";
import { ZodError } from "zod";
import { requireOrg, requireFeature } from "@/lib/requireOrg";

export async function GET(req: NextRequest) {  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }

  try {
    const { searchParams } = new URL(req.url);
    const supplierId = searchParams.get("supplierId");
    const status = searchParams.get("status");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "50"));
    const skip = (page - 1) * limit;

    const where = {
      organizationId: orgId,
      ...(supplierId ? { supplierId } : {}),
      ...(status ? { status } : {}),
    };

    const [total, data] = await prisma.$transaction([
      prisma.supplierInvoice.count({ where }),
      prisma.supplierInvoice.findMany({
        where,
        include: { supplier: { select: { id: true, name: true } }, supplierPayments: true },
        orderBy: { date: "desc" },
        skip,
        take: limit,
      }),
    ]);

    return NextResponse.json({ data, meta: { total, page, limit } });
  } catch {
    return NextResponse.json({ error: "Error al obtener facturas", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }
  try { requireFeature(req, "financial"); } catch (e) { return e as Response; }

  try {
    const body = await req.json();
    const data = CreateSupplierInvoiceSchema.parse(body);

    const invoice = await prisma.supplierInvoice.create({
      data: {
        organizationId: orgId,
        supplierId: data.supplierId,
        amount: data.amount,
        currency: data.currency,
        date: data.date ? new Date(data.date) : new Date(),
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        invoiceNumber: data.invoiceNumber ?? null,
        imageUrl: data.imageUrl ?? null,
        notes: data.notes ?? null,
      },
      include: { supplier: { select: { id: true, name: true } } },
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (e) {
    if (e instanceof ZodError) return NextResponse.json({ error: e.issues[0].message, code: "VALIDATION_ERROR" }, { status: 400 });
    return NextResponse.json({ error: "Error al crear factura", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
