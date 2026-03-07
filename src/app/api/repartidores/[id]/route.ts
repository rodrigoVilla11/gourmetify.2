export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg } from "@/lib/requireOrg";
import { z, ZodError } from "zod";

type Params = { params: { id: string } };

const UpdateRepartidorSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().max(30).optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function PUT(req: NextRequest, { params }: Params) {
  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }

  try {
    const body = await req.json();
    const data = UpdateRepartidorSchema.parse(body);

    const rep = await prisma.repartidor.update({
      where: { id: params.id, organizationId: orgId },
      data,
      select: { id: true, name: true, phone: true, isActive: true },
    });

    return NextResponse.json(rep);
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: e.issues[0].message, code: "VALIDATION_ERROR" }, { status: 400 });
    }
    return NextResponse.json({ error: "Error interno", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }

  // Soft-delete: set isActive = false
  await prisma.repartidor.update({
    where: { id: params.id, organizationId: orgId },
    data: { isActive: false },
  });

  return NextResponse.json({ ok: true });
}
