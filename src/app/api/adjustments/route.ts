import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { CreateAdjustmentSchema } from "@/lib/validators";
import { ZodError } from "zod";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ingredientId, delta, reason } = CreateAdjustmentSchema.parse(body);

    const [movement] = await prisma.$transaction([
      prisma.stockMovement.create({
        data: {
          ingredientId,
          type: "ADJUSTMENT",
          delta,
          reason: reason ?? "Ajuste manual",
        },
        include: { ingredient: true },
      }),
      prisma.ingredient.update({
        where: { id: ingredientId },
        data: { onHand: { increment: delta } },
      }),
    ]);

    revalidateTag("dashboard");
    return NextResponse.json(movement, { status: 201 });
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: e.issues[0].message, code: "VALIDATION_ERROR" }, { status: 400 });
    }
    return NextResponse.json({ error: "Error al registrar ajuste", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ingredientId = searchParams.get("ingredientId");
    const movements = await prisma.stockMovement.findMany({
      where: {
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
