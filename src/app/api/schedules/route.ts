import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/schedules?employeeId=  →  all schedules (optionally filtered)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");

    const schedules = await prisma.workSchedule.findMany({
      where: employeeId ? { employeeId } : {},
      orderBy: [{ employeeId: "asc" }, { dayOfWeek: "asc" }],
    });

    return NextResponse.json({ data: schedules });
  } catch {
    return NextResponse.json({ error: "Error al obtener horarios", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
