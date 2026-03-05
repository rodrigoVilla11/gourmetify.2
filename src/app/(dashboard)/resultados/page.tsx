"use client";
import { useEffect, useState, useCallback } from "react";
import { format, startOfMonth, endOfMonth, addMonths, isSameMonth } from "date-fns";
import { es } from "date-fns/locale";

type ResultadosData = {
  ingresos: { totalSales: number; totalOtherIncome: number; total: number };
  costos: { totalExpenses: number; totalSupplierPayments: number; totalSalaries: number; cogs: number; total: number };
  resultado: number;
  breakdowns: {
    paymentMethods: { method: string; amount: number }[];
    expenseCategories: { category: string; amount: number }[];
    salaries: { name: string; hours: number; amount: number }[];
    supplierPayments: { supplier: string; amount: number }[];
  };
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

export default function ResultadosPage() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [data, setData] = useState<ResultadosData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async (m: Date) => {
    setLoading(true);
    setData(null);
    const from = format(startOfMonth(m), "yyyy-MM-dd");
    const to = format(endOfMonth(m), "yyyy-MM-dd");
    try {
      const res = await fetch(`/api/resultados?from=${from}&to=${to}`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(month);
  }, [month, fetchData]);

  const isCurrentMonth = isSameMonth(month, new Date());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Resultados</h1>
        {/* Month navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMonth((m) => addMonths(m, -1))}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600"
          >
            ‹
          </button>
          <span className="min-w-[140px] text-center font-semibold text-gray-800 capitalize">
            {format(month, "MMMM yyyy", { locale: es })}
          </span>
          <button
            onClick={() => setMonth((m) => addMonths(m, 1))}
            disabled={isCurrentMonth}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ›
          </button>
        </div>
      </div>

      {loading && (
        <div className="text-center py-16 text-gray-400">Calculando...</div>
      )}

      {!loading && data && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <p className="text-sm text-gray-500 mb-1">Ingresos</p>
              <p className="text-2xl font-bold text-emerald-600">{fmt(data.ingresos.total)}</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <p className="text-sm text-gray-500 mb-1">Costos</p>
              <p className="text-2xl font-bold text-rose-600">{fmt(data.costos.total)}</p>
            </div>
            <div className={`rounded-2xl shadow-sm border p-5 ${
              data.resultado >= 0
                ? "bg-emerald-50 border-emerald-200"
                : "bg-rose-50 border-rose-200"
            }`}>
              <p className="text-sm text-gray-500 mb-1">Resultado neto</p>
              <p className={`text-2xl font-bold ${data.resultado >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                {fmt(data.resultado)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ── Ingresos ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-emerald-50 border-b border-emerald-100 px-5 py-3">
                <h2 className="font-semibold text-emerald-800">Ingresos</h2>
              </div>
              <div className="p-5 space-y-4">
                {/* Totals */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Ventas</span>
                    <span className="font-semibold text-gray-900">{fmt(data.ingresos.totalSales)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Otros ingresos</span>
                    <span className="font-semibold text-gray-900">{fmt(data.ingresos.totalOtherIncome)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold border-t pt-2">
                    <span>Total</span>
                    <span className="text-emerald-700">{fmt(data.ingresos.total)}</span>
                  </div>
                </div>

                {/* Payment methods breakdown */}
                {data.breakdowns.paymentMethods.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Ventas por método de pago</p>
                    <div className="space-y-1">
                      {data.breakdowns.paymentMethods.map((pm) => (
                        <div key={pm.method} className="flex justify-between text-sm">
                          <span className="text-gray-600">{PAYMENT_LABELS[pm.method] ?? pm.method}</span>
                          <span className="text-gray-800">{fmt(pm.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Costos ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-rose-50 border-b border-rose-100 px-5 py-3">
                <h2 className="font-semibold text-rose-800">Costos</h2>
              </div>
              <div className="p-5 space-y-4">
                {/* Totals */}
                <div className="space-y-2">
                  {data.costos.cogs > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Costo de mercadería (CMV)</span>
                      <span className="font-semibold text-gray-900">{fmt(data.costos.cogs)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Gastos operativos</span>
                    <span className="font-semibold text-gray-900">{fmt(data.costos.totalExpenses)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Pagos a proveedores</span>
                    <span className="font-semibold text-gray-900">{fmt(data.costos.totalSupplierPayments)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Sueldos estimados</span>
                    <span className="font-semibold text-gray-900">{fmt(data.costos.totalSalaries)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold border-t pt-2">
                    <span>Total</span>
                    <span className="text-rose-700">{fmt(data.costos.total)}</span>
                  </div>
                </div>

                {/* Expense categories */}
                {data.breakdowns.expenseCategories.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Gastos por categoría</p>
                    <div className="space-y-1">
                      {data.breakdowns.expenseCategories.map((ec) => (
                        <div key={ec.category} className="flex justify-between text-sm">
                          <span className="text-gray-600">{ec.category}</span>
                          <span className="text-gray-800">{fmt(ec.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Supplier payments breakdown */}
                {data.breakdowns.supplierPayments.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Pagos a facturas por proveedor</p>
                    <div className="space-y-1">
                      {data.breakdowns.supplierPayments.map((sp) => (
                        <div key={sp.supplier} className="flex justify-between text-sm">
                          <span className="text-gray-600">{sp.supplier}</span>
                          <span className="text-gray-800">{fmt(sp.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Salaries breakdown */}
                {data.breakdowns.salaries.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Sueldos por empleado</p>
                    <div className="space-y-1">
                      {data.breakdowns.salaries.map((s) => (
                        <div key={s.name} className="flex justify-between text-sm">
                          <span className="text-gray-600">
                            {s.name}
                            <span className="text-gray-400 ml-1">({s.hours.toFixed(1)} hs)</span>
                          </span>
                          <span className="text-gray-800">{fmt(s.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Empty state */}
          {data.ingresos.total === 0 && data.costos.total === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">
              No hay datos registrados para este mes
            </div>
          )}
        </>
      )}
    </div>
  );
}
