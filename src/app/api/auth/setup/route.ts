import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { ZodError, z } from "zod";

const SetupSchema = z.object({
  orgName: z.string().min(1, "Nombre del local requerido"),
  orgSlug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/, "Solo letras minúsculas, números y guiones"),
  username: z.string().min(3, "Mínimo 3 caracteres"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

export async function GET() {
  const count = await prisma.organization.count();
  return NextResponse.json({ needsSetup: count === 0 });
}

export async function POST(req: NextRequest) {
  try {
    const count = await prisma.organization.count();
    if (count > 0) {
      return NextResponse.json({ error: "El sistema ya fue configurado", code: "FORBIDDEN" }, { status: 403 });
    }

    const body = await req.json();
    const { orgName, orgSlug, username, password } = SetupSchema.parse(body);
    const hashed = await hashPassword(password);

    const org = await prisma.organization.create({
      data: { name: orgName, slug: orgSlug },
    });

    await prisma.user.create({
      data: {
        username,
        password: hashed,
        role: "ADMIN",
        organizationId: org.id,
        employeeId: null,
      },
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: e.issues[0].message, code: "VALIDATION_ERROR" }, { status: 400 });
    }
    return NextResponse.json({ error: "Error interno", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
