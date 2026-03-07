export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOrg } from "@/lib/requireOrg";
import { z, ZodError } from "zod";

const UpdateZoneSchema = z.object({
  name:      z.string().min(1).max(100).optional(),
  price:     z.coerce.number().min(0).optional(),
  zoneType:  z.enum(["radius", "polygon"]).optional(),
  radiusKm:  z.coerce.number().min(0.1).optional().nullable(),
  polygon:   z.array(z.object({ lat: z.number(), lng: z.number() })).optional().nullable(),
  color:     z.string().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }

  const zone = await prisma.deliveryZone.findUnique({ where: { id: params.id } });
  if (!zone || zone.organizationId !== orgId) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const data = UpdateZoneSchema.parse(body);

    const updateData: Prisma.DeliveryZoneUpdateInput = {
      ...(data.name      !== undefined ? { name:      data.name }      : {}),
      ...(data.price     !== undefined ? { price:     data.price }     : {}),
      ...(data.zoneType  !== undefined ? { zoneType:  data.zoneType }  : {}),
      ...(data.radiusKm  !== undefined ? { radiusKm:  data.radiusKm }  : {}),
      ...(data.polygon   !== undefined ? { polygon:   data.polygon === null ? Prisma.JsonNull : data.polygon } : {}),
      ...(data.color     !== undefined ? { color:     data.color }     : {}),
      ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
    };

    const updated = await prisma.deliveryZone.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: e.issues[0].message, code: "VALIDATION_ERROR" }, { status: 400 });
    }
    return NextResponse.json({ error: "Error interno", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }

  const zone = await prisma.deliveryZone.findUnique({ where: { id: params.id } });
  if (!zone || zone.organizationId !== orgId) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  await prisma.deliveryZone.update({ where: { id: params.id }, data: { isActive: false } });

  return NextResponse.json({ ok: true });
}
