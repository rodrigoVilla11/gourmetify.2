export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: { slug: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const org = await prisma.organization.findUnique({
      where: { slug: params.slug },
      select: {
        id: true,
        name: true,
        slug: true,
        modalities: true,
        paymentMethods: true,
        deliveryFee: true,
        colorPrimary: true,
        colorSecondary: true,
        colorAccent: true,
        coverImageUrl: true,
      },
    });

    if (!org) {
      return NextResponse.json({ error: "Local no encontrado" }, { status: 404 });
    }

    const products = await prisma.product.findMany({
      where: { organizationId: org.id, isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        imageUrl: true,
        salePrice: true,
        currency: true,
        categoryId: true,
        category: { select: { id: true, name: true, color: true } },
      },
      orderBy: { name: "asc" },
    });

    // Group products by category
    const categoryMap = new Map<string | null, { id: string | null; name: string; color: string; products: typeof products }>();
    for (const p of products) {
      const key = p.categoryId ?? null;
      if (!categoryMap.has(key)) {
        categoryMap.set(key, {
          id: p.category?.id ?? null,
          name: p.category?.name ?? "Otros",
          color: p.category?.color ?? "#6B7280",
          products: [],
        });
      }
      categoryMap.get(key)!.products.push(p);
    }

    // Sort: categories first (alphabetically), then null last
    const categories = Array.from(categoryMap.entries())
      .sort(([a], [b]) => {
        if (a === null) return 1;
        if (b === null) return -1;
        return (categoryMap.get(a)!.name).localeCompare(categoryMap.get(b)!.name);
      })
      .map(([, cat]) => ({
        ...cat,
        products: cat.products.map((p) => ({
          ...p,
          salePrice: Number(p.salePrice),
        })),
      }));

    return NextResponse.json({
      org: {
        ...org,
        deliveryFee: org.deliveryFee ? Number(org.deliveryFee) : null,
      },
      categories,
    });
  } catch (e) {
    console.error("[public menu GET]", e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
