export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UpdateDiscountSchema } from "@/lib/validators";
import { ZodError } from "zod";
import { requireOrg, requireRole } from "@/lib/requireOrg";

type Params = { params: { id: string } };

export async function GET(req: NextRequest, { params }: Params) {
  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }
  const discount = await prisma.discount.findFirst({ where: { id: params.id, organizationId: orgId } });
  if (!discount) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json(discount);
}

export async function PUT(req: NextRequest, { params }: Params) {
  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }
  try { requireRole(req, ["ADMIN", "ENCARGADO"]); } catch (e) { return e as Response; }
  try {
    const body = await req.json();
    const data = UpdateDiscountSchema.parse(body);
    const discount = await prisma.discount.updateMany({
      where: { id: params.id, organizationId: orgId },
      data: {
        ...(data.name          !== undefined ? { name:          data.name }          : {}),
        ...(data.description   !== undefined ? { description:   data.description }   : {}),
        ...(data.isActive      !== undefined ? { isActive:      data.isActive }      : {}),
        ...(data.discountType  !== undefined ? { discountType:  data.discountType }  : {}),
        ...(data.value         !== undefined ? { value:         data.value }         : {}),
        ...(data.priority      !== undefined ? { priority:      data.priority }      : {}),
        ...(data.label         !== undefined ? { label:         data.label }         : {}),
        ...(data.dateFrom      !== undefined ? { dateFrom:      data.dateFrom ? new Date(data.dateFrom) : null } : {}),
        ...(data.dateTo        !== undefined ? { dateTo:        data.dateTo   ? new Date(data.dateTo)   : null } : {}),
        ...(data.timeFrom      !== undefined ? { timeFrom:      data.timeFrom }      : {}),
        ...(data.timeTo        !== undefined ? { timeTo:        data.timeTo }        : {}),
        ...(data.weekdays      !== undefined ? { weekdays:      data.weekdays ?? undefined } : {}),
        ...(data.appliesTo     !== undefined ? { appliesTo:     data.appliesTo }     : {}),
        ...(data.productIds    !== undefined ? { productIds:    data.productIds ?? undefined } : {}),
        ...(data.categoryIds   !== undefined ? { categoryIds:   data.categoryIds ?? undefined } : {}),
        ...(data.paymentMethods !== undefined ? { paymentMethods: data.paymentMethods ?? undefined } : {}),
        ...(data.sortOrder     !== undefined ? { sortOrder:     data.sortOrder }     : {}),
      },
    });
    if (discount.count === 0) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof ZodError) return NextResponse.json({ error: e.issues[0].message }, { status: 400 });
    return NextResponse.json({ error: "Error al actualizar descuento" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }
  try { requireRole(req, ["ADMIN", "ENCARGADO"]); } catch (e) { return e as Response; }
  const result = await prisma.discount.deleteMany({ where: { id: params.id, organizationId: orgId } });
  if (result.count === 0) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
