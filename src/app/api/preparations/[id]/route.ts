import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UpdatePreparationSchema } from "@/lib/validators";
import { ZodError } from "zod";

type Params = { params: { id: string } };

export async function GET(_: NextRequest, { params }: Params) {
  try {
    const preparation = await prisma.preparation.findUnique({
      where: { id: params.id },
      include: {
        ingredients: {
          include: { ingredient: { select: { id: true, name: true, unit: true } } },
        },
        movements: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    });
    if (!preparation) {
      return NextResponse.json({ error: "Preparación no encontrada", code: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json(preparation);
  } catch {
    return NextResponse.json({ error: "Error interno", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const body = await req.json();
    const { ingredients, ...prepData } = UpdatePreparationSchema.parse(body);

    const preparation = await prisma.$transaction(async (tx) => {
      if (ingredients !== undefined) {
        await tx.preparationIngredient.deleteMany({ where: { preparationId: params.id } });
      }

      const updated = await tx.preparation.update({
        where: { id: params.id },
        data: {
          ...prepData,
          ...(ingredients !== undefined
            ? {
                ingredients: {
                  create: ingredients.map((item) => ({
                    ingredientId: item.ingredientId,
                    qty: item.qty,
                    unit: item.unit,
                    wastagePct: item.wastagePct ?? 0,
                  })),
                },
              }
            : {}),
        },
        include: {
          ingredients: {
            include: { ingredient: { select: { id: true, name: true, unit: true } } },
          },
        },
      });
      return updated;
    });

    return NextResponse.json(preparation);
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: e.issues[0].message, code: "VALIDATION_ERROR" }, { status: 400 });
    }
    return NextResponse.json({ error: "Error al actualizar preparación", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: Params) {
  try {
    await prisma.preparation.update({
      where: { id: params.id },
      data: { isActive: false },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Error al desactivar preparación", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
