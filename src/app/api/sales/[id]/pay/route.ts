import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PaySaleSchema } from "@/lib/validators";
import { ZodError } from "zod";
import { requireOrg } from "@/lib/requireOrg";

type Params = { params: { id: string } };

export async function POST(req: NextRequest, { params }: Params) {  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }

  try {
    const sale = await prisma.sale.findUnique({ where: { id: params.id, organizationId: orgId }, select: { id: true, isPaid: true } });
    if (!sale) {
      return NextResponse.json({ error: "Venta no encontrada", code: "NOT_FOUND" }, { status: 404 });
    }
    if (sale.isPaid) {
      return NextResponse.json({ error: "La venta ya está pagada", code: "ALREADY_PAID" }, { status: 409 });
    }

    const body = PaySaleSchema.parse(await req.json());

    await prisma.$transaction([
      prisma.salePayment.createMany({
        data: body.payments.map((p) => ({
          saleId: params.id,
          paymentMethod: p.paymentMethod,
          amount: p.amount,
        })),
      }),
      prisma.sale.update({
        where: { id: params.id, organizationId: orgId },
        data: { isPaid: true },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: e.issues[0].message, code: "VALIDATION_ERROR" }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Error interno", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
