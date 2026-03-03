const SEP = ";";
export const BOM = "\uFEFF";

export function escapeCell(v: string | number | null | undefined): string {
  if (v == null) return "";
  const s = String(v);
  if (s.includes(SEP) || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export function buildCSV(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const lines = [
    headers.map(escapeCell).join(SEP),
    ...rows.map((row) => row.map(escapeCell).join(SEP)),
  ];
  return BOM + lines.join("\r\n");
}

/** Parse a CSV string (BOM + semicolon separated). Returns array of rows (strings). */
export function parseCSV(text: string): string[][] {
  const cleaned = text.replace(/^\uFEFF/, "").trim();
  if (!cleaned) return [];
  return cleaned.split(/\r?\n/).map((line) => {
    const cells: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          current += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          current += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === SEP) {
        cells.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    cells.push(current.trim());
    return cells;
  });
}

/** Create a Response with CSV content and proper headers for download. */
export function csvResponse(csv: string, filename: string): Response {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

/** Client-side: fetch a URL and trigger a file download. */
export function downloadCSV(url: string, filename: string): void {
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
