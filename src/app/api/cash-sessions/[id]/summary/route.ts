import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildCajaSummary } from "@/utils/cajaUtils";

type Params = { params: { id: string } };

export async function GET(_: NextRequest, { params }: Params) {
  try {
    const session = await prisma.cashSession.findUnique({ where: { id: params.id } });
    if (!session) return NextResponse.json({ error: "Sesión no encontrada", code: "NOT_FOUND" }, { status: 404 });

    const from = session.openedAt;
    const to = session.closedAt ?? new Date();
    const summary = await buildCajaSummary(from, to, Number(session.openingBalance));

    return NextResponse.json({ session, ...summary });
  } catch {
    return NextResponse.json({ error: "Error al generar resumen", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
