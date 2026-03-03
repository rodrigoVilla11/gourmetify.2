import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UpdateExpenseSchema } from "@/lib/validators";
import { ZodError } from "zod";

type Params = { params: { id: string } };

export async function GET(_: NextRequest, { params }: Params) {
  try {
    const expense = await prisma.expense.findUnique({
      where: { id: params.id },
      include: { category: true },
    });
    if (!expense) return NextResponse.json({ error: "Gasto no encontrado", code: "NOT_FOUND" }, { status: 404 });
    return NextResponse.json(expense);
  } catch {
    return NextResponse.json({ error: "Error interno", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const body = await req.json();
    const data = UpdateExpenseSchema.parse(body);
    const expense = await prisma.expense.update({
      where: { id: params.id },
      data: {
        ...data,
        date: data.date ? new Date(data.date) : undefined,
      },
      include: { category: true },
    });
    return NextResponse.json(expense);
  } catch (e) {
    if (e instanceof ZodError) return NextResponse.json({ error: e.issues[0].message, code: "VALIDATION_ERROR" }, { status: 400 });
    return NextResponse.json({ error: "Error al actualizar gasto", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: Params) {
  try {
    await prisma.expense.delete({ where: { id: params.id } });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Error al eliminar gasto", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
