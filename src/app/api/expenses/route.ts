export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { CreateExpenseSchema } from "@/lib/validators";
import { ZodError } from "zod";
import { buildExcel, excelResponse } from "@/utils/excel";
import { format as fmtDate } from "date-fns";
import { requireOrg, requireFeature } from "@/lib/requireOrg";

export async function GET(req: NextRequest) {  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }

  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const categoryId = searchParams.get("categoryId");
    const cashSessionId = searchParams.get("cashSessionId");
    const format = searchParams.get("format");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "50"));
    const skip = (page - 1) * limit;

    const where = {
      organizationId: orgId,
      ...(from && to ? { date: { gte: new Date(from), lte: new Date(to + "T23:59:59.999Z") } } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(cashSessionId ? { cashSessionId } : {}),
    };

    if (format === "xlsx") {
      const expenses = await prisma.expense.findMany({
        where,
        include: { category: true },
        orderBy: { date: "desc" },
      });
      const buf = buildExcel(
        ["Fecha", "Descripción", "Categoría", "Monto", "Moneda", "Método pago", "Notas"],
        expenses.map((e) => [
          fmtDate(e.date, "dd/MM/yyyy"),
          e.description,
          e.category?.name ?? "",
          e.amount.toNumber(),
          e.currency,
          e.paymentMethod ?? "",
          e.notes ?? "",
        ]),
        "Gastos"
      );
      return excelResponse(buf, "gastos.xlsx");
    }

    const [total, data] = await prisma.$transaction([
      prisma.expense.count({ where }),
      prisma.expense.findMany({
        where,
        include: { category: true },
        orderBy: { date: "desc" },
        skip,
        take: limit,
      }),
    ]);

    return NextResponse.json({ data, meta: { total, page, limit } });
  } catch {
    return NextResponse.json({ error: "Error al obtener gastos", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }
  try { requireFeature(req, "financial"); } catch (e) { return e as Response; }

  try {
    const body = await req.json();
    const data = CreateExpenseSchema.parse(body);

    const expense = await prisma.expense.create({
      data: {
        organizationId: orgId,
        amount: data.amount,
        currency: data.currency,
        date: data.date ? new Date(data.date) : new Date(),
        description: data.description,
        categoryId: data.categoryId ?? null,
        cashSessionId: data.cashSessionId ?? null,
        paymentMethod: data.paymentMethod ?? null,
        notes: data.notes ?? null,
      },
      include: { category: true },
    });

    revalidateTag(`dashboard:${orgId}`);
    return NextResponse.json(expense, { status: 201 });
  } catch (e) {
    if (e instanceof ZodError) return NextResponse.json({ error: e.issues[0].message, code: "VALIDATION_ERROR" }, { status: 400 });
    return NextResponse.json({ error: "Error al crear gasto", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
