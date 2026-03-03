import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UpdateIncomeEntrySchema } from "@/lib/validators";
import { ZodError } from "zod";

type Params = { params: { id: string } };

export async function GET(_: NextRequest, { params }: Params) {
  try {
    const entry = await prisma.incomeEntry.findUnique({ where: { id: params.id } });
    if (!entry) return NextResponse.json({ error: "Ingreso no encontrado", code: "NOT_FOUND" }, { status: 404 });
    return NextResponse.json(entry);
  } catch {
    return NextResponse.json({ error: "Error interno", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const body = await req.json();
    const data = UpdateIncomeEntrySchema.parse(body);
    const entry = await prisma.incomeEntry.update({
      where: { id: params.id },
      data: {
        ...data,
        date: data.date ? new Date(data.date) : undefined,
      },
    });
    return NextResponse.json(entry);
  } catch (e) {
    if (e instanceof ZodError) return NextResponse.json({ error: e.issues[0].message, code: "VALIDATION_ERROR" }, { status: 400 });
    return NextResponse.json({ error: "Error al actualizar ingreso", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: Params) {
  try {
    await prisma.incomeEntry.delete({ where: { id: params.id } });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Error al eliminar ingreso", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
