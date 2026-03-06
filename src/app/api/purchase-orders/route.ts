import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CreatePurchaseOrderSchema } from "@/lib/validators";
import { ZodError } from "zod";
import { requireOrg, requireFeature } from "@/lib/requireOrg";

export async function GET(req: NextRequest) {
  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const supplierId = searchParams.get("supplierId");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "50"));
    const skip = (page - 1) * limit;

    const where = {
      organizationId: orgId,
      ...(status ? { status } : {}),
      ...(supplierId ? { supplierId } : {}),
    };

    const [total, data] = await prisma.$transaction([
      prisma.purchaseOrder.count({ where }),
      prisma.purchaseOrder.findMany({
        where,
        include: {
          supplier: { select: { id: true, name: true } },
          _count: { select: { items: true, invoices: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    return NextResponse.json({ data, meta: { total, page, limit } });
  } catch {
    return NextResponse.json({ error: "Error al obtener pedidos", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }
  try { requireFeature(req, "suppliers"); } catch (e) { return e as Response; }

  try {
    const body = await req.json();
    const data = CreatePurchaseOrderSchema.parse(body);

    const count = await prisma.purchaseOrder.count({ where: { organizationId: orgId } });
    const number = `PO-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

    const expectedTotal = data.items.reduce(
      (sum, item) => sum + item.expectedQty * item.expectedUnitCost,
      0
    );

    const order = await prisma.purchaseOrder.create({
      data: {
        organizationId: orgId,
        supplierId: data.supplierId,
        number,
        status: "DRAFT",
        expectedTotal,
        notes: data.notes ?? null,
        expectedDeliveryAt: data.expectedDeliveryAt ? new Date(data.expectedDeliveryAt) : null,
        items: {
          create: data.items.map((item) => ({
            ingredientId: item.ingredientId,
            ingredientNameSnapshot: item.ingredientNameSnapshot,
            unit: item.unit,
            expectedQty: item.expectedQty,
            expectedUnitCost: item.expectedUnitCost,
            expectedSubtotal: item.expectedQty * item.expectedUnitCost,
            notes: item.notes ?? null,
          })),
        },
      },
      include: {
        supplier: { select: { id: true, name: true } },
        items: true,
      },
    });

    return NextResponse.json(order, { status: 201 });
  } catch (e) {
    if (e instanceof ZodError) return NextResponse.json({ error: e.issues[0].message, code: "VALIDATION_ERROR" }, { status: 400 });
    return NextResponse.json({ error: "Error al crear pedido", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
