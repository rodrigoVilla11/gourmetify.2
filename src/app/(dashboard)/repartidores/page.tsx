"use client";
import { useEffect, useState, useCallback } from "react";
import { format, startOfDay, endOfDay } from "date-fns";
import { es } from "date-fns/locale";

type Repartidor = { id: string; name: string; phone: string | null; isActive: boolean };
type SaleItem   = { product: { name: string }; quantity: string };
type SaleCombo  = { combo: { name: string }; quantity: string };

type DeliverySale = {
  id: string;
  date: string;
  total: string;
  deliveryFee: string | null;
  deliveryAddress: string | null;
  orderStatus: string;
  isPaid: boolean;
  dailyOrderNumber: number | null;
  customer: { name: string } | null;
  customerName: string | null;
  items: SaleItem[];
  combos: SaleCombo[];
};

type RepartidorStats = {
  repartidor: Repartidor;
  sales: DeliverySale[];
  totalDeliveries: number;
  totalAmount: number;
  totalFees: number;
};

function fmt(n: number) {
  return "$" + n.toLocaleString("es-AR", { maximumFractionDigits: 0 });
}

const STATUS_LABELS: Record<string, string> = {
  NUEVO: "Nuevo", EN_PREPARACION: "En preparación", LISTO: "Listo",
  ENTREGADO: "Entregado", CANCELADO: "Cancelado",
};
const STATUS_COLORS: Record<string, string> = {
  NUEVO: "bg-blue-100 text-blue-700",
  EN_PREPARACION: "bg-amber-100 text-amber-700",
  LISTO: "bg-emerald-100 text-emerald-700",
  ENTREGADO: "bg-gray-100 text-gray-600",
  CANCELADO: "bg-rose-100 text-rose-600",
};

// ── New / Edit repartidor modal ─────────────────────────────────────────────

