export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { UpdateSaleStatusSchema } from "@/lib/validators";
import { z, ZodError } from "zod";
import { deductSaleStock } from "@/lib/saleStockUtils";
import { requireOrg } from "@/lib/requireOrg";

type Params = { params: { id: string } };

// Valid forward-only transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  NUEVO:          ["EN_PREPARACION", "CANCELADO"],
  EN_PREPARACION: ["LISTO", "CANCELADO"],
  LISTO:          ["ENTREGADO", "CANCELADO"],
  ENTREGADO:      [],
  CANCELADO:      [],
};

export async function POST(req: NextRequest, { params }: Params) {  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }

  try {
    const body = await req.json();
    const { status, rollbackPayments, cancelStockDecision, cancelCashDecision } = UpdateSaleStatusSchema.parse(body);

    const sale = await prisma.sale.findUnique({
      where: { id: params.id, organizationId: orgId },
      include: {
        items:   { select: { productId: true, quantity: true } },
        combos:  { select: { comboId: true, quantity: true } },
        payments: { select: { paymentMethod: true, amount: true } },
      },
    });

    if (!sale) {
      return NextResponse.json({ error: "Venta no encontrada", code: "NOT_FOUND" }, { status: 404 });
    }

    const allowed = VALID_TRANSITIONS[sale.orderStatus] ?? [];
    if (!allowed.includes(status)) {
      return NextResponse.json(
        { error: `Transición inválida: ${sale.orderStatus} → ${status}`, code: "INVALID_TRANSITION" },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = { orderStatus: status };
    if (status === "EN_PREPARACION") updateData.startedAt   = new Date();
    if (status === "LISTO")          updateData.readyAt     = new Date();
    if (status === "ENTREGADO")      updateData.deliveredAt = new Date();
    if (status === "CANCELADO") {
      updateData.cancelledAt = new Date();
      if (cancelStockDecision) updateData.cancelStockDecision = cancelStockDecision;
      if (cancelCashDecision)  updateData.cancelCashDecision  = cancelCashDecision;
      // rollbackPayments only relevant when cancelCashDecision !== "add"
      if (rollbackPayments && cancelCashDecision !== "add") updateData.isPaid = false;
    }

    const items  = sale.items.map((i)  => ({ productId: i.productId, quantity: Number(i.quantity) }));
    const combos = sale.combos.map((c) => ({ comboId: c.comboId,   quantity: Number(c.quantity) }));

    let warnings: unknown[] = [];

    await prisma.$transaction(async (tx) => {
      if (status === "ENTREGADO") {
        // Guard: check for existing SALE stock movements (backwards compat for rows before this flag)
        const existingMoves = !sale.stockImpacted
          ? await tx.stockMovement.count({ where: { refId: params.id, type: "SALE" } })
          : 1; // already impacted, skip check

        if (!sale.stockImpacted) {
          if (existingMoves === 0) {
            warnings = await deductSaleStock(tx, params.id, items, combos, orgId);
          }
          // Deduct stock for extras that affect stock
          const extrasWithStock = await tx.saleExtra.findMany({
            where: { saleId: params.id, affectsStockSnapshot: true, ingredientId: { not: null } },
          });
          for (const se of extrasWithStock) {
            const delta = Number(se.ingredientQtySnapshot ?? 0) * se.quantity;
            if (delta > 0) {
              await tx.ingredient.update({
                where: { id: se.ingredientId! },
                data:  { onHand: { decrement: delta } },
              });
              await tx.stockMovement.create({
                data: {
                  organizationId: orgId,
                  ingredientId:   se.ingredientId!,
                  type:           "SALE",
                  delta:          -delta,
                  reason:         `Extra venta ${params.id}`,
                  refId:          params.id,
                },
              });
            }
          }
          updateData.stockImpacted   = true;
          updateData.stockImpactedAt = new Date();
        }
        updateData.cashImpacted   = true;
        updateData.cashImpactedAt = new Date();
      }

      if (status === "CANCELADO") {
        if (cancelStockDecision === "deduct" && !sale.stockImpacted) {
          warnings = await deductSaleStock(tx, params.id, items, combos, orgId);
          updateData.stockImpacted   = true;
          updateData.stockImpactedAt = new Date();
        }
        if (cancelCashDecision === "add" && sale.payments && sale.payments.length > 0) {
          await tx.incomeEntry.createMany({
            data: sale.payments.map((p) => ({
              organizationId: orgId,
              amount:        p.amount,
              currency:      "ARS",
              paymentMethod: p.paymentMethod,
              description:   `Venta cancelada #${params.id.slice(-6).toUpperCase()}`,
              date:          new Date(),
            })),
          });
          updateData.cashImpacted   = true;
          updateData.cashImpactedAt = new Date();
        } else if (rollbackPayments && cancelCashDecision !== "add") {
          await tx.salePayment.deleteMany({ where: { saleId: params.id } });
        }
      }

      await tx.sale.update({ where: { id: params.id, organizationId: orgId }, data: updateData });
    }, { timeout: 30000 });

    revalidateTag(`dashboard:${orgId}`);
    return NextResponse.json({ ok: true, warnings });
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: e.issues[0].message, code: "VALIDATION_ERROR" }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Error interno", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

// PUT — update delayMinutes only (kitchen monitor)
const UpdateDelaySchema = z.object({
  delayMinutes: z.number().int().min(0).max(480).nullable(),
});

export async function PUT(req: NextRequest, { params }: Params) {
  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }

  try {
    const body = await req.json();
    const { delayMinutes } = UpdateDelaySchema.parse(body);

    const sale = await prisma.sale.update({
      where: { id: params.id, organizationId: orgId },
      data: { delayMinutes },
      select: { id: true, delayMinutes: true },
    });

    return NextResponse.json(sale);
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: e.issues[0].message, code: "VALIDATION_ERROR" }, { status: 400 });
    }
    return NextResponse.json({ error: "Error interno", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
