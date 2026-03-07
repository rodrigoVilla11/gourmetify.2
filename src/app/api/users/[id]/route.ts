export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, hashPassword } from "@/lib/auth";
import { UpdateUserSchema } from "@/lib/validators";
import { ZodError } from "zod";
import { requireOrg } from "@/lib/requireOrg";

type Params = { params: { id: string } };

export async function GET(req: NextRequest, { params }: Params) {
  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado", code: "FORBIDDEN" }, { status: 403 });
  }

  const user = await prisma.user.findUnique({
    where: { id: params.id, organizationId: orgId },
    include: { employee: { select: { id: true, firstName: true, lastName: true } } },
  });

  if (!user) return NextResponse.json({ error: "Usuario no encontrado", code: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json(user);
}

export async function PUT(req: NextRequest, { params }: Params) {  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }

  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado", code: "FORBIDDEN" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { password, employeeId, role, ...rest } = UpdateUserSchema.parse(body);

    const updateData: Record<string, unknown> = { ...rest };
    if (role !== undefined) updateData.role = role;
    if (password) updateData.password = await hashPassword(password);

    // ADMIN users cannot be linked to an employee
    if (role === "ADMIN") {
      updateData.employeeId = null;
    } else if (employeeId !== undefined) {
      updateData.employeeId = employeeId;
    }

    const user = await prisma.user.update({
      where: { id: params.id, organizationId: orgId },
      data: updateData,
      include: { employee: { select: { id: true, firstName: true, lastName: true } } },
    });

    return NextResponse.json(user);
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: e.issues[0].message, code: "VALIDATION_ERROR" }, { status: 400 });
    }
    if ((e as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "El nombre de usuario ya existe", code: "DUPLICATE" }, { status: 409 });
    }
    return NextResponse.json({ error: "Error interno", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado", code: "FORBIDDEN" }, { status: 403 });
  }

  try {
    await prisma.user.update({
      where: { id: params.id, organizationId: orgId },
      data: { isActive: false },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Error al desactivar usuario", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
