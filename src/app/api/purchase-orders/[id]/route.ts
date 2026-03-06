import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UpdatePurchaseOrderSchema } from "@/lib/validators";
import { ZodError } from "zod";
import { requireOrg } from "@/lib/requireOrg";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }

  const order = await prisma.purchaseOrder.findFirst({
    where: { id: params.id, organizationId: orgId },
    include: {
      supplier: { select: { id: true, name: true } },
      items: { include: { ingredient: { select: { id: true, name: true, unit: true, costPerUnit: true } } } },
      invoices: true,
      costHistory: {
        orderBy: { effectiveDate: "desc" },
        take: 20,
        include: { ingredient: { select: { name: true } } },
      },
    },
  });

  if (!order) return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  return NextResponse.json(order);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }

  try {
    const order = await prisma.purchaseOrder.findFirst({ where: { id: params.id, organizationId: orgId } });
    if (!order) return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    if (order.status !== "DRAFT") return NextResponse.json({ error: "Solo se puede editar un pedido en estado Borrador" }, { status: 400 });

    const body = await req.json();
    const data = UpdatePurchaseOrderSchema.parse(body);

    const expectedTotal = data.items
      ? data.items.reduce((sum, item) => sum + item.expectedQty * item.expectedUnitCost, 0)
      : Number(order.expectedTotal);

    const updated = await prisma.$transaction(async (tx) => {
      if (data.items) {
        await tx.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: params.id } });
        await tx.purchaseOrderItem.createMany({
          data: data.items.map((item) => ({
            purchaseOrderId: params.id,
            ingredientId: item.ingredientId,
            ingredientNameSnapshot: item.ingredientNameSnapshot,
            unit: item.unit,
            expectedQty: item.expectedQty,
            expectedUnitCost: item.expectedUnitCost,
            expectedSubtotal: item.expectedQty * item.expectedUnitCost,
            notes: item.notes ?? null,
          })),
        });
      }

      return tx.purchaseOrder.update({
        where: { id: params.id },
        data: {
          ...(data.supplierId ? { supplierId: data.supplierId } : {}),
          ...(data.notes !== undefined ? { notes: data.notes ?? null } : {}),
          ...(data.expectedDeliveryAt !== undefined ? { expectedDeliveryAt: data.expectedDeliveryAt ? new Date(data.expectedDeliveryAt) : null } : {}),
          ...(data.items ? { expectedTotal } : {}),
        },
        include: {
          supplier: { select: { id: true, name: true } },
          items: true,
        },
      });
    });

    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof ZodError) return NextResponse.json({ error: e.issues[0].message, code: "VALIDATION_ERROR" }, { status: 400 });
    return NextResponse.json({ error: "Error al actualizar pedido", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }

  const order = await prisma.purchaseOrder.findFirst({ where: { id: params.id, organizationId: orgId } });
  if (!order) return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  if (order.status === "RECEIVED") return NextResponse.json({ error: "No se puede cancelar un pedido ya recibido" }, { status: 400 });

  await prisma.purchaseOrder.update({
    where: { id: params.id },
    data: { status: "CANCELLED" },
  });

  return NextResponse.json({ ok: true });
}
