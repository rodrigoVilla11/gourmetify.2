import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildCajaDiariaSummary } from "@/utils/cajaUtils";
import { requireOrg } from "@/lib/requireOrg";

export async function GET(req: NextRequest) {  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }

  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "El parámetro sessionId es requerido", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const session = await prisma.cashSession.findUnique({ where: { id: sessionId, organizationId: orgId } });
    if (!session) {
      return NextResponse.json({ error: "Sesión no encontrada", code: "NOT_FOUND" }, { status: 404 });
    }

    const summary = await buildCajaDiariaSummary({
      id: session.id,
      openedAt: session.openedAt,
      closedAt: session.closedAt,
      openingBalance: Number(session.openingBalance),
    }, orgId);

    return NextResponse.json(summary);
  } catch {
    return NextResponse.json({ error: "Error al generar resumen", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
