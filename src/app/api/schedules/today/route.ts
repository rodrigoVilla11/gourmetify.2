import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { requireOrg } from "@/lib/requireOrg";

// GET /api/schedules/today?employeeId=  →  today's schedules (up to 2) + rest day status
// Used by the fichador to enforce check-in times
export async function GET(req: NextRequest) {  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }

  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");
    if (!employeeId) {
      return NextResponse.json({ error: "employeeId requerido", code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const dateStr = format(today, "yyyy-MM-dd");

    const [schedules, restDay] = await Promise.all([
      prisma.workSchedule.findMany({
        where: { organizationId: orgId, employeeId, dayOfWeek },
        orderBy: { shiftIndex: "asc" },
      }),
      prisma.restDay.findFirst({
        where: { organizationId: orgId, employeeId, date: dateStr },
      }),
    ]);

    return NextResponse.json({
      schedules: schedules.map((s) => ({
        id: s.id,
        shiftIndex: s.shiftIndex,
        startTime: s.startTime,
        endTime: s.endTime,
      })),
      isRestDay: !!restDay,
      restDayId: restDay?.id ?? null,
    });
  } catch {
    return NextResponse.json({ error: "Error interno", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
