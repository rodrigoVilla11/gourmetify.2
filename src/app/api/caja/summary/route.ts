import { NextRequest, NextResponse } from "next/server";
import { buildCajaSummary } from "@/utils/cajaUtils";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!from || !to) {
      return NextResponse.json(
        { error: "Los parámetros from y to son requeridos", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const fromDate = new Date(from);
    const toDate = new Date(to + "T23:59:59.999Z");
    const summary = await buildCajaSummary(fromDate, toDate);

    return NextResponse.json({ period: { from, to }, ...summary });
  } catch {
    return NextResponse.json({ error: "Error al generar resumen", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
