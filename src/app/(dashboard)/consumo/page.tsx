"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { formatCurrency } from "@/utils/currency";
import { formatQty } from "@/utils/units";
import type { Unit, Currency } from "@/types";

const BRAND = "#0f2f26";

interface ConsumoRow {
  ingredientId: string;
  name: string;
  unit: string;
  costPerUnit: number;
  currency: Currency;
  totalConsumed: number;
  estimatedCost: number;
}
interface PrepConsumoRow {
  preparationId: string;
  name: string;
  unit: string;
  costPerUnit: number;
  totalConsumed: number;
  estimatedCost: number;
}

type Period = "today" | "week" | "month" | "custom";
type SortCol = "name" | "consumed" | "cost";
type SortDir = "asc" | "desc";

function getRange(period: Period): { from: string; to: string } {
  const today = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  if (period === "today") { const t = fmt(today); return { from: t, to: t }; }
  if (period === "week") {
    const day = today.getDay();
    const diffToMon = day === 0 ? -6 : 1 - day;
    const mon = new Date(today); mon.setDate(today.getDate() + diffToMon);
    return { from: fmt(mon), to: fmt(today) };
  }
  if (period === "month") {
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: fmt(first), to: fmt(today) };
  }
  return { from: fmt(today), to: fmt(today) };
}

const PERIOD_LABELS: Record<Period, string> = {
  today: "Hoy", week: "Esta semana", month: "Este mes", custom: "Personalizado",
};