function RepartidorModal({
  repartidor, onClose, onSaved,
}: {
  repartidor: Repartidor | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(repartidor?.name ?? "");
  const [phone, setPhone] = useState(repartidor?.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    if (!name.trim()) { setError("El nombre es requerido"); return; }
    setSaving(true); setError("");
    try {
      const url    = repartidor ? `/api/repartidores/${repartidor.id}` : "/api/repartidores";
      const method = repartidor ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Error al guardar"); return; }
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-4">
        <h3 className="font-bold text-gray-900">{repartidor ? "Editar repartidor" : "Nuevo repartidor"}</h3>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nombre *</label>
            <input value={name} onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              autoFocus
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Juan García"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Teléfono</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="+54 11 1234-5678"
            />
          </div>
        </div>

        {error && <p className="text-xs text-rose-600">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function RepartidoresPage() {
  const [repartidores, setRepartidores] = useState<Repartidor[]>([]);
  const [stats, setStats]               = useState<RepartidorStats[]>([]);
  const [loading, setLoading]           = useState(true);

  // Filters
  const today = format(new Date(), "yyyy-MM-dd");
  const [from, setFrom] = useState(today);
  const [to, setTo]     = useState(today);
  const [isAdmin, setIsAdmin] = useState(false);

  // CRUD modal
  const [modalOpen, setModalOpen]         = useState(false);
  const [editRepartidor, setEditRepartidor] = useState<Repartidor | null>(null);

  // Expanded accordion
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Fetch session role to determine if admin
  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => {
      setIsAdmin(d.role === "ADMIN");
    });
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [repsRes, salesRes] = await Promise.all([
        fetch("/api/repartidores?includeInactive=true"),
        fetch(`/api/sales?orderType=DELIVERY&from=${from}&to=${to}&limit=200`),
      ]);
      const reps  = await repsRes.json();
      const salesData = await salesRes.json();
      const sales: DeliverySale[] = Array.isArray(salesData.data) ? salesData.data : [];

      const repList: Repartidor[] = Array.isArray(reps) ? reps : [];
      setRepartidores(repList);

      // Group sales by repartidorId
      const repMap = new Map<string, DeliverySale[]>();
      for (const sale of sales) {
        const rid = (sale as DeliverySale & { repartidorId?: string | null }).repartidorId ?? "__none__";
        if (!repMap.has(rid)) repMap.set(rid, []);
        repMap.get(rid)!.push(sale);
      }

      // Build stats for repartidores that have sales OR all repartidores
      const statsArr: RepartidorStats[] = [];
      for (const rep of repList) {
        const repSales = repMap.get(rep.id) ?? [];
        statsArr.push({
          repartidor: rep,
          sales: repSales,
          totalDeliveries: repSales.length,
          totalAmount: repSales.reduce((s, x) => s + Number(x.total), 0),
          totalFees: repSales.reduce((s, x) => s + Number(x.deliveryFee ?? 0), 0),
        });
      }

      // Also show sales without repartidor
      const noRep = repMap.get("__none__");
      if (noRep && noRep.length > 0) {
        statsArr.unshift({
          repartidor: { id: "__none__", name: "Sin asignar", phone: null, isActive: true },
          sales: noRep,
          totalDeliveries: noRep.length,
          totalAmount: noRep.reduce((s, x) => s + Number(x.total), 0),
          totalFees: noRep.reduce((s, x) => s + Number(x.deliveryFee ?? 0), 0),
        });
      }

      setStats(statsArr);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // For non-admin: lock to today only
  useEffect(() => {
    if (!isAdmin) { setFrom(today); setTo(today); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  async function handleDeactivate(rep: Repartidor) {
    await fetch(`/api/repartidores/${rep.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !rep.isActive }),
    });
    fetchData();
  }

  const totalDeliveries = stats.reduce((s, x) => s + x.totalDeliveries, 0);
  const totalAmount     = stats.reduce((s, x) => s + x.totalAmount, 0);
  const totalFees       = stats.reduce((s, x) => s + x.totalFees, 0);

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Repartidores</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isAdmin ? "Historial y estadísticas de delivery" : "Pedidos de delivery de hoy"}
          </p>
        </div>
        <button
          onClick={() => { setEditRepartidor(null); setModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors"
          style={{ backgroundColor: "#0f2f26" }}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Nuevo repartidor
        </button>
      </div>

      {/* Date filters (admin only) */}
      {isAdmin && (
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Desde</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Hasta</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <button onClick={fetchData}
            className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors"
            style={{ backgroundColor: "#0f2f26" }}
          >
            Buscar
          </button>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Entregas totales", value: totalDeliveries, isNum: true },
          { label: "Monto total", value: fmt(totalAmount) },
          { label: "Costo de envío recaudado", value: fmt(totalFees) },
        ].map((c) => (
          <div key={c.label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <p className="text-xs text-gray-500">{c.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Repartidores list */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando...</div>
      ) : stats.length === 0 && repartidores.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center shadow-sm">
          <p className="text-4xl mb-3">🛵</p>
          <p className="text-gray-500 text-sm">No hay repartidores registrados aún.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {stats.map((s) => {
            const isExpanded = expandedId === s.repartidor.id;
            const isNone     = s.repartidor.id === "__none__";

            return (
              <div key={s.repartidor.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                {/* Row header */}
                <div
                  className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : s.repartidor.id)}
                >
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                    <span className="text-lg">{isNone ? "❓" : "🛵"}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{s.repartidor.name}</p>
                    {!isNone && s.repartidor.phone && (
                      <p className="text-xs text-gray-400">{s.repartidor.phone}</p>
                    )}
                    {!isNone && !s.repartidor.isActive && (
                      <span className="text-[10px] bg-rose-100 text-rose-600 rounded px-1.5 py-0.5 font-medium">Inactivo</span>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-gray-900">{s.totalDeliveries} entregas</p>
                    <p className="text-xs text-gray-500">{fmt(s.totalAmount)}</p>
                    {s.totalFees > 0 && (
                      <p className="text-xs text-amber-600">envío: {fmt(s.totalFees)}</p>
                    )}
                  </div>
                  {!isNone && (
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditRepartidor(s.repartidor); setModalOpen(true); }}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeactivate(s.repartidor); }}
                        className={`p-1.5 rounded-lg transition-colors text-xs font-medium ${s.repartidor.isActive ? "text-amber-500 hover:bg-amber-50" : "text-emerald-600 hover:bg-emerald-50"}`}
                        title={s.repartidor.isActive ? "Desactivar" : "Activar"}
                      >
                        {s.repartidor.isActive ? "●" : "○"}
                      </button>
                    </div>
                  )}
                  <svg
                    className={`h-4 w-4 text-gray-400 transition-transform ml-1 shrink-0 ${isExpanded ? "rotate-180" : ""}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {/* Expanded: orders list */}
                {isExpanded && (
                  <div className="border-t border-gray-100 divide-y divide-gray-50">
                    {s.sales.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-6">Sin pedidos en este período</p>
                    ) : (
                      s.sales.map((sale) => (
                        <div key={sale.id} className="px-5 py-3 flex items-start gap-3 hover:bg-gray-50/60 transition-colors">
                          <div className="shrink-0 text-right w-20">
                            {sale.dailyOrderNumber != null && (
                              <span className="text-xs font-mono font-bold text-gray-500 bg-gray-100 rounded px-1.5 py-0.5">
                                #{sale.dailyOrderNumber}
                              </span>
                            )}
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              {format(new Date(sale.date), "HH:mm", { locale: es })}
                            </p>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">
                              {sale.customer?.name ?? sale.customerName ?? "Anónimo"}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {[
                                ...sale.items.map((i) => `${Number(i.quantity)}× ${i.product.name}`),
                                ...sale.combos.map((c) => `${Number(c.quantity)}× ${c.combo.name}`),
                              ].join(", ") || "—"}
                            </p>
                            {sale.deliveryAddress && (
                              <p className="text-[10px] text-amber-700 mt-0.5 truncate">📍 {sale.deliveryAddress}</p>
                            )}
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-sm font-bold text-gray-900">{fmt(Number(sale.total))}</p>
                            {sale.deliveryFee && Number(sale.deliveryFee) > 0 && (
                              <p className="text-[10px] text-amber-600">envío {fmt(Number(sale.deliveryFee))}</p>
                            )}
                            <span className={`text-[9px] font-semibold rounded px-1.5 py-0.5 ${STATUS_COLORS[sale.orderStatus] ?? "bg-gray-100 text-gray-600"}`}>
                              {STATUS_LABELS[sale.orderStatus] ?? sale.orderStatus}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Repartidores without deliveries in period */}
          {repartidores
            .filter((r) => !stats.find((s) => s.repartidor.id === r.id))
            .map((rep) => (
              <div key={rep.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden opacity-60">
                <div className="flex items-center gap-4 px-5 py-4">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                    <span className="text-lg">🛵</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-700">{rep.name}</p>
                    {rep.phone && <p className="text-xs text-gray-400">{rep.phone}</p>}
                    {!rep.isActive && (
                      <span className="text-[10px] bg-rose-100 text-rose-600 rounded px-1.5 py-0.5 font-medium">Inactivo</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">Sin entregas en el período</p>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => { setEditRepartidor(rep); setModalOpen(true); }}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button
                      onClick={() => handleDeactivate(rep)}
                      className={`p-1.5 rounded-lg transition-colors text-xs font-medium ${rep.isActive ? "text-amber-500 hover:bg-amber-50" : "text-emerald-600 hover:bg-emerald-50"}`}
                    >
                      {rep.isActive ? "●" : "○"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <RepartidorModal
          repartidor={editRepartidor}
          onClose={() => setModalOpen(false)}
          onSaved={fetchData}
        />
      )}
    </div>
  );
}
