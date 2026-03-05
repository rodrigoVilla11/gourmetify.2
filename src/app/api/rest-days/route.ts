import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { ZodError } from "zod";
import { requireOrg } from "@/lib/requireOrg";

const CreateRestDaySchema = z.object({
  employeeId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)"),
  notes: z.string().optional(),
});

// GET /api/rest-days?employeeId=&from=&to=
export async function GET(req: NextRequest) {  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }

  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const where = {
      organizationId: orgId,
      ...(employeeId ? { employeeId } : {}),
      ...(from || to
        ? {
            date: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    };

    const restDays = await prisma.restDay.findMany({
      where,
      include: {
        employee: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { date: "asc" },
    });

    return NextResponse.json(restDays);
  } catch {
    return NextResponse.json({ error: "Error al obtener días de descanso", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

// POST /api/rest-days
export async function POST(req: NextRequest) {  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }

  try {
    const body = await req.json();
    const { employeeId, date, notes } = CreateRestDaySchema.parse(body);

    // Check employee exists
    const employee = await prisma.employee.findUnique({ where: { id: employeeId, organizationId: orgId } });
    if (!employee) {
      return NextResponse.json({ error: "Empleado no encontrado", code: "NOT_FOUND" }, { status: 404 });
    }

    const restDay = await prisma.restDay.create({
      data: { organizationId: orgId, employeeId, date, notes },
      include: { employee: { select: { id: true, firstName: true, lastName: true } } },
    });

    return NextResponse.json(restDay, { status: 201 });
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: e.issues[0].message, code: "VALIDATION_ERROR" }, { status: 400 });
    }
    // Unique constraint violation
    if ((e as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Ya existe un día de descanso para ese empleado en esa fecha", code: "DUPLICATE" }, { status: 409 });
    }
    return NextResponse.json({ error: "Error al crear día de descanso", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
