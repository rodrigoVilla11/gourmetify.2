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
    const body = await req.json();
    const { items: receiveItems, notes } = ReceivePurchaseOrderSchema.parse(body);

    const result = await prisma.$transaction(async (tx) => {
      // Fetch order INSIDE transaction — atomic status check prevents double-receive race condition
      const order = await tx.purchaseOrder.findFirst({
        where: { id: params.id, organizationId: orgId },
        include: { items: true },
      });
      if (!order) throw Object.assign(new Error("Pedido no encontrado"), { code: "NOT_FOUND" });
      if (order.status !== "SENT") {
        throw Object.assign(new Error("Solo se pueden recibir pedidos en estado Enviado"), { code: "INVALID_STATUS" });
      }

      let actualTotal = 0;

      for (const ri of receiveItems) {
        const item = order.items.find((i) => i.id === ri.id);
        if (!item) continue;

        if (ri.receivedQty < 0) {
          throw Object.assign(new Error(`Cantidad recibida no puede ser negativa`), { code: "VALIDATION_ERROR" });
        }

        const actualSubtotal = ri.receivedQty * ri.actualUnitCost;
        actualTotal += actualSubtotal;

        await tx.purchaseOrderItem.update({
          where: { id: ri.id },
          data: { receivedQty: ri.receivedQty, actualUnitCost: ri.actualUnitCost, actualSubtotal },
        });

        if (ri.receivedQty > 0) {
          // organizationId on updateMany prevents cross-tenant ingredient manipulation
          await tx.ingredient.updateMany({
            where: { id: item.ingredientId, organizationId: orgId },
            data: { onHand: { increment: ri.receivedQty } },
          });

          await tx.stockMovement.create({
            data: {
              organizationId: orgId,
              ingredientId: item.ingredientId,
              type: "PURCHASE",
              delta: ri.receivedQty,
              reason: `Recepción de pedido ${order.number}`,
            },
          });

          const ingredient = await tx.ingredient.findFirst({
            where: { id: item.ingredientId, organizationId: orgId },
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
            await tx.ingredient.updateMany({
              where: { id: item.ingredientId, organizationId: orgId },
              data: { costPerUnit: ri.actualUnitCost },
            });
          }
        }
      }

      return tx.purchaseOrder.update({
        where: { id: params.id },
        data: { status: "RECEIVED", receivedAt: new Date(), actualTotal, ...(notes ? { notes } : {}) },
        include: { items: true, invoices: true },
      });
    });

    revalidateTag(`dashboard:${orgId}`);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof ZodError) return NextResponse.json({ error: e.issues[0].message, code: "VALIDATION_ERROR" }, { status: 400 });
    const errCode = (e as NodeJS.ErrnoException & { code?: string }).code;
    if (errCode === "NOT_FOUND") return NextResponse.json({ error: "Pedido no encontrado", code: "NOT_FOUND" }, { status: 404 });
    if (errCode === "INVALID_STATUS") return NextResponse.json({ error: "Solo se pueden recibir pedidos en estado Enviado", code: "INVALID_STATUS" }, { status: 400 });
    if (errCode === "VALIDATION_ERROR") return NextResponse.json({ error: (e as Error).message, code: "VALIDATION_ERROR" }, { status: 400 });
    return NextResponse.json({ error: "Error al recibir pedido", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
