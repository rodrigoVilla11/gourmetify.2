export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg } from "@/lib/requireOrg";

// GET /api/schedules?employeeId=  →  all schedules (optionally filtered)
export async function GET(req: NextRequest) {  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }

  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");

    const schedules = await prisma.workSchedule.findMany({
      where: employeeId ? { organizationId: orgId, employeeId } : { organizationId: orgId },
      orderBy: [{ employeeId: "asc" }, { dayOfWeek: "asc" }],
    });

    return NextResponse.json(schedules);
  } catch {
    return NextResponse.json({ error: "Error al obtener horarios", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
