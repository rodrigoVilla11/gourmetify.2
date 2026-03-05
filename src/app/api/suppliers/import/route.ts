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
      const [name, phone, email, notes] = dataRows[i].map((v) => (v != null ? String(v).trim() : ""));
      const rowNum = i + 2;

      if (!name) {
        errors.push({ row: rowNum, error: "Nombre vacío, fila ignorada" });
        continue;
      }

      try {
        const existing = await prisma.supplier.findFirst({
          where: { organizationId: orgId, name: { equals: name, mode: "insensitive" } },
        });

        if (existing) {
          await prisma.supplier.update({
            where: { id: existing.id, organizationId: orgId },
            data: {
              phone: phone || existing.phone,
              email: email || existing.email,
              notes: notes || existing.notes,
            },
          });
          updated++;
        } else {
          await prisma.supplier.create({
            data: {
              name,
              organizationId: orgId,
              phone: phone || null,
              email: email || null,
              notes: notes || null,
            },
          });
          created++;
        }
      } catch {
        errors.push({ row: rowNum, error: `Error al procesar proveedor "${name}"` });
      }
    }

    return NextResponse.json({ created, updated, errors });
  } catch {
    return NextResponse.json({ error: "Error al procesar archivo", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
