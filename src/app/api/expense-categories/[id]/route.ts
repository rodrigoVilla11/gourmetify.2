export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UpdateExpenseCategorySchema } from "@/lib/validators";
import { ZodError } from "zod";
import { requireOrg } from "@/lib/requireOrg";

type Params = { params: { id: string } };

export async function PUT(req: NextRequest, { params }: Params) {  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }

  try {
    const body = await req.json();
    const data = UpdateExpenseCategorySchema.parse(body);
    const result = await prisma.expenseCategory.updateMany({ where: { id: params.id, organizationId: orgId }, data });
    if (result.count === 0) return NextResponse.json({ error: "No encontrado", code: "NOT_FOUND" }, { status: 404 });
    const category = await prisma.expenseCategory.findUnique({ where: { id: params.id } });
    return NextResponse.json(category);
  } catch (e) {
    if (e instanceof ZodError) return NextResponse.json({ error: e.issues[0].message, code: "VALIDATION_ERROR" }, { status: 400 });
    return NextResponse.json({ error: "Error al actualizar categoría", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }
  try {
    const result = await prisma.expenseCategory.deleteMany({ where: { id: params.id, organizationId: orgId } });
    if (result.count === 0) return NextResponse.json({ error: "No encontrado", code: "NOT_FOUND" }, { status: 404 });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Error al eliminar categoría", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
