import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CreateExpenseCategorySchema } from "@/lib/validators";
import { ZodError } from "zod";

export async function GET() {
  try {
    const categories = await prisma.expenseCategory.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json(categories);
  } catch {
    return NextResponse.json({ error: "Error al obtener categorías", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = CreateExpenseCategorySchema.parse(body);
    const category = await prisma.expenseCategory.create({ data });
    return NextResponse.json(category, { status: 201 });
  } catch (e) {
    if (e instanceof ZodError) return NextResponse.json({ error: e.issues[0].message, code: "VALIDATION_ERROR" }, { status: 400 });
    return NextResponse.json({ error: "Error al crear categoría", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
