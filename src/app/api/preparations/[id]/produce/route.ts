import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ProducePreparationSchema } from "@/lib/validators";
import { ZodError } from "zod";
import { convertUnit } from "@/utils/units";
import type { Unit } from "@/types";

type Params = { params: { id: string } };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const body = await req.json();
    const { batches, notes } = ProducePreparationSchema.parse(body);

    const preparation = await prisma.preparation.findUnique({
      where: { id: params.id, isActive: true },
      include: {
        ingredients: { include: { ingredient: true } },
      },
    });

    if (!preparation) {
      return NextResponse.json({ error: "Preparación no encontrada", code: "NOT_FOUND" }, { status: 404 });
    }

    // Build deduction map for raw ingredients (same logic as sale BOM)
    const deductionMap = new Map<string, { delta: number; name: string; unit: Unit; onHand: number }>();

    for (const bomItem of preparation.ingredients) {
      const wastageMultiplier = 1 + Number(bomItem.wastagePct) / 100;
      const effectiveQtyPerBatch = Number(bomItem.qty) * wastageMultiplier;
      const totalInBomUnit = effectiveQtyPerBatch * batches;
      const ingredientBaseUnit = bomItem.ingredient.unit as Unit;
      const bomUnit = bomItem.unit as Unit;
      const totalInBaseUnit = convertUnit(totalInBomUnit, bomUnit, ingredientBaseUnit);

      const existing = deductionMap.get(bomItem.ingredientId);
      if (existing) {
        existing.delta += totalInBaseUnit;
      } else {
        deductionMap.set(bomItem.ingredientId, {
          delta: totalInBaseUnit,
          name: bomItem.ingredient.name,
          unit: ingredientBaseUnit,
          onHand: Number(bomItem.ingredient.onHand),
        });
      }
    }

    const yieldTotal = Number(preparation.yieldQty) * batches;
    const reason = `Producción de ${preparation.name} (${batches} ${batches === 1 ? "tanda" : "tandas"})`;

    const result = await prisma.$transaction(async (tx) => {
      // Deduct raw ingredients
      const ingredientMovements = [];
      for (const [ingredientId, info] of Array.from(deductionMap.entries())) {
        await tx.ingredient.update({
          where: { id: ingredientId },
          data: { onHand: { decrement: info.delta } },
        });
        const movement = await tx.stockMovement.create({
          data: {
            ingredientId,
            type: "ADJUSTMENT",
            delta: -info.delta,
            reason,
          },
        });
        ingredientMovements.push(movement);
      }

      // Add to preparation stock
      const updatedPrep = await tx.preparation.update({
        where: { id: params.id },
        data: { onHand: { increment: yieldTotal } },
      });

      // Record preparation movement
      const prepMovement = await tx.preparationMovement.create({
        data: {
          preparationId: params.id,
          type: "PRODUCE",
          delta: yieldTotal,
          reason: notes ?? reason,
        },
      });

      return { preparation: updatedPrep, ingredientMovements, prepMovement };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: e.issues[0].message, code: "VALIDATION_ERROR" }, { status: 400 });
    }
    return NextResponse.json({ error: "Error al registrar producción", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
