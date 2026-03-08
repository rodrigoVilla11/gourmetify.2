"use client";
import { useRef, useState } from "react";
import { downloadExcel } from "@/utils/excel";
import type {
  ImportPlan,
  IngRow,
  PrepRow,
  ProdRow,
  ComboRow,
  ParseError,
} from "@/lib/importacionPlan";

type Step = "upload" | "previewing" | "preview" | "applying" | "done";

interface ApplyResult {
  ingredientes: { created: number; updated: number };
  preparaciones: { created: number; updated: number };
  productos: { created: number; updated: number };
  combos: { created: number; updated: number };
  errors: ParseError[];
}

type PreviewTab =
  | "ingredientes"
  | "preparaciones"
  | "productos"
  | "combos"
  | "errores";

const BRAND = "#0f2f26";

function Badge({
  action,
}: {
  action: "create" | "update" | "warning" | "error";
}) {
  const styles = {
    create:
      "bg-emerald-100 text-emerald-800 border border-emerald-200",
    update: "bg-blue-100 text-blue-800 border border-blue-200",
    warning: "bg-amber-100 text-amber-800 border border-amber-200",
    error: "bg-red-100 text-red-800 border border-red-200",
  };
  const labels = {
    create: "Nuevo",
    update: "Actualizar",
    warning: "Advertencia",
    error: "Error",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[action]}`}
    >
      {labels[action]}
    </span>
  );
}

function SectionStat({
  label,
  create,
  update,
  errors,
}: {
  label: string;
  create: number;
  update: number;
  errors: number;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
        {label}
      </p>
      <div className="flex gap-3 text-sm">
        {create > 0 && (
          <span className="text-emerald-700 font-semibold">
            +{create} nuevos
          </span>
        )}
        {update > 0 && (
          <span className="text-blue-700 font-semibold">
            ~{update} actualizaciones
          </span>
        )}
        {create === 0 && update === 0 && (
          <span className="text-gray-400">Sin cambios</span>
        )}
        {errors > 0 && (
          <span className="text-red-600 font-semibold">
            {errors} advertencias
          </span>
        )}
      </div>
    </div>
  );
}

export default function ImportacionPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [applyResult, setApplyResult] = useState<ApplyResult | null>(null);
  const [activeTab, setActiveTab] = useState<PreviewTab>("ingredientes");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fileRef2] = useState<{ file: File | null }>({ file: null });

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    fileRef2.file = file;
    setUploadError(null);
    setStep("previewing");

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch("/api/importacion/preview", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error ?? "Error al procesar archivo");
        setStep("upload");
        return;
      }
      setPlan(data as ImportPlan);
      setStep("preview");
      setActiveTab("ingredientes");
    } catch {
      setUploadError("Error de red al subir el archivo");
      setStep("upload");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleApply() {
    if (!fileRef2.file) return;
    setStep("applying");

    const fd = new FormData();
    fd.append("file", fileRef2.file);

    try {
      const res = await fetch("/api/importacion/apply", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error ?? "Error al aplicar importación");
        setStep("preview");
        return;
      }
      setApplyResult(data as ApplyResult);
      setStep("done");
    } catch {
      setUploadError("Error de red al aplicar importación");
      setStep("preview");
    }
  }

  function reset() {
    setPlan(null);
    setApplyResult(null);
    setUploadError(null);
    fileRef2.file = null;
    setStep("upload");
  }

  const totalCreate = plan
    ? plan.ingredientes.filter((r) => r.action === "create").length +
      plan.preparaciones.filter((r) => r.action === "create").length +
      plan.productos.filter((r) => r.action === "create").length +
      plan.combos.filter((r) => r.action === "create").length
    : 0;

  const totalUpdate = plan
    ? plan.ingredientes.filter((r) => r.action === "update").length +
      plan.preparaciones.filter((r) => r.action === "update").length +
      plan.productos.filter((r) => r.action === "update").length +
      plan.combos.filter((r) => r.action === "update").length
    : 0;

  const totalErrors = plan?.errors.length ?? 0;

  const tabs: { id: PreviewTab; label: string; count: number }[] = plan
    ? [
        {
          id: "ingredientes",
          label: "Ingredientes",
          count: plan.ingredientes.length,
        },
        {
          id: "preparaciones",
          label: "Preparaciones",
          count: plan.preparaciones.length,
        },
        { id: "productos", label: "Productos", count: plan.productos.length },
        { id: "combos", label: "Combos", count: plan.combos.length },
        { id: "errores", label: "Errores", count: plan.errors.length },
      ]
    : [];

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Carga Masiva</h1>
        <p className="mt-1 text-sm text-gray-500">
          Importá y exportá ingredientes, preparaciones, productos y combos con
          sus relaciones completas usando un único archivo Excel.
        </p>
      </div>

      {/* ── Upload step ─────────────────────────────────────────────────── */}
      {step === "upload" && (
        <div className="space-y-6">
          {/* Actions */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <ActionCard
              title="Descargar plantilla"
              description="Excel vacío con ejemplos para completar y luego importar"
              icon={
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
              }
              onClick={() =>
                downloadExcel(
                  "/api/importacion/template",
                  "plantilla_carga_masiva.xlsx"
                )
              }
              variant="secondary"
            />
            <ActionCard
              title="Exportar datos actuales"
              description="Descargá todo lo que hay en el sistema en formato reimportable"
              icon={
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              }
              onClick={() =>
                downloadExcel(
                  "/api/exportacion",
                  `exportacion_${new Date().toISOString().slice(0, 10)}.xlsx`
                )
              }
              variant="secondary"
            />
            <ActionCard
              title="Importar archivo"
              description="Subí tu Excel completado para previsualizar y confirmar los cambios"
              icon={
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12"
                  />
                </svg>
              }
              onClick={() => fileRef.current?.click()}
              variant="primary"
            />
          </div>

          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleFile}
          />

          {uploadError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {uploadError}
            </div>
          )}

          {/* Instructions */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">
              Cómo usar la carga masiva
            </h2>
            <ol className="space-y-2 text-sm text-gray-600 list-decimal list-inside">
              <li>
                <strong>Descargá la plantilla</strong> — contiene 7 hojas con
                ejemplos.
              </li>
              <li>
                <strong>Completá las hojas</strong> — las referencias entre
                entidades se hacen por nombre (o SKU para productos y combos).
              </li>
              <li>
                <strong>Importá el archivo</strong> — el sistema te mostrará
                una previsualización antes de aplicar.
              </li>
              <li>
                <strong>Confirmá</strong> — solo después de revisar la
                previsualización se guardan los cambios.
              </li>
            </ol>
            <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
              <strong>Orden de procesamiento:</strong> Ingredientes →
              Preparaciones → Productos → Combos. Las referencias se resuelven
              en este orden.
            </div>
          </div>

          {/* Sheet guide */}
          <SheetGuide />
        </div>
      )}

      {/* ── Previewing (loading) ─────────────────────────────────────────── */}
      {step === "previewing" && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <svg
            className="h-10 w-10 animate-spin text-emerald-600"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
          <p className="text-gray-500 text-sm">
            Analizando archivo y validando relaciones...
          </p>
        </div>
      )}

      {/* ── Preview ──────────────────────────────────────────────────────── */}
      {step === "preview" && plan && (
        <div className="space-y-5">
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SectionStat
              label="Ingredientes"
              create={plan.ingredientes.filter((r) => r.action === "create").length}
              update={plan.ingredientes.filter((r) => r.action === "update").length}
              errors={0}
            />
            <SectionStat
              label="Preparaciones"
              create={plan.preparaciones.filter((r) => r.action === "create").length}
              update={plan.preparaciones.filter((r) => r.action === "update").length}
              errors={plan.preparaciones.filter((r) => r.bomErrors?.length).length}
            />
            <SectionStat
              label="Productos"
              create={plan.productos.filter((r) => r.action === "create").length}
              update={plan.productos.filter((r) => r.action === "update").length}
              errors={plan.productos.filter((r) => r.bomErrors?.length).length}
            />
            <SectionStat
              label="Combos"
              create={plan.combos.filter((r) => r.action === "create").length}
              update={plan.combos.filter((r) => r.action === "update").length}
              errors={plan.combos.filter((r) => r.productErrors?.length).length}
            />
          </div>

          {/* Error banner */}
          {totalErrors > 0 && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
              <strong>{totalErrors} problemas detectados.</strong> Los ítems con
              advertencias en el BOM se importarán sin esas líneas. Revisá la
              pestaña &quot;Errores&quot; para ver el detalle.
            </div>
          )}

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex gap-1 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? "border-emerald-600 text-emerald-700"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-xs ${
                        tab.id === "errores"
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab content */}
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            {activeTab === "ingredientes" && (
              <IngredientesPreview rows={plan.ingredientes} />
            )}
            {activeTab === "preparaciones" && (
              <PreparacionesPreview rows={plan.preparaciones} />
            )}
            {activeTab === "productos" && (
              <ProductosPreview rows={plan.productos} />
            )}
            {activeTab === "combos" && <CombosPreview rows={plan.combos} />}
            {activeTab === "errores" && (
              <ErroresPreview errors={plan.errors} />
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={reset}
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <div className="flex items-center gap-3">
              <p className="text-sm text-gray-500">
                {totalCreate > 0 && (
                  <span className="text-emerald-700 font-medium">
                    {totalCreate} nuevos
                  </span>
                )}
                {totalCreate > 0 && totalUpdate > 0 && " · "}
                {totalUpdate > 0 && (
                  <span className="text-blue-700 font-medium">
                    {totalUpdate} actualizaciones
                  </span>
                )}
              </p>
              <button
                onClick={handleApply}
                disabled={totalCreate === 0 && totalUpdate === 0}
                className="px-5 py-2 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50"
                style={{ backgroundColor: BRAND }}
              >
                Confirmar importación
              </button>
            </div>
          </div>

          {uploadError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {uploadError}
            </div>
          )}
        </div>
      )}

      {/* ── Applying (loading) ───────────────────────────────────────────── */}
      {step === "applying" && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <svg
            className="h-10 w-10 animate-spin text-emerald-600"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
          <p className="text-gray-500 text-sm">Aplicando cambios...</p>
        </div>
      )}

      {/* ── Done ─────────────────────────────────────────────────────────── */}
      {step === "done" && applyResult && (
        <div className="space-y-5">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 flex items-start gap-3">
            <svg
              className="h-6 w-6 text-emerald-600 flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <h2 className="text-sm font-semibold text-emerald-800">
                Importación completada
              </h2>
              <p className="text-sm text-emerald-700 mt-0.5">
                Los datos fueron guardados correctamente en el sistema.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(
              [
                ["Ingredientes", applyResult.ingredientes],
                ["Preparaciones", applyResult.preparaciones],
                ["Productos", applyResult.productos],
                ["Combos", applyResult.combos],
              ] as [string, { created: number; updated: number }][]
            ).map(([label, counts]) => (
              <div
                key={label}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  {label}
                </p>
                <div className="space-y-1 text-sm">
                  {counts.created > 0 && (
                    <div className="text-emerald-700 font-semibold">
                      +{counts.created} creados
                    </div>
                  )}
                  {counts.updated > 0 && (
                    <div className="text-blue-700 font-semibold">
                      ~{counts.updated} actualizados
                    </div>
                  )}
                  {counts.created === 0 && counts.updated === 0 && (
                    <div className="text-gray-400">Sin cambios</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {applyResult.errors.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-800 mb-2">
                {applyResult.errors.length} advertencias durante la importación:
              </p>
              <ul className="space-y-1">
                {applyResult.errors.map((e, idx) => (
                  <li key={idx} className="text-xs text-amber-700">
                    <span className="font-medium">
                      {e.sheet} fila {e.row}:
                    </span>{" "}
                    {e.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={reset}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors"
            style={{ backgroundColor: BRAND }}
          >
            Nueva importación
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Action Card ─────────────────────────────────────────────────────────────

function ActionCard({
  title,
  description,
  icon,
  onClick,
  variant,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant: "primary" | "secondary";
}) {
  const BRAND = "#0f2f26";
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-start gap-3 rounded-xl border p-5 text-left transition-all hover:shadow-md w-full ${
        variant === "primary"
          ? "border-emerald-700 bg-emerald-800 text-white"
          : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
      }`}
      style={variant === "primary" ? { backgroundColor: BRAND } : {}}
    >
      <div
        className={`rounded-lg p-2 ${
          variant === "primary"
            ? "bg-white/20 text-white"
            : "bg-gray-100 text-gray-600"
        }`}
      >
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p
          className={`text-xs mt-0.5 ${
            variant === "primary" ? "text-emerald-100" : "text-gray-500"
          }`}
        >
          {description}
        </p>
      </div>
    </button>
  );
}

