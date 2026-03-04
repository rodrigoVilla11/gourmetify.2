"use client";
import { useCallback, useEffect, useState } from "react";
import { format, startOfMonth, endOfDay, subDays, subMonths, startOfYear } from "date-fns";
import {
  AreaChart, Area,
  BarChart, Bar,
  XAxis, YAxis,
  CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";

type AnalyticsData = {
  summary: { totalCount: number; totalRevenue: number; avgTicket: number };
  byDay: { date: string; total: number; count: number }[];
  byHour: { hour: number; total: number; count: number }[];
  byDayOfWeek: { day: number; label: string; total: number; count: number }[];
  topProducts: { name: string; quantity: number; revenue: number }[];
  byPaymentMethod: { method: string; amount: number }[];
};

const PAYMENT_LABELS: Record<string, string> = {
  EFECTIVO: "Efectivo",
  TRANSFERENCIA: "Transferencia",
  ONLINE: "Online",
  DEBITO: "Débito",
  CREDITO: "Crédito",
  RAPPI: "Rappi",
  MERCADO_ENVIOS: "Mercado Envíos",
};

function fmt(n: number) {
  return "$" + n.toLocaleString("es-AR", { maximumFractionDigits: 0 });
}

function isoDate(d: Date) {
  return format(d, "yyyy-MM-dd");
}

const today = new Date();

const PRESETS = [
  { label: "Última semana", from: isoDate(subDays(today, 6)), to: isoDate(today) },
  { label: "Último mes", from: isoDate(subDays(today, 29)), to: isoDate(today) },
  { label: "Últimos 3 meses", from: isoDate(subMonths(today, 3)), to: isoDate(today) },
  { label: "Este año", from: isoDate(startOfYear(today)), to: isoDate(today) },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltipMoney({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-lg shadow px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p: { name: string; value: number; color: string }, i: number) => (
        <p key={i} style={{ color: p.color }}>
          {p.name === "total" ? fmt(p.value) : p.value + " ventas"}
        </p>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const [from, setFrom] = useState(isoDate(startOfMonth(today)));
  const [to, setTo] = useState(isoDate(endOfDay(today)));
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const fetchData = useCallback(async (f: string, t: string) => {
    setLoading(true);
    setData(null);
    try {
      const res = await fetch(`/api/analytics/sales?from=${f}&to=${t}`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(from, to);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyPreset(preset: (typeof PRESETS)[0]) {
    setFrom(preset.from);
    setTo(preset.to);
    setActivePreset(preset.label);
    fetchData(preset.from, preset.to);
  }

  function handleApply() {
    setActivePreset(null);
    fetchData(from, to);
  }

  const byDayFormatted = (data?.byDay ?? []).map((d) => ({
    ...d,
    label: d.date.slice(5).replace("-", "/"), // "MM/DD"
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Analytics de ventas</h1>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
        {/* Presets */}
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => applyPreset(p)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activePreset === p.label
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {/* Manual range */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={from}
            onChange={(e) => { setFrom(e.target.value); setActivePreset(null); }}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <span className="text-gray-400 text-sm">—</span>
          <input
            type="date"
            value={to}
            onChange={(e) => { setTo(e.target.value); setActivePreset(null); }}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            onClick={handleApply}
            className="px-4 py-1.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Aplicar
          </button>
        </div>
      </div>

      {loading && (
        <div className="text-center py-16 text-gray-400">Cargando...</div>
      )}

      {!loading && data && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <p className="text-sm text-gray-500 mb-1">Ventas</p>
              <p className="text-2xl font-bold text-gray-900">{data.summary.totalCount.toLocaleString("es-AR")}</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <p className="text-sm text-gray-500 mb-1">Ingresos</p>
              <p className="text-2xl font-bold text-emerald-600">{fmt(data.summary.totalRevenue)}</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <p className="text-sm text-gray-500 mb-1">Ticket promedio</p>
              <p className="text-2xl font-bold text-gray-900">{fmt(data.summary.avgTicket)}</p>
            </div>
          </div>

          {data.summary.totalCount === 0 ? (
            <div className="text-center py-12 text-gray-400">No hay ventas en el período seleccionado</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Chart 1: Revenue by day */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 lg:col-span-2">
                <h2 className="text-sm font-semibold text-gray-700 mb-4">Ingresos por día</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={byDayFormatted} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} tickFormatter={(v) => "$" + (v >= 1000 ? (v / 1000).toFixed(0) + "k" : v)} width={48} />
                    <Tooltip content={<ChartTooltipMoney />} />
                    <Area type="monotone" dataKey="total" stroke="#10b981" strokeWidth={2} fill="url(#colorTotal)" name="total" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Chart 2: Sales by hour */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h2 className="text-sm font-semibold text-gray-700 mb-4">Ventas por hora</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.byHour} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                    <XAxis dataKey="hour" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} tickFormatter={(h) => h % 3 === 0 ? `${h}h` : ""} />
                    <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} allowDecimals={false} width={30} />
                    <Tooltip content={<ChartTooltipMoney />} />
                    <Bar dataKey="count" fill="#10b981" radius={[3, 3, 0, 0]} name="count" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Chart 3: Sales by day of week */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h2 className="text-sm font-semibold text-gray-700 mb-4">Ventas por día de la semana</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.byDayOfWeek} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} tickFormatter={(v) => "$" + (v >= 1000 ? (v / 1000).toFixed(0) + "k" : v)} width={48} />
                    <Tooltip content={<ChartTooltipMoney />} />
                    <Bar dataKey="total" fill="#8b5cf6" radius={[3, 3, 0, 0]} name="total" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Chart 4: Top products */}
              {data.topProducts.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 lg:col-span-2">
                  <h2 className="text-sm font-semibold text-gray-700 mb-4">Top productos</h2>
                  <ResponsiveContainer width="100%" height={Math.max(180, data.topProducts.length * 36)}>
                    <BarChart
                      layout="vertical"
                      data={data.topProducts}
                      margin={{ top: 0, right: 48, bottom: 0, left: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} tickFormatter={(v) => "$" + (v >= 1000 ? (v / 1000).toFixed(0) + "k" : v)} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#374151" }} tickLine={false} axisLine={false} width={120} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0].payload as { name: string; revenue: number; quantity: number };
                          return (
                            <div className="bg-white border border-gray-100 rounded-lg shadow px-3 py-2 text-xs">
                              <p className="font-semibold text-gray-700">{d.name}</p>
                              <p className="text-emerald-600">{fmt(d.revenue)}</p>
                              <p className="text-gray-500">{d.quantity.toLocaleString("es-AR")} unidades</p>
                            </div>
                          );
                        }}
                      />
                      <Bar dataKey="revenue" fill="#10b981" radius={[0, 3, 3, 0]} name="revenue" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Payment methods */}
              {data.byPaymentMethod.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 lg:col-span-2">
                  <h2 className="text-sm font-semibold text-gray-700 mb-4">Ventas por método de pago</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {data.byPaymentMethod.map((pm) => (
                      <div key={pm.method} className="bg-gray-50 rounded-xl p-3">
                        <p className="text-xs text-gray-500 mb-0.5">{PAYMENT_LABELS[pm.method] ?? pm.method}</p>
                        <p className="text-base font-bold text-gray-900">{fmt(pm.amount)}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {data.summary.totalRevenue > 0
                            ? ((pm.amount / data.summary.totalRevenue) * 100).toFixed(1) + "%"
                            : "—"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
