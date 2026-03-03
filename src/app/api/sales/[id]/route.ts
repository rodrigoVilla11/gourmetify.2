import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: { id: string } };

export async function GET(_: NextRequest, { params }: Params) {
  try {
    const sale = await prisma.sale.findUnique({
      where: { id: params.id },
      include: {
        items: { include: { product: true } },
        payments: true,
        stockMovements: { include: { ingredient: true }, orderBy: { createdAt: "asc" } },
      },
    });
    if (!sale) {
      return NextResponse.json({ error: "Venta no encontrada", code: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json(sale);
  } catch {
    return NextResponse.json({ error: "Error interno", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
