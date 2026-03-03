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
        subPreparations: { include: { subPrep: true } },
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
      let totalInBaseUnit: number;
      try {
        totalInBaseUnit = convertUnit(totalInBomUnit, bomUnit, ingredientBaseUnit);
      } catch {
        return NextResponse.json(
          {
            error: `Unidades incompatibles en "${bomItem.ingredient.name}": BOM usa ${bomUnit} pero el ingrediente está en ${ingredientBaseUnit}. Editá la preparación y corregí la unidad.`,
            code: "UNIT_MISMATCH",
          },
          { status: 400 }
        );
      }

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

    // Build deduction map for sub-preparations
    const subPrepDeductionMap = new Map<string, { delta: number; name: string; unit: Unit }>();

    for (const bomItem of preparation.subPreparations) {
      const wastageMultiplier = 1 + Number(bomItem.wastagePct) / 100;
      const effectiveQtyPerBatch = Number(bomItem.qty) * wastageMultiplier;
      const totalInBomUnit = effectiveQtyPerBatch * batches;
      const subPrepBaseUnit = bomItem.subPrep.unit as Unit;
      const bomUnit = bomItem.unit as Unit;
      let totalInBaseUnit: number;
      try {
        totalInBaseUnit = convertUnit(totalInBomUnit, bomUnit, subPrepBaseUnit);
      } catch {
        return NextResponse.json(
          {
            error: `Unidades incompatibles en preparación "${bomItem.subPrep.name}": BOM usa ${bomUnit} pero la preparación está en ${subPrepBaseUnit}.`,
            code: "UNIT_MISMATCH",
          },
          { status: 400 }
        );
      }

      const existing = subPrepDeductionMap.get(bomItem.subPrepId);
      if (existing) {
        existing.delta += totalInBaseUnit;
      } else {
        subPrepDeductionMap.set(bomItem.subPrepId, {
          delta: totalInBaseUnit,
          name: bomItem.subPrep.name,
          unit: subPrepBaseUnit,
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

      // Deduct sub-preparations
      const subPrepMovements = [];
      for (const [subPrepId, info] of Array.from(subPrepDeductionMap.entries())) {
        await tx.preparation.update({
          where: { id: subPrepId },
          data: { onHand: { decrement: info.delta } },
        });
        const movement = await tx.preparationMovement.create({
          data: {
            preparationId: subPrepId,
            type: "CONSUME",
            delta: -info.delta,
            reason,
          },
        });
        subPrepMovements.push(movement);
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

      return { preparation: updatedPrep, ingredientMovements, subPrepMovements, prepMovement };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: e.issues[0].message, code: "VALIDATION_ERROR" }, { status: 400 });
    }
    console.error("[produce]", e);
    return NextResponse.json({ error: "Error al registrar producción", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
