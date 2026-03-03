"use client";
import { useRef, useState } from "react";
import { downloadExcelTemplate } from "@/utils/excel";
import type { Row } from "@/utils/excel";

interface ImportResult {
  created: number;
  updated?: number;
  errors: { row: number; error: string }[];
}

interface ImportButtonProps {
  endpoint: string;
  templateHeaders: string[];
  templateExampleRow: Row;
  label?: string;
  onSuccess?: (result: ImportResult) => void;
}

export function ImportButton({
  endpoint,
  templateHeaders,
  templateExampleRow,
  label = "Importar Excel",
  onSuccess,
}: ImportButtonProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function downloadTemplate() {
    downloadExcelTemplate(templateHeaders, templateExampleRow, "plantilla.xlsx");
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setResult(null);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(endpoint, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Error al importar");
      } else {
        setResult(data);
        onSuccess?.(data);
      }
    } catch {
      setError("Error de red al subir el archivo");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={handleFile}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {uploading ? (
            <>
              <svg className="h-4 w-4 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Importando...
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              {label}
            </>
          )}
        </button>
        <button
          onClick={downloadTemplate}
          className="text-xs text-emerald-600 hover:text-emerald-800 underline"
        >
          Descargar plantilla
        </button>
      </div>

      {result && (
        <div className={`text-xs rounded px-2 py-1 ${result.errors.length > 0 ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-800"}`}>
          {result.created > 0 && <span>{result.created} creados</span>}
          {result.updated != null && result.updated > 0 && (
            <span className={result.created > 0 ? "ml-1" : ""}>{result.updated} actualizados</span>
          )}
          {result.created === 0 && (result.updated == null || result.updated === 0) && <span>Sin cambios</span>}
          {result.errors.length > 0 && (
            <span className="ml-1">· {result.errors.length} errores (fila {result.errors.map(e => e.row).join(", ")})</span>
          )}
        </div>
      )}
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
