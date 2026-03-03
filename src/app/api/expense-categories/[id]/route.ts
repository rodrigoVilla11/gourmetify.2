import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UpdateExpenseCategorySchema } from "@/lib/validators";
import { ZodError } from "zod";

type Params = { params: { id: string } };

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const body = await req.json();
    const data = UpdateExpenseCategorySchema.parse(body);
    const category = await prisma.expenseCategory.update({ where: { id: params.id }, data });
    return NextResponse.json(category);
  } catch (e) {
    if (e instanceof ZodError) return NextResponse.json({ error: e.issues[0].message, code: "VALIDATION_ERROR" }, { status: 400 });
    return NextResponse.json({ error: "Error al actualizar categoría", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: Params) {
  try {
    await prisma.expenseCategory.delete({ where: { id: params.id } });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Error al eliminar categoría", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
