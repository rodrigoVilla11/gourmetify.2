import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CreateProductSchema } from "@/lib/validators";
import { ZodError } from "zod";
import { buildExcel, excelResponse } from "@/utils/excel";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const isActive = searchParams.get("isActive");
    const format = searchParams.get("format");

    const products = await prisma.product.findMany({
      where: {
        ...(isActive !== null ? { isActive: isActive === "true" } : {}),
      },
      include: {
        ingredients: { include: { ingredient: { select: { id: true, name: true, unit: true } } } },
        preparations: { include: { preparation: { select: { id: true, name: true, unit: true } } } },
      },
      orderBy: { name: "asc" },
    });

    if (format === "xlsx") {
      // Flat: one row per BOM entry; products with no BOM get one row with empty ingredient cols
      const rows: (string | number | null)[][] = [];
      for (const p of products) {
        if (p.ingredients.length === 0) {
          rows.push([p.name, p.sku ?? "", p.salePrice.toNumber(), p.currency, "", "", "", ""]);
        } else {
          for (const bom of p.ingredients) {
            rows.push([
              p.name, p.sku ?? "", p.salePrice.toNumber(), p.currency,
              bom.ingredient.name, bom.qty.toNumber(), bom.unit, bom.wastagePct.toNumber(),
            ]);
          }
        }
      }
      const buf = buildExcel(
        ["Producto", "SKU", "Precio de Venta", "Moneda", "Ingrediente", "Cantidad BOM", "Unidad BOM", "Merma%"],
        rows
      );
      return excelResponse(buf, "productos.xlsx");
    }

    return NextResponse.json({ data: products });
  } catch {
    return NextResponse.json(
      { error: "Error al obtener productos", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ingredients, ...productData } = CreateProductSchema.parse(body);

    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          ...productData,
          ingredients: {
            create: ingredients.map((item) => ({
              ingredientId: item.ingredientId,
              qty: item.qty,
              unit: item.unit,
              wastagePct: item.wastagePct ?? 0,
            })),
          },
        },
        include: {
          ingredients: { include: { ingredient: { select: { id: true, name: true, unit: true } } } },
          preparations: { include: { preparation: { select: { id: true, name: true, unit: true } } } },
        },
      });
      return created;
    });

    return NextResponse.json(product, { status: 201 });
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json(
        { error: e.issues[0].message, code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Error al crear producto", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
