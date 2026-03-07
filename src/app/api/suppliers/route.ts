export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CreateSupplierSchema } from "@/lib/validators";
import { ZodError } from "zod";
import { buildExcel, excelResponse } from "@/utils/excel";
import { requireOrg, requireFeature } from "@/lib/requireOrg";

export async function GET(req: NextRequest) {  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }

  try {
    const format = new URL(req.url).searchParams.get("format");
    const suppliers = await prisma.supplier.findMany({
      where: { organizationId: orgId },
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

export async function POST(req: NextRequest) {  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }
  try { requireFeature(req, "suppliers"); } catch (e) { return e as Response; }

  try {
    const body = await req.json();
    const data = CreateSupplierSchema.parse(body);
    const supplier = await prisma.supplier.create({ data: { ...data, organizationId: orgId } });
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
