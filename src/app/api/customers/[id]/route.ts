import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UpdateCustomerSchema } from "@/lib/validators";
import { requireOrg } from "@/lib/requireOrg";

type Params = { params: { id: string } };

export async function GET(req: NextRequest, { params }: Params) {
  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }

  try {
    const customer = await prisma.customer.findUnique({
      where: { id: params.id, organizationId: orgId },
      include: {
        _count: { select: { sales: true } },
        sales: {
          select: {
            id: true,
            date: true,
            total: true,
            customerName: true,
            payments: { select: { paymentMethod: true, amount: true } },
          },
          orderBy: { date: "desc" },
          take: 20,
        },
      },
    });
    if (!customer) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    }
    return NextResponse.json(customer);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error interno", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }

  try {
    const body = await req.json();
    const parsed = UpdateCustomerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    const data = { ...parsed.data, email: parsed.data.email === "" ? null : parsed.data.email };
    const customer = await prisma.customer.update({
      where: { id: params.id, organizationId: orgId },
      data,
    });
    return NextResponse.json(customer);
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Ya existe un cliente con ese teléfono" }, { status: 409 });
    }
    if ((e as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    }
    console.error(e);
    return NextResponse.json({ error: "Error al actualizar cliente", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }

  try {
    await prisma.customer.delete({ where: { id: params.id, organizationId: orgId } });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    }
    console.error(e);
    return NextResponse.json({ error: "Error al eliminar cliente", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
