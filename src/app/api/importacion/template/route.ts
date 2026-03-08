export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { buildMultiSheetExcel, type SheetSpec } from "@/utils/excelMultisheet";
import { excelResponse } from "@/utils/excel";
import { requireOrg } from "@/lib/requireOrg";

export async function GET(req: NextRequest) {
  try {
    requireOrg(req);
  } catch (e) {
    return e as Response;
  }

  const sheets: SheetSpec[] = [
    {
      name: "Ingredientes",
      headers: [
        "Nombre",
        "Unidad",
        "Stock_Actual",
        "Stock_Minimo",
        "Costo_Por_Unidad",
        "Moneda",
        "Proveedor",
      ],
      exampleRows: [
        ["Harina 000", "KG", 50, 10, 1500, "ARS", "Molinos del Sur"],
        ["Aceite de girasol", "L", 20, 5, 2200, "ARS", ""],
        ["Sal fina", "KG", 10, 2, 300, "ARS", ""],
      ],
      colWidths: [24, 10, 14, 14, 18, 10, 22],
    },
    {
      name: "Preparaciones",
      headers: ["Nombre", "Unidad", "Rendimiento", "Merma_Pct", "Notas"],
      exampleRows: [
        ["Masa para pizza", "UNIT", 1, 5, "Rendimiento = 1 masa"],
        ["Salsa de tomate", "L", 2, 3, "Por tanda"],
      ],
      colWidths: [24, 10, 14, 12, 30],
    },
    {
      name: "Preparaciones_Detalle",
      headers: [
        "Preparacion",
        "Tipo",
        "Referencia",
        "Cantidad",
        "Unidad",
        "Merma_Pct",
      ],
      exampleRows: [
        ["Masa para pizza", "ingrediente", "Harina 000", 500, "G", 0],
        ["Masa para pizza", "ingrediente", "Aceite de girasol", 30, "ML", 0],
        ["Masa para pizza", "ingrediente", "Sal fina", 5, "G", 0],
        ["Salsa de tomate", "ingrediente", "Harina 000", 0, "G", 0],
      ],
      colWidths: [24, 14, 24, 10, 10, 12],
    },
    {
      name: "Productos",
      headers: [
        "Nombre",
        "SKU",
        "Precio_Venta",
        "Moneda",
        "Categoria",
        "Descripcion",
      ],
      exampleRows: [
        [
          "Pizza Muzzarella",
          "PIZ-001",
          5000,
          "ARS",
          "Pizzas",
          "Pizza clásica de muzzarella",
        ],
        ["Pizza Napolitana", "PIZ-002", 5500, "ARS", "Pizzas", ""],
      ],
      colWidths: [24, 14, 14, 10, 16, 32],
    },
    {
      name: "Productos_Detalle",
      headers: [
        "Producto",
        "Tipo",
        "Referencia",
        "Cantidad",
        "Unidad",
        "Merma_Pct",
      ],
      exampleRows: [
        ["Pizza Muzzarella", "preparacion", "Masa para pizza", 1, "UNIT", 0],
        ["Pizza Muzzarella", "ingrediente", "Harina 000", 200, "G", 5],
        ["Pizza Napolitana", "preparacion", "Masa para pizza", 1, "UNIT", 0],
      ],
      colWidths: [24, 14, 24, 10, 10, 12],
    },
    {
      name: "Combos",
      headers: ["Nombre", "SKU", "Precio_Venta", "Moneda", "Notas"],
      exampleRows: [
        [
          "Combo Familiar",
          "COM-001",
          12000,
          "ARS",
          "2 pizzas grandes + bebida",
        ],
      ],
      colWidths: [24, 14, 14, 10, 30],
    },
    {
      name: "Combos_Detalle",
      headers: ["Combo", "Producto", "Cantidad"],
      exampleRows: [
        ["Combo Familiar", "Pizza Muzzarella", 1],
        ["Combo Familiar", "Pizza Napolitana", 1],
      ],
      colWidths: [24, 24, 12],
    },
  ];

  const buf = buildMultiSheetExcel(sheets);
  return excelResponse(buf, "plantilla_carga_masiva.xlsx");
}
