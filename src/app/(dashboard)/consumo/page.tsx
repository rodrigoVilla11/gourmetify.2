"use client";
import { useState, useEffect, useCallback } from "react";
import { Table, Column } from "@/components/ui/Table";
import { formatCurrency } from "@/utils/currency";
import { formatQty } from "@/utils/units";
import type { Unit, Currency } from "@/types";

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
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  if (period === "today") {
    const t = fmt(today);
    return { from: t, to: t };
  }
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
      // ADMIN defaults to month; others stay on today
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

  const PERIOD_LABELS: Record<Period, string> = {
    today: "Hoy",
    week: "Esta semana",
    month: "Este mes",
    custom: "Personalizado",
  };

  const ingColumns: Column<ConsumoRow>[] = [
    {
      key: "name",
      header: "Ingrediente",
      render: (r) => <span className="font-medium text-gray-900">{r.name}</span>,
    },
    {
      key: "unit",
      header: "Unidad",
      className: "hidden sm:table-cell",
      render: (r) => <span className="text-xs text-gray-500 uppercase font-medium">{r.unit}</span>,
    },
    {
      key: "totalConsumed",
      header: "Consumo total",
      render: (r) => (
        <span className="font-semibold text-gray-900">
          {formatQty(r.totalConsumed, r.unit as Unit)}
        </span>
      ),
    },
    {
      key: "costPerUnit",
      header: "Costo/unidad",
      className: "hidden sm:table-cell",
      render: (r) =>
        r.costPerUnit > 0
          ? formatCurrency(r.costPerUnit, r.currency)
          : <span className="text-gray-400">—</span>,
    },
    {
      key: "estimatedCost",
      header: "Costo estimado",
      render: (r) => (
        <span className={r.estimatedCost > 0 ? "font-semibold text-red-600" : "text-gray-400"}>
          {r.estimatedCost > 0 ? formatCurrency(r.estimatedCost, r.currency) : "—"}
        </span>
      ),
    },
    {
      key: "pct",
      header: "% del total",
      className: "hidden sm:table-cell",
      render: (r) => {
        if (totalCost === 0 || r.estimatedCost === 0) return <span className="text-gray-400">—</span>;
        const pct = (r.estimatedCost / totalCost) * 100;
        return (
          <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full rounded-full bg-red-400" style={{ width: `${Math.min(100, pct)}%` }} />
            </div>
            <span className="text-xs text-gray-500">{pct.toFixed(1)}%</span>
          </div>
        );
      },
    },
  ];

  const prepColumns: Column<PrepConsumoRow>[] = [
    {
      key: "name",
      header: "Preparación",
      render: (r) => <span className="font-medium text-gray-900">{r.name}</span>,
    },
    {
      key: "unit",
      header: "Unidad",
      className: "hidden sm:table-cell",
      render: (r) => <span className="text-xs text-gray-500 uppercase font-medium">{r.unit}</span>,
    },
    {
      key: "totalConsumed",
      header: "Consumo total",
      render: (r) => (
        <span className="font-semibold text-gray-900">
          {formatQty(r.totalConsumed, r.unit as Unit)}
        </span>
      ),
    },
    {
      key: "costPerUnit",
      header: "Costo/unidad",
      className: "hidden sm:table-cell",
      render: (r) =>
        r.costPerUnit > 0
          ? formatCurrency(r.costPerUnit, "ARS")
          : <span className="text-gray-400">—</span>,
    },
    {
      key: "estimatedCost",
      header: "Costo estimado",
      render: (r) => (
        <span className={r.estimatedCost > 0 ? "font-semibold text-orange-600" : "text-gray-400"}>
          {r.estimatedCost > 0 ? formatCurrency(r.estimatedCost, "ARS") : "—"}
        </span>
      ),
    },
    {
      key: "pct",
      header: "% del total",
      className: "hidden sm:table-cell",
      render: (r) => {
        if (totalCost === 0 || r.estimatedCost === 0) return <span className="text-gray-400">—</span>;
        const pct = (r.estimatedCost / totalCost) * 100;
        return (
          <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full rounded-full bg-orange-400" style={{ width: `${Math.min(100, pct)}%` }} />
            </div>
            <span className="text-xs text-gray-500">{pct.toFixed(1)}%</span>
          </div>
        );
      },
    },
  ];

  const allRows = [...rows, ...prepRows];
  const topItem = [...rows, ...prepRows.map(r => ({ ...r, currency: "ARS" as Currency }))].sort((a, b) => b.estimatedCost - a.estimatedCost)[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Consumo de Insumos</h1>
        <p className="text-sm text-gray-500 mt-1">Ingredientes y preparaciones consumidos por ventas</p>
      </div>

      {/* Period selector — ADMIN only */}
      {isAdmin ? (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {(["today", "week", "month", "custom"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => handlePeriodClick(p)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  period === p
                    ? "bg-emerald-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>

          {period === "custom" && (
            <div className="flex flex-wrap gap-3 items-end pt-1">
              <div className="w-full sm:w-auto">
                <label className="block text-xs font-medium text-gray-600 mb-1">Desde</label>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="w-full sm:w-auto">
                <label className="block text-xs font-medium text-gray-600 mb-1">Hasta</label>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          )}

          {period !== "custom" && (
            <p className="text-xs text-gray-400">{from} → {to}</p>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-2">
          <span className="text-sm font-medium text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">Hoy</span>
          <span className="text-xs text-gray-400">{from}</span>
        </div>
      )}

      {/* KPIs */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500">Costo total</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(totalCost, "ARS")}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500">En ingredientes</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(totalIngCost, "ARS")}</p>
            <p className="text-xs text-gray-400 mt-0.5">{rows.length} tipos</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500">En preparaciones</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(totalPrepCost, "ARS")}</p>
            <p className="text-xs text-gray-400 mt-0.5">{prepRows.length} tipos</p>
          </div>
          {topItem && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 col-span-2 sm:col-span-1">
              <p className="text-xs text-gray-500">Mayor consumo</p>
              <p className="text-base font-bold text-gray-900 truncate">{topItem.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {formatCurrency(topItem.estimatedCost, "currency" in topItem ? topItem.currency : "ARS")}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Ingredients table */}
      <div>
        <div className="flex items-center gap-2 mb-2 px-1">
          <h2 className="text-sm font-semibold text-gray-700">Ingredientes</h2>
          {!loading && totalIngCost > 0 && (
            <span className="text-xs text-gray-400">{formatCurrency(totalIngCost, "ARS")}</span>
          )}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <Table
            columns={ingColumns}
            data={rows}
            isLoading={loading}
            rowKey={(r) => r.ingredientId}
            emptyMessage="Sin consumo de ingredientes en este período."
          />
        </div>
      </div>

      {/* Preparations table */}
      <div>
        <div className="flex items-center gap-2 mb-2 px-1">
          <h2 className="text-sm font-semibold text-gray-700">Preparaciones</h2>
          {!loading && totalPrepCost > 0 && (
            <span className="text-xs text-gray-400">{formatCurrency(totalPrepCost, "ARS")}</span>
          )}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <Table
            columns={prepColumns}
            data={prepRows}
            isLoading={loading}
            rowKey={(r) => r.preparationId}
            emptyMessage="Sin consumo de preparaciones en este período."
          />
        </div>
      </div>
    </div>
  );
}
