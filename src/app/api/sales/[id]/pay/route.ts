export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PaySaleSchema } from "@/lib/validators";
import { ZodError } from "zod";
import { requireOrg } from "@/lib/requireOrg";

type Params = { params: { id: string } };

export async function POST(req: NextRequest, { params }: Params) {  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }

  try {
    // Parse body before entering the transaction
    const body = PaySaleSchema.parse(await req.json());

    await prisma.$transaction(async (tx) => {
      // Re-check isPaid inside the transaction to prevent race conditions
      const sale = await tx.sale.findUnique({ where: { id: params.id, organizationId: orgId }, select: { id: true, isPaid: true, total: true } });
      if (!sale) {
        const err = new Error("NOT_FOUND");
        (err as NodeJS.ErrnoException).code = "NOT_FOUND";
        throw err;
      }
      if (sale.isPaid) {
        const err = new Error("ALREADY_PAID");
        (err as NodeJS.ErrnoException).code = "ALREADY_PAID";
        throw err;
      }

      const baseTotal = Number(sale.total);
      const saleUpdateData: Record<string, unknown> = { isPaid: body.isPaid };
      if (body.total !== undefined) {
        saleUpdateData.total = body.total;
      } else if (body.paymentAdjustmentAmount !== undefined) {
        saleUpdateData.total = baseTotal + body.paymentAdjustmentAmount;
      }
      if (body.paymentAdjustmentType && body.paymentAdjustmentType !== "none") {
        saleUpdateData.paymentAdjustmentType   = body.paymentAdjustmentType;
        saleUpdateData.paymentAdjustmentPct    = body.paymentAdjustmentPct ?? null;
        saleUpdateData.paymentAdjustmentAmount = body.paymentAdjustmentAmount ?? null;
        saleUpdateData.paymentMethodSnapshot   = body.paymentMethodSnapshot ?? null;
      }
      if (body.discountAmount !== undefined) saleUpdateData.discountAmount = body.discountAmount;
      if (body.discountsSnapshot !== undefined) saleUpdateData.discountsSnapshot = body.discountsSnapshot;

      await tx.salePayment.deleteMany({ where: { saleId: params.id } });
      await tx.salePayment.createMany({
        data: body.payments.map((p) => ({
          saleId: params.id,
          paymentMethod: p.paymentMethod,
          amount: p.amount,
          confirmedAt: new Date(),
        })),
      });
      await tx.sale.update({ where: { id: params.id, organizationId: orgId }, data: saleUpdateData });
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: e.issues[0].message, code: "VALIDATION_ERROR" }, { status: 400 });
    }
    const code = (e as NodeJS.ErrnoException).code;
    if (code === "NOT_FOUND") return NextResponse.json({ error: "Venta no encontrada", code: "NOT_FOUND" }, { status: 404 });
    if (code === "ALREADY_PAID") return NextResponse.json({ error: "La venta ya está pagada", code: "ALREADY_PAID" }, { status: 409 });
    console.error(e);
    return NextResponse.json({ error: "Error interno", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }

  try {
    await prisma.$transaction([
      prisma.salePayment.deleteMany({ where: { saleId: params.id } }),
      prisma.sale.update({ where: { id: params.id, organizationId: orgId }, data: { isPaid: false } }),
    ]);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