function fmtDate(d: string) {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

export default function ConsumoPage() {
  const [role, setRole] = useState<string | null>(null);
  const isAdmin = role === "ADMIN" || role === "ENCARGADO";

  const [period, setPeriod] = useState<Period>("today");
  const [from, setFrom] = useState(() => getRange("today").from);
  const [to, setTo]     = useState(() => getRange("today").to);

  const [rows,         setRows]         = useState<ConsumoRow[]>([]);
  const [prepRows,     setPrepRows]     = useState<PrepConsumoRow[]>([]);
  const [totalCost,    setTotalCost]    = useState(0);
  const [totalIngCost, setTotalIngCost] = useState(0);
  const [totalPrepCost,setTotalPrepCost]= useState(0);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((s) => {
      setRole(s.role ?? null);
      if (s.role === "ADMIN" || s.role === "ENCARGADO") {
        const range = getRange("month");
        setPeriod("month");
        setFrom(range.from);
        setTo(range.to);
      }
    }).catch(() => {});
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ from, to });
    const res = await fetch(`/api/consumo?${params}`);
    if (res.ok) {
      const json = await res.json();
      setRows(json.data ?? []);
      setPrepRows(json.preparations ?? []);
      setTotalCost(json.totalEstimatedCost ?? 0);
      setTotalIngCost(json.totalIngCost ?? 0);
      setTotalPrepCost(json.totalPrepCost ?? 0);
    } else {
      setRows([]); setPrepRows([]); setTotalCost(0); setTotalIngCost(0); setTotalPrepCost(0);
    }
    setLoading(false);
  }, [from, to]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handlePeriodClick = (p: Period) => {
    if (p === "custom") { setPeriod("custom"); return; }
    const range = getRange(p);
    setPeriod(p);
    setFrom(range.from);
    setTo(range.to);
  };

  const allItems = useMemo(() => [
    ...rows.map((r) => ({ name: r.name, estimatedCost: r.estimatedCost, currency: r.currency })),
    ...prepRows.map((r) => ({ name: r.name, estimatedCost: r.estimatedCost, currency: "ARS" as Currency })),
  ], [rows, prepRows]);

  const topItem = allItems.sort((a, b) => b.estimatedCost - a.estimatedCost)[0];

  const periodLabel = period === "custom"
    ? `${fmtDate(from)} → ${fmtDate(to)}`
    : period === "today"
    ? `Hoy, ${fmtDate(from)}`
    : period === "week"
    ? `${fmtDate(from)} → ${fmtDate(to)}`
    : `${fmtDate(from)} → ${fmtDate(to)}`;

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Consumo de Insumos</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Ingredientes y preparaciones consumidos por ventas
            {!loading && <span className="ml-1 text-gray-400">· {periodLabel}</span>}
          </p>
        </div>
        <button
          onClick={fetchData}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
          Actualizar
        </button>
      </div>

      {/* ── Period selector (admin/encargado) ── */}
      {isAdmin ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex rounded-xl border border-gray-200 overflow-hidden text-sm shrink-0">
              {(["today", "week", "month", "custom"] as Period[]).map((p, idx) => (
                <button
                  key={p}
                  onClick={() => handlePeriodClick(p)}
                  className={`px-4 py-2 font-medium transition-colors ${idx > 0 ? "border-l border-gray-200" : ""}`}
                  style={period === p ? { backgroundColor: BRAND, color: "#fff" } : { backgroundColor: "#fff", color: "#6b7280" }}
                >
                  {PERIOD_LABELS[p]}
                </button>
              ))}
            </div>
            {period !== "custom" && (
              <span className="text-xs text-gray-400 font-mono">{periodLabel}</span>
            )}
          </div>

          {period === "custom" && (
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Desde</label>
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Hasta</label>
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all" />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-4 py-3 flex items-center gap-2">
          <span className="text-sm font-semibold px-3 py-1 rounded-lg text-white" style={{ background: BRAND }}>Hoy</span>
          <span className="text-xs text-gray-400 font-mono">{fmtDate(from)}</span>
        </div>
      )}

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-50 shrink-0">
            <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500 font-medium">Costo total</p>
            <p className="text-xl font-bold text-red-600 truncate">{loading ? "—" : formatCurrency(totalCost, "ARS")}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(15,47,38,0.08)" }}>
            <svg className="h-5 w-5" style={{ color: BRAND }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500 font-medium">Ingredientes</p>
            <p className="text-lg font-bold text-gray-900 truncate">{loading ? "—" : formatCurrency(totalIngCost, "ARS")}</p>
            <p className="text-xs text-gray-400">{rows.length} tipos</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-orange-50 shrink-0">
            <svg className="h-5 w-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500 font-medium">Preparaciones</p>
            <p className="text-lg font-bold text-gray-900 truncate">{loading ? "—" : formatCurrency(totalPrepCost, "ARS")}</p>
            <p className="text-xs text-gray-400">{prepRows.length} tipos</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-50 shrink-0">
            <svg className="h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500 font-medium">Mayor consumo</p>
            {topItem && !loading ? (
              <>
                <p className="text-sm font-bold text-gray-900 truncate">{topItem.name}</p>
                <p className="text-xs text-gray-400 truncate">{formatCurrency(topItem.estimatedCost, topItem.currency)}</p>
              </>
            ) : (
              <p className="text-sm text-gray-300 mt-0.5">—</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Tables ── */}
      <ConsumoTable
        title="Ingredientes"
        accentColor="text-red-600"
        barColor="bg-red-400"
        totalCost={totalCost}
        loading={loading}
        emptyMessage="Sin consumo de ingredientes en este período"
        rows={rows.map((r) => ({
          key: r.ingredientId,
          name: r.name,
          unit: r.unit,
          totalConsumed: r.totalConsumed,
          costPerUnit: r.costPerUnit,
          costPerUnitFormatted: r.costPerUnit > 0 ? formatCurrency(r.costPerUnit, r.currency) : null,
          estimatedCost: r.estimatedCost,
          estimatedCostFormatted: r.estimatedCost > 0 ? formatCurrency(r.estimatedCost, r.currency) : null,
        }))}
      />

      <ConsumoTable
        title="Preparaciones"
        accentColor="text-orange-600"
        barColor="bg-orange-400"
        totalCost={totalCost}
        loading={loading}
        emptyMessage="Sin consumo de preparaciones en este período"
        rows={prepRows.map((r) => ({
          key: r.preparationId,
          name: r.name,
          unit: r.unit,
          totalConsumed: r.totalConsumed,
          costPerUnit: r.costPerUnit,
          costPerUnitFormatted: r.costPerUnit > 0 ? formatCurrency(r.costPerUnit, "ARS") : null,
          estimatedCost: r.estimatedCost,
          estimatedCostFormatted: r.estimatedCost > 0 ? formatCurrency(r.estimatedCost, "ARS") : null,
        }))}
      />
    </div>
  );
}

// ── ConsumoTable ──────────────────────────────────────────────────────────────

interface TableRow {
  key: string;
  name: string;
  unit: string;
  totalConsumed: number;
  costPerUnit: number;
  costPerUnitFormatted: string | null;
  estimatedCost: number;
  estimatedCostFormatted: string | null;
}

type SortCol = "name" | "consumed" | "cost";
type SortDir = "asc" | "desc";

function ConsumoTable({ title, accentColor, barColor, totalCost, loading, emptyMessage, rows }: {
  title: string;
  accentColor: string;
  barColor: string;
  totalCost: number;
  loading: boolean;
  emptyMessage: string;
  rows: TableRow[];
}) {
  const [search, setSearch]   = useState("");
  const [sortCol, setSortCol] = useState<SortCol>("cost");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const toggleSort = (col: SortCol) => {
    if (sortCol === col) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("desc"); }
  };

  const filtered = useMemo(() => {
    let r = rows;
    if (search) r = r.filter((x) => x.name.toLowerCase().includes(search.toLowerCase()));
    return [...r].sort((a, b) => {
      const mul = sortDir === "asc" ? 1 : -1;
      if (sortCol === "name")     return mul * a.name.localeCompare(b.name);
      if (sortCol === "consumed") return mul * (a.totalConsumed - b.totalConsumed);
      return mul * (a.estimatedCost - b.estimatedCost);
    });
  }, [rows, search, sortCol, sortDir]);

  const SortIcon = ({ col }: { col: SortCol }) => {
    if (sortCol !== col) return (
      <svg className="w-3 h-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
      </svg>
    );
    return sortDir === "asc" ? (
      <svg className="w-3 h-3 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
      </svg>
    ) : (
      <svg className="w-3 h-3 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
      </svg>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {rows.length} tipos
            </span>
          </div>
          {!loading && rows.length > 0 && rows.some((r) => r.estimatedCost > 0) && (
            <span className={`text-sm font-bold ${accentColor}`}>
              {rows.reduce((s, r) => s + r.estimatedCost, 0) > 0
                ? rows[0]?.estimatedCostFormatted?.replace(/[\d.,]+/, () =>
                    rows.reduce((s, r) => s + r.estimatedCost, 0)
                      .toLocaleString("es-AR", { maximumFractionDigits: 0 })
                  ) ?? ""
                : ""}
            </span>
          )}
        </div>

        {/* Search */}
        {rows.length > 0 && (
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Buscar en ${title.toLowerCase()}...`}
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
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-14">
          <svg className="animate-spin h-5 w-5 text-gray-300" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-14 text-gray-400">
          <svg className="w-10 h-10 mx-auto mb-3 opacity-25" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <p className="text-sm">{search ? "Sin resultados para la búsqueda" : emptyMessage}</p>
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3">
                <button onClick={() => toggleSort("name")} className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wide hover:text-gray-700 transition-colors">
                  Nombre <SortIcon col="name" />
                </button>
              </th>
              <th className="text-left px-4 py-3 hidden sm:table-cell">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Unidad</span>
              </th>
              <th className="text-left px-4 py-3">
                <button onClick={() => toggleSort("consumed")} className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wide hover:text-gray-700 transition-colors">
                  Consumo <SortIcon col="consumed" />
                </button>
              </th>
              <th className="text-left px-4 py-3 hidden sm:table-cell">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Costo / u</span>
              </th>
              <th className="text-left px-4 py-3">
                <button onClick={() => toggleSort("cost")} className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wide hover:text-gray-700 transition-colors">
                  Costo est. <SortIcon col="cost" />
                </button>
              </th>
              <th className="text-left px-4 py-3 hidden md:table-cell">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">% total</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((r) => {
              const pct = totalCost > 0 && r.estimatedCost > 0
                ? (r.estimatedCost / totalCost) * 100
                : 0;
              return (
                <tr key={r.key} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{r.name}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-xs font-semibold text-gray-400 uppercase bg-gray-100 px-1.5 py-0.5 rounded">{r.unit}</span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900 tabular-nums">
                    {formatQty(r.totalConsumed, r.unit as Unit)}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-gray-500 tabular-nums">
                    {r.costPerUnitFormatted ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className={`px-4 py-3 font-bold tabular-nums ${r.estimatedCost > 0 ? accentColor : "text-gray-300"}`}>
                    {r.estimatedCostFormatted ?? "—"}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {pct > 0 ? (
                      <div className="flex items-center gap-2 min-w-[90px]">
                        <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                          <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${Math.min(100, pct)}%` }} />
                        </div>
                        <span className="text-xs text-gray-500 tabular-nums w-10 text-right">{pct.toFixed(1)}%</span>
                      </div>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
