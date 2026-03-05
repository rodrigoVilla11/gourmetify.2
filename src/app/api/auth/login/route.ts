import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { signToken, verifyPassword, COOKIE_NAME, MAX_AGE } from "@/lib/auth";
import { LoginSchema } from "@/lib/validators";
import { ZodError } from "zod";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = LoginSchema.parse(body);

    const user = await prisma.user.findFirst({
      where: { username, isActive: true },
      include: {
        organization: { select: { plan: true, planExpiresAt: true } },
      },
    });

    if (!user || !(await verifyPassword(password, user.password))) {
      return NextResponse.json(
        { error: "Usuario o contraseña incorrectos", code: "INVALID_CREDENTIALS" },
        { status: 401 }
      );
    }

    const token = await signToken({
      sub: user.id,
      username: user.username,
      role: user.role as import("@/lib/auth").UserRole,
      organizationId: user.organizationId ?? null,
      employeeId: user.employeeId ?? undefined,
      plan: (user.organization?.plan as "FREE" | "STARTER" | "PRO") ?? undefined,
      planExpiresAt: user.organization?.planExpiresAt?.toISOString() ?? null,
    });

    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: MAX_AGE,
      path: "/",
      secure: process.env.NODE_ENV === "production",
    });

    return NextResponse.json({ role: user.role, username: user.username });
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: e.issues[0].message, code: "VALIDATION_ERROR" }, { status: 400 });
    }
    return NextResponse.json({ error: "Error interno", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
