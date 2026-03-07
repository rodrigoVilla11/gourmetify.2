export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { CreateSaleSchema } from "@/lib/validators";
import { ZodError } from "zod";
import { buildExcel, excelResponse } from "@/utils/excel";
import { format as fmtDate } from "date-fns";
import { requireOrg } from "@/lib/requireOrg";
import { computeOrderPricing, type DiscountConfig, type DiscountContext } from "@/lib/pricingUtils";

export async function GET(req: NextRequest) {
  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }
  try {
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format");

    if (format === "xlsx") {
      const sales = await prisma.sale.findMany({
        where: { organizationId: orgId },
        include: { items: { include: { product: true } }, payments: true },
        orderBy: { date: "desc" },
      });
      const rows: (string | number | null)[][] = [];
      for (const sale of sales) {
        for (const item of sale.items) {
          rows.push([
            fmtDate(sale.date, "dd/MM/yyyy"),
            fmtDate(sale.date, "HH:mm"),
            item.product.name,
            item.quantity.toNumber(),
            sale.total.toNumber(),
            sale.notes ?? "",
          ]);
        }
        if (sale.items.length === 0) {
          rows.push([fmtDate(sale.date, "dd/MM/yyyy"), fmtDate(sale.date, "HH:mm"), "", "", sale.total.toNumber(), sale.notes ?? ""]);
        }
      }
      const buf = buildExcel(["Fecha", "Hora", "Producto", "Cantidad", "Total", "Notas"], rows, "Ventas");
      return excelResponse(buf, "ventas.xlsx");
    }

    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const isPaidParam = searchParams.get("isPaid");
    const orderStatusParam = searchParams.get("orderStatus");
    const orderTypeParam = searchParams.get("orderType");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(200, parseInt(searchParams.get("limit") ?? "20"));
    const skip = (page - 1) * limit;

    const where = {
      organizationId: orgId,
      ...(from || to ? {
        date: {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to ? { lte: new Date(to + "T23:59:59.999Z") } : {}),
        },
      } : {}),
      ...(isPaidParam !== null ? { isPaid: isPaidParam === "true" } : {}),
      ...(orderStatusParam ? { orderStatus: { in: orderStatusParam.split(",") } } : {}),
      ...(orderTypeParam ? { orderType: orderTypeParam } : {}),
    };

    const [total, sales] = await prisma.$transaction([
      prisma.sale.count({ where }),
      prisma.sale.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          date: true,
          total: true,
          notes: true,
          isPaid: true,
          orderType: true,
          orderStatus: true,
          dailyOrderNumber: true,
          startedAt: true,
          readyAt: true,
          deliveredAt: true,
          delayMinutes: true,
          deliveryAddress: true,
          deliveryFee: true,
          repartidorId: true,
          repartidor: { select: { id: true, name: true } },
          customerId: true,
          customerName: true,
          customer: { select: { id: true, name: true, phone: true } },
          items: {
            select: {
              productId: true,
              quantity: true,
              isUnavailable: true,
              product: { select: { name: true } },
            },
          },
          payments: { select: { paymentMethod: true, amount: true, confirmedAt: true } },
          discountAmount: true,
          discountsSnapshot: true,
          combos: {
            select: {
              id: true,
              comboId: true,
              quantity: true,
              price: true,
              combo: { select: { name: true } },
            },
          },
        },
        orderBy: { date: "desc" },
      }),
    ]);

    return NextResponse.json({ data: sales, meta: { total, page, limit } });
  } catch {
    return NextResponse.json(
      { error: "Error al obtener ventas", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }
  try {
    const body = await req.json();
    const { date, notes, customerId, customerName, orderType, deliveryAddress, repartidorId, items, comboItems, payments, paymentAdjustmentType, paymentAdjustmentPct, paymentAdjustmentAmount, paymentMethodSnapshot, selectedExtras } = CreateSaleSchema.parse(body);
    const isPaid = typeof body.isPaid === "boolean" ? body.isPaid : !!(payments && payments.length > 0 && payments.some((p: { amount: number }) => p.amount > 0));

    // ── Step 1: Load products to compute total ─────────────────────────────────
    const productIds = items.map((i) => i.productId);
    const products = productIds.length > 0
      ? await prisma.product.findMany({
          where: { id: { in: productIds }, isActive: true, organizationId: orgId },
          select: { id: true, salePrice: true, categoryId: true },
        })
      : [];

    if (productIds.length > 0 && products.length !== productIds.length) {
      const foundIds = products.map((p) => p.id);
      const missing = productIds.filter((id) => !foundIds.includes(id));
      return NextResponse.json(
        { error: `Productos no encontrados o inactivos: ${missing.join(", ")}`, code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    // ── Step 1b: Load combos to compute total ──────────────────────────────────
    const comboIds = (comboItems ?? []).map((c) => c.comboId);
    const combos = comboIds.length > 0
      ? await prisma.combo.findMany({
          where: { id: { in: comboIds }, isActive: true, organizationId: orgId },
          select: { id: true, salePrice: true },
        })
      : [];

    if (comboIds.length > 0 && combos.length !== comboIds.length) {
      const foundIds = combos.map((c) => c.id);
      const missing = comboIds.filter((id) => !foundIds.includes(id));
      return NextResponse.json(
        { error: `Combos no encontrados o inactivos: ${missing.join(", ")}`, code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    // ── Step 2: Compute sale total ─────────────────────────────────────────────
    const productMap = new Map(products.map((p) => [p.id, p]));
    const comboMap = new Map(combos.map((c) => [c.id, c]));

    // Fetch delivery fee from org if order is DELIVERY
    let orgDeliveryFee = 0;
    if (orderType === "DELIVERY") {
      const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { deliveryFee: true } });
      orgDeliveryFee = Number(org?.deliveryFee ?? 0);
    }

    const itemsSubtotal =
      items.reduce((sum, item) => {
        const product = productMap.get(item.productId)!;
        return sum + Number(product.salePrice) * item.quantity;
      }, 0) +
      (comboItems ?? []).reduce((sum, ci) => {
        const combo = comboMap.get(ci.comboId)!;
        return sum + Number(combo.salePrice) * ci.quantity;
      }, 0);

    // ── Step 2b: Load extras if any ───────────────────────────────────────────
    let extrasAmount = 0;
    let loadedExtras: Array<{ id: string; name: string; price: number; isFree: boolean; affectsStock: boolean; ingredientId: string | null; ingredientQty: number | null }> = [];
    if (selectedExtras && selectedExtras.length > 0) {
      const extraIds = selectedExtras.map((e) => e.extraId);
      const dbExtras = await prisma.extra.findMany({
        where: { id: { in: extraIds }, organizationId: orgId, isActive: true },
        select: { id: true, name: true, price: true, isFree: true, affectsStock: true, ingredientId: true, ingredientQty: true },
      });
      loadedExtras = dbExtras.map((e) => ({
        id: e.id, name: e.name, price: Number(e.price), isFree: e.isFree,
        affectsStock: e.affectsStock, ingredientId: e.ingredientId, ingredientQty: e.ingredientQty ? Number(e.ingredientQty) : null,
      }));
      extrasAmount = selectedExtras.reduce((sum, se) => {
        const ex = loadedExtras.find((e) => e.id === se.extraId);
        return sum + (ex && !ex.isFree ? ex.price * se.quantity : 0);
      }, 0);
    }

    // ── Step 2c: Load active discounts and find best ───────────────────────────
    const activeDiscounts = await prisma.discount.findMany({
      where: { organizationId: orgId, isActive: true },
    });
    const paymentMethod = payments && payments.length === 1 ? payments[0].paymentMethod : undefined;
    const categoryIds = products.map((p) => (p as unknown as { categoryId?: string | null }).categoryId).filter(Boolean) as string[];
    const discountCtx: DiscountContext = {
      now:           new Date(),
      paymentMethod,
      productIds:    productIds,
      categoryIds,
    };
    const discountConfigs: DiscountConfig[] = activeDiscounts.map((d) => ({
      id:             d.id,
      name:           d.name,
      label:          d.label,
      discountType:   d.discountType,
      value:          Number(d.value),
      priority:       d.priority,
      isActive:       d.isActive,
      dateFrom:       d.dateFrom ? d.dateFrom.toISOString().slice(0, 10) : null,
      dateTo:         d.dateTo   ? d.dateTo.toISOString().slice(0, 10)   : null,
      timeFrom:       d.timeFrom,
      timeTo:         d.timeTo,
      weekdays:       d.weekdays as number[] | null,
      appliesTo:      d.appliesTo,
      productIds:     d.productIds as string[] | null,
      categoryIds:    d.categoryIds as string[] | null,
      paymentMethods: d.paymentMethods as string[] | null,
    }));

    const pricing = computeOrderPricing({
      itemsSubtotal,
      deliveryFee: orgDeliveryFee,
      extras: selectedExtras?.map((se) => {
        const ex = loadedExtras.find((e) => e.id === se.extraId);
        return { price: ex?.price ?? 0, quantity: se.quantity, isFree: ex?.isFree ?? false };
      }) ?? [],
      discounts: discountConfigs,
      discountCtx,
      paymentAdjustmentAmount: paymentAdjustmentAmount ?? 0,
    });

    const finalTotal = Math.round(pricing.total * 100) / 100;
    const adjAmount = paymentAdjustmentAmount ?? 0;

    // ── Step 3: Compute daily order number ────────────────────────────────────
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date();
    dayEnd.setHours(23, 59, 59, 999);
    const todayCount = await prisma.sale.count({
      where: { organizationId: orgId, createdAt: { gte: dayStart, lte: dayEnd } },
    });
    const dailyOrderNumber = todayCount + 1;

    // ── Step 4: Create sale (NO stock deduction — happens on ENTREGADO) ───────
    const discountSnapshot = pricing.appliedDiscount ? {
      discountId:    pricing.appliedDiscount.id,
      name:          pricing.appliedDiscount.name,
      label:         pricing.appliedDiscount.label ?? null,
      discountType:  pricing.appliedDiscount.discountType,
      value:         pricing.appliedDiscount.value,
      amountApplied: pricing.discountAmount,
    } : null;

    const sale = await prisma.sale.create({
      data: {
        date: date ? new Date(date) : new Date(),
        notes,
        total: finalTotal,
        organizationId: orgId,
        customerId: customerId ?? null,
        customerName: customerName ?? null,
        orderType,
        orderStatus: "NUEVO",
        isPaid,
        dailyOrderNumber,
        deliveryAddress: deliveryAddress ?? null,
        deliveryFee: orgDeliveryFee > 0 ? orgDeliveryFee : null,
        repartidorId: repartidorId ?? null,
        extrasAmount:   pricing.extrasAmount > 0 ? pricing.extrasAmount : null,
        discountAmount: pricing.discountAmount > 0 ? pricing.discountAmount : null,
        discountsSnapshot: discountSnapshot ? discountSnapshot : undefined,
        ...(paymentAdjustmentType && paymentAdjustmentType !== "none" ? {
          paymentAdjustmentType,
          paymentAdjustmentPct,
          paymentAdjustmentAmount: adjAmount !== 0 ? adjAmount : null,
          paymentMethodSnapshot: paymentMethodSnapshot ?? null,
        } : {}),
        cashImpacted: isPaid,
        cashImpactedAt: isPaid ? new Date() : null,
        items: {
          create: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
          })),
        },
        ...(comboItems && comboItems.length > 0
          ? {
              combos: {
                create: comboItems.map((ci) => ({
                  comboId: ci.comboId,
                  quantity: ci.quantity,
                  price: Number(comboMap.get(ci.comboId)!.salePrice) * ci.quantity,
                })),
              },
            }
          : {}),
        ...(payments && payments.length > 0
          ? {
              payments: {
                create: payments.map((p) => ({
                  paymentMethod: p.paymentMethod,
                  amount: p.amount,
                  confirmedAt: new Date(),
                })),
              },
            }
          : {}),
        ...(selectedExtras && selectedExtras.length > 0
          ? {
              saleExtras: {
                create: selectedExtras.map((se) => {
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
            }
          : {}),
      },
    });

    revalidateTag(`dashboard:${orgId}`);
    return NextResponse.json({ sale }, { status: 201 });
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json(
        { error: e.issues[0].message, code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }
    console.error(e);
    return NextResponse.json(
      { error: "Error al registrar venta", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
