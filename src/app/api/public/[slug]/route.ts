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
        whatsapp: true,
        phone: true,
      },
    });

    if (!org) {
      return NextResponse.json({ error: "Local no encontrado" }, { status: 404 });
    }

    const [products, extrasRows, discountsRows] = await Promise.all([
      prisma.product.findMany({
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
      }),
      prisma.extra.findMany({
        where: { organizationId: org.id, isActive: true },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true, name: true, description: true, price: true, isFree: true,
          appliesTo: true, productIds: true, categoryIds: true, maxQuantity: true,
        },
      }),
      prisma.discount.findMany({
        where: { organizationId: org.id, isActive: true },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true, name: true, label: true, discountType: true, value: true,
          priority: true, isActive: true, dateFrom: true, dateTo: true,
          timeFrom: true, timeTo: true,
          weekdays: true, appliesTo: true, productIds: true, categoryIds: true,
          paymentMethods: true,
        },
      }),
    ]);

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

    const extras = extrasRows.map((e) => ({
      ...e,
      price:      Number(e.price),
      productIds: e.productIds as string[] | null,
      categoryIds: e.categoryIds as string[] | null,
    }));

    const discounts = discountsRows.map((d) => ({
      ...d,
      value:          Number(d.value),
      dateFrom:       d.dateFrom ? d.dateFrom.toISOString().slice(0, 10) : null,
      dateTo:         d.dateTo   ? d.dateTo.toISOString().slice(0, 10)   : null,
      weekdays:       d.weekdays as number[] | null,
      productIds:     d.productIds as string[] | null,
      categoryIds:    d.categoryIds as string[] | null,
      paymentMethods: d.paymentMethods as string[] | null,
    }));

    return NextResponse.json({
      org: {
        ...org,
        deliveryFee: org.deliveryFee ? Number(org.deliveryFee) : null,
      },
      categories,
      extras,
      discounts,
    });
  } catch (e) {
    console.error("[public menu GET]", e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
