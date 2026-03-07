export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ReceivePurchaseOrderSchema } from "@/lib/validators";
import { ZodError } from "zod";
import { requireOrg } from "@/lib/requireOrg";
import { revalidateTag } from "next/cache";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }

  try {
    const order = await prisma.purchaseOrder.findFirst({
      where: { id: params.id, organizationId: orgId },
      include: { items: true, supplier: { select: { id: true } } },
    });
    if (!order) return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    if (order.status !== "SENT") {
      return NextResponse.json({ error: "Solo se pueden recibir pedidos en estado Enviado" }, { status: 400 });
    }

    const body = await req.json();
    const { items: receiveItems, notes } = ReceivePurchaseOrderSchema.parse(body);

    const result = await prisma.$transaction(async (tx) => {
      let actualTotal = 0;

      for (const ri of receiveItems) {
        const item = order.items.find((i) => i.id === ri.id);
        if (!item) continue;

        const actualSubtotal = ri.receivedQty * ri.actualUnitCost;
        actualTotal += actualSubtotal;

        // Update item with received quantities
        await tx.purchaseOrderItem.update({
          where: { id: ri.id },
          data: {
            receivedQty: ri.receivedQty,
            actualUnitCost: ri.actualUnitCost,
            actualSubtotal,
          },
        });

        if (ri.receivedQty > 0) {
          // Increment stock
          await tx.ingredient.update({
            where: { id: item.ingredientId },
            data: { onHand: { increment: ri.receivedQty } },
          });

          // Create stock movement
          await tx.stockMovement.create({
            data: {
              organizationId: orgId,
              ingredientId: item.ingredientId,
              type: "PURCHASE",
              delta: ri.receivedQty,
              reason: `Recepción de pedido ${order.number}`,
              refId: params.id,
            },
          });
        }

        // Update cost if changed
        const ingredient = await tx.ingredient.findUnique({
          where: { id: item.ingredientId },
          select: { costPerUnit: true },
        });

        if (ingredient && Number(ingredient.costPerUnit) !== ri.actualUnitCost) {
          await tx.ingredientCostHistory.create({
            data: {
              organizationId: orgId,
              ingredientId: item.ingredientId,
              supplierId: order.supplierId,
              purchaseOrderId: params.id,
              previousCost: ingredient.costPerUnit,
              newCost: ri.actualUnitCost,
              quantity: ri.receivedQty,
            },
          });

          await tx.ingredient.update({
            where: { id: item.ingredientId },
            data: { costPerUnit: ri.actualUnitCost },
          });
        }
      }

      // Update purchase order
      return tx.purchaseOrder.update({
        where: { id: params.id },
        data: {
          status: "RECEIVED",
          receivedAt: new Date(),
          actualTotal,
          ...(notes ? { notes } : {}),
        },
        include: {
          items: true,
          invoices: true,
        },
      });
    });

    revalidateTag(`dashboard:${orgId}`);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof ZodError) return NextResponse.json({ error: e.issues[0].message, code: "VALIDATION_ERROR" }, { status: 400 });
    return NextResponse.json({ error: "Error al recibir pedido", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
