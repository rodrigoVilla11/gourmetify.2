import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CloseCashSessionSchema } from "@/lib/validators";
import { ZodError } from "zod";

type Params = { params: { id: string } };

export async function GET(_: NextRequest, { params }: Params) {
  try {
    const session = await prisma.cashSession.findUnique({ where: { id: params.id } });
    if (!session) return NextResponse.json({ error: "Sesión no encontrada", code: "NOT_FOUND" }, { status: 404 });
    return NextResponse.json(session);
  } catch {
    return NextResponse.json({ error: "Error interno", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await prisma.cashSession.findUnique({ where: { id: params.id } });
    if (!session) return NextResponse.json({ error: "Sesión no encontrada", code: "NOT_FOUND" }, { status: 404 });
    if (session.closedAt) return NextResponse.json({ error: "La sesión ya está cerrada", code: "CONFLICT" }, { status: 409 });

    const body = await req.json();
    const data = CloseCashSessionSchema.parse(body);
    const updated = await prisma.cashSession.update({
      where: { id: params.id },
      data: { closedAt: new Date(), closingBalance: data.closingBalance, notes: data.notes ?? session.notes },
    });
    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof ZodError) return NextResponse.json({ error: e.issues[0].message, code: "VALIDATION_ERROR" }, { status: 400 });
    return NextResponse.json({ error: "Error al cerrar caja", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
