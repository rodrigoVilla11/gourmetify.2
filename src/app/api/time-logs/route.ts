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
