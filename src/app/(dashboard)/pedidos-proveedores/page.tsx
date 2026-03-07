"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const BRAND = "#0f2f26";

function PrimaryBtn({ onClick, children }: { onClick?: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      style={{ background: BRAND }}
      className="px-4 py-2 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-opacity">
      {children}
    </button>
  );
}

interface PurchaseOrder {
  id: string;
  number: string;
  status: string;
  expectedTotal: number;
  actualTotal: number | null;
  createdAt: string;
  sentAt: string | null;
  receivedAt: string | null;
  supplier: { id: string; name: string };
  _count: { items: number; invoices: number };
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Borrador",
  SENT: "Enviado",
  RECEIVED: "Recibido",
  CANCELLED: "Cancelado",
};

const STATUS_STYLES: Record<string, string> = {
  DRAFT:     "bg-gray-100 text-gray-600",
  SENT:      "bg-blue-100 text-blue-700",
  RECEIVED:  "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-red-100 text-red-600",
};

const TABS = [
  { key: "", label: "Todos" },
  { key: "DRAFT", label: "Borrador" },
  { key: "SENT", label: "Enviados" },
  { key: "RECEIVED", label: "Recibidos" },
  { key: "CANCELLED", label: "Cancelados" },
];

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "100" });
    if (statusFilter) params.set("status", statusFilter);
    const res = await fetch(`/api/purchase-orders?${params}`);
    const json = await res.json();
    setOrders(json.data ?? []);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // Unique suppliers from orders (for filter dropdown)
  const suppliers = useMemo(() => {
    const map = new Map<string, string>();
    orders.forEach((o) => map.set(o.supplier.id, o.supplier.name));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [orders]);

  const visible = useMemo(() =>
    supplierFilter ? orders.filter((o) => o.supplier.id === supplierFilter) : orders,
    [orders, supplierFilter]
  );

  const handleSend = async (id: string) => {
    await fetch(`/api/purchase-orders/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "SENT" }),
    });
    fetchOrders();
  };

  const handleCopyMessage = async (id: string) => {
    setCopyingId(id);
    try {
      const res = await fetch(`/api/purchase-orders/${id}`);
      const order = await res.json();

      const lines: string[] = [];
      lines.push(`Hola ${order.supplier.name}! 👋`);
      lines.push(`Te paso el pedido *${order.number}*:`);
      lines.push("");
      order.items.forEach((item: { ingredientNameSnapshot: string; expectedQty: number; unit: string; expectedUnitCost: number }) => {
        const subtotal = (item.expectedQty * item.expectedUnitCost).toLocaleString("es-AR", { maximumFractionDigits: 0 });
        lines.push(`• ${item.ingredientNameSnapshot}: ${item.expectedQty} ${item.unit} ($${subtotal})`);
      });
      lines.push("");
      const total = Number(order.expectedTotal).toLocaleString("es-AR", { minimumFractionDigits: 0 });
      lines.push(`💰 *Total estimado: $${total}*`);
      if (order.notes) {
        lines.push("");
        lines.push(`📝 Notas: ${order.notes}`);
      }
      lines.push("");
      lines.push("¡Gracias! 🙏");

      await navigator.clipboard.writeText(lines.join("\n"));
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    } finally {
      setCopyingId(null);
    }
  };

  const handleCancel = async () => {
    if (!cancellingId) return;
    setIsCancelling(true);
    await fetch(`/api/purchase-orders/${cancellingId}`, { method: "DELETE" });
    setCancellingId(null);
    setIsCancelling(false);
    fetchOrders();
  };

  // Stats from full orders list
  const stats = useMemo(() => ({
    total: orders.length,
    draft: orders.filter((o) => o.status === "DRAFT").length,
    sent: orders.filter((o) => o.status === "SENT").length,
    received: orders.filter((o) => o.status === "RECEIVED").length,
  }), [orders]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pedidos a Proveedores</h1>
          <p className="text-sm text-gray-500 mt-0.5">{visible.length} pedido{visible.length !== 1 ? "s" : ""}</p>
        </div>
        <PrimaryBtn onClick={() => router.push("/pedidos-proveedores/new")}>+ Nuevo pedido</PrimaryBtn>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, color: BRAND, bg: "#f0f7f4" },
          { label: "Borradores", value: stats.draft, color: "#4b5563", bg: "#f3f4f6" },
          { label: "Enviados", value: stats.sent, color: "#1d4ed8", bg: "#eff6ff" },
          { label: "Recibidos", value: stats.received, color: "#059669", bg: "#ecfdf5" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-col gap-1">
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Status tabs + Supplier filter */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex gap-1 flex-wrap">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
              style={statusFilter === tab.key
                ? { background: BRAND, color: "#fff" }
                : { background: "#f3f4f6", color: "#374151" }
              }
            >
              {tab.label}
            </button>
          ))}
        </div>

        {suppliers.length > 0 && (
          <div className="sm:ml-auto">
            <select
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white text-gray-700"
            >
              <option value="">Todos los proveedores</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Copy toast */}
      {copiedId && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-sm font-semibold text-white" style={{ background: BRAND }}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Mensaje copiado al portapapeles
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <svg className="animate-spin h-5 w-5 text-gray-300" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </div>
        ) : visible.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">No hay pedidos registrados</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nro.</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Proveedor</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Total</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Fecha</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Items</th>
                <th className="px-4 py-3 w-32" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {visible.map((o) => (
                <tr key={o.id} className="group hover:bg-gray-50/60 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/pedidos-proveedores/${o.id}`}
                      className="font-mono font-semibold text-sm hover:underline"
                      style={{ color: BRAND }}>
                      {o.number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{o.supplier.name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[o.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {STATUS_LABELS[o.status] ?? o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-gray-700 hidden sm:table-cell">
                    ${Number(o.expectedTotal).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs hidden lg:table-cell">
                    {format(new Date(o.createdAt), "dd MMM yyyy", { locale: es })}
                  </td>
                  <td className="px-4 py-3 text-center hidden sm:table-cell">
                    <span className="inline-flex items-center justify-center min-w-[24px] h-6 rounded-full bg-gray-100 text-gray-600 text-xs font-bold px-2">
                      {o._count.items}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => router.push(`/pedidos-proveedores/${o.id}`)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Ver">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      </button>
                      {o.status === "SENT" && (
                        <button
                          onClick={() => handleCopyMessage(o.id)}
                          disabled={copyingId === o.id}
                          title="Copiar mensaje para el proveedor"
                          className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 ${
                            copiedId === o.id
                              ? "text-emerald-600 bg-emerald-50"
                              : "text-gray-400 hover:text-violet-600 hover:bg-violet-50"
                          }`}
                        >
                          {copiedId === o.id ? (
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          ) : copyingId === o.id ? (
                            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                          ) : (
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          )}
                        </button>
                      )}
                      {o.status === "DRAFT" && (
                        <button onClick={() => handleSend(o.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors" title="Enviar">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                        </button>
                      )}
                      {(o.status === "DRAFT" || o.status === "SENT") && (
                        <button onClick={() => setCancellingId(o.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Cancelar">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!cancellingId}
        onClose={() => setCancellingId(null)}
        onConfirm={handleCancel}
        title="Cancelar pedido"
        message="¿Cancelar este pedido? Esta acción no modifica el stock."
        confirmLabel="Cancelar pedido"
        isLoading={isCancelling}
      />
    </div>
  );
}
