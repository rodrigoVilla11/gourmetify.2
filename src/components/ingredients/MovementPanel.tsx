"use client";
import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { format, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { formatQty } from "@/utils/units";
import type { Unit } from "@/types";

interface Movement {
  id: string;
  type: string;
  delta: string;
  reason: string | null;
  createdAt: string;
}

interface Props {
  ingredientId: string;
  ingredientName: string;
  unit: Unit;
  onHand: string;
  daysRemaining: number | null;
  avgDailyConsumption: number;
  onClose: () => void;
}

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  SALE:       { label: "Venta",      color: "text-red-600",   bg: "bg-red-50"   },
  ADJUSTMENT: { label: "Ajuste",     color: "text-blue-600",  bg: "bg-blue-50"  },
  PRODUCE:    { label: "Producción", color: "text-green-600", bg: "bg-green-50" },
};

export function MovementPanel({
  ingredientId,
  ingredientName,
  unit,
  onHand,
  daysRemaining,
  avgDailyConsumption,
  onClose,
}: Props) {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/stock-movements?ingredientId=${ingredientId}&limit=100`)
      .then((r) => r.json())
      .then((data) => {
        setMovements(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }, [ingredientId]);

  // Net delta per day for the last 14 days
  const chartData = Array.from({ length: 14 }, (_, i) => {
    const date = subDays(new Date(), 13 - i);
    const dayStr = format(date, "yyyy-MM-dd");
    const net = movements
      .filter(
        (m) => format(new Date(m.createdAt), "yyyy-MM-dd") === dayStr
      )
      .reduce((sum, m) => sum + Number(m.delta), 0);
    return { date: format(date, "dd/MM", { locale: es }), net };
  });

  const daysColor =
    daysRemaining === null
      ? "text-gray-400"
      : daysRemaining < 3
      ? "text-red-600"
      : daysRemaining < 7
      ? "text-amber-600"
      : "text-emerald-600";

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-xl border-l border-gray-200 z-40 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900 truncate pr-2">
          {ingredientName}
        </h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 shrink-0"
        >
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100 text-center">
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Stock actual</p>
          <p className="font-bold text-gray-900 text-sm">
            {formatQty(onHand, unit)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Consumo/día</p>
          <p className="font-bold text-gray-900 text-sm">
            {avgDailyConsumption > 0
              ? formatQty(avgDailyConsumption.toFixed(4), unit)
              : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Días est.</p>
          <p className={`font-bold text-sm ${daysColor}`}>
            {daysRemaining !== null ? Math.round(daysRemaining) : "—"}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="px-4 pt-4 pb-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
          Movimientos netos — últimos 14 días
        </p>
        {loading ? (
          <div className="h-20 flex items-center justify-center text-gray-300 text-xs">
            Cargando...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={80}>
            <BarChart
              data={chartData}
              margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
            >
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
                interval={1}
              />
              <Tooltip
                formatter={(v: number | undefined) => [
                  v == null ? "—" : `${v >= 0 ? "+" : ""}${v.toFixed(3)}`,
                  "Delta",
                ]}
                contentStyle={{ fontSize: 11, padding: "4px 8px" }}
              />
              <ReferenceLine y={0} stroke="#e5e7eb" />
              <Bar dataKey="net" radius={[2, 2, 0, 0]} maxBarSize={24}>
                {chartData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.net >= 0 ? "#10b981" : "#ef4444"}
                    fillOpacity={entry.net === 0 ? 0.2 : 0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Movement list */}
      <div className="flex-1 overflow-y-auto">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 pt-3 pb-2">
          Historial
        </p>
        {loading ? (
          <p className="text-center py-8 text-gray-300 text-sm">Cargando...</p>
        ) : movements.length === 0 ? (
          <p className="text-center py-8 text-gray-400 text-sm">
            Sin movimientos registrados
          </p>
        ) : (
          <div className="divide-y divide-gray-50">
            {movements.map((m) => {
              const cfg = TYPE_CONFIG[m.type] ?? {
                label: m.type,
                color: "text-gray-600",
                bg: "bg-gray-100",
              };
              const delta = Number(m.delta);
              return (
                <div key={m.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span
                    className={`text-xs font-semibold px-1.5 py-0.5 rounded shrink-0 ${cfg.bg} ${cfg.color}`}
                  >
                    {cfg.label}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 truncate">
                      {m.reason ?? "—"}
                    </p>
                    <p className="text-xs text-gray-300">
                      {format(new Date(m.createdAt), "dd/MM/yy HH:mm")}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-semibold tabular-nums shrink-0 ${
                      delta >= 0 ? "text-emerald-600" : "text-red-500"
                    }`}
                  >
                    {delta >= 0 ? "+" : ""}
                    {delta.toFixed(3)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
