import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { CreateUserSchema } from "@/lib/validators";
import { ZodError } from "zod";

export async function GET() {
  const count = await prisma.user.count();
  return NextResponse.json({ needsSetup: count === 0 });
}

export async function POST(req: NextRequest) {
  try {
    const count = await prisma.user.count();
    if (count > 0) {
      return NextResponse.json({ error: "Ya existe al menos un usuario", code: "FORBIDDEN" }, { status: 403 });
    }

    const body = await req.json();
    const { password, ...rest } = CreateUserSchema.parse(body);
    const hashed = await hashPassword(password);

    await prisma.user.create({
      data: { ...rest, password: hashed, role: "ADMIN", employeeId: null },
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: e.issues[0].message, code: "VALIDATION_ERROR" }, { status: 400 });
    }
    return NextResponse.json({ error: "Error interno", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
