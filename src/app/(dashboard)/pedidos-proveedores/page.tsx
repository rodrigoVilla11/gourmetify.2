"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table, Column } from "@/components/ui/Table";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { format } from "date-fns";
import { es } from "date-fns/locale";

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

const STATUS_VARIANT: Record<string, "neutral" | "info" | "success" | "danger"> = {
  DRAFT: "neutral",
  SENT: "info",
  RECEIVED: "success",
  CANCELLED: "danger",
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
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

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

  const handleSend = async (id: string) => {
    await fetch(`/api/purchase-orders/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "SENT" }),
    });
    fetchOrders();
  };

  const handleCancel = async () => {
    if (!cancellingId) return;
    setIsCancelling(true);
    await fetch(`/api/purchase-orders/${cancellingId}`, { method: "DELETE" });
    setCancellingId(null);
    setIsCancelling(false);
    fetchOrders();
  };

  const columns: Column<PurchaseOrder>[] = [
    {
      key: "number",
      header: "Nro.",
      render: (o) => (
        <Link href={`/pedidos-proveedores/${o.id}`} className="font-mono font-medium text-emerald-700 hover:underline">
          {o.number}
        </Link>
      ),
    },
    {
      key: "supplier",
      header: "Proveedor",
      render: (o) => <span className="font-medium">{o.supplier.name}</span>,
    },
    {
      key: "status",
      header: "Estado",
      render: (o) => (
        <Badge variant={STATUS_VARIANT[o.status] ?? "neutral"}>
          {STATUS_LABELS[o.status] ?? o.status}
        </Badge>
      ),
    },
    {
      key: "expectedTotal",
      header: "Total esperado",
      className: "hidden sm:table-cell text-right",
      render: (o) => (
        <span className="font-mono">
          ${Number(o.expectedTotal).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: "actualTotal",
      header: "Total real",
      className: "hidden md:table-cell text-right",
      render: (o) =>
        o.actualTotal != null ? (
          <span className="font-mono">
            ${Number(o.actualTotal).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
          </span>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
    {
      key: "createdAt",
      header: "Fecha",
      className: "hidden lg:table-cell",
      render: (o) => format(new Date(o.createdAt), "dd MMM yyyy", { locale: es }),
    },
    {
      key: "items",
      header: "Items",
      className: "hidden sm:table-cell",
      render: (o) => <Badge variant="neutral">{o._count.items}</Badge>,
    },
    {
      key: "actions",
      header: "",
      render: (o) => (
        <div className="flex gap-1 justify-end">
          <Button size="sm" variant="ghost" onClick={() => router.push(`/pedidos-proveedores/${o.id}`)}>
            Ver
          </Button>
          {o.status === "DRAFT" && (
            <Button size="sm" variant="secondary" onClick={() => handleSend(o.id)}>
              Enviar
            </Button>
          )}
          {(o.status === "DRAFT" || o.status === "SENT") && (
            <Button size="sm" variant="danger" onClick={() => setCancellingId(o.id)}>
              Cancelar
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pedidos a Proveedores</h1>
          <p className="text-sm text-gray-500 mt-1">{orders.length} pedidos</p>
        </div>
        <Button onClick={() => router.push("/pedidos-proveedores/new")}>+ Nuevo Pedido</Button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 flex-wrap border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors -mb-px ${
              statusFilter === tab.key
                ? "border border-b-white border-gray-200 bg-white text-emerald-700"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <Table
          columns={columns}
          data={orders}
          isLoading={loading}
          rowKey={(o) => o.id}
          emptyMessage="No hay pedidos registrados"
        />
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
