export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOrg } from "@/lib/requireOrg";
import { z, ZodError } from "zod";

const CreateZoneSchema = z.object({
  name:      z.string().min(1).max(100),
  price:     z.coerce.number().min(0),
  zoneType:  z.enum(["radius", "polygon"]),
  radiusKm:  z.coerce.number().min(0.1).optional().nullable(),
  polygon:   z.array(z.object({ lat: z.number(), lng: z.number() })).optional().nullable(),
  color:     z.string().default("#3B82F6"),
  sortOrder: z.coerce.number().int().default(0),
});

export async function GET(req: NextRequest) {
  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }

  const zones = await prisma.deliveryZone.findMany({
    where: { organizationId: orgId, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json(zones);
}

export async function POST(req: NextRequest) {
  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }

  try {
    const body = await req.json();
    const data = CreateZoneSchema.parse(body);

    const zone = await prisma.deliveryZone.create({
      data: {
        organizationId: orgId,
        name:      data.name,
        price:     data.price,
        zoneType:  data.zoneType,
        radiusKm:  data.radiusKm ?? null,
        polygon:   data.polygon ? data.polygon : Prisma.JsonNull,
        color:     data.color,
        sortOrder: data.sortOrder,
      },
    });

    return NextResponse.json(zone, { status: 201 });
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: e.issues[0].message, code: "VALIDATION_ERROR" }, { status: 400 });
    }
    return NextResponse.json({ error: "Error interno", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
