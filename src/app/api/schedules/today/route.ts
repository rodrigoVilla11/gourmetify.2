import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";

// GET /api/schedules/today?employeeId=  →  today's schedule + rest day status
// Used by the fichador to enforce check-in times
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");
    if (!employeeId) {
      return NextResponse.json({ error: "employeeId requerido", code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const dateStr = format(today, "yyyy-MM-dd");

    const [schedule, restDay] = await Promise.all([
      prisma.workSchedule.findUnique({
        where: { employeeId_dayOfWeek: { employeeId, dayOfWeek } },
      }),
      prisma.restDay.findUnique({
        where: { employeeId_date: { employeeId, date: dateStr } },
      }),
    ]);

    return NextResponse.json({
      schedule: schedule ? { id: schedule.id, startTime: schedule.startTime, endTime: schedule.endTime } : null,
      isRestDay: !!restDay,
      restDayId: restDay?.id ?? null,
    });
  } catch {
    return NextResponse.json({ error: "Error interno", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
