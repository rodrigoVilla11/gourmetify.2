import { prisma } from "@/lib/prisma";
import { convertUnit } from "@/utils/units";
import type { Unit } from "@/types";

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

type BOMIngredient = {
  ingredientId: string;
  qty: { toNumber?(): number } | number | string;
  wastagePct: { toNumber?(): number } | number | string;
  unit: string;
  ingredient: { unit: string; name: string; onHand: { toNumber?(): number } | number | string };
};

type BOMPrep = {
  preparationId: string;
  qty: { toNumber?(): number } | number | string;
  wastagePct: { toNumber?(): number } | number | string;
  unit: string;
  preparation: { unit: string; name: string; onHand: { toNumber?(): number } | number | string };
};

type DeductionEntry = { delta: number; name: string; unit: Unit; onHand: number };

function buildDeductionMaps(
  products: {
    id: string;
    ingredients: BOMIngredient[];
    preparations: BOMPrep[];
  }[],
  items: { productId: string; quantity: number }[],
  combos: {
    id: string;
    products: {
      quantity: { toNumber?(): number } | number | string;
      product: {
        ingredients: BOMIngredient[];
        preparations: BOMPrep[];
      };
    }[];
  }[],
  comboItems: { comboId: string; quantity: number }[]
): {
  deductionMap: Map<string, DeductionEntry>;
  prepDeductionMap: Map<string, DeductionEntry>;
} {
  const deductionMap = new Map<string, DeductionEntry>();
  const prepDeductionMap = new Map<string, DeductionEntry>();

  function addIngredientDeduction(bom: BOMIngredient, saleQty: number) {
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

  function addPrepDeduction(bomPrep: BOMPrep, saleQty: number) {
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

  const productMap = new Map(products.map((p) => [p.id, p]));
  const comboMap = new Map(combos.map((c) => [c.id, c]));

  for (const saleItem of items) {
    const product = productMap.get(saleItem.productId);
    if (!product) continue;
    for (const bom of product.ingredients) addIngredientDeduction(bom, saleItem.quantity);
    for (const bomPrep of product.preparations) addPrepDeduction(bomPrep, saleItem.quantity);
  }

  for (const comboItem of comboItems) {
    const combo = comboMap.get(comboItem.comboId);
    if (!combo) continue;
    for (const cp of combo.products) {
      const cpQty = Number(cp.quantity);
      for (const bom of cp.product.ingredients) addIngredientDeduction(bom, cpQty * comboItem.quantity);
      for (const bomPrep of cp.product.preparations) addPrepDeduction(bomPrep, cpQty * comboItem.quantity);
    }
  }

  return { deductionMap, prepDeductionMap };
}

export async function deductSaleStock(
  tx: TxClient,
  saleId: string,
  items: { productId: string; quantity: number }[],
  comboItems: { comboId: string; quantity: number }[],
  orgId: string
): Promise<{ ingredientId?: string; preparationId?: string; name: string; currentStock: number; required: number; deficit: number }[]> {
  const productIds = items.map((i) => i.productId);
  const comboIds = comboItems.map((c) => c.comboId);

  // organizationId filter is required here to prevent cross-tenant stock manipulation
  const [products, combos] = await Promise.all([
    productIds.length > 0
      ? tx.product.findMany({
          where: { id: { in: productIds }, organizationId: orgId },
          include: {
            ingredients: { include: { ingredient: true } },
            preparations: { include: { preparation: true } },
          },
        })
      : [],
    comboIds.length > 0
      ? tx.combo.findMany({
          where: { id: { in: comboIds }, organizationId: orgId },
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
      : [],
  ]);

  const { deductionMap, prepDeductionMap } = buildDeductionMaps(
    products as Parameters<typeof buildDeductionMaps>[0],
    items,
    combos as Parameters<typeof buildDeductionMaps>[2],
    comboItems
  );

  const warnings: { ingredientId?: string; preparationId?: string; name: string; currentStock: number; required: number; deficit: number }[] = [];

  for (const [ingredientId, info] of Array.from(deductionMap.entries())) {
    if (info.onHand - info.delta < 0) {
      warnings.push({ ingredientId, name: info.name, currentStock: info.onHand, required: info.delta, deficit: info.delta - info.onHand });
    }
    await tx.ingredient.update({ where: { id: ingredientId }, data: { onHand: { decrement: info.delta } } });
    await tx.stockMovement.create({
      data: { ingredientId, organizationId: orgId, type: "SALE", delta: -info.delta, reason: `Venta ${saleId}`, refId: saleId },
    });
  }

  for (const [preparationId, info] of Array.from(prepDeductionMap.entries())) {
    if (info.onHand - info.delta < 0) {
      warnings.push({ preparationId, name: info.name, currentStock: info.onHand, required: info.delta, deficit: info.delta - info.onHand });
    }
    await tx.preparation.update({ where: { id: preparationId }, data: { onHand: { decrement: info.delta } } });
    await tx.preparationMovement.create({
      data: { preparationId, organizationId: orgId, type: "SALE", delta: -info.delta, reason: `Venta ${saleId}` },
    });
  }

  return warnings;
}

export async function returnSaleStock(
  tx: TxClient,
  saleId: string,
  items: { productId: string; quantity: number }[],
  comboItems: { comboId: string; quantity: number }[],
  orgId: string
): Promise<void> {
  const productIds = items.map((i) => i.productId);
  const comboIds   = comboItems.map((c) => c.comboId);

  // organizationId filter prevents cross-tenant stock corruption
  const [products, combos] = await Promise.all([
    productIds.length > 0
      ? tx.product.findMany({
          where: { id: { in: productIds }, organizationId: orgId },
          include: {
            ingredients: { include: { ingredient: true } },
            preparations: { include: { preparation: true } },
          },
        })
      : [],
    comboIds.length > 0
      ? tx.combo.findMany({
          where: { id: { in: comboIds }, organizationId: orgId },
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
      : [],
  ]);

  const { deductionMap, prepDeductionMap } = buildDeductionMaps(
    products as Parameters<typeof buildDeductionMaps>[0],
    items,
    combos as Parameters<typeof buildDeductionMaps>[2],
    comboItems
  );

  for (const [ingredientId, info] of Array.from(deductionMap.entries())) {
    await tx.ingredient.update({ where: { id: ingredientId }, data: { onHand: { increment: info.delta } } });
    await tx.stockMovement.create({
      data: { ingredientId, organizationId: orgId, type: "ADJUSTMENT", delta: info.delta, reason: `Edición venta ${saleId}`, refId: saleId },
    });
  }

  for (const [preparationId, info] of Array.from(prepDeductionMap.entries())) {
    await tx.preparation.update({ where: { id: preparationId }, data: { onHand: { increment: info.delta } } });
    await tx.preparationMovement.create({
      data: { preparationId, organizationId: orgId, type: "ADJUSTMENT", delta: info.delta, reason: `Edición venta ${saleId}` },
    });
  }
}

export async function rollbackSaleStock(
  tx: TxClient,
  saleId: string,
  items: { productId: string; quantity: number }[],
  comboItems: { comboId: string; quantity: number }[],
  orgId: string
): Promise<void> {
  // Rollback ingredients via StockMovement records
  const stockMoves = await tx.stockMovement.findMany({ where: { refId: saleId, type: "SALE", organizationId: orgId } });
  for (const move of stockMoves) {
    const toRestore = -Number(move.delta); // delta is negative (SALE deduction), so negate it
    await tx.ingredient.update({ where: { id: move.ingredientId }, data: { onHand: { increment: toRestore } } });
    await tx.stockMovement.create({
      data: { organizationId: orgId, ingredientId: move.ingredientId, type: "ADJUSTMENT", delta: toRestore, reason: `Rollback venta ${saleId}`, refId: saleId },
    });
  }

  // Rollback preparations by recomputing BOM
  const productIds = items.map((i) => i.productId);
  const comboIds = comboItems.map((c) => c.comboId);

  const [products, combos] = await Promise.all([
    productIds.length > 0
      ? tx.product.findMany({
          where: { id: { in: productIds } },
          include: {
            ingredients: { include: { ingredient: true } },
            preparations: { include: { preparation: true } },
          },
        })
      : [],
    comboIds.length > 0
      ? tx.combo.findMany({
          where: { id: { in: comboIds } },
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
      : [],
  ]);

  const { prepDeductionMap } = buildDeductionMaps(
    products as Parameters<typeof buildDeductionMaps>[0],
    items,
    combos as Parameters<typeof buildDeductionMaps>[2],
    comboItems
  );

  for (const [preparationId, info] of Array.from(prepDeductionMap.entries())) {
    await tx.preparation.update({ where: { id: preparationId }, data: { onHand: { increment: info.delta } } });
    await tx.preparationMovement.create({
      data: { organizationId: orgId, preparationId, type: "ADJUSTMENT", delta: info.delta, reason: `Rollback venta ${saleId}` },
    });
  }
}
