"use client";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Table, Column } from "@/components/ui/Table";
import Link from "next/link";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/Badge";
import { downloadExcel } from "@/utils/excel";
import { formatCurrency } from "@/utils/currency";

const ORDER_STATUS_LABELS: Record<string, { label: string; className: string }> = {
  NUEVO:          { label: "Nuevo",          className: "bg-blue-100 text-blue-700" },
  EN_PREPARACION: { label: "En preparación", className: "bg-amber-100 text-amber-700" },
  LISTO:          { label: "Listo",          className: "bg-emerald-100 text-emerald-700" },
  ENTREGADO:      { label: "Entregado",      className: "bg-gray-100 text-gray-600" },
  CANCELADO:      { label: "Cancelado",      className: "bg-rose-100 text-rose-600" },
};

const PM_LABELS: Record<string, { label: string; icon: string }> = {
  EFECTIVO:      { label: "Efectivo",      icon: "💵" },
  TRANSFERENCIA: { label: "Transferencia", icon: "🏦" },
  DEBITO:        { label: "Débito",        icon: "💳" },
  CREDITO:       { label: "Crédito",       icon: "💳" },
  ONLINE:        { label: "Mercado Pago",  icon: "📱" },
  RAPPI:         { label: "Rappi",         icon: "🛵" },
  MERCADO_ENVIOS:{ label: "Mercado Envíos",icon: "📦" },
};

type QuickRange = "hoy" | "semana" | "mes" | "custom";

