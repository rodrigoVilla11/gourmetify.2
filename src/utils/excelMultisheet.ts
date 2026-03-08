import * as XLSX from "xlsx";

export type CellValue = string | number | null | undefined;
export type SheetRows = CellValue[][];

export interface SheetSpec {
  name: string;
  headers: string[];
  rows?: SheetRows;
  exampleRows?: SheetRows;
  /** character widths per column */
  colWidths?: number[];
}

/** Server-side: build a multi-sheet .xlsx Buffer */
export function buildMultiSheetExcel(sheets: SheetSpec[]): Buffer {
  const wb = XLSX.utils.book_new();
  for (const sheet of sheets) {
    const data: SheetRows = [
      sheet.headers,
      ...(sheet.exampleRows ?? []),
      ...(sheet.rows ?? []),
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const widths =
      sheet.colWidths ??
      sheet.headers.map((h) => Math.max(String(h).length + 4, 16));
    ws["!cols"] = widths.map((w) => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  }
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

/** Server-side: parse all sheets from an uploaded .xlsx file */
export function parseMultiSheetExcel(
  ab: ArrayBuffer
): Record<string, SheetRows> {
  const wb = XLSX.read(ab, { type: "array" });
  const result: Record<string, SheetRows> = {};
  for (const name of wb.SheetNames) {
    result[name] = XLSX.utils.sheet_to_json<CellValue[]>(wb.Sheets[name], {
      header: 1,
      defval: "",
    });
  }
  return result;
}
