export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deductSaleStock } from "@/lib/saleStockUtils";
import { z } from "zod";
import { ZodError } from "zod";

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
        ? prisma.product.findMany({ where: { id: { in: productIds }, organizationId: org.id }, select: { id: true, salePrice: true } })
        : [],
      comboIds.length > 0
        ? prisma.combo.findMany({ where: { id: { in: comboIds }, organizationId: org.id }, select: { id: true, salePrice: true } })
        : [],
    ]);

    const pPrices = new Map(products.map((p) => [p.id, Number(p.salePrice)]));
    const cPrices = new Map(combos.map((c) => [c.id, Number(c.salePrice)]));

    const deliveryFee = body.orderType === "DELIVERY" ? Number(org.deliveryFee ?? 0) : 0;
    const total =
      body.items.reduce((s, i) => s + (pPrices.get(i.productId) ?? 0) * i.quantity, 0) +
      body.comboItems.reduce((s, c) => s + (cPrices.get(c.comboId) ?? 0) * c.quantity, 0) +
      deliveryFee;

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
          items: body.items.length > 0 ? {
            create: body.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          } : undefined,
          combos: body.comboItems.length > 0 ? {
            create: body.comboItems.map((c) => ({ comboId: c.comboId, quantity: c.quantity, price: (cPrices.get(c.comboId) ?? 0) * c.quantity })),
          } : undefined,
          payments: body.payments.length > 0 ? {
            create: body.payments.map((p) => ({ paymentMethod: p.paymentMethod, amount: 0 })),
          } : undefined,
        },
      });

      if (body.items.length > 0 || body.comboItems.length > 0) {
        await deductSaleStock(tx, created.id, body.items, body.comboItems, org.id);
      }

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
