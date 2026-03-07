export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UpdateEmployeeSchema } from "@/lib/validators";
import { ZodError } from "zod";
import { requireOrg } from "@/lib/requireOrg";

type Params = { params: { id: string } };

export async function GET(req: NextRequest, { params }: Params) {
  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: params.id, organizationId: orgId },
      include: {
        timeLogs: {
          orderBy: { checkIn: "desc" },
          take: 100,
        },
      },
    });
    if (!employee) {
      return NextResponse.json({ error: "Empleado no encontrado", code: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json(employee);
  } catch {
    return NextResponse.json({ error: "Error interno", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }

  try {
    const body = await req.json();
    const data = UpdateEmployeeSchema.parse(body);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const employee = await prisma.employee.update({ where: { id: params.id, organizationId: orgId }, data: data as any });
    return NextResponse.json(employee);
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: e.issues[0].message, code: "VALIDATION_ERROR" }, { status: 400 });
    }
    return NextResponse.json({ error: "Error al actualizar empleado", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }
  try {
    // Block if there's an open time log
    const openLog = await prisma.timeLog.findFirst({
      where: { organizationId: orgId, employeeId: params.id, checkOut: null },
    });
    if (openLog) {
      return NextResponse.json(
        { error: "El empleado tiene un fichaje abierto. Cerralo antes de desactivar.", code: "OPEN_TIMELOG" },
        { status: 400 }
      );
    }
    await prisma.employee.update({ where: { id: params.id, organizationId: orgId }, data: { isActive: false } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Error al desactivar empleado", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
