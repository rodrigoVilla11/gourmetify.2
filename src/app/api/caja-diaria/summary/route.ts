import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildCajaDiariaSummary } from "@/utils/cajaUtils";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "El parámetro sessionId es requerido", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const session = await prisma.cashSession.findUnique({ where: { id: sessionId } });
    if (!session) {
      return NextResponse.json({ error: "Sesión no encontrada", code: "NOT_FOUND" }, { status: 404 });
    }

    const summary = await buildCajaDiariaSummary({
      id: session.id,
      openedAt: session.openedAt,
      closedAt: session.closedAt,
      openingBalance: session.openingBalance,
    });

    return NextResponse.json(summary);
  } catch {
    return NextResponse.json({ error: "Error al generar resumen", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
