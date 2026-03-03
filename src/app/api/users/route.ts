import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, hashPassword } from "@/lib/auth";
import { CreateUserSchema } from "@/lib/validators";
import { ZodError } from "zod";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado", code: "FORBIDDEN" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    include: {
      employee: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { username: "asc" },
  });

  return NextResponse.json({ data: users });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado", code: "FORBIDDEN" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { password, employeeId, ...rest } = CreateUserSchema.parse(body);
    const hashed = await hashPassword(password);

    // ADMIN users cannot be linked to an employee
    const finalEmployeeId = rest.role === "ADMIN" ? null : (employeeId ?? null);

    const user = await prisma.user.create({
      data: { ...rest, password: hashed, employeeId: finalEmployeeId },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return NextResponse.json(user, { status: 201 });
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
