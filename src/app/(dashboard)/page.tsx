"use client";
import { useState, useEffect, useCallback } from "react";
import { formatQty } from "@/utils/units";
import { formatCurrency } from "@/utils/currency";
import type { Unit, Currency } from "@/types";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";

interface DashboardData {
  lowStockIngredients: {
    id: string;
    name: string;
    unit: Unit;
    onHand: string;
    minQty: string;
    supplier: { name: string } | null;
  }[];
  recentSales: {
    id: string;
    date: string;
    notes: string | null;
    items: { productId: string; quantity: string; product: { name: string } }[];
  }[];
  topProducts: { product: { id: string; name: string; salePrice: string; currency: Currency }; total: number }[];
  totalIngredients: number;
  totalProducts: number;
  totalSalesToday: number;
  kanbanCounts: { NUEVO: number; EN_PREPARACION: number; LISTO: number };
  todayRevenue: number;
}

const BRAND = "#0f2f26";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true); else setLoading(true);
    try {
      const r = await fetch("/api/dashboard");
      if (r.status === 401) { window.location.href = "/login"; return; }
      if (!r.ok) return;
      const d = await r.json();
      setData(d);
      setRefreshedAt(new Date());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex items-center gap-3 text-gray-400">
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm font-medium">Cargando dashboard...</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const maxTopProduct = data.topProducts[0]?.total ?? 1;
  const rankColors = ["text-yellow-500", "text-gray-400", "text-amber-600"];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5 capitalize">
            {format(new Date(), "PPPP", { locale: es })}
          </p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-600 bg-white hover:bg-gray-50 transition-colors disabled:opacity-60 shrink-0"
        >
          <svg className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
          {refreshedAt
            ? `Actualizado ${formatDistanceToNow(refreshedAt, { locale: es, addSuffix: true })}`
            : "Actualizar"}
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Ingredientes */}
        <Link href="/ingredients" className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex items-center gap-3 hover:border-gray-300 transition-colors">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(15,47,38,0.08)" }}>
            <svg className="w-5 h-5" style={{ color: BRAND }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-bold text-gray-900">{data.totalIngredients}</p>
            <p className="text-xs text-gray-500 font-medium">Ingredientes</p>
            {data.lowStockIngredients.length > 0 && (
              <p className="text-xs font-semibold text-amber-600 mt-0.5">
                {data.lowStockIngredients.length} bajo mínimo
              </p>
            )}
          </div>
        </Link>

        {/* Productos */}
        <Link href="/products" className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex items-center gap-3 hover:border-gray-300 transition-colors">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(15,47,38,0.08)" }}>
            <svg className="w-5 h-5" style={{ color: BRAND }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
            </svg>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{data.totalProducts}</p>
            <p className="text-xs text-gray-500 font-medium">Productos</p>
          </div>
        </Link>

        {/* Ventas hoy */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-blue-50">
            <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-4.125-2.625-3.375 2.25-3.375-2.25L4.5 21.75V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185z" />
            </svg>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{data.totalSalesToday}</p>
            <p className="text-xs text-gray-500 font-medium">Ventas hoy</p>
          </div>
        </div>

        {/* Recaudado hoy */}
        <div className={`rounded-2xl shadow-sm p-4 flex items-center gap-3 ${data.todayRevenue > 0 ? "bg-emerald-600 border border-emerald-600" : "bg-white border border-gray-200"}`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${data.todayRevenue > 0 ? "bg-emerald-500" : "bg-gray-50"}`}>
            <svg className={`w-5 h-5 ${data.todayRevenue > 0 ? "text-white" : "text-gray-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className={`text-xl font-bold truncate ${data.todayRevenue > 0 ? "text-white" : "text-gray-900"}`}>
              {formatCurrency(data.todayRevenue.toFixed(2), "ARS")}
            </p>
            <p className={`text-xs font-medium ${data.todayRevenue > 0 ? "text-emerald-100" : "text-gray-500"}`}>
              Recaudado hoy
            </p>
          </div>
        </div>
      </div>

      {/* Kanban status */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900">Pedidos activos</h2>
          <Link
            href="/comandas"
            className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
          >
            Ver comandas
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
            <div>
              <p className="text-2xl font-bold text-blue-700">{data.kanbanCounts?.NUEVO ?? 0}</p>
              <p className="text-xs font-medium text-blue-500">Nuevos</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
            <div>
              <p className="text-2xl font-bold text-amber-700">{data.kanbanCounts?.EN_PREPARACION ?? 0}</p>
              <p className="text-xs font-medium text-amber-500">En prep.</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
            <div>
              <p className="text-2xl font-bold text-emerald-700">{data.kanbanCounts?.LISTO ?? 0}</p>
              <p className="text-xs font-medium text-emerald-500">Listos</p>
            </div>
          </div>
        </div>
      </div>

      {/* 2-col: low stock + recent sales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Low stock */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-gray-900">Ingredientes bajo mínimo</h2>
              {data.lowStockIngredients.length > 0 && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-600">
                  {data.lowStockIngredients.length}
                </span>
              )}
            </div>
            <Link href="/ingredients" className="text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors">
              Ver todos →
            </Link>
          </div>

          {data.lowStockIngredients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400">
              <svg className="w-10 h-10 mb-2 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-medium text-gray-500">Todo en orden</p>
              <p className="text-xs mt-0.5">Stock suficiente en todos los ingredientes</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {data.lowStockIngredients.map((ing) => {
                const onHand = parseFloat(ing.onHand);
                const minQty = parseFloat(ing.minQty);
                const pct = minQty > 0 ? Math.max(0, Math.min(100, (onHand / minQty) * 100)) : 0;
                const isCritical = onHand <= 0;
                return (
                  <div key={ing.id} className="px-5 py-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{ing.name}</p>
                        {ing.supplier && <p className="text-xs text-gray-400">{ing.supplier.name}</p>}
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className={`text-sm font-semibold ${isCritical ? "text-red-600" : "text-amber-600"}`}>
                          {formatQty(ing.onHand, ing.unit)}
                        </p>
                        <p className="text-xs text-gray-400">mín: {formatQty(ing.minQty, ing.unit)}</p>
                      </div>
                    </div>
                    <div className="h-1 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${isCritical ? "bg-red-400" : "bg-amber-400"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent sales */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Últimas ventas</h2>
            <Link href="/sales" className="text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors">
              Ver todas →
            </Link>
          </div>

          {data.recentSales.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400">
              <svg className="w-10 h-10 mb-2 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-4.125-2.625-3.375 2.25-3.375-2.25L4.5 21.75V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185z" />
              </svg>
              <p className="text-sm font-medium text-gray-500">Sin ventas aún</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {data.recentSales.map((sale) => {
                const itemsSummary = sale.items
                  .slice(0, 3)
                  .map((item) => {
                    const qty = parseFloat(item.quantity);
                    return qty !== 1 ? `${qty}× ${item.product.name}` : item.product.name;
                  })
                  .join(", ");
                const extra = sale.items.length > 3 ? ` +${sale.items.length - 3} más` : "";
                return (
                  <Link
                    key={sale.id}
                    href={`/sales/${sale.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-gray-50/60 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{itemsSummary}{extra}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatDistanceToNow(new Date(sale.date), { locale: es, addSuffix: true })}
                      </p>
                    </div>
                    <span className="ml-3 inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 shrink-0">
                      {sale.items.length} {sale.items.length === 1 ? "ítem" : "ítems"}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Top products */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Productos más vendidos</h2>
          <p className="text-xs text-gray-400 mt-0.5">Últimos 30 días</p>
        </div>

        {data.topProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400">
            <svg className="w-10 h-10 mb-2 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
            <p className="text-sm font-medium text-gray-500">Sin datos de ventas</p>
            <p className="text-xs mt-0.5">en los últimos 30 días</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {data.topProducts.map(({ product, total }, index) => {
              const pct = maxTopProduct > 0 ? (total / maxTopProduct) * 100 : 0;
              return (
                <div key={product.id} className="flex items-center gap-4 px-5 py-3.5">
                  <span className={`text-base font-bold w-5 shrink-0 text-center ${rankColors[index] ?? "text-gray-300"}`}>
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                      <span className="ml-3 text-sm font-bold text-gray-700 shrink-0">{total} uds.</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: BRAND }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatCurrency(product.salePrice, product.currency)} / u
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
