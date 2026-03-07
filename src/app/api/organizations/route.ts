export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, hashPassword } from "@/lib/auth";
import { z, ZodError } from "zod";

const CreateOrgSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  slug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/, "Solo letras minúsculas, números y guiones"),
  adminUsername: z.string().min(3, "Mínimo 3 caracteres"),
  adminPassword: z.string().min(6, "Mínimo 6 caracteres"),
  plan: z.enum(["FREE", "STARTER", "PRO"]).default("FREE"),
});

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "No autorizado", code: "FORBIDDEN" }, { status: 403 });
  }

  const organizations = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { users: true } },
    },
  });

  return NextResponse.json(organizations);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "No autorizado", code: "FORBIDDEN" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, slug, adminUsername, adminPassword, plan } = CreateOrgSchema.parse(body);

    const hashed = await hashPassword(adminPassword);

    const org = await prisma.$transaction(async (tx) => {
      const newOrg = await tx.organization.create({ data: { name, slug, plan } });
      await tx.user.create({
        data: {
          username: adminUsername,
          password: hashed,
          role: "ADMIN",
          organizationId: newOrg.id,
          isActive: true,
        },
      });
      return newOrg;
    });

    return NextResponse.json(org, { status: 201 });
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: e.issues[0].message, code: "VALIDATION_ERROR" }, { status: 400 });
    }
    if ((e as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "El slug o usuario ya existe", code: "DUPLICATE" }, { status: 409 });
    }
    return NextResponse.json({ error: "Error interno", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
