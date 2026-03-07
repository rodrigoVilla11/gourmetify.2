"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { formatQty, unitLabel } from "@/utils/units";
import type { Unit } from "@/types";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const BRAND = "#0f2f26";

interface Ingredient  { id: string; name: string; unit: Unit; onHand: string }
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
  const [adjType,      setAdjType]      = useState<"ingredient" | "preparation">("ingredient");
  const [ingredients,  setIngredients]  = useState<Ingredient[]>([]);
  const [preparations, setPreparations] = useState<Preparation[]>([]);
  const [movements,    setMovements]    = useState<Movement[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [success,      setSuccess]      = useState(false);
  const [errorMsg,     setErrorMsg]     = useState("");

  // Filters
  const [search,      setSearch]      = useState("");
  const [typeFilter,  setTypeFilter]  = useState<"all" | "ingredient" | "preparation">("all");
  const [dirFilter,   setDirFilter]   = useState<"all" | "positive" | "negative">("all");

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<AdjustmentForm>();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [ingRes, prepRes, movRes] = await Promise.all([
      fetch("/api/ingredients?isActive=true"),
      fetch("/api/preparations?isActive=true"),
      fetch("/api/adjustments"),
    ]);
    const { data: ingData  } = await ingRes.json();
    const { data: prepData } = await prepRes.json();
    const movData = await movRes.json();
    setIngredients(ingData  ?? []);
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
        ? { type: "ingredient",  ingredientId:  data.subjectId, delta: Number(data.delta), reason: data.reason }
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

  const selectedId     = watch("subjectId");
  const selectedIng    = ingredients.find((i)  => i.id === selectedId);
  const selectedPrep   = preparations.find((p) => p.id === selectedId);
  const selectedUnit   = adjType === "ingredient" ? selectedIng?.unit : selectedPrep?.unit;
  const selectedOnHand = adjType === "ingredient"
    ? (selectedIng  ? formatQty(selectedIng.onHand, selectedIng.unit as Unit) : null)
    : (selectedPrep ? `${Number(selectedPrep.onHand)}` : null);
  const selectedUnitLabel = adjType === "ingredient" && selectedIng
    ? selectedIng.unit
    : selectedPrep?.unit ?? "";

  // Stats
  const stats = useMemo(() => {
    const total     = movements.length;
    const positives = movements.filter((m) => parseFloat(m.delta) > 0);
    const negatives = movements.filter((m) => parseFloat(m.delta) < 0);
    return {
      total,
      entradas: positives.length,
      salidas:  negatives.length,
    };
  }, [movements]);

  // Filtered movements
  const visible = useMemo(() => {
    return movements.filter((m) => {
      if (search && !m.name.toLowerCase().includes(search.toLowerCase()) && !(m.reason ?? "").toLowerCase().includes(search.toLowerCase())) return false;
      if (typeFilter !== "all" && m.kind !== typeFilter) return false;
      const d = parseFloat(m.delta);
      if (dirFilter === "positive" && d <= 0) return false;
      if (dirFilter === "negative" && d >= 0) return false;
      return true;
    });
  }, [movements, search, typeFilter, dirFilter]);

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Ajustes de Stock</h1>
          <p className="text-sm text-gray-500 mt-0.5">Registrá entradas, mermas o correcciones manuales</p>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(15,47,38,0.08)" }}>
            <svg className="w-5 h-5" style={{ color: BRAND }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-xs text-gray-500 font-medium">Total ajustes</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-emerald-50">
            <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <div>
            <p className="text-2xl font-bold text-emerald-700">{stats.entradas}</p>
            <p className="text-xs text-gray-500 font-medium">Entradas</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-red-50">
            <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
            </svg>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-600">{stats.salidas}</p>
            <p className="text-xs text-gray-500 font-medium">Salidas / mermas</p>
          </div>
        </div>
      </div>

      {/* ── Form card ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-5">Nuevo ajuste</h2>

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
        <div className="flex rounded-xl border border-gray-200 overflow-hidden text-sm w-fit mb-5">
          {(["ingredient", "preparation"] as const).map((t, idx) => (
            <button
              key={t}
              type="button"
              onClick={() => { setAdjType(t); reset({ subjectId: "", delta: 0, reason: "" }); }}
              className={`px-4 py-2 font-medium transition-colors ${idx > 0 ? "border-l border-gray-200" : ""}`}
              style={adjType === t ? { backgroundColor: BRAND, color: "#fff" } : { backgroundColor: "#fff", color: "#6b7280" }}
            >
              {t === "ingredient" ? "Ingrediente" : "Preparación"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">

            {/* Select */}
            <div className="lg:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                {adjType === "ingredient" ? "Ingrediente" : "Preparación"} *
              </label>
              <select
                {...register("subjectId", { required: `Seleccioná un${adjType === "ingredient" ? " ingrediente" : "a preparación"}` })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent bg-white transition-all"
                style={{ ["--tw-ring-color" as string]: "rgba(15,47,38,0.3)" }}
              >
                <option value="">Seleccionar...</option>
                {adjType === "ingredient"
                  ? ingredients.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name} — {formatQty(i.onHand, i.unit as Unit)} {i.unit}
                      </option>
                    ))
                  : preparations.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {Number(p.onHand)} {p.unit}
                      </option>
                    ))
                }
              </select>
              {errors.subjectId && <p className="text-xs text-red-500 mt-1">{errors.subjectId.message}</p>}
              {selectedOnHand && (
                <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
                  Stock actual:
                  <span className="font-semibold text-gray-800 bg-gray-100 px-1.5 py-0.5 rounded-md">
                    {selectedOnHand} {selectedUnitLabel}
                  </span>
                </p>
              )}
            </div>

            {/* Delta */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Delta{selectedUnit ? ` (${adjType === "ingredient" ? unitLabel(selectedUnit as Unit) : selectedUnit})` : ""} *
              </label>
              <input
                type="number"
                step="0.001"
                placeholder="ej. +5 o -2"
                {...register("delta", {
                  required: "Requerido",
                  validate: (v) => Number(v) !== 0 || "No puede ser cero",
                })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all"
              />
              {errors.delta
                ? <p className="text-xs text-red-500 mt-1">{errors.delta.message}</p>
                : <p className="text-xs text-gray-400 mt-1.5">+ entrada · − salida</p>
              }
            </div>

            {/* Reason */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Motivo (opcional)</label>
              <input
                type="text"
                placeholder="Merma, compra, corrección..."
                {...register("reason")}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all"
              />
            </div>

          </div>

          <div className="mt-5 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
              style={{ backgroundColor: saving ? "#9ca3af" : BRAND }}
            >
              {saving ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Registrando...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Registrar ajuste
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ── History ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

        {/* Filter bar */}
        <div className="px-5 py-4 border-b border-gray-100 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-gray-900">Historial</h2>
            <span className="text-xs text-gray-400">{visible.length} de {movements.length} registros</span>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-48">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre o motivo..."
                className="w-full pl-8 pr-8 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-gray-400"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Type pill */}
            <div className="flex rounded-xl border border-gray-200 overflow-hidden text-sm shrink-0">
              {([["all", "Todos"], ["ingredient", "Ingredientes"], ["preparation", "Preparaciones"]] as const).map(([val, lbl], idx) => (
                <button
                  key={val}
                  onClick={() => setTypeFilter(val)}
                  className={`px-3 py-2 font-medium transition-colors ${idx > 0 ? "border-l border-gray-200" : ""}`}
                  style={typeFilter === val ? { backgroundColor: BRAND, color: "#fff" } : { backgroundColor: "#fff", color: "#6b7280" }}
                >
                  {lbl}
                </button>
              ))}
            </div>

            {/* Direction pill */}
            <div className="flex rounded-xl border border-gray-200 overflow-hidden text-sm shrink-0">
              {([["all", "Todos"], ["positive", "Entradas"], ["negative", "Salidas"]] as const).map(([val, lbl], idx) => (
                <button
                  key={val}
                  onClick={() => setDirFilter(val)}
                  className={`px-3 py-2 font-medium transition-colors ${idx > 0 ? "border-l border-gray-200" : ""}`}
                  style={dirFilter === val ? { backgroundColor: BRAND, color: "#fff" } : { backgroundColor: "#fff", color: "#6b7280" }}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <svg className="animate-spin h-5 w-5 text-gray-300" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </div>
        ) : visible.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <svg className="w-10 h-10 mx-auto mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-sm">{movements.length === 0 ? "No hay ajustes registrados" : "Sin resultados para los filtros aplicados"}</p>
          </div>
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
              {visible.map((m) => {
                const d = parseFloat(m.delta);
                const isPositive = d > 0;
                return (
                  <tr key={m.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3 text-xs text-gray-500 font-mono whitespace-nowrap">
                      {format(new Date(m.createdAt), "dd/MM/yy HH:mm", { locale: es })}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        m.kind === "preparation" ? "bg-violet-100 text-violet-700" : "bg-sky-100 text-sky-700"
                      }`}>
                        {m.kind === "preparation" ? "Preparación" : "Ingrediente"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{m.name}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-lg text-xs font-bold ${
                        isPositive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                      }`}>
                        {isPositive
                          ? <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
                          : <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4"/></svg>
                        }
                        {isPositive ? "+" : ""}{d} {m.unit}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell text-sm">
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
