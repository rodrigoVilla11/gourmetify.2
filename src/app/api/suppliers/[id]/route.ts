export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UpdateSupplierSchema } from "@/lib/validators";
import { ZodError } from "zod";
import { requireOrg } from "@/lib/requireOrg";

type Params = { params: { id: string } };

export async function GET(req: NextRequest, { params }: Params) {
  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }

  try {
    const supplier = await prisma.supplier.findUnique({
      where: { id: params.id, organizationId: orgId },
      include: {
        ingredients: { where: { isActive: true }, orderBy: { name: "asc" } },
        invoices: { orderBy: { date: "desc" } },
        supplierPayments: { orderBy: { date: "desc" } },
      },
    });
    if (!supplier) {
      return NextResponse.json({ error: "Proveedor no encontrado", code: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json(supplier);
  } catch {
    return NextResponse.json({ error: "Error interno", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }

  try {
    const body = await req.json();
    const data = UpdateSupplierSchema.parse(body);
    const supplier = await prisma.supplier.update({
      where: { id: params.id, organizationId: orgId },
      data,
    });
    return NextResponse.json(supplier);
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: e.issues[0].message, code: "VALIDATION_ERROR" }, { status: 400 });
    }
    return NextResponse.json({ error: "Error al actualizar proveedor", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }

  try {
    // Disassociate ingredients before deleting
    await prisma.ingredient.updateMany({
      where: { supplierId: params.id, organizationId: orgId },
      data: { supplierId: null },
    });
    await prisma.supplier.delete({ where: { id: params.id, organizationId: orgId } });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Error al eliminar proveedor", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
