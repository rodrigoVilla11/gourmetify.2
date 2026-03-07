export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UpdatePurchaseOrderStatusSchema } from "@/lib/validators";
import { ZodError } from "zod";
import { requireOrg } from "@/lib/requireOrg";

const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["SENT", "CANCELLED"],
  SENT: ["CANCELLED"],
};

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }

  try {
    const order = await prisma.purchaseOrder.findFirst({ where: { id: params.id, organizationId: orgId } });
    if (!order) return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });

    const body = await req.json();
    const { status } = UpdatePurchaseOrderStatusSchema.parse(body);

    const allowed = VALID_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(status)) {
      return NextResponse.json(
        { error: `No se puede pasar de ${order.status} a ${status}` },
        { status: 400 }
      );
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id: params.id },
      data: {
        status,
        ...(status === "SENT" ? { sentAt: new Date() } : {}),
      },
    });

    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof ZodError) return NextResponse.json({ error: e.issues[0].message, code: "VALIDATION_ERROR" }, { status: 400 });
    return NextResponse.json({ error: "Error al actualizar estado", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