// ─── Sheet Guide ─────────────────────────────────────────────────────────────

function SheetGuide() {
  const sheets = [
    {
      name: "Ingredientes",
      cols: "Nombre*, Unidad*, Stock_Actual, Stock_Minimo, Costo_Por_Unidad, Moneda, Proveedor",
      note: 'Referenciados por Nombre en las otras hojas. Unidades: KG, G, L, ML, UNIT',
    },
    {
      name: "Preparaciones",
      cols: "Nombre*, Unidad*, Rendimiento, Merma_Pct, Notas",
      note: "Rendimiento = cuántas unidades produce una tanda",
    },
    {
      name: "Preparaciones_Detalle",
      cols: "Preparacion*, Tipo*, Referencia*, Cantidad*, Unidad*, Merma_Pct",
      note: 'Tipo = "ingrediente" o "preparacion". Referencia = nombre del ingrediente/preparación',
    },
    {
      name: "Productos",
      cols: "Nombre*, SKU, Precio_Venta, Moneda, Categoria, Descripcion",
      note: "SKU se usa para identificar productos en actualizaciones",
    },
    {
      name: "Productos_Detalle",
      cols: "Producto*, Tipo*, Referencia*, Cantidad*, Unidad*, Merma_Pct",
      note: 'Tipo = "ingrediente" o "preparacion"',
    },
    {
      name: "Combos",
      cols: "Nombre*, SKU, Precio_Venta, Moneda, Notas",
      note: "Un combo agrupa múltiples productos",
    },
    {
      name: "Combos_Detalle",
      cols: "Combo*, Producto*, Cantidad",
      note: "Referenciá el producto por nombre",
    },
  ];

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-700">
          Estructura del Excel ({sheets.length} hojas)
        </h2>
      </div>
      <div className="divide-y divide-gray-100">
        {sheets.map((s) => (
          <div key={s.name} className="px-5 py-3 flex gap-4">
            <div className="w-40 flex-shrink-0">
              <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-mono font-medium text-gray-700">
                {s.name}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-700 font-medium truncate">
                {s.cols}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{s.note}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="px-5 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-400">
        * = obligatorio
      </div>
    </div>
  );
}

// ─── Preview tables ───────────────────────────────────────────────────────────

function TableWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">{children}</table>
    </div>
  );
}

