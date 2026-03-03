import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { OpenCashSessionSchema } from "@/lib/validators";
import { ZodError } from "zod";

export async function GET() {
  try {
    const [active, recent] = await prisma.$transaction([
      prisma.cashSession.findFirst({ where: { closedAt: null }, orderBy: { openedAt: "desc" } }),
      prisma.cashSession.findMany({ where: { closedAt: { not: null } }, orderBy: { openedAt: "desc" }, take: 10 }),
    ]);
    return NextResponse.json({ active, recent });
  } catch {
    return NextResponse.json({ error: "Error al obtener sesiones", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const existing = await prisma.cashSession.findFirst({ where: { closedAt: null } });
    if (existing) {
      return NextResponse.json(
        { error: "Ya hay una caja abierta. Cerrala antes de abrir una nueva.", code: "CONFLICT" },
        { status: 409 }
      );
    }

    const body = await req.json();
    const data = OpenCashSessionSchema.parse(body);
    const session = await prisma.cashSession.create({
      data: { openingBalance: data.openingBalance, notes: data.notes ?? null },
    });
    return NextResponse.json(session, { status: 201 });
  } catch (e) {
    if (e instanceof ZodError) return NextResponse.json({ error: e.issues[0].message, code: "VALIDATION_ERROR" }, { status: 400 });
    return NextResponse.json({ error: "Error al abrir caja", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
