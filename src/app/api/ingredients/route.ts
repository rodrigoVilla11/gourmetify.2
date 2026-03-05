import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CreateIngredientSchema } from "@/lib/validators";
import { ZodError } from "zod";
import { Decimal } from "@prisma/client/runtime/library";
import { buildExcel, excelResponse } from "@/utils/excel";
import { requireOrg } from "@/lib/requireOrg";

export async function GET(req: NextRequest) {
  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }

  try {
    const { searchParams } = new URL(req.url);
    const isActive = searchParams.get("isActive");
    const lowStock = searchParams.get("lowStock") === "true";
    const format = searchParams.get("format");

    const ingredients = await prisma.ingredient.findMany({
      where: {
        organizationId: orgId,
        ...(isActive !== null ? { isActive: isActive === "true" } : {}),
      },
      include: { supplier: { select: { id: true, name: true } } },
      orderBy: { name: "asc" },
    });

    const data = ingredients
      .filter((i) => {
        if (lowStock) {
          return i.minQty.greaterThan(new Decimal(0)) && i.onHand.lessThan(i.minQty);
        }
        return true;
      })
      .map((i) => ({
        ...i,
        isLow: i.minQty.greaterThan(new Decimal(0)) && i.onHand.lessThan(i.minQty),
      }));

    if (format === "xlsx") {
      const buf = buildExcel(
        ["Nombre", "Unidad", "Stock Actual", "Stock Mínimo", "Costo/Unidad", "Moneda", "Proveedor"],
        data.map((i) => [
          i.name,
          i.unit,
          i.onHand.toNumber(),
          i.minQty.toNumber(),
          i.costPerUnit.toNumber(),
          i.currency,
          i.supplier?.name ?? "",
        ])
      );
      return excelResponse(buf, "ingredientes.xlsx");
    }

    const lowCount = ingredients.filter(
      (i) => i.minQty.greaterThan(new Decimal(0)) && i.onHand.lessThan(i.minQty)
    ).length;

    return NextResponse.json({ data, meta: { total: ingredients.length, lowCount } });
  } catch {
    return NextResponse.json(
      { error: "Error al obtener ingredientes", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }

  try {
    const body = await req.json();
    const data = CreateIngredientSchema.parse(body);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ingredient = await prisma.ingredient.create({ data: { ...(data as any), organizationId: orgId } });
    return NextResponse.json(ingredient, { status: 201 });
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json(
        { error: e.issues[0].message, code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Error al crear ingrediente", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
