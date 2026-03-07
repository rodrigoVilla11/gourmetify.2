"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { downloadExcel } from "@/utils/excel";
import { formatCurrency } from "@/utils/currency";

const ORDER_STATUS_LABELS: Record<string, { label: string; className: string }> = {
  NUEVO:          { label: "Nuevo",          className: "bg-blue-100 text-blue-700" },
  EN_PREPARACION: { label: "En preparación", className: "bg-amber-100 text-amber-700" },
  LISTO:          { label: "Listo",          className: "bg-emerald-100 text-emerald-700" },
  ENTREGADO:      { label: "Entregado",      className: "bg-gray-100 text-gray-600" },
  CANCELADO:      { label: "Cancelado",      className: "bg-rose-100 text-rose-600" },
};

const PM_LABELS: Record<string, { label: string }> = {
  EFECTIVO:       { label: "Efectivo" },
  TRANSFERENCIA:  { label: "Transferencia" },
  DEBITO:         { label: "Débito" },
  CREDITO:        { label: "Crédito" },
  ONLINE:         { label: "Mercado Pago" },
  RAPPI:          { label: "Rappi" },
  MERCADO_ENVIOS: { label: "Mercado Envíos" },
};

type QuickRange = "hoy" | "semana" | "mes" | "custom";

interface SaleItem { productId: string; quantity: string; product: { name: string } }
interface SalePayment { paymentMethod: string; amount: string }
interface Sale {
  id: string;
  date: string;
  total: string;
  discountAmount: string | null;
  notes: string | null;
  isPaid: boolean;
  orderType: string;
  orderStatus: string;
  customerId: string | null;
  customerName: string | null;
  customer: { id: string; name: string; phone: string | null } | null;
  items: SaleItem[];
  payments: SalePayment[];
}

function effectiveTotal(s: Sale): number {
  // For paid orders use the sum of payment amounts (ground truth regardless of
  // whether sale.total was updated) — handles pre-fix records where total wasn't
  // written back after the discount was applied at cobrar time.
  if (s.isPaid && s.payments.length > 0) {
    const sum = s.payments.reduce((acc, p) => acc + Number(p.amount), 0);
    if (sum > 0) return sum;
  }
  // For unpaid/no-payments orders subtract any stored discount from total
  return Number(s.total) - (s.discountAmount ? Number(s.discountAmount) : 0);
}

interface Metrics {
  summary: { totalCount: number; totalRevenue: number; avgTicket: number };
  byPaymentMethod: { method: string; amount: number; count: number }[];
}

function fmt(n: number) {
  return "$" + n.toLocaleString("es-AR", { maximumFractionDigits: 0 });
}

function rangeFromQuick(q: QuickRange): { from: string; to: string } {
  const now = new Date();
  if (q === "hoy") return {
    from: startOfDay(now).toISOString().slice(0, 10),
    to:   endOfDay(now).toISOString().slice(0, 10),
  };
  if (q === "semana") return {
    from: startOfWeek(now, { weekStartsOn: 1 }).toISOString().slice(0, 10),
    to:   endOfWeek(now,   { weekStartsOn: 1 }).toISOString().slice(0, 10),
  };
  return {
    from: startOfMonth(now).toISOString().slice(0, 10),
    to:   endOfMonth(now).toISOString().slice(0, 10),
  };
}

const QUICK_BTNS: { value: QuickRange; label: string }[] = [
  { value: "hoy",    label: "Hoy" },
  { value: "semana", label: "Semana" },
  { value: "mes",    label: "Mes" },
  { value: "custom", label: "Personalizado" },
];

