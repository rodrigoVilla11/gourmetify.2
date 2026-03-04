import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CreateCustomerSchema } from "@/lib/validators";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get("phone");
    const q     = searchParams.get("q");

    if (phone) {
      // Search by exact phone first, then startsWith
      const exact = await prisma.customer.findUnique({
        where: { phone },
        include: { _count: { select: { sales: true } } },
      });
      if (exact) return NextResponse.json(exact);

      const partial = await prisma.customer.findFirst({
        where: { phone: { startsWith: phone } },
        include: { _count: { select: { sales: true } } },
      });
      return NextResponse.json(partial ?? null);
    }

    const customers = await prisma.customer.findMany({
      where: q
        ? {
            OR: [
              { name:  { contains: q, mode: "insensitive" } },
              { phone: { contains: q } },
            ],
          }
        : undefined,
      include: { _count: { select: { sales: true } } },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(customers);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al obtener clientes", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CreateCustomerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    const data = { ...parsed.data, email: parsed.data.email || null };
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
