import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CreateSupplierSchema } from "@/lib/validators";
import { ZodError } from "zod";
import { buildExcel, excelResponse } from "@/utils/excel";

export async function GET(req: NextRequest) {
  try {
    const format = new URL(req.url).searchParams.get("format");
    const suppliers = await prisma.supplier.findMany({
      include: { _count: { select: { ingredients: true } } },
      orderBy: { name: "asc" },
    });

    if (format === "xlsx") {
      const buf = buildExcel(
        ["Nombre", "Teléfono", "Email", "Notas"],
        suppliers.map((s) => [s.name, s.phone ?? "", s.email ?? "", s.notes ?? ""])
      );
      return excelResponse(buf, "proveedores.xlsx");
    }

    return NextResponse.json(suppliers);
  } catch {
    return NextResponse.json(
      { error: "Error al obtener proveedores", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = CreateSupplierSchema.parse(body);
    const supplier = await prisma.supplier.create({ data });
    return NextResponse.json(supplier, { status: 201 });
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json(
        { error: e.issues[0].message, code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Error al crear proveedor", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
