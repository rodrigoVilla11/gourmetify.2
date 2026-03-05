import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z, ZodError } from "zod";
import { requireOrg, requireFeature } from "@/lib/requireOrg";

type Params = { params: { id: string } };

const DayScheduleSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  shiftIndex: z.number().int().min(0).max(1).default(0),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Formato HH:MM"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Formato HH:MM"),
});

const PutSchedulesSchema = z.object({
  schedules: z.array(DayScheduleSchema),
});

// PUT /api/schedules/employee/[id]  →  replace all schedules for an employee
export async function PUT(req: NextRequest, { params }: Params) {  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }
  try { requireFeature(req, "horarios"); } catch (e) { return e as Response; }

  try {
    const body = await req.json();
    const { schedules } = PutSchedulesSchema.parse(body);

    await prisma.$transaction(async (tx) => {
      await tx.workSchedule.deleteMany({ where: { organizationId: orgId, employeeId: params.id } });
      if (schedules.length > 0) {
        await tx.workSchedule.createMany({
          data: schedules.map((s) => ({
            organizationId: orgId,
            employeeId: params.id,
            dayOfWeek: s.dayOfWeek,
            shiftIndex: s.shiftIndex,
            startTime: s.startTime,
            endTime: s.endTime,
          })),
        });
      }
    });

    const updated = await prisma.workSchedule.findMany({
      where: { organizationId: orgId, employeeId: params.id },
      orderBy: { dayOfWeek: "asc" },
    });

    return NextResponse.json({ data: updated });
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: e.issues[0].message, code: "VALIDATION_ERROR" }, { status: 400 });
    }
    return NextResponse.json({ error: "Error al guardar horario", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
