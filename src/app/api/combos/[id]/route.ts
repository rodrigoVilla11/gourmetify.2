export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UpdateComboSchema } from "@/lib/validators";
import { ZodError } from "zod";
import { requireOrg } from "@/lib/requireOrg";

type Params = { params: { id: string } };

export async function GET(req: NextRequest, { params }: Params) {
  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }

  try {
    const combo = await prisma.combo.findUnique({
      where: { id: params.id, organizationId: orgId },
      include: {
        products: {
          include: {
            product: {
              select: {
                id: true, name: true, salePrice: true, currency: true,
                ingredients: { include: { ingredient: { select: { id: true, name: true, unit: true } } } },
              },
            },
          },
        },
      },
    });
    if (!combo) {
      return NextResponse.json({ error: "Combo no encontrado", code: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json(combo);
  } catch {
    return NextResponse.json({ error: "Error interno", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }

  try {
    const body = await req.json();
    const { products, ...comboData } = UpdateComboSchema.parse(body);

    const combo = await prisma.$transaction(async (tx) => {
      if (products !== undefined) {
        await tx.comboProduct.deleteMany({ where: { comboId: params.id } });
      }

      const updated = await tx.combo.update({
        where: { id: params.id, organizationId: orgId },
        data: {
          ...comboData,
          sku: comboData.sku === undefined ? undefined : comboData.sku || null,
          ...(products !== undefined
            ? {
                products: {
                  create: products.map((item) => ({
                    productId: item.productId,
                    quantity: item.quantity,
                  })),
                },
              }
            : {}),
        },
        include: {
          products: {
            include: { product: { select: { id: true, name: true, salePrice: true, costPrice: true, currency: true } } },
          },
        },
      });
      return updated;
    });

    return NextResponse.json(combo);
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: e.issues[0].message, code: "VALIDATION_ERROR" }, { status: 400 });
    }
    return NextResponse.json({ error: "Error al actualizar combo", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }

  try {
    await prisma.combo.update({
      where: { id: params.id, organizationId: orgId },
      data: { isActive: false },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Error al desactivar combo", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
