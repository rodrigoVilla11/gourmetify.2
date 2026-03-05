import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { CreateAdjustmentSchema } from "@/lib/validators";
import { ZodError } from "zod";
import { requireOrg } from "@/lib/requireOrg";

export async function POST(req: NextRequest) {  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }

  try {
    const body = await req.json();
    const { ingredientId, delta, reason } = CreateAdjustmentSchema.parse(body);

    const [movement] = await prisma.$transaction([
      prisma.stockMovement.create({
        data: {
          ingredientId,
          organizationId: orgId,
          type: "ADJUSTMENT",
          delta,
          reason: reason ?? "Ajuste manual",
        },
        include: { ingredient: true },
      }),
      prisma.ingredient.update({
        where: { id: ingredientId, organizationId: orgId },
        data: { onHand: { increment: delta } },
      }),
    ]);

    revalidateTag(`dashboard:${orgId}`);
    return NextResponse.json(movement, { status: 201 });
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
    const { searchParams } = new URL(req.url);
    const ingredientId = searchParams.get("ingredientId");
    const movements = await prisma.stockMovement.findMany({
      where: {
        organizationId: orgId,
        type: "ADJUSTMENT",
        ...(ingredientId ? { ingredientId } : {}),
      },
      include: { ingredient: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json(movements);
  } catch {
    return NextResponse.json({ error: "Error interno", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
