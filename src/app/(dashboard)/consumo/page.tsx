"use client";
import { useState, useEffect, useCallback } from "react";
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

function getRange(period: Period): { from: string; to: string } {
  const today = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  if (period === "today") { const t = fmt(today); return { from: t, to: t }; }
  if (period === "week") {
    const day = today.getDay();
    const diffToMon = day === 0 ? -6 : 1 - day;
    const mon = new Date(today);
    mon.setDate(today.getDate() + diffToMon);
    return { from: fmt(mon), to: fmt(today) };
  }
  if (period === "month") {
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: fmt(first), to: fmt(today) };
  }
  return { from: fmt(today), to: fmt(today) };
}

const PERIOD_LABELS: Record<Period, string> = {
  today: "Hoy",
  week: "Esta semana",
  month: "Este mes",
  custom: "Personalizado",
};

export default function ConsumoPage() {
  const [role, setRole] = useState<string | null>(null);
  const isAdmin = role === "ADMIN";

  const [period, setPeriod] = useState<Period>("today");
  const [from, setFrom] = useState(() => getRange("today").from);
  const [to, setTo] = useState(() => getRange("today").to);

  const [rows, setRows] = useState<ConsumoRow[]>([]);
  const [prepRows, setPrepRows] = useState<PrepConsumoRow[]>([]);
  const [totalCost, setTotalCost] = useState(0);
  const [totalIngCost, setTotalIngCost] = useState(0);
  const [totalPrepCost, setTotalPrepCost] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((s) => {
      setRole(s.role ?? null);
      if (s.role === "ADMIN") {
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
      setRows([]);
      setPrepRows([]);
      setTotalCost(0);
      setTotalIngCost(0);
      setTotalPrepCost(0);
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

  const topItem = [...rows, ...prepRows.map((r) => ({ ...r, currency: "ARS" as Currency }))]
    .sort((a, b) => b.estimatedCost - a.estimatedCost)[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Consumo de Insumos</h1>
        <p className="text-sm text-gray-500 mt-0.5">Ingredientes y preparaciones consumidos por ventas</p>
      </div>

      {/* Period selector */}
      {isAdmin ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {(["today", "week", "month", "custom"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => handlePeriodClick(p)}
                className="px-4 py-1.5 rounded-full text-sm font-semibold transition-colors"
                style={period === p
                  ? { background: BRAND, color: "#fff" }
                  : { background: "#f3f4f6", color: "#374151" }
                }
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>

          {period === "custom" && (
            <div className="flex flex-wrap gap-3 items-end pt-1">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Desde</label>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Hasta</label>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>
          )}

          {period !== "custom" && (
            <p className="text-xs text-gray-400">{from} → {to}</p>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-4 py-3 flex items-center gap-2">
          <span className="text-sm font-semibold px-3 py-1 rounded-full text-white" style={{ background: BRAND }}>Hoy</span>
          <span className="text-xs text-gray-400">{from}</span>
        </div>
      )}

      {/* KPI cards */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* Costo total */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-50 shrink-0">
              <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500">Costo total</p>
              <p className="text-xl font-bold text-red-600 truncate">{formatCurrency(totalCost, "ARS")}</p>
            </div>
          </div>

          {/* Ingredientes */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
            <p className="text-xs text-gray-500 mb-1">Ingredientes</p>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(totalIngCost, "ARS")}</p>
            <p className="text-xs text-gray-400 mt-0.5">{rows.length} tipos</p>
          </div>

          {/* Preparaciones */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
            <p className="text-xs text-gray-500 mb-1">Preparaciones</p>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(totalPrepCost, "ARS")}</p>
            <p className="text-xs text-gray-400 mt-0.5">{prepRows.length} tipos</p>
          </div>

          {/* Mayor consumo */}
          {topItem ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 col-span-2 sm:col-span-1">
              <p className="text-xs text-gray-500 mb-1">Mayor consumo</p>
              <p className="text-sm font-bold text-gray-900 truncate">{topItem.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {formatCurrency(topItem.estimatedCost, "currency" in topItem ? topItem.currency : "ARS")}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 col-span-2 sm:col-span-1">
              <p className="text-xs text-gray-500">Mayor consumo</p>
              <p className="text-sm text-gray-300 mt-1">—</p>
            </div>
          )}
        </div>
      )}

      {/* Ingredients table */}
      <ConsumoTable
        title="Ingredientes"
        subtitle={!loading && totalIngCost > 0 ? formatCurrency(totalIngCost, "ARS") : undefined}
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
          totalCost,
          barColor: "bg-red-400",
          costColor: "text-red-600",
        }))}
      />

      {/* Preparations table */}
      <ConsumoTable
        title="Preparaciones"
        subtitle={!loading && totalPrepCost > 0 ? formatCurrency(totalPrepCost, "ARS") : undefined}
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
          totalCost,
          barColor: "bg-orange-400",
          costColor: "text-orange-600",
        }))}
      />
    </div>
  );
}

interface TableRow {
  key: string;
  name: string;
  unit: string;
  totalConsumed: number;
  costPerUnit: number;
  costPerUnitFormatted: string | null;
  estimatedCost: number;
  estimatedCostFormatted: string | null;
  totalCost: number;
  barColor: string;
  costColor: string;
}

function ConsumoTable({ title, subtitle, loading, emptyMessage, rows }: {
  title: string;
  subtitle?: string;
  loading: boolean;
  emptyMessage: string;
  rows: TableRow[];
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        {subtitle && <span className="text-xs text-gray-400">{subtitle}</span>}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <svg className="animate-spin h-5 w-5 text-gray-300" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">{emptyMessage}</div>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nombre</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Unidad</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Consumo</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Costo/u</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Costo est.</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">% total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((r) => {
              const pct = r.totalCost > 0 && r.estimatedCost > 0
                ? (r.estimatedCost / r.totalCost) * 100
                : 0;
              return (
                <tr key={r.key} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{r.name}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-xs font-medium text-gray-500 uppercase">{r.unit}</span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900">
                    {formatQty(r.totalConsumed, r.unit as Unit)}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-gray-500">
                    {r.costPerUnitFormatted ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className={`px-4 py-3 font-semibold ${r.estimatedCost > 0 ? r.costColor : "text-gray-300"}`}>
                    {r.estimatedCostFormatted ?? "—"}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {pct > 0 ? (
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div className={`h-full rounded-full ${r.barColor}`} style={{ width: `${Math.min(100, pct)}%` }} />
                        </div>
                        <span className="text-xs text-gray-500">{pct.toFixed(1)}%</span>
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
