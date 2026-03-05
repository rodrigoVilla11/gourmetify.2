import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { z, ZodError } from "zod";

const UpdateOrgSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/).optional(),
  isActive: z.boolean().optional(),
  plan: z.enum(["FREE", "STARTER", "PRO"]).optional(),
  planExpiresAt: z.string().datetime({ offset: true }).nullable().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "No autorizado", code: "FORBIDDEN" }, { status: 403 });
  }

  const { id } = await params;
  const org = await prisma.organization.findUnique({
    where: { id },
    include: { _count: { select: { users: true } } },
  });

  if (!org) {
    return NextResponse.json({ error: "Organización no encontrada", code: "NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json(org);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "No autorizado", code: "FORBIDDEN" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const data = UpdateOrgSchema.parse(body);

    const org = await prisma.organization.update({
      where: { id },
      data: {
        ...data,
        planExpiresAt: data.planExpiresAt !== undefined
          ? data.planExpiresAt ? new Date(data.planExpiresAt) : null
          : undefined,
      },
    });

    return NextResponse.json(org);
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: e.issues[0].message, code: "VALIDATION_ERROR" }, { status: 400 });
    }
    if ((e as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "Organización no encontrada", code: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ error: "Error interno", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

// Soft delete: set isActive = false
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "No autorizado", code: "FORBIDDEN" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const org = await prisma.organization.update({
      where: { id },
      data: { isActive: false },
    });
    return NextResponse.json(org);
  } catch (e) {
    if ((e as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "Organización no encontrada", code: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ error: "Error interno", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
