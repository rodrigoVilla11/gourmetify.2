export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { CreateAdjustmentSchema } from "@/lib/validators";
import { ZodError } from "zod";
import { requireOrg, requireRole } from "@/lib/requireOrg";

export async function POST(req: NextRequest) {  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }
  try { requireRole(req, ["ADMIN", "ENCARGADO"]); } catch (e) { return e as Response; }

  try {
    const body = await req.json();
    const parsed = CreateAdjustmentSchema.parse(body);

    if (parsed.type === "ingredient") {
      const { ingredientId, delta, reason } = parsed;
      await prisma.$transaction([
        prisma.stockMovement.create({
          data: { ingredientId, organizationId: orgId, type: "ADJUSTMENT", delta, reason: reason ?? "Ajuste manual" },
        }),
        prisma.ingredient.update({
          where: { id: ingredientId, organizationId: orgId },
          data: { onHand: { increment: delta } },
        }),
      ]);
    } else {
      const { preparationId, delta, reason } = parsed;
      await prisma.$transaction([
        prisma.preparationMovement.create({
          data: { preparationId, organizationId: orgId, type: "ADJUSTMENT", delta, reason: reason ?? "Ajuste manual" },
        }),
        prisma.preparation.update({
          where: { id: preparationId, organizationId: orgId },
          data: { onHand: { increment: delta } },
        }),
      ]);
    }

    revalidateTag(`dashboard:${orgId}`);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: e.issues[0].message, code: "VALIDATION_ERROR" }, { status: 400 });
    }
    return NextResponse.json({ error: "Error al registrar ajuste", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }

  try {
    const [ingMovements, prepMovements] = await Promise.all([
      prisma.stockMovement.findMany({
        where: { organizationId: orgId, type: "ADJUSTMENT" },
        include: { ingredient: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.preparationMovement.findMany({
        where: { organizationId: orgId, type: "ADJUSTMENT" },
        include: { preparation: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    ]);

    const combined = [
      ...ingMovements.map((m) => ({
        id: m.id,
        kind: "ingredient" as const,
        name: m.ingredient.name,
        unit: m.ingredient.unit,
        delta: m.delta,
        reason: m.reason,
        createdAt: m.createdAt,
      })),
      ...prepMovements.map((m) => ({
        id: m.id,
        kind: "preparation" as const,
        name: m.preparation.name,
        unit: m.preparation.unit,
        delta: m.delta,
        reason: m.reason,
        createdAt: m.createdAt,
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 100);

    return NextResponse.json(combined);
  } catch {
    return NextResponse.json({ error: "Error interno", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
