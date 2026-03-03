import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CreatePreparationSchema } from "@/lib/validators";
import { ZodError } from "zod";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const isActive = searchParams.get("isActive");

    const preparations = await prisma.preparation.findMany({
      where: {
        ...(isActive !== null ? { isActive: isActive === "true" } : {}),
      },
      include: {
        ingredients: {
          include: { ingredient: { select: { id: true, name: true, unit: true } } },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ data: preparations });
  } catch {
    return NextResponse.json({ error: "Error al obtener preparaciones", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ingredients, ...prepData } = CreatePreparationSchema.parse(body);

    const preparation = await prisma.$transaction(async (tx) => {
      const created = await tx.preparation.create({
        data: {
          ...prepData,
          ingredients: {
            create: ingredients.map((item) => ({
              ingredientId: item.ingredientId,
              qty: item.qty,
              unit: item.unit,
              wastagePct: item.wastagePct ?? 0,
            })),
          },
        },
        include: {
          ingredients: {
            include: { ingredient: { select: { id: true, name: true, unit: true } } },
          },
        },
      });
      return created;
    });

    return NextResponse.json(preparation, { status: 201 });
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: e.issues[0].message, code: "VALIDATION_ERROR" }, { status: 400 });
    }
    return NextResponse.json({ error: "Error al crear preparación", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