interface SaleItem { productId: string; quantity: string; product: { name: string } }
interface Sale {
  id: string;
  date: string;
  total: string;
  notes: string | null;
  isPaid: boolean;
  orderType: string;
  orderStatus: string;
  customerId: string | null;
  customerName: string | null;
  customer: { id: string; name: string; phone: string | null } | null;
  items: SaleItem[];
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

export default function SalesPage() {
  const [sales, setSales]     = useState<Sale[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [role, setRole]       = useState<string | null>(null);

  const [quickRange, setQuickRange] = useState<QuickRange>("hoy");
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(() => rangeFromQuick("hoy").from);
  const [to,   setTo]   = useState(() => rangeFromQuick("hoy").to);

  // Load role once
  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => setRole(d?.role ?? null));
  }, []);

  const canFilter = role === "ADMIN";

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

  const columns: Column<Sale>[] = [
    {
      key: "date",
      header: "Fecha",
      render: (s) => {
        const statusInfo = ORDER_STATUS_LABELS[s.orderStatus];
        return (
          <div className="flex flex-col gap-0.5">
            <span>{format(new Date(s.date), "dd/MM/yyyy HH:mm", { locale: es })}</span>
            <div className="flex items-center gap-1 flex-wrap">
              {s.orderType !== "SALON" && (
                <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">
                  {s.orderType === "TAKEAWAY" ? "Para llevar" : "Delivery"}
                </span>
              )}
              {statusInfo && s.orderStatus !== "ENTREGADO" && (
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${statusInfo.className}`}>
                  {statusInfo.label}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: "customer",
      header: "Cliente",
      className: "hidden sm:table-cell",
      render: (s) => {
        if (s.customer) return <span className="text-sm text-gray-800 font-medium">{s.customer.name}</span>;
        if (s.customerName) return <span className="text-sm text-gray-400">{s.customerName}</span>;
        return <span className="text-gray-300">—</span>;
      },
    },
    {
      key: "items",
      header: "Productos",
      render: (s) => (
        <div className="flex flex-wrap gap-1">
          {s.items.map((item) => (
            <Badge key={item.productId} variant="info">
              {parseFloat(item.quantity)}× {item.product.name}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: "total",
      header: "Total",
      render: (s) => <span className="font-semibold text-gray-900">{formatCurrency(s.total, "ARS")}</span>,
    },
    {
      key: "notes",
      header: "Notas",
      className: "hidden sm:table-cell",
      render: (s) => s.notes ?? <span className="text-gray-400">—</span>,
    },
    {
      key: "actions",
      header: "",
      render: (s) => (
        <Link href={`/sales/${s.id}`}>
          <Button size="sm" variant="ghost">Ver detalle</Button>
        </Link>
      ),
    },
  ];

  const QUICK_BTNS: { value: QuickRange; label: string }[] = [
    { value: "hoy",    label: "Hoy" },
    { value: "semana", label: "Semana" },
    { value: "mes",    label: "Mes" },
    { value: "custom", label: "Personalizado" },
  ];

  const totalRevenue = metrics?.summary.totalRevenue ?? 0;
  const paidRevenue  = sales.filter(s => s.isPaid && s.orderStatus !== "CANCELADO").reduce((s, x) => s + Number(x.total), 0);
  const pendingCount = sales.filter(s => !s.isPaid && s.orderStatus !== "CANCELADO").length;

  return (
    <div className="space-y-5">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ventas</h1>
          <p className="text-sm text-gray-500 mt-0.5">{totalRows} ventas en el período</p>
        </div>
        <Button variant="secondary" onClick={() => downloadExcel(`/api/sales?format=xlsx&from=${from}&to=${to}`, "ventas.xlsx")}>
          Exportar Excel
        </Button>
      </div>

      {/* ── Date filter (solo ADMIN / ENCARGADO) ─────────────────────────── */}
      {canFilter && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 p-0.5 bg-gray-100 rounded-lg">
            {QUICK_BTNS.map((b) => (
              <button key={b.value} onClick={() => applyQuick(b.value)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${quickRange === b.value ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
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
              <span className="text-xs text-gray-400">→</span>
              <input type="date" value={to} max={today} onChange={(e) => setTo(e.target.value)}
                className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )}
        </div>
      )}

      {/* ── Metrics ──────────────────────────────────────────────────────── */}
      <div className={`transition-opacity ${metricsLoading ? "opacity-50" : "opacity-100"}`}>
        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
            <p className="text-xs text-gray-500 font-medium">Total ventas</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">{metrics?.summary.totalCount ?? 0}</p>
            {pendingCount > 0 && <p className="text-[11px] text-amber-600 mt-0.5">{pendingCount} sin cobrar</p>}
          </div>
          <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
            <p className="text-xs text-gray-500 font-medium">Recaudado</p>
            <p className="text-2xl font-bold text-emerald-700 mt-0.5">{fmt(totalRevenue)}</p>
            {paidRevenue < totalRevenue && (
              <p className="text-[11px] text-gray-400 mt-0.5">Cobrado: {fmt(paidRevenue)}</p>
            )}
          </div>
          <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
            <p className="text-xs text-gray-500 font-medium">Ticket promedio</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">{fmt(metrics?.summary.avgTicket ?? 0)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
            <p className="text-xs text-gray-500 font-medium">Canceladas</p>
            <p className="text-2xl font-bold text-rose-600 mt-0.5">
              {sales.filter(s => s.orderStatus === "CANCELADO").length}
            </p>
          </div>
        </div>

        {/* Payment method breakdown */}
        {metrics && metrics.byPaymentMethod.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Por método de pago</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {metrics.byPaymentMethod.map((pm) => {
                const info = PM_LABELS[pm.method] ?? { label: pm.method, icon: "💰" };
                const pct  = totalRevenue > 0 ? (pm.amount / totalRevenue) * 100 : 0;
                return (
                  <div key={pm.method} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                    <span className="text-xl shrink-0">{info.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-gray-700 truncate">{info.label}</p>
                      <p className="text-sm font-bold text-gray-900">{fmt(pm.amount)}</p>
                      <p className="text-[10px] text-gray-400">{pm.count} pago{pm.count !== 1 ? "s" : ""} · {pct.toFixed(1)}%</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Table ────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <Table
          columns={columns}
          data={sales}
          isLoading={loading}
          rowKey={(s) => s.id}
          emptyMessage="No hay ventas en el período"
          rowClassName={(s) =>
            s.orderStatus === "CANCELADO"
              ? "border-l-4 border-l-rose-300 opacity-60"
              : s.isPaid
                ? "border-l-4 border-l-emerald-400"
                : "border-l-4 border-l-amber-400"
          }
        />
      </div>
    </div>
  );
}
