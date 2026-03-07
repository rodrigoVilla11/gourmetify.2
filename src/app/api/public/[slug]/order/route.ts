export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z, ZodError } from "zod";
import { computeOrderPricing, type DiscountConfig, type DiscountContext } from "@/lib/pricingUtils";

type Params = { params: { slug: string } };

const PublicOrderSchema = z.object({
  customerName: z.string().min(1, "Nombre requerido"),
  customerPhone: z.string().optional().nullable(),
  customerAddress: z.string().optional().nullable(),
  orderType: z.enum(["SALON", "TAKEAWAY", "DELIVERY"]).default("SALON"),
  payments: z.array(z.object({
    paymentMethod: z.string(),
  })).default([]),
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.coerce.number().positive(),
  })).default([]),
  comboItems: z.array(z.object({
    comboId: z.string(),
    quantity: z.coerce.number().positive(),
  })).default([]),
  paymentAdjustmentType:   z.enum(["none", "discount", "surcharge"]).optional().nullable(),
  paymentAdjustmentPct:    z.coerce.number().min(0).max(100).optional().nullable(),
  paymentAdjustmentAmount: z.coerce.number().optional().nullable(),
  paymentMethodSnapshot:   z.any().optional().nullable(),
  selectedExtras: z.array(z.object({
    extraId:  z.string(),
    quantity: z.coerce.number().int().positive(),
  })).optional().default([]),
});

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const org = await prisma.organization.findUnique({
      where: { slug: params.slug },
      select: { id: true, deliveryFee: true },
    });

    if (!org) {
      return NextResponse.json({ error: "Local no encontrado" }, { status: 404 });
    }

    const body = PublicOrderSchema.parse(await req.json());

    const productIds = body.items.map((i) => i.productId);
    const comboIds = body.comboItems.map((c) => c.comboId);

    const [products, combos] = await Promise.all([
      productIds.length > 0
        ? prisma.product.findMany({ where: { id: { in: productIds }, organizationId: org.id }, select: { id: true, salePrice: true, categoryId: true } })
        : [],
      comboIds.length > 0
        ? prisma.combo.findMany({ where: { id: { in: comboIds }, organizationId: org.id }, select: { id: true, salePrice: true } })
        : [],
    ]);

    const pPrices = new Map(products.map((p) => [p.id, Number(p.salePrice)]));
    const cPrices = new Map(combos.map((c) => [c.id, Number(c.salePrice)]));

    const deliveryFee = body.orderType === "DELIVERY" ? Number(org.deliveryFee ?? 0) : 0;
    const itemsSubtotal =
      body.items.reduce((s, i) => s + (pPrices.get(i.productId) ?? 0) * i.quantity, 0) +
      body.comboItems.reduce((s, c) => s + (cPrices.get(c.comboId) ?? 0) * c.quantity, 0);

    // Load extras
    let loadedExtras: Array<{ id: string; name: string; price: number; isFree: boolean; affectsStock: boolean; ingredientId: string | null; ingredientQty: number | null }> = [];
    if (body.selectedExtras && body.selectedExtras.length > 0) {
      const extraIds = body.selectedExtras.map((e) => e.extraId);
      const dbExtras = await prisma.extra.findMany({
        where: { id: { in: extraIds }, organizationId: org.id, isActive: true },
        select: { id: true, name: true, price: true, isFree: true, affectsStock: true, ingredientId: true, ingredientQty: true },
      });
      loadedExtras = dbExtras.map((e) => ({
        id: e.id, name: e.name, price: Number(e.price), isFree: e.isFree,
        affectsStock: e.affectsStock, ingredientId: e.ingredientId,
        ingredientQty: e.ingredientQty ? Number(e.ingredientQty) : null,
      }));
    }

    // Load active discounts and compute best
    const activeDiscounts = await prisma.discount.findMany({
      where: { organizationId: org.id, isActive: true },
    });
    const paymentMethod = body.payments.length === 1 ? body.payments[0].paymentMethod : undefined;
    const categoryIds = products.map((p) => (p as any).categoryId).filter(Boolean) as string[];
    const discountCtx: DiscountContext = { now: new Date(), paymentMethod, productIds: body.items.map((i) => i.productId), categoryIds };
    const discountConfigs: DiscountConfig[] = activeDiscounts.map((d) => ({
      id: d.id, name: d.name, label: d.label, discountType: d.discountType, value: Number(d.value),
      priority: d.priority, isActive: d.isActive,
      dateFrom: d.dateFrom ? d.dateFrom.toISOString().slice(0, 10) : null,
      dateTo:   d.dateTo   ? d.dateTo.toISOString().slice(0, 10)   : null,
      timeFrom: d.timeFrom, timeTo: d.timeTo, weekdays: d.weekdays as number[] | null,
      appliesTo: d.appliesTo, productIds: d.productIds as string[] | null,
      categoryIds: d.categoryIds as string[] | null, paymentMethods: d.paymentMethods as string[] | null,
    }));

    const pricing = computeOrderPricing({
      itemsSubtotal,
      deliveryFee,
      extras: (body.selectedExtras ?? []).map((se) => {
        const ex = loadedExtras.find((e) => e.id === se.extraId);
        return { price: ex?.price ?? 0, quantity: se.quantity, isFree: ex?.isFree ?? false };
      }),
      discounts: discountConfigs,
      discountCtx,
      paymentAdjustmentAmount: body.paymentAdjustmentAmount ?? 0,
    });

    const adjAmount = body.paymentAdjustmentAmount ?? 0;
    const total = Math.round(pricing.total * 100) / 100;

    // Find or create customer (only when phone is provided)
    let customerId: string | undefined;
    const phone = body.customerPhone?.trim() || null;
    if (phone) {
      const existing = await prisma.customer.findFirst({
        where: { phone, organizationId: org.id },
        select: { id: true },
      });
      if (existing) {
        customerId = existing.id;
        await prisma.customer.update({ where: { id: existing.id }, data: { name: body.customerName } });
      } else {
        const created = await prisma.customer.create({
          data: { organizationId: org.id, name: body.customerName, phone },
        });
        customerId = created.id;
      }
    }

    const discountSnapshot = pricing.appliedDiscount ? {
      discountId:    pricing.appliedDiscount.id,
      name:          pricing.appliedDiscount.name,
      label:         pricing.appliedDiscount.label ?? null,
      discountType:  pricing.appliedDiscount.discountType,
      value:         pricing.appliedDiscount.value,
      amountApplied: pricing.discountAmount,
    } : null;

    const sale = await prisma.$transaction(async (tx) => {
      const created = await tx.sale.create({
        data: {
          organizationId: org.id,
          customerName: body.customerName,
          customerId: customerId ?? null,
          deliveryAddress: body.customerAddress ?? null,
          orderType: body.orderType,
          deliveryFee: deliveryFee > 0 ? deliveryFee : null,
          total,
          isPaid: false,
          extrasAmount:   pricing.extrasAmount > 0 ? pricing.extrasAmount : null,
          discountAmount: pricing.discountAmount > 0 ? pricing.discountAmount : null,
          discountsSnapshot: discountSnapshot ? discountSnapshot : undefined,
          ...(body.paymentAdjustmentType && body.paymentAdjustmentType !== "none" ? {
            paymentAdjustmentType:   body.paymentAdjustmentType,
            paymentAdjustmentPct:    body.paymentAdjustmentPct ?? null,
            paymentAdjustmentAmount: adjAmount !== 0 ? adjAmount : null,
            paymentMethodSnapshot:   body.paymentMethodSnapshot ?? null,
          } : {}),
          items: body.items.length > 0 ? {
            create: body.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          } : undefined,
          combos: body.comboItems.length > 0 ? {
            create: body.comboItems.map((c) => ({ comboId: c.comboId, quantity: c.quantity, price: (cPrices.get(c.comboId) ?? 0) * c.quantity })),
          } : undefined,
          payments: body.payments.length > 0 ? {
            create: body.payments.map((p) => ({ paymentMethod: p.paymentMethod, amount: 0 })),
          } : undefined,
          ...(body.selectedExtras && body.selectedExtras.length > 0 ? {
            saleExtras: {
              create: body.selectedExtras.map((se) => {
                const ex = loadedExtras.find((e) => e.id === se.extraId)!;
                return {
                  extraId:              se.extraId,
                  quantity:             se.quantity,
                  nameSnapshot:         ex?.name ?? "Desconocido",
                  priceSnapshot:        ex?.price ?? 0,
                  isFreeSnapshot:       ex?.isFree ?? false,
                  affectsStockSnapshot: ex?.affectsStock ?? false,
                  ingredientId:         ex?.ingredientId ?? null,
                  ingredientQtySnapshot: ex?.ingredientQty ?? null,
                };
              }),
            },
          } : {}),
        },
      });

      return created;
    }, { timeout: 30000 });

    return NextResponse.json({ id: sale.id, total }, { status: 201 });
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: e.issues[0].message, code: "VALIDATION_ERROR" }, { status: 400 });
    }
    console.error("[public order POST]", e);
    return NextResponse.json({ error: "Error al crear pedido" }, { status: 500 });
  }
}