export default function SalesPage() {
  const router = useRouter();
  const [sales, setSales]         = useState<Sale[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading]     = useState(true);
  const [metrics, setMetrics]     = useState<Metrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [role, setRole]           = useState<string | null>(null);
  const [search, setSearch]       = useState("");

  const [quickRange, setQuickRange] = useState<QuickRange>("hoy");
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(() => rangeFromQuick("hoy").from);
  const [to,   setTo]   = useState(() => rangeFromQuick("hoy").to);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => setRole(d?.role ?? null));
  }, []);

  const canFilter = role === "ADMIN" || role === "ENCARGADO";

  const fetchSales = useCallback(async (f: string, t: string) => {
    setLoading(true);
    const res = await fetch(`/api/sales?from=${f}&to=${t}&limit=200`);
    const { data, meta } = await res.json();
    setSales(Array.isArray(data) ? data : []);
    setTotalRows(meta?.total ?? 0);
    setLoading(false);
  }, []);

  const fetchMetrics = useCallback(async (f: string, t: string) => {
    setMetricsLoading(true);
    const res = await fetch(`/api/analytics/sales?from=${f}&to=${t}`);
    const data = await res.json();
    setMetrics(data);
    setMetricsLoading(false);
  }, []);

  useEffect(() => {
    fetchSales(from, to);
    fetchMetrics(from, to);
  }, [from, to, fetchSales, fetchMetrics]);

  function applyQuick(q: QuickRange) {
    if (!canFilter) return;
    setQuickRange(q);
    if (q !== "custom") {
      const r = rangeFromQuick(q);
      setFrom(r.from);
      setTo(r.to);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sales;
    return sales.filter((s) => {
      const clientName = (s.customer?.name ?? s.customerName ?? "").toLowerCase();
      const products = s.items.map((i) => i.product.name.toLowerCase()).join(" ");
      return clientName.includes(q) || products.includes(q);
    });
  }, [sales, search]);

  const nonCancelledCount = filtered.filter(s => s.orderStatus !== "CANCELADO").length;
  const paidRevenue       = filtered.filter(s => s.isPaid && s.orderStatus !== "CANCELADO").reduce((s, x) => s + effectiveTotal(x), 0);
  const pendingCount      = filtered.filter(s => !s.isPaid && s.orderStatus !== "CANCELADO").length;
  const pendingAmount     = filtered.filter(s => !s.isPaid && s.orderStatus !== "CANCELADO").reduce((s, x) => s + effectiveTotal(x), 0);

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ventas</h1>
          <p className="text-sm text-gray-500 mt-0.5">{totalRows} registro{totalRows !== 1 ? "s" : ""} en el período</p>
        </div>
        <Button variant="secondary" onClick={() => downloadExcel(`/api/sales?format=xlsx&from=${from}&to=${to}`, "ventas.xlsx")}>
          <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Exportar Excel
        </Button>
      </div>

      {/* ── Date filter ── */}
      {canFilter && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-gray-200 overflow-hidden bg-white">
            {QUICK_BTNS.map((b, i) => (
              <button key={b.value} onClick={() => applyQuick(b.value)}
                className={`px-3.5 py-2 text-xs font-semibold transition-colors ${i > 0 ? "border-l border-gray-200" : ""} ${quickRange === b.value ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"}`}
              >
                {b.label}
              </button>
            ))}
          </div>
          {quickRange === "custom" && (
            <div className="flex items-center gap-2">
              <input type="date" value={from} max={today} onChange={(e) => setFrom(e.target.value)}
                className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-xs text-gray-400">—</span>
              <input type="date" value={to} max={today} onChange={(e) => setTo(e.target.value)}
                className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )}
        </div>
      )}

      {/* ── KPI cards ── */}
      <div className={`transition-opacity ${metricsLoading ? "opacity-50" : "opacity-100"}`}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          {/* Total ventas */}
          <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
              <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Ventas</p>
              <p className="text-2xl font-bold text-gray-900">{nonCancelledCount}</p>
              {pendingCount > 0 && <p className="text-[11px] text-amber-600">{pendingCount} sin cobrar</p>}
            </div>
          </div>
          {/* Recaudado */}
          <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
              <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Recaudado</p>
              <p className="text-2xl font-bold text-emerald-700">{fmt(paidRevenue)}</p>
              {pendingAmount > 0 && <p className="text-[11px] text-amber-600">Pend: {fmt(pendingAmount)}</p>}
            </div>
          </div>
          {/* Ticket promedio */}
          <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
              <svg className="h-5 w-5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Ticket prom.</p>
              <p className="text-2xl font-bold text-gray-900">{fmt(metrics?.summary.avgTicket ?? 0)}</p>
            </div>
          </div>
          {/* Canceladas */}
          <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-rose-50 flex items-center justify-center shrink-0">
              <svg className="h-5 w-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Canceladas</p>
              <p className="text-2xl font-bold text-rose-600">{sales.filter(s => s.orderStatus === "CANCELADO").length}</p>
            </div>
          </div>
        </div>

        {/* Payment method breakdown */}
        {metrics && metrics.byPaymentMethod.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Por método de pago</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {metrics.byPaymentMethod.map((pm) => {
                const info = PM_LABELS[pm.method] ?? { label: pm.method };
                const pct  = paidRevenue > 0 ? (pm.amount / paidRevenue) * 100 : 0;
                return (
                  <div key={pm.method} className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <p className="text-xs font-semibold text-gray-700 truncate">{info.label}</p>
                    <p className="text-lg font-bold text-gray-900 mt-0.5">{fmt(pm.amount)}</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-[10px] text-gray-400">{pm.count} pago{pm.count !== 1 ? "s" : ""}</p>
                      <span className="text-[10px] font-semibold text-gray-500 bg-gray-200 rounded-full px-1.5 py-0.5">{pct.toFixed(0)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Search bar */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar por cliente o producto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50"
            />
          </div>
          {search && (
            <button onClick={() => setSearch("")} className="text-xs text-gray-400 hover:text-gray-600">
              Limpiar
            </button>
          )}
          <p className="text-xs text-gray-400 ml-auto">{filtered.length} resultado{filtered.length !== 1 ? "s" : ""}</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2 text-gray-400">
            <svg className="h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-sm">{search ? "Sin resultados para la búsqueda" : "No hay ventas en el período"}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Cliente</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Artículos</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Pago</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
                <th className="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((s) => {
                const statusInfo = ORDER_STATUS_LABELS[s.orderStatus];
                const isCancelled = s.orderStatus === "CANCELADO";
                const rowBorder = isCancelled ? "border-l-4 border-l-rose-300" : s.isPaid ? "border-l-4 border-l-emerald-400" : "border-l-4 border-l-amber-400";
                const visibleItems = s.items.slice(0, 2);
                const overflow = s.items.length - 2;
                const pmNames = s.payments.map((p) => PM_LABELS[p.paymentMethod]?.label ?? p.paymentMethod);

                return (
                  <tr
                    key={s.id}
                    onClick={() => router.push(`/sales/${s.id}`)}
                    className={`${rowBorder} ${isCancelled ? "opacity-60" : ""} hover:bg-gray-50 cursor-pointer transition-colors`}
                  >
                    {/* Fecha */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-gray-900 text-xs">
                          {format(new Date(s.date), "dd/MM/yyyy", { locale: es })}
                        </span>
                        <span className="text-[11px] text-gray-400">
                          {format(new Date(s.date), "HH:mm", { locale: es })}
                        </span>
                        <div className="flex items-center gap-1 flex-wrap mt-0.5">
                          {s.orderType !== "SALON" && (
                            <span className="text-[9px] font-semibold text-gray-500 bg-gray-100 rounded px-1.5 py-0.5 uppercase">
                              {s.orderType === "TAKEAWAY" ? "Llevar" : "Delivery"}
                            </span>
                          )}
                          {statusInfo && s.orderStatus !== "ENTREGADO" && (
                            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${statusInfo.className}`}>
                              {statusInfo.label}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Cliente */}
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {s.customer
                        ? <span className="font-medium text-gray-800">{s.customer.name}</span>
                        : s.customerName
                          ? <span className="text-gray-500">{s.customerName}</span>
                          : <span className="text-gray-300 text-xs">—</span>
                      }
                    </td>

                    {/* Artículos */}
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1 max-w-[220px]">
                        {visibleItems.map((item) => (
                          <span key={item.productId} className="inline-flex items-center text-[11px] bg-gray-100 text-gray-700 rounded-md px-1.5 py-0.5">
                            {parseFloat(item.quantity)}× {item.product.name}
                          </span>
                        ))}
                        {overflow > 0 && (
                          <span className="inline-flex items-center text-[11px] bg-gray-100 text-gray-500 rounded-md px-1.5 py-0.5">
                            +{overflow} más
                          </span>
                        )}
                        {s.items.length === 0 && <span className="text-xs text-gray-300">—</span>}
                      </div>
                    </td>

                    {/* Pago */}
                    <td className="px-4 py-3">
                      {pmNames.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {pmNames.slice(0, 2).map((name, i) => (
                            <span key={i} className="text-[11px] text-gray-600 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5">
                              {name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${s.isPaid ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
                          {s.isPaid ? "Cobrado" : "Pendiente"}
                        </span>
                      )}
                    </td>

                    {/* Total */}
                    <td className="px-4 py-3 text-right">
                      <span className="font-bold text-gray-900">{fmt(effectiveTotal(s))}</span>
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-3 text-gray-400">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
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
