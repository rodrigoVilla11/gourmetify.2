import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UpdateProductSchema } from "@/lib/validators";
import { ZodError } from "zod";

type Params = { params: { id: string } };

const PRODUCT_INCLUDE = {
  ingredients: { include: { ingredient: { select: { id: true, name: true, unit: true } } } },
  preparations: { include: { preparation: { select: { id: true, name: true, unit: true } } } },
};

export async function GET(_: NextRequest, { params }: Params) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: PRODUCT_INCLUDE,
    });
    if (!product) {
      return NextResponse.json({ error: "Producto no encontrado", code: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json(product);
  } catch {
    return NextResponse.json({ error: "Error interno", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const body = await req.json();
    const { ingredients, preparations, ...productData } = UpdateProductSchema.parse(body);

    const product = await prisma.$transaction(async (tx) => {
      if (ingredients !== undefined) {
        await tx.productIngredient.deleteMany({ where: { productId: params.id } });
      }
      if (preparations !== undefined) {
        await tx.productPreparation.deleteMany({ where: { productId: params.id } });
      }

      const updated = await tx.product.update({
        where: { id: params.id },
        data: {
          ...productData,
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
          ...(preparations !== undefined
            ? {
                preparations: {
                  create: preparations.map((item) => ({
                    preparationId: item.preparationId,
                    qty: item.qty,
                    unit: item.unit,
                    wastagePct: item.wastagePct ?? 0,
                  })),
                },
              }
            : {}),
        },
        include: PRODUCT_INCLUDE,
      });
      return updated;
    });

    return NextResponse.json(product);
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: e.issues[0].message, code: "VALIDATION_ERROR" }, { status: 400 });
    }
    return NextResponse.json({ error: "Error al actualizar producto", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: Params) {
  try {
    await prisma.product.update({
      where: { id: params.id },
      data: { isActive: false },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Error al eliminar producto", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
