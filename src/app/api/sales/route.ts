import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { CreateSaleSchema } from "@/lib/validators";
import { ZodError } from "zod";
import { convertUnit } from "@/utils/units";
import type { Unit } from "@/types";
import { buildExcel, excelResponse } from "@/utils/excel";
import { format as fmtDate } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format");

    if (format === "xlsx") {
      const sales = await prisma.sale.findMany({
        include: { items: { include: { product: true } }, payments: true },
        orderBy: { date: "desc" },
      });
      const rows: (string | number | null)[][] = [];
      for (const sale of sales) {
        for (const item of sale.items) {
          rows.push([
            fmtDate(sale.date, "dd/MM/yyyy"),
            fmtDate(sale.date, "HH:mm"),
            item.product.name,
            item.quantity.toNumber(),
            sale.total.toNumber(),
            sale.notes ?? "",
          ]);
        }
        if (sale.items.length === 0) {
          rows.push([fmtDate(sale.date, "dd/MM/yyyy"), fmtDate(sale.date, "HH:mm"), "", "", sale.total.toNumber(), sale.notes ?? ""]);
        }
      }
      const buf = buildExcel(["Fecha", "Hora", "Producto", "Cantidad", "Total", "Notas"], rows, "Ventas");
      return excelResponse(buf, "ventas.xlsx");
    }

    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "20"));
    const skip = (page - 1) * limit;

    const [total, sales] = await prisma.$transaction([
      prisma.sale.count(),
      prisma.sale.findMany({
        skip,
        take: limit,
        select: {
          id: true,
          date: true,
          total: true,
          notes: true,
          items: {
            select: {
              productId: true,
              quantity: true,
              product: { select: { name: true } },
            },
          },
          payments: { select: { paymentMethod: true, amount: true } },
          combos: {
            select: {
              id: true,
              quantity: true,
              price: true,
              combo: { select: { name: true } },
            },
          },
        },
        orderBy: { date: "desc" },
      }),
    ]);

    return NextResponse.json({ data: sales, meta: { total, page, limit } });
  } catch {
    return NextResponse.json(
      { error: "Error al obtener ventas", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { date, notes, items, comboItems, payments } = CreateSaleSchema.parse(body);

    // ── Step 1: Load BOMs for regular products ─────────────────────────────────
    const productIds = items.map((i) => i.productId);
    const products = productIds.length > 0
      ? await prisma.product.findMany({
          where: { id: { in: productIds }, isActive: true },
          include: {
            ingredients: { include: { ingredient: true } },
            preparations: { include: { preparation: true } },
          },
        })
      : [];

    if (productIds.length > 0 && products.length !== productIds.length) {
      const foundIds = products.map((p) => p.id);
      const missing = productIds.filter((id) => !foundIds.includes(id));
      return NextResponse.json(
        { error: `Productos no encontrados o inactivos: ${missing.join(", ")}`, code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    // ── Step 1b: Load combos with their products + BOMs ────────────────────────
    const comboIds = (comboItems ?? []).map((c) => c.comboId);
    const combos = comboIds.length > 0
      ? await prisma.combo.findMany({
          where: { id: { in: comboIds }, isActive: true },
          include: {
            products: {
              include: {
                product: {
                  include: {
                    ingredients: { include: { ingredient: true } },
                    preparations: { include: { preparation: true } },
                  },
                },
              },
            },
          },
        })
      : [];

    if (comboIds.length > 0 && combos.length !== comboIds.length) {
      const foundIds = combos.map((c) => c.id);
      const missing = comboIds.filter((id) => !foundIds.includes(id));
      return NextResponse.json(
        { error: `Combos no encontrados o inactivos: ${missing.join(", ")}`, code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    // ── Step 2: Compute sale total ─────────────────────────────────────────────
    const productMap = new Map(products.map((p) => [p.id, p]));
    const comboMap = new Map(combos.map((c) => [c.id, c]));

    const saleTotal =
      items.reduce((sum, item) => {
        const product = productMap.get(item.productId)!;
        return sum + Number(product.salePrice) * item.quantity;
      }, 0) +
      (comboItems ?? []).reduce((sum, ci) => {
        const combo = comboMap.get(ci.comboId)!;
        return sum + Number(combo.salePrice) * ci.quantity;
      }, 0);

    // ── Step 3: Build ingredient deduction map ─────────────────────────────────
    const deductionMap = new Map<string, { delta: number; name: string; unit: Unit; onHand: number }>();

    function addIngredientDeduction(
      bom: {
        ingredientId: string;
        qty: { toNumber?(): number } | number | string;
        wastagePct: { toNumber?(): number } | number | string;
        unit: string;
        ingredient: { unit: string; name: string; onHand: { toNumber?(): number } | number | string };
      },
      saleQty: number
    ) {
      const wastageMultiplier = 1 + Number(bom.wastagePct) / 100;
      const totalInBomUnit = Number(bom.qty) * wastageMultiplier * saleQty;
      const ingredientBaseUnit = bom.ingredient.unit as Unit;
      const totalInBaseUnit = convertUnit(totalInBomUnit, bom.unit as Unit, ingredientBaseUnit);
      const existing = deductionMap.get(bom.ingredientId);
      if (existing) {
        existing.delta += totalInBaseUnit;
      } else {
        deductionMap.set(bom.ingredientId, {
          delta: totalInBaseUnit,
          name: bom.ingredient.name,
          unit: ingredientBaseUnit,
          onHand: Number(bom.ingredient.onHand),
        });
      }
    }

    // Regular items
    for (const saleItem of items) {
      const product = productMap.get(saleItem.productId)!;
      for (const bom of product.ingredients) {
        addIngredientDeduction(bom, saleItem.quantity);
      }
    }
    // Combo items
    for (const comboItem of (comboItems ?? [])) {
      const combo = comboMap.get(comboItem.comboId)!;
      for (const cp of combo.products) {
        for (const bom of cp.product.ingredients) {
          addIngredientDeduction(bom, Number(cp.quantity) * comboItem.quantity);
        }
      }
    }

    // ── Step 3b: Build preparation deduction map ───────────────────────────────
    const prepDeductionMap = new Map<string, { delta: number; name: string; unit: Unit; onHand: number }>();

    function addPrepDeduction(
      bomPrep: {
        preparationId: string;
        qty: { toNumber?(): number } | number | string;
        wastagePct: { toNumber?(): number } | number | string;
        unit: string;
        preparation: { unit: string; name: string; onHand: { toNumber?(): number } | number | string };
      },
      saleQty: number
    ) {
      const wastageMultiplier = 1 + Number(bomPrep.wastagePct) / 100;
      const totalInBomUnit = Number(bomPrep.qty) * wastageMultiplier * saleQty;
      const prepBaseUnit = bomPrep.preparation.unit as Unit;
      const totalInBaseUnit = convertUnit(totalInBomUnit, bomPrep.unit as Unit, prepBaseUnit);
      const existing = prepDeductionMap.get(bomPrep.preparationId);
      if (existing) {
        existing.delta += totalInBaseUnit;
      } else {
        prepDeductionMap.set(bomPrep.preparationId, {
          delta: totalInBaseUnit,
          name: bomPrep.preparation.name,
          unit: prepBaseUnit,
          onHand: Number(bomPrep.preparation.onHand),
        });
      }
    }

    // Regular items
    for (const saleItem of items) {
      const product = productMap.get(saleItem.productId)!;
      for (const bomPrep of product.preparations) {
        addPrepDeduction(bomPrep, saleItem.quantity);
      }
    }
    // Combo items
    for (const comboItem of (comboItems ?? [])) {
      const combo = comboMap.get(comboItem.comboId)!;
      for (const cp of combo.products) {
        for (const bomPrep of cp.product.preparations) {
          addPrepDeduction(bomPrep, Number(cp.quantity) * comboItem.quantity);
        }
      }
    }

    // ── Step 4: Collect stock warnings (non-blocking) ─────────────────────────
    const warnings: {
      ingredientId?: string;
      preparationId?: string;
      name: string;
      currentStock: number;
      required: number;
      deficit: number;
    }[] = [];

    for (const [ingredientId, info] of Array.from(deductionMap.entries())) {
      if (info.onHand - info.delta < 0) {
        warnings.push({ ingredientId, name: info.name, currentStock: info.onHand, required: info.delta, deficit: info.delta - info.onHand });
      }
    }
    for (const [preparationId, info] of Array.from(prepDeductionMap.entries())) {
      if (info.onHand - info.delta < 0) {
        warnings.push({ preparationId, name: info.name, currentStock: info.onHand, required: info.delta, deficit: info.delta - info.onHand });
      }
    }

    // ── Step 5: Execute atomic transaction ────────────────────────────────────
    const result = await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.create({
        data: {
          date: date ? new Date(date) : new Date(),
          notes,
          total: saleTotal,
          items: {
            create: items.map((i) => ({
              productId: i.productId,
              quantity: i.quantity,
            })),
          },
          ...(comboItems && comboItems.length > 0
            ? {
                combos: {
                  create: comboItems.map((ci) => ({
                    comboId: ci.comboId,
                    quantity: ci.quantity,
                    price: Number(comboMap.get(ci.comboId)!.salePrice) * ci.quantity,
                  })),
                },
              }
            : {}),
          ...(payments && payments.length > 0
            ? {
                payments: {
                  create: payments.map((p) => ({
                    paymentMethod: p.paymentMethod,
                    amount: p.amount,
                  })),
                },
              }
            : {}),
        },
      });

      const movements = [];

      for (const [ingredientId, info] of Array.from(deductionMap.entries())) {
        await tx.ingredient.update({
          where: { id: ingredientId },
          data: { onHand: { decrement: info.delta } },
        });
        const movement = await tx.stockMovement.create({
          data: {
            ingredientId,
            type: "SALE",
            delta: -info.delta,
            reason: `Venta ${sale.id}`,
            refId: sale.id,
          },
        });
        movements.push(movement);
      }

      for (const [preparationId, info] of Array.from(prepDeductionMap.entries())) {
        await tx.preparation.update({
          where: { id: preparationId },
          data: { onHand: { decrement: info.delta } },
        });
        await tx.preparationMovement.create({
          data: {
            preparationId,
            type: "SALE",
            delta: -info.delta,
            reason: `Venta ${sale.id}`,
          },
        });
      }

      return { sale, movements };
    });

    revalidateTag("dashboard");
    return NextResponse.json(
      { sale: result.sale, movements: result.movements, warnings },
      { status: 201 }
    );
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json(
        { error: e.issues[0].message, code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }
    console.error(e);
    return NextResponse.json(
      { error: "Error al registrar venta", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
