import * as XLSX from "xlsx";

export type Row = (string | number | null | undefined)[];

/** Server-side: build an .xlsx Buffer from headers + data rows */
export function buildExcel(headers: string[], rows: Row[], sheetName = "Datos"): Buffer {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  // Auto column widths (approximate)
  ws["!cols"] = headers.map((h) => ({ wch: Math.max(h.length, 12) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

/** Server-side: create a Response with the Excel buffer */
export function excelResponse(buf: Buffer, filename: string): Response {
  return new Response(buf as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

/** Server-side: parse an uploaded Excel file → array of rows (row 0 = headers) */
export function parseExcel(arrayBuffer: ArrayBuffer): Row[] {
  const wb = XLSX.read(arrayBuffer, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<Row>(ws, { header: 1, defval: "" });
}

/** Client-side: generate an Excel template and trigger download */
export function downloadExcelTemplate(
  headers: string[],
  exampleRow: Row,
  filename: string
): void {
  const ws = XLSX.utils.aoa_to_sheet([headers, exampleRow]);
  ws["!cols"] = headers.map((h) => ({ wch: Math.max(String(h).length, 14) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Datos");
  XLSX.writeFile(wb, filename);
}

/** Client-side: fetch a URL and trigger an Excel file download */
export function downloadExcel(url: string, filename: string): void {
  fetch(url)
    .then((r) => r.blob())
    .then((blob) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    });
}
