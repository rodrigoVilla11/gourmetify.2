import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CreateTimeLogSchema } from "@/lib/validators";
import { ZodError } from "zod";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const open = searchParams.get("open");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(200, parseInt(searchParams.get("limit") ?? "50"));
    const skip = (page - 1) * limit;

    const where = {
      ...(employeeId ? { employeeId } : {}),
      ...(from || to
        ? {
            checkIn: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to + "T23:59:59.999Z") } : {}),
            },
          }
        : {}),
      ...(open === "true" ? { checkOut: null } : {}),
    };

    const [total, logs] = await prisma.$transaction([
      prisma.timeLog.count({ where }),
      prisma.timeLog.findMany({
        where,
        include: { employee: { select: { id: true, firstName: true, lastName: true, role: true } } },
        orderBy: { checkIn: "desc" },
        skip,
        take: limit,
      }),
    ]);

    return NextResponse.json({ logs, meta: { total, page, limit } });
  } catch {
    return NextResponse.json({ error: "Error al obtener fichajes", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { employeeId, notes } = CreateTimeLogSchema.parse(body);

    // Verify employee exists and is active
    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee || !employee.isActive) {
      return NextResponse.json({ error: "Empleado no encontrado o inactivo", code: "NOT_FOUND" }, { status: 404 });
    }

    // Check schedule and rest day
    const now = new Date();
    const dayOfWeek = now.getDay();
    const dateStr = now.toISOString().split("T")[0];

    const [daySchedules, restDay] = await Promise.all([
      prisma.workSchedule.findMany({
        where: { employeeId, dayOfWeek },
        orderBy: { shiftIndex: "asc" },
      }),
      prisma.restDay.findUnique({
        where: { employeeId_date: { employeeId, date: dateStr } },
      }),
    ]);

    if (restDay) {
      return NextResponse.json(
        { error: "Hoy es un día de descanso asignado", code: "REST_DAY" },
        { status: 409 }
      );
    }

    if (daySchedules.length > 0) {
      // Allow check-in starting 1 minute before the earliest shift of the day
      const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
      const earliestStart = Math.min(...daySchedules.map((s) => toMin(s.startTime)));
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const graceMinutes = earliestStart - 1;

      if (nowMinutes < graceMinutes) {
        const eh = Math.floor(graceMinutes / 60);
        const em = graceMinutes % 60;
        const earliest = `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;
        const firstShift = daySchedules.find((s) => toMin(s.startTime) === earliestStart)!;
        return NextResponse.json(
          {
            error: `Tu turno comienza a las ${firstShift.startTime}. Podés fichar desde las ${earliest}`,
            code: "TOO_EARLY",
          },
          { status: 409 }
        );
      }
    }

    // Check for existing open log
    const openLog = await prisma.timeLog.findFirst({
      where: { employeeId, checkOut: null },
    });
    if (openLog) {
      return NextResponse.json(
        { error: `${employee.firstName} ya tiene un fichaje abierto desde las ${new Date(openLog.checkIn).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}`, code: "ALREADY_CHECKED_IN" },
        { status: 409 }
      );
    }

    const timeLog = await prisma.timeLog.create({
      data: { employeeId, checkIn: new Date(), notes },
      include: { employee: true },
    });

    return NextResponse.json({ timeLog }, { status: 201 });
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: e.issues[0].message, code: "VALIDATION_ERROR" }, { status: 400 });
    }
    return NextResponse.json({ error: "Error al registrar entrada", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
