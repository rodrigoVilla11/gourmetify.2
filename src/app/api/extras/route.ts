export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CreateExtraSchema } from "@/lib/validators";
import { ZodError } from "zod";
import { requireOrg } from "@/lib/requireOrg";

export async function GET(req: NextRequest) {
  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }
  try {
    const { searchParams } = new URL(req.url);
    const active    = searchParams.get("active");
    const productId = searchParams.get("productId");

    const where: Record<string, unknown> = { organizationId: orgId };
    if (active === "true")  where.isActive = true;
    if (active === "false") where.isActive = false;

    const extras = await prisma.extra.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      include: { ingredient: { select: { id: true, name: true, unit: true } } },
    });

    // Client-side product filter (simpler than JSON path query)
    if (productId) {
      return NextResponse.json(
        extras.filter((e) => {
          if (e.appliesTo === "ALL") return true;
          if (e.appliesTo === "PRODUCTS") {
            const ids = e.productIds as string[] | null;
            return ids?.includes(productId) ?? false;
          }
          return true;
        }),
      );
    }

    return NextResponse.json(extras);
  } catch {
    return NextResponse.json({ error: "Error al obtener adicionales" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }
  try {
    const body = await req.json();
    const data = CreateExtraSchema.parse(body);
    const extra = await prisma.extra.create({
      data: {
        organizationId: orgId,
        name:          data.name,
        description:   data.description ?? null,
        isActive:      data.isActive,
        price:         data.price,
        isFree:        data.isFree,
        affectsStock:  data.affectsStock,
        ingredientId:  data.ingredientId ?? null,
        ingredientQty: data.ingredientQty ?? null,
        appliesTo:     data.appliesTo,
        productIds:    data.productIds ?? undefined,
        categoryIds:   data.categoryIds ?? undefined,
        maxQuantity:   data.maxQuantity ?? null,
        sortOrder:     data.sortOrder,
      },
    });
    return NextResponse.json(extra, { status: 201 });
  } catch (e) {
    if (e instanceof ZodError) return NextResponse.json({ error: e.issues[0].message }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "Error al crear adicional" }, { status: 500 });
  }
}
