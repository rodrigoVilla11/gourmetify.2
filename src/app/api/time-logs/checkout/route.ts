import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CheckOutSchema } from "@/lib/validators";
import { ZodError } from "zod";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { employeeId, notes } = CheckOutSchema.parse(body);

    // Find the open log for this employee
    const openLog = await prisma.timeLog.findFirst({
      where: { employeeId, checkOut: null },
    });
    if (!openLog) {
      return NextResponse.json(
        { error: "No hay fichaje abierto para este empleado", code: "NO_OPEN_TIMELOG" },
        { status: 404 }
      );
    }

    const checkOut = new Date();
    const durationMs = checkOut.getTime() - openLog.checkIn.getTime();
    const durationHours = Math.round((durationMs / 3_600_000) * 100) / 100;

    const timeLog = await prisma.timeLog.update({
      where: { id: openLog.id },
      data: {
        checkOut,
        duration: durationHours,
        ...(notes !== undefined ? { notes } : {}),
      },
      include: { employee: true },
    });

    return NextResponse.json({ timeLog, durationHours });
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: e.issues[0].message, code: "VALIDATION_ERROR" }, { status: 400 });
    }
    return NextResponse.json({ error: "Error al registrar salida", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
