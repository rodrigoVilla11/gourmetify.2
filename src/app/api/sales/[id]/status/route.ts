import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { UpdateSaleStatusSchema } from "@/lib/validators";
import { z, ZodError } from "zod";
import { deductSaleStock, rollbackSaleStock } from "@/lib/saleStockUtils";
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
    const { status, rollbackStock, rollbackPayments } = UpdateSaleStatusSchema.parse(body);

    const sale = await prisma.sale.findUnique({
      where: { id: params.id, organizationId: orgId },
      include: {
        items: { select: { productId: true, quantity: true } },
        combos: { select: { comboId: true, quantity: true } },
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
    if (status === "CANCELADO" && rollbackPayments) updateData.isPaid = false;

    const items   = sale.items.map((i) => ({ productId: i.productId, quantity: Number(i.quantity) }));
    const combos  = sale.combos.map((c) => ({ comboId: c.comboId, quantity: Number(c.quantity) }));

    let warnings: unknown[] = [];

    await prisma.$transaction(async (tx) => {
      await tx.sale.update({ where: { id: params.id, organizationId: orgId }, data: updateData });

      if (status === "EN_PREPARACION") {
        warnings = await deductSaleStock(tx, params.id, items, combos, orgId);
      }

      if (status === "CANCELADO" && (sale.orderStatus === "EN_PREPARACION" || sale.orderStatus === "LISTO") && rollbackStock) {
        await rollbackSaleStock(tx, params.id, items, combos, orgId);
      }
      if (status === "CANCELADO" && rollbackPayments) {
        await tx.salePayment.deleteMany({ where: { saleId: params.id } });
      }
    });

    revalidateTag("dashboard");
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
