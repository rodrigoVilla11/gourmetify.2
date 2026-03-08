export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UpdateExtraSchema } from "@/lib/validators";
import { ZodError } from "zod";
import { requireOrg, requireRole } from "@/lib/requireOrg";

type Params = { params: { id: string } };

export async function GET(req: NextRequest, { params }: Params) {
  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }
  const extra = await prisma.extra.findFirst({
    where: { id: params.id, organizationId: orgId },
    include: { ingredient: { select: { id: true, name: true, unit: true } } },
  });
  if (!extra) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json(extra);
}

export async function PUT(req: NextRequest, { params }: Params) {
  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }
  try { requireRole(req, ["ADMIN", "ENCARGADO"]); } catch (e) { return e as Response; }
  try {
    const body = await req.json();
    const data = UpdateExtraSchema.parse(body);
    const result = await prisma.extra.updateMany({
      where: { id: params.id, organizationId: orgId },
      data: {
        ...(data.name          !== undefined ? { name:          data.name }          : {}),
        ...(data.description   !== undefined ? { description:   data.description }   : {}),
        ...(data.isActive      !== undefined ? { isActive:      data.isActive }      : {}),
        ...(data.price         !== undefined ? { price:         data.price }         : {}),
        ...(data.isFree        !== undefined ? { isFree:        data.isFree }        : {}),
        ...(data.affectsStock  !== undefined ? { affectsStock:  data.affectsStock }  : {}),
        ...(data.ingredientId  !== undefined ? { ingredientId:  data.ingredientId }  : {}),
        ...(data.ingredientQty !== undefined ? { ingredientQty: data.ingredientQty } : {}),
        ...(data.appliesTo     !== undefined ? { appliesTo:     data.appliesTo }     : {}),
        ...(data.productIds    !== undefined ? { productIds:    data.productIds ?? undefined } : {}),
        ...(data.categoryIds   !== undefined ? { categoryIds:   data.categoryIds ?? undefined } : {}),
        ...(data.maxQuantity   !== undefined ? { maxQuantity:   data.maxQuantity }   : {}),
        ...(data.sortOrder     !== undefined ? { sortOrder:     data.sortOrder }     : {}),
      },
    });
    if (result.count === 0) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof ZodError) return NextResponse.json({ error: e.issues[0].message }, { status: 400 });
    return NextResponse.json({ error: "Error al actualizar adicional" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }
  try { requireRole(req, ["ADMIN", "ENCARGADO"]); } catch (e) { return e as Response; }
  const result = await prisma.extra.deleteMany({ where: { id: params.id, organizationId: orgId } });
  if (result.count === 0) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
