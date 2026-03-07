export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg } from "@/lib/requireOrg";

// DELETE /api/rest-days/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }

  try {
    const { id } = params;

    const existing = await prisma.restDay.findUnique({ where: { id, organizationId: orgId } });
    if (!existing) {
      return NextResponse.json({ error: "Día de descanso no encontrado", code: "NOT_FOUND" }, { status: 404 });
    }

    await prisma.restDay.delete({ where: { id, organizationId: orgId } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Error al eliminar día de descanso", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
