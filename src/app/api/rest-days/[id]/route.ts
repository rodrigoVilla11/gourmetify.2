import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// DELETE /api/rest-days/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const existing = await prisma.restDay.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Día de descanso no encontrado", code: "NOT_FOUND" }, { status: 404 });
    }

    await prisma.restDay.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Error al eliminar día de descanso", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