function IngredientesPreview({ rows }: { rows: IngRow[] }) {
  if (rows.length === 0)
    return (
      <p className="p-6 text-sm text-gray-400 text-center">
        Sin ingredientes en el archivo
      </p>
    );
  return (
    <TableWrapper>
      <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
        <tr>
          <th className="px-4 py-3 text-left">Acción</th>
          <th className="px-4 py-3 text-left">Nombre</th>
          <th className="px-4 py-3 text-left">Unidad</th>
          <th className="px-4 py-3 text-right">Stock</th>
          <th className="px-4 py-3 text-right">Costo</th>
          <th className="px-4 py-3 text-left">Proveedor</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {rows.map((r) => (
          <tr key={r.row} className="hover:bg-gray-50">
            <td className="px-4 py-2.5">
              <Badge action={r.action} />
            </td>
            <td className="px-4 py-2.5 font-medium text-gray-900">
              {r.nombre}
            </td>
            <td className="px-4 py-2.5 text-gray-500">{r.unidad}</td>
            <td className="px-4 py-2.5 text-right text-gray-700">
              {r.stockActual}
              {r.action === "update" && Math.abs(r.stockDelta) > 0.0001 && (
                <span
                  className={`ml-1 text-xs ${
                    r.stockDelta > 0 ? "text-emerald-600" : "text-red-500"
                  }`}
                >
                  ({r.stockDelta > 0 ? "+" : ""}
                  {r.stockDelta.toFixed(2)})
                </span>
              )}
            </td>
            <td className="px-4 py-2.5 text-right text-gray-700">
              {r.costo} {r.moneda}
            </td>
            <td className="px-4 py-2.5 text-gray-500">{r.proveedor || "—"}</td>
          </tr>
        ))}
      </tbody>
    </TableWrapper>
  );
}

