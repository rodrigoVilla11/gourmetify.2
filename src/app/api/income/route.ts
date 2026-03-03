import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { CreateIncomeEntrySchema } from "@/lib/validators";
import { ZodError } from "zod";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "50"));
    const skip = (page - 1) * limit;

    const where = {
      ...(from && to
        ? { date: { gte: new Date(from), lte: new Date(to + "T23:59:59.999Z") } }
        : {}),
    };

    const [total, data] = await prisma.$transaction([
      prisma.incomeEntry.count({ where }),
      prisma.incomeEntry.findMany({
        where,
        orderBy: { date: "desc" },
        skip,
        take: limit,
      }),
    ]);

    return NextResponse.json({ data, meta: { total, page, limit } });
  } catch {
    return NextResponse.json({ error: "Error al obtener ingresos", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = CreateIncomeEntrySchema.parse(body);

    const entry = await prisma.incomeEntry.create({
      data: {
        amount: data.amount,
        currency: data.currency,
        date: data.date ? new Date(data.date) : new Date(),
        paymentMethod: data.paymentMethod,
        description: data.description,
        notes: data.notes ?? null,
      },
    });

    revalidateTag("dashboard");
    return NextResponse.json(entry, { status: 201 });
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: e.issues[0].message, code: "VALIDATION_ERROR" }, { status: 400 });
    }
    return NextResponse.json({ error: "Error al crear ingreso", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
