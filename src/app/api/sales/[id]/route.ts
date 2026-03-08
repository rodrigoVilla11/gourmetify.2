export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg } from "@/lib/requireOrg";
import { deductSaleStock, returnSaleStock } from "@/lib/saleStockUtils";

type Params = { params: { id: string } };

export async function GET(req: NextRequest, { params }: Params) {
  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }

  try {
    const [sale, preparationMovements] = await Promise.all([
      prisma.sale.findUnique({
        where: { id: params.id, organizationId: orgId },
        include: {
          customer: { select: { id: true, name: true, phone: true, email: true, address: true } },
          items: { include: { product: true } },
          combos: { include: { combo: { select: { id: true, name: true, currency: true } } } },
          payments: true,
          stockMovements: { include: { ingredient: true }, orderBy: { createdAt: "asc" } },
        },
      }),
      prisma.preparationMovement.findMany({
        where: { organizationId: orgId, reason: `Venta ${params.id}`, type: "SALE" },
        include: { preparation: { select: { id: true, name: true, unit: true } } },
        orderBy: { createdAt: "asc" },
      }),
    ]);
    if (!sale) {
      return NextResponse.json({ error: "Venta no encontrada", code: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ ...sale, preparationMovements });
  } catch {
    return NextResponse.json({ error: "Error interno", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }

  try {
    const body = await req.json();

    // ── Items/customerName update (complex path) ─────────────────────────────
    if ("newItems" in body || "newComboItems" in body || "customerName" in body) {
      const currentSale = await prisma.sale.findUnique({
        where: { id: params.id, organizationId: orgId },
        include: {
          items:  { select: { productId: true, quantity: true } },
          combos: { select: { comboId: true, quantity: true } },
        },
      });
      if (!currentSale) return NextResponse.json({ error: "Venta no encontrada" }, { status: 404 });

      const oldItems      = currentSale.items.map(i => ({ productId: i.productId, quantity: Number(i.quantity) }));
      const oldComboItems = currentSale.combos.map(c => ({ comboId: c.comboId, quantity: Number(c.quantity) }));
      const newItems:      { productId: string; quantity: number }[] = body.newItems      ?? oldItems;
      const newComboItems: { comboId: string;   quantity: number }[] = body.newComboItems ?? oldComboItems;

      // Deduplicate by productId/comboId (merge quantities)
      const mergedItems = Array.from(
        newItems.reduce((m, i) => { m.set(i.productId, (m.get(i.productId) ?? 0) + i.quantity); return m; }, new Map<string, number>()),
        ([productId, quantity]) => ({ productId, quantity })
      );
      const mergedCombos = Array.from(
        newComboItems.reduce((m, c) => { m.set(c.comboId, (m.get(c.comboId) ?? 0) + c.quantity); return m; }, new Map<string, number>()),
        ([comboId, quantity]) => ({ comboId, quantity })
      );

      // Load prices — also validates that all product/combo IDs belong to this org
      const [prods, combos] = await Promise.all([
        mergedItems.length > 0 ? prisma.product.findMany({ where: { id: { in: mergedItems.map(i => i.productId) }, organizationId: orgId }, select: { id: true, salePrice: true } }) : [],
        mergedCombos.length > 0 ? prisma.combo.findMany({ where: { id: { in: mergedCombos.map(c => c.comboId) }, organizationId: orgId }, select: { id: true, salePrice: true } }) : [],
      ]);
      const pPrices = new Map(prods.map(p => [p.id, Number(p.salePrice)]));
      const cPrices = new Map(combos.map(c => [c.id, Number(c.salePrice)]));

      // Reject if any product/combo ID doesn't belong to this org
      const missingProducts = mergedItems.filter(i => !pPrices.has(i.productId));
      const missingCombos   = mergedCombos.filter(c => !cPrices.has(c.comboId));
      if (missingProducts.length > 0 || missingCombos.length > 0) {
        return NextResponse.json({ error: "Productos o combos no encontrados en esta organización", code: "NOT_FOUND" }, { status: 404 });
      }

      const newTotal =
        mergedItems.reduce((s, i) => s + (pPrices.get(i.productId) ?? 0) * i.quantity, 0) +
        mergedCombos.reduce((s, c) => s + (cPrices.get(c.comboId) ?? 0) * c.quantity, 0) +
        Number(currentSale.deliveryFee ?? 0);

      await prisma.$transaction(async (tx) => {
        if (oldItems.length > 0 || oldComboItems.length > 0)
          await returnSaleStock(tx, params.id, oldItems, oldComboItems, orgId);
        if (mergedItems.length > 0 || mergedCombos.length > 0)
          await deductSaleStock(tx, params.id, mergedItems, mergedCombos, orgId);

        await tx.saleItem.deleteMany({ where: { saleId: params.id } });
        await tx.saleCombo.deleteMany({ where: { saleId: params.id } });

        if (mergedItems.length > 0)
          await tx.saleItem.createMany({ data: mergedItems.map(i => ({ saleId: params.id, productId: i.productId, quantity: i.quantity })) });
        if (mergedCombos.length > 0)
          await tx.saleCombo.createMany({ data: mergedCombos.map(c => ({ saleId: params.id, comboId: c.comboId, quantity: c.quantity, price: (cPrices.get(c.comboId) ?? 0) * c.quantity })) });

        const saleData: Record<string, unknown> = { total: newTotal };
        if ("customerName" in body)   saleData.customerName   = body.customerName   || null;
        if ("repartidorId" in body)   saleData.repartidorId   = body.repartidorId   || null;
        if ("deliveryAddress" in body) saleData.deliveryAddress = body.deliveryAddress || null;

        if ("newPayments" in body) {
          const pmts = (body.newPayments as { paymentMethod: string; amount: number }[]).filter(p => p.amount > 0);
          await tx.salePayment.deleteMany({ where: { saleId: params.id } });
          if (pmts.length > 0)
            await tx.salePayment.createMany({ data: pmts.map(p => ({ saleId: params.id, paymentMethod: p.paymentMethod, amount: p.amount })) });
          saleData.isPaid = pmts.reduce((s, p) => s + p.amount, 0) >= newTotal - 0.01;
        }

        await tx.sale.update({ where: { id: params.id, organizationId: orgId }, data: saleData });
      }, { timeout: 30000 });
      return NextResponse.json({ id: params.id, total: newTotal });
    }

    // ── Simple fields update ─────────────────────────────────────────────────
    const data: Record<string, unknown> = {};
    if ("repartidorId" in body)    data.repartidorId    = body.repartidorId || null;
    if ("deliveryAddress" in body) data.deliveryAddress = body.deliveryAddress || null;
    if ("orderStatus" in body)     data.orderStatus     = body.orderStatus;

    const sale = await prisma.sale.update({
      where: { id: params.id, organizationId: orgId },
      data,
      select: { id: true, repartidorId: true, deliveryAddress: true, orderStatus: true },
    });
    return NextResponse.json(sale);
  } catch {
    return NextResponse.json({ error: "Error interno", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
