export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg } from "@/lib/requireOrg";
import { z, ZodError } from "zod";

const CreateRepartidorSchema = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().max(30).optional().nullable(),
});

export async function GET(req: NextRequest) {
  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }

  const { searchParams } = new URL(req.url);
  const includeInactive = searchParams.get("includeInactive") === "true";

  const all = await prisma.repartidor.findMany({
    where: { organizationId: orgId, ...(includeInactive ? {} : { isActive: true }) },
    select: { id: true, name: true, phone: true, isActive: true, createdAt: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(all);
}

export async function POST(req: NextRequest) {
  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }

  try {
    const body = await req.json();
    const { name, phone } = CreateRepartidorSchema.parse(body);

    const rep = await prisma.repartidor.create({
      data: { name, phone: phone ?? null, organizationId: orgId },
      select: { id: true, name: true, phone: true, isActive: true },
    });

    return NextResponse.json(rep, { status: 201 });
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: e.issues[0].message, code: "VALIDATION_ERROR" }, { status: 400 });
    }
    return NextResponse.json({ error: "Error interno", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
