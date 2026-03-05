import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseExcel } from "@/utils/excel";
import { requireOrg } from "@/lib/requireOrg";

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

    const dataRows = rows.slice(1);
    let created = 0;
    let updated = 0;
    const errors: { row: number; error: string }[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      const cells = dataRows[i].map((v) => (v != null ? String(v).trim() : ""));
      const [name, sku, salePriceStr, currency] = cells;
      const rowNum = i + 2;

      if (!name) {
        errors.push({ row: rowNum, error: "Nombre vacío, fila ignorada" });
        continue;
      }

      const salePrice = parseFloat(salePriceStr.replace(",", ".")) || 0;
      const currencyVal = currency.toUpperCase() === "USD" ? "USD" : "ARS";

      try {
        // Match by SKU (if provided, it's unique) or by name
        const existing = await prisma.product.findFirst({
          where: sku
            ? { organizationId: orgId, OR: [{ sku }, { name: { equals: name, mode: "insensitive" } }] }
            : { organizationId: orgId, name: { equals: name, mode: "insensitive" } },
        });

        if (existing) {
          await prisma.product.update({
            where: { id: existing.id, organizationId: orgId },
            data: {
              name,
              sku: sku || existing.sku,
              salePrice: salePrice || existing.salePrice,
              currency: currencyVal as "ARS" | "USD",
            },
          });
          updated++;
        } else {
          await prisma.product.create({
            data: {
              name,
              organizationId: orgId,
              sku: sku || null,
              salePrice,
              currency: currencyVal as "ARS" | "USD",
            },
          });
          created++;
        }
      } catch {
        errors.push({ row: rowNum, error: `Error al procesar producto "${name}"` });
      }
    }

    return NextResponse.json({ created, updated, errors });
  } catch {
    return NextResponse.json({ error: "Error al procesar archivo", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
