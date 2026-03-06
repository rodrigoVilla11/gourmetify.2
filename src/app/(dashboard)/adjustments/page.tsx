"use client";
import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { formatQty, unitLabel } from "@/utils/units";
import type { Unit } from "@/types";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const BRAND = "#0f2f26";

function PrimaryBtn({ type = "button", onClick, disabled, children }: { type?: "button" | "submit"; onClick?: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      style={{ background: disabled ? "#9ca3af" : BRAND }}
      className="px-4 py-2 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed">
      {children}
    </button>
  );
}

interface Ingredient { id: string; name: string; unit: Unit; onHand: string }
interface Preparation { id: string; name: string; unit: string; onHand: string }
interface Movement {
  id: string;
  kind: "ingredient" | "preparation";
  name: string;
  unit: string;
  delta: string;
  reason: string | null;
  createdAt: string;
}
interface AdjustmentForm {
  subjectId: string;
  delta: number;
  reason?: string;
}

export default function AdjustmentsPage() {
  const [adjType, setAdjType] = useState<"ingredient" | "preparation">("ingredient");
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [preparations, setPreparations] = useState<Preparation[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<AdjustmentForm>();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [ingRes, prepRes, movRes] = await Promise.all([
      fetch("/api/ingredients?isActive=true"),
      fetch("/api/preparations?isActive=true"),
      fetch("/api/adjustments"),
    ]);
    const { data: ingData } = await ingRes.json();
    const { data: prepData } = await prepRes.json();
    const movData = await movRes.json();
    setIngredients(ingData ?? []);
    setPreparations(prepData ?? []);
    setMovements(movData ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onSubmit = async (data: AdjustmentForm) => {
    setSaving(true);
    setSuccess(false);
    setErrorMsg("");
    try {
      const body = adjType === "ingredient"
        ? { type: "ingredient", ingredientId: data.subjectId, delta: Number(data.delta), reason: data.reason }
        : { type: "preparation", preparationId: data.subjectId, delta: Number(data.delta), reason: data.reason };
      const res = await fetch("/api/adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setSuccess(true);
        reset({ subjectId: "", delta: 0, reason: "" });
        fetchData();
        setTimeout(() => setSuccess(false), 4000);
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(err.error ?? "Error al registrar ajuste");
      }
    } finally {
      setSaving(false);
    }
  };

  const selectedId = watch("subjectId");
  const selectedIng = ingredients.find((i) => i.id === selectedId);
  const selectedPrep = preparations.find((p) => p.id === selectedId);
  const selectedUnit = adjType === "ingredient" ? selectedIng?.unit : selectedPrep?.unit;
  const selectedOnHand = adjType === "ingredient"
    ? (selectedIng ? formatQty(selectedIng.onHand, selectedIng.unit as Unit) : null)
    : (selectedPrep ? `${Number(selectedPrep.onHand)} ${selectedPrep.unit}` : null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Ajustes de Stock</h1>
        <p className="text-sm text-gray-500 mt-0.5">Registrá entradas, mermas o correcciones manuales</p>
      </div>

      {/* Form card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0" style={{ background: BRAND }}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-gray-900">Nuevo ajuste</h2>
        </div>

        {success && (
          <div className="mb-4 flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5">
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Ajuste registrado correctamente
          </div>
        )}
        {errorMsg && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">{errorMsg}</div>
        )}

        {/* Type toggle */}
        <div className="flex gap-2 mb-5">
          {(["ingredient", "preparation"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => { setAdjType(t); reset({ subjectId: "", delta: 0, reason: "" }); }}
              className="px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-colors"
              style={adjType === t
                ? { borderColor: BRAND, background: "#f0f7f4", color: BRAND }
                : { borderColor: "#e5e7eb", color: "#6b7280" }
              }
            >
              {t === "ingredient" ? "Ingrediente" : "Preparación"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-xl">
          {/* Select */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {adjType === "ingredient" ? "Ingrediente" : "Preparación"} *
            </label>
            <select
              {...register("subjectId", { required: `Seleccioná un${adjType === "ingredient" ? " ingrediente" : "a preparación"}` })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
            >
              <option value="">Seleccionar...</option>
              {adjType === "ingredient"
                ? ingredients.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} — Stock: {formatQty(i.onHand, i.unit as Unit)} {i.unit}
                    </option>
                  ))
                : preparations.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — Stock: {Number(p.onHand)} {p.unit}
                    </option>
                  ))
              }
            </select>
            {errors.subjectId && <p className="text-xs text-red-500 mt-1">{errors.subjectId.message}</p>}
          </div>

          {selectedOnHand && (
            <p className="text-xs text-gray-500 -mt-1">
              Stock actual: <span className="font-semibold text-gray-700">{selectedOnHand}</span>
            </p>
          )}

          {/* Delta */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Delta{selectedUnit ? ` (${adjType === "ingredient" ? unitLabel(selectedUnit as Unit) : selectedUnit})` : ""} *
            </label>
            <input
              type="number"
              step="0.001"
              {...register("delta", {
                required: "Delta requerido",
                validate: (v) => Number(v) !== 0 || "Delta no puede ser cero",
              })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
            <p className="text-xs text-gray-400 mt-1">Positivo = entrada de stock. Negativo = salida/merma.</p>
            {errors.delta && <p className="text-xs text-red-500 mt-0.5">{errors.delta.message}</p>}
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Motivo</label>
            <input
              type="text"
              placeholder="ej. Compra a proveedor, merma por vencimiento..."
              {...register("reason")}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <PrimaryBtn type="submit" disabled={saving}>
            {saving ? "Registrando..." : "Registrar ajuste"}
          </PrimaryBtn>
        </form>
      </div>

      {/* History */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Historial de ajustes</h2>
          <span className="text-xs text-gray-400">{movements.length} registros</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <svg className="animate-spin h-5 w-5 text-gray-300" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </div>
        ) : movements.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">No hay ajustes registrados</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Tipo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nombre</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Delta</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Motivo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {movements.map((m) => {
                const d = parseFloat(m.delta);
                const isPositive = d > 0;
                return (
                  <tr key={m.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3 text-xs text-gray-500 font-mono whitespace-nowrap">
                      {format(new Date(m.createdAt), "dd/MM/yy HH:mm", { locale: es })}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        m.kind === "preparation"
                          ? "bg-violet-100 text-violet-700"
                          : "bg-sky-100 text-sky-700"
                      }`}>
                        {m.kind === "preparation" ? "Preparación" : "Ingrediente"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{m.name}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-bold ${
                        isPositive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                      }`}>
                        {isPositive ? "+" : ""}{d} {m.unit}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                      {m.reason ?? <span className="text-gray-300">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
