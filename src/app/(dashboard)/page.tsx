"use client";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { formatQty } from "@/utils/units";
import { formatCurrency } from "@/utils/currency";
import type { Unit, Currency } from "@/types";
import { format } from "date-fns";
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
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          {format(new Date(), "PPPP", { locale: es })}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <p className="text-sm text-gray-500">Ingredientes activos</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{data.totalIngredients}</p>
          {data.lowStockIngredients.length > 0 && (
            <Badge variant="warning" className="mt-2">
              {data.lowStockIngredients.length} bajo mínimo
            </Badge>
          )}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <p className="text-sm text-gray-500">Productos activos</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{data.totalProducts}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <p className="text-sm text-gray-500">Ventas hoy</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{data.totalSalesToday}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Alert */}
        <Card
          title="Ingredientes bajo mínimo"
          action={
            <Link href="/ingredients" className="text-sm text-emerald-600 hover:underline">
              Ver todos
            </Link>
          }
        >
          {data.lowStockIngredients.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              Todos los ingredientes tienen stock suficiente ✓
            </p>
          ) : (
            <div className="divide-y divide-gray-100">
              {data.lowStockIngredients.map((i) => (
                <div key={i.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{i.name}</p>
                    {i.supplier && (
                      <p className="text-xs text-gray-400">{i.supplier.name}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-red-600 font-semibold">
                      {formatQty(i.onHand, i.unit)}
                    </p>
                    <p className="text-xs text-gray-400">
                      mín: {formatQty(i.minQty, i.unit)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Sales */}
        <Card
          title="Últimas ventas"
          action={
            <Link href="/sales" className="text-sm text-emerald-600 hover:underline">
              Ver todas
            </Link>
          }
        >
          {data.recentSales.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No hay ventas registradas</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {data.recentSales.map((s) => (
                <Link
                  key={s.id}
                  href={`/sales/${s.id}`}
                  className="flex items-start justify-between py-3 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {s.items.map((item) => `${parseFloat(item.quantity)}× ${item.product.name}`).join(", ")}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {format(new Date(s.date), "dd/MM/yyyy HH:mm", { locale: es })}
                    </p>
                  </div>
                  <Badge variant="neutral">{s.items.length} productos</Badge>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Top Products */}
      <Card title="Productos más vendidos (últimos 30 días)">
        {data.topProducts.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">
            Sin datos de ventas en los últimos 30 días
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {data.topProducts.map(({ product, total }, index) => (
              <div key={product.id} className="flex items-center gap-4 py-3">
                <span className="text-2xl font-bold text-gray-200 w-8">
                  {index + 1}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{product.name}</p>
                  <p className="text-xs text-gray-400">
                    {formatCurrency(product.salePrice, product.currency)} por unidad
                  </p>
                </div>
                <Badge variant="success">{total} vendidos</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
