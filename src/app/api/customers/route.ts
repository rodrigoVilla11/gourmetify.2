import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CreateCustomerSchema } from "@/lib/validators";
import { requireOrg, requireFeature } from "@/lib/requireOrg";

export async function GET(req: NextRequest) {  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }

  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get("phone");
    const q     = searchParams.get("q");

    if (phone) {
      // Search by exact phone first, then startsWith
      const exact = await prisma.customer.findFirst({
        where: { phone, organizationId: orgId },
        include: { _count: { select: { sales: true } } },
      });
      if (exact) return NextResponse.json(exact);

      const partial = await prisma.customer.findFirst({
        where: { organizationId: orgId, phone: { startsWith: phone } },
        include: { _count: { select: { sales: true } } },
      });
      return NextResponse.json(partial ?? null);
    }

    const customers = await prisma.customer.findMany({
      where: q
        ? {
            organizationId: orgId,
            OR: [
              { name:  { contains: q, mode: "insensitive" } },
              { phone: { contains: q } },
            ],
          }
        : { organizationId: orgId },
      include: { _count: { select: { sales: true } } },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(customers);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al obtener clientes", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }
  try { requireFeature(req, "clientes"); } catch (e) { return e as Response; }

  try {
    const body = await req.json();
    const parsed = CreateCustomerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    const data = { ...parsed.data, email: parsed.data.email || null, organizationId: orgId };
    const customer = await prisma.customer.create({
      data,
      include: { _count: { select: { sales: true } } },
    });
    return NextResponse.json(customer, { status: 201 });
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Ya existe un cliente con ese teléfono" }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ error: "Error al crear cliente", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
