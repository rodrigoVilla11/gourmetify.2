import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseExcel } from "@/utils/excel";
import { requireOrg } from "@/lib/requireOrg";

const VALID_UNITS = ["KG", "G", "L", "ML", "UNIT"];

export async function POST(req: NextRequest) {  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "Archivo no enviado", code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const rows = parseExcel(arrayBuffer);
    if (rows.length < 2) {
      return NextResponse.json({ error: "El archivo no tiene datos", code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const suppliers = await prisma.supplier.findMany({ where: { organizationId: orgId }, select: { id: true, name: true } });

    const dataRows = rows.slice(1);
    let created = 0;
    let updated = 0;
    const errors: { row: number; error: string }[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      const cells = dataRows[i].map((v) => (v != null ? String(v).trim() : ""));
      const [name, unit, onHandStr, minQtyStr, costStr, currency, supplierName] = cells;
      const rowNum = i + 2;

      if (!name) {
        errors.push({ row: rowNum, error: "Nombre vacío, fila ignorada" });
        continue;
      }

      const unitUpper = unit.toUpperCase();
      if (!VALID_UNITS.includes(unitUpper)) {
        errors.push({ row: rowNum, error: `Unidad inválida "${unit}". Válidas: ${VALID_UNITS.join(", ")}` });
        continue;
      }

      const onHand = parseFloat(onHandStr.replace(",", ".")) || 0;
      const minQty = parseFloat(minQtyStr.replace(",", ".")) || 0;
      const costPerUnit = parseFloat(costStr.replace(",", ".")) || 0;
      const currencyVal = currency.toUpperCase() === "USD" ? "USD" : "ARS";

      let supplierId: string | undefined;
      if (supplierName) {
        const found = suppliers.find((s) => s.name.toLowerCase() === supplierName.toLowerCase());
        supplierId = found?.id;
      }

      try {
        const existing = await prisma.ingredient.findFirst({
          where: { organizationId: orgId, name: { equals: name, mode: "insensitive" } },
        });

        if (existing) {
          const currentOnHand = Number(existing.onHand);
          await prisma.ingredient.update({
            where: { id: existing.id, organizationId: orgId },
            data: {
              unit: unitUpper as "KG" | "G" | "L" | "ML" | "UNIT",
              onHand,
              minQty: minQty || existing.minQty,
              costPerUnit: costPerUnit || existing.costPerUnit,
              currency: currencyVal as "ARS" | "USD",
              supplierId: supplierId ?? existing.supplierId,
            },
          });

          const delta = onHand - currentOnHand;
          if (Math.abs(delta) > 0.0001) {
            await prisma.stockMovement.create({
              data: {
                ingredientId: existing.id,
                organizationId: orgId,
                type: "ADJUSTMENT",
                delta,
                reason: "Ajuste por reimportación Excel",
              },
            });
          }
          updated++;
        } else {
          const ingredient = await prisma.ingredient.create({
            data: {
              name,
              organizationId: orgId,
              unit: unitUpper as "KG" | "G" | "L" | "ML" | "UNIT",
              onHand,
              minQty,
              costPerUnit,
              currency: currencyVal as "ARS" | "USD",
              supplierId: supplierId ?? null,
            },
          });

          if (onHand > 0) {
            await prisma.stockMovement.create({
              data: {
                ingredientId: ingredient.id,
                organizationId: orgId,
                type: "ADJUSTMENT",
                delta: onHand,
                reason: "Stock inicial (importación Excel)",
              },
            });
          }
          created++;
        }
      } catch {
        errors.push({ row: rowNum, error: `Error al procesar ingrediente "${name}"` });
      }
    }

    return NextResponse.json({ created, updated, errors });
  } catch {
    return NextResponse.json({ error: "Error al procesar archivo", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