function PreparacionesPreview({ rows }: { rows: PrepRow[] }) {
  if (rows.length === 0)
    return (
      <p className="p-6 text-sm text-gray-400 text-center">
        Sin preparaciones en el archivo
      </p>
    );
  return (
    <TableWrapper>
      <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
        <tr>
          <th className="px-4 py-3 text-left">Acción</th>
          <th className="px-4 py-3 text-left">Nombre</th>
          <th className="px-4 py-3 text-left">Unidad</th>
          <th className="px-4 py-3 text-right">Rendimiento</th>
          <th className="px-4 py-3 text-right">Merma</th>
          <th className="px-4 py-3 text-left">Receta</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {rows.map((r) => (
          <tr key={r.row} className="hover:bg-gray-50">
            <td className="px-4 py-2.5">
              <Badge action={r.action} />
            </td>
            <td className="px-4 py-2.5 font-medium text-gray-900">
              {r.nombre}
            </td>
            <td className="px-4 py-2.5 text-gray-500">{r.unidad}</td>
            <td className="px-4 py-2.5 text-right text-gray-700">
              {r.rendimiento}
            </td>
            <td className="px-4 py-2.5 text-right text-gray-700">
              {r.merma}%
            </td>
            <td className="px-4 py-2.5 text-gray-500 text-xs">
              {r.bom.length > 0 ? (
                <span>{r.bom.length} líneas</span>
              ) : (
                <span className="text-gray-300">Sin receta</span>
              )}
              {r.bomErrors.length > 0 && (
                <span className="ml-2 text-amber-600">
                  ⚠ {r.bomErrors.length} referencias no encontradas
                </span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </TableWrapper>
  );
}

function ProductosPreview({ rows }: { rows: ProdRow[] }) {
  if (rows.length === 0)
    return (
      <p className="p-6 text-sm text-gray-400 text-center">
        Sin productos en el archivo
      </p>
    );
  return (
    <TableWrapper>
      <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
        <tr>
          <th className="px-4 py-3 text-left">Acción</th>
          <th className="px-4 py-3 text-left">Nombre</th>
          <th className="px-4 py-3 text-left">SKU</th>
          <th className="px-4 py-3 text-right">Precio</th>
          <th className="px-4 py-3 text-left">Categoría</th>
          <th className="px-4 py-3 text-left">Receta</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {rows.map((r) => (
          <tr key={r.row} className="hover:bg-gray-50">
            <td className="px-4 py-2.5">
              <Badge action={r.action} />
            </td>
            <td className="px-4 py-2.5 font-medium text-gray-900">
              {r.nombre}
            </td>
            <td className="px-4 py-2.5 text-gray-500 font-mono text-xs">
              {r.sku || "—"}
            </td>
            <td className="px-4 py-2.5 text-right text-gray-700">
              {r.precioVenta} {r.moneda}
            </td>
            <td className="px-4 py-2.5 text-gray-500">{r.categoria || "—"}</td>
            <td className="px-4 py-2.5 text-gray-500 text-xs">
              {r.bom.length > 0 ? (
                <span>{r.bom.length} líneas</span>
              ) : (
                <span className="text-gray-300">Sin receta</span>
              )}
              {r.bomErrors.length > 0 && (
                <span className="ml-2 text-amber-600">
                  ⚠ {r.bomErrors.length} referencias no encontradas
                </span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </TableWrapper>
  );
}

function CombosPreview({ rows }: { rows: ComboRow[] }) {
  if (rows.length === 0)
    return (
      <p className="p-6 text-sm text-gray-400 text-center">
        Sin combos en el archivo
      </p>
    );
  return (
    <TableWrapper>
      <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
        <tr>
          <th className="px-4 py-3 text-left">Acción</th>
          <th className="px-4 py-3 text-left">Nombre</th>
          <th className="px-4 py-3 text-left">SKU</th>
          <th className="px-4 py-3 text-right">Precio</th>
          <th className="px-4 py-3 text-left">Productos</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {rows.map((r) => (
          <tr key={r.row} className="hover:bg-gray-50">
            <td className="px-4 py-2.5">
              <Badge action={r.action} />
            </td>
            <td className="px-4 py-2.5 font-medium text-gray-900">
              {r.nombre}
            </td>
            <td className="px-4 py-2.5 text-gray-500 font-mono text-xs">
              {r.sku || "—"}
            </td>
            <td className="px-4 py-2.5 text-right text-gray-700">
              {r.precioVenta} {r.moneda}
            </td>
            <td className="px-4 py-2.5 text-xs text-gray-500">
              {r.productos.length > 0 ? (
                r.productos.map((p) => p.producto).join(", ")
              ) : (
                <span className="text-gray-300">Sin productos</span>
              )}
              {r.productErrors.length > 0 && (
                <span className="ml-2 text-amber-600">
                  ⚠ {r.productErrors.length} no encontrados
                </span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </TableWrapper>
  );
}

function ErroresPreview({ errors }: { errors: ParseError[] }) {
  if (errors.length === 0)
    return (
      <p className="p-6 text-sm text-emerald-600 text-center">
        Sin errores de validación
      </p>
    );
  return (
    <TableWrapper>
      <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
        <tr>
          <th className="px-4 py-3 text-left">Hoja</th>
          <th className="px-4 py-3 text-right">Fila</th>
          <th className="px-4 py-3 text-left">Problema</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {errors.map((e, idx) => (
          <tr key={idx} className="hover:bg-gray-50">
            <td className="px-4 py-2.5">
              <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">
                {e.sheet}
              </span>
            </td>
            <td className="px-4 py-2.5 text-right text-gray-500">{e.row}</td>
            <td className="px-4 py-2.5 text-gray-700">{e.message}</td>
          </tr>
        ))}
      </tbody>
    </TableWrapper>
  );
}
