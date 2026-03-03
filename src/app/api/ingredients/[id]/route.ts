import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UpdateIngredientSchema } from "@/lib/validators";
import { ZodError } from "zod";

type Params = { params: { id: string } };

export async function GET(_: NextRequest, { params }: Params) {
  try {
    const ingredient = await prisma.ingredient.findUnique({
      where: { id: params.id },
      include: {
        supplier: true,
        stockMovements: { orderBy: { createdAt: "desc" }, take: 50 },
      },
    });
    if (!ingredient) {
      return NextResponse.json({ error: "Ingrediente no encontrado", code: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json(ingredient);
  } catch {
    return NextResponse.json({ error: "Error interno", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const body = await req.json();
    const data = UpdateIngredientSchema.parse(body);
    const ingredient = await prisma.ingredient.update({
      where: { id: params.id },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: data as any,
      include: { supplier: true },
    });
    return NextResponse.json(ingredient);
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: e.issues[0].message, code: "VALIDATION_ERROR" }, { status: 400 });
    }
    return NextResponse.json({ error: "Error al actualizar ingrediente", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: Params) {
  try {
    await prisma.ingredient.update({
      where: { id: params.id },
      data: { isActive: false },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Error al eliminar ingrediente", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
