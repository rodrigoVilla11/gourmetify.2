export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CreateComboSchema } from "@/lib/validators";
import { ZodError } from "zod";
import { requireOrg, requireFeature } from "@/lib/requireOrg";

export async function GET(req: NextRequest) {  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }

  try {
    const { searchParams } = new URL(req.url);
    const isActive = searchParams.get("isActive");

    const combos = await prisma.combo.findMany({
      where: {
        organizationId: orgId,
        ...(isActive !== null ? { isActive: isActive === "true" } : {}),
      },
      include: {
        products: {
          include: { product: { select: { id: true, name: true, salePrice: true, costPrice: true, currency: true } } },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ data: combos });
  } catch {
    return NextResponse.json({ error: "Error al obtener combos", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }
  try { requireFeature(req, "combos"); } catch (e) { return e as Response; }

  try {
    const body = await req.json();
    const { products, ...comboData } = CreateComboSchema.parse(body);

    const combo = await prisma.$transaction(async (tx) => {
      const created = await tx.combo.create({
        data: {
          ...comboData,
          organizationId: orgId,
          sku: comboData.sku || null,
          products: {
            create: products.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
            })),
          },
        },
        include: {
          products: {
            include: { product: { select: { id: true, name: true, salePrice: true, costPrice: true, currency: true } } },
          },
        },
      });
      return created;
    });

    return NextResponse.json(combo, { status: 201 });
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: e.issues[0].message, code: "VALIDATION_ERROR" }, { status: 400 });
    }
    return NextResponse.json({ error: "Error al crear combo", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
