export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CreateEmployeeSchema } from "@/lib/validators";
import { ZodError } from "zod";
import { requireOrg, requireFeature, checkLimit } from "@/lib/requireOrg";

export async function GET(req: NextRequest) {  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }

  try {
    const { searchParams } = new URL(req.url);
    const isActive = searchParams.get("isActive");

    const employees = await prisma.employee.findMany({
      where: {
        organizationId: orgId,
        ...(isActive !== null ? { isActive: isActive === "true" } : {}),
      },
      include: { _count: { select: { timeLogs: true } } },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });
    return NextResponse.json(employees);
  } catch {
    return NextResponse.json({ error: "Error al obtener empleados", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }
  try { requireFeature(req, "employees"); } catch (e) { return e as Response; }
  try { await checkLimit(orgId, "employees", req); } catch (e) { return e as Response; }

  try {
    const body = await req.json();
    const data = CreateEmployeeSchema.parse(body);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const employee = await prisma.employee.create({ data: { ...(data as any), organizationId: orgId } });
    return NextResponse.json(employee, { status: 201 });
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: e.issues[0].message, code: "VALIDATION_ERROR" }, { status: 400 });
    }
    return NextResponse.json({ error: "Error al crear empleado", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
