export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CreateDiscountSchema } from "@/lib/validators";
import { ZodError } from "zod";
import { requireOrg } from "@/lib/requireOrg";

export async function GET(req: NextRequest) {
  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }
  try {
    const { searchParams } = new URL(req.url);
    const active = searchParams.get("active");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = { organizationId: orgId };
    if (active === "true")  where.isActive = true;
    if (active === "false") where.isActive = false;
    if (search) where.name = { contains: search, mode: "insensitive" };

    const discounts = await prisma.discount.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
    return NextResponse.json(discounts);
  } catch {
    return NextResponse.json({ error: "Error al obtener descuentos" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }
  try {
    const body = await req.json();
    const data = CreateDiscountSchema.parse(body);
    const discount = await prisma.discount.create({
      data: {
        organizationId: orgId,
        name:           data.name,
        description:    data.description ?? null,
        isActive:       data.isActive,
        discountType:   data.discountType,
        value:          data.value,
        priority:       data.priority,
        label:          data.label ?? null,
        dateFrom:       data.dateFrom ? new Date(data.dateFrom) : null,
        dateTo:         data.dateTo   ? new Date(data.dateTo)   : null,
        timeFrom:       data.timeFrom ?? null,
        timeTo:         data.timeTo   ?? null,
        weekdays:       data.weekdays ?? undefined,
        appliesTo:      data.appliesTo,
        productIds:     data.productIds ?? undefined,
        categoryIds:    data.categoryIds ?? undefined,
        paymentMethods: data.paymentMethods ?? undefined,
        sortOrder:      data.sortOrder,
      },
    });
    return NextResponse.json(discount, { status: 201 });
  } catch (e) {
    if (e instanceof ZodError) return NextResponse.json({ error: e.issues[0].message }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "Error al crear descuento" }, { status: 500 });
  }
}
