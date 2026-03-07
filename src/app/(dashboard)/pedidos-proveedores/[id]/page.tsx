"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Supplier { id: string; name: string }
interface Ingredient { id: string; name: string; unit: string; costPerUnit: number }

interface OrderItem {
  id: string;
  ingredientId: string;
  ingredientNameSnapshot: string;
  unit: string;
  expectedQty: number;
  receivedQty: number | null;
  expectedUnitCost: number;
  actualUnitCost: number | null;
  expectedSubtotal: number;
  actualSubtotal: number | null;
  ingredient: Ingredient;
}

interface Invoice {
  id: string;
  fileUrl: string;
  fileName: string;
  fileType: string | null;
  uploadedAt: string;
}

interface CostHistory {
  id: string;
  previousCost: number;
  newCost: number;
  quantity: number | null;
  effectiveDate: string;
  ingredient: { name: string };
}

interface PurchaseOrder {
  id: string;
  number: string;
  status: string;
  expectedTotal: number;
  actualTotal: number | null;
  notes: string | null;
  sentAt: string | null;
  receivedAt: string | null;
  expectedDeliveryAt: string | null;
  createdAt: string;
  supplier: Supplier;
  items: OrderItem[];
  invoices: Invoice[];
  costHistory: CostHistory[];
}

// Receive row state
interface ReceiveRow {
  id: string;
  receivedQty: number;
  actualUnitCost: number;
}

interface InvoiceForm {
  createInvoice: boolean;
  invoiceNumber: string;
  amount: string;
  date: string;
  dueDate: string;
  notes: string;
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

export default function PurchaseOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);

  // Receive state
  const [receiveRows, setReceiveRows] = useState<ReceiveRow[]>([]);
  const [receiving, setReceiving] = useState(false);
  const [receiveError, setReceiveError] = useState("");

  // Invoice form state
  const today = new Date().toISOString().slice(0, 10);
  const [invoiceForm, setInvoiceForm] = useState<InvoiceForm>({
    createInvoice: false,
    invoiceNumber: "",
    amount: "",
    date: today,
    dueDate: "",
    notes: "",
  });

  // Invoice upload state
  const [uploadingInvoice, setUploadingInvoice] = useState(false);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);

  // Confirm dialogs
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);
  const [sending, setSending] = useState(false);

  const fetchOrder = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/purchase-orders/${params.id}`);
    if (!res.ok) { setLoading(false); return; }
    const data: PurchaseOrder = await res.json();
    setOrder(data);

    // Initialize receive rows
    if (data.status === "SENT") {
      setReceiveRows(data.items.map((item) => ({
        id: item.id,
        receivedQty: Number(item.expectedQty),
        actualUnitCost: Number(item.expectedUnitCost),
      })));
    }
    setLoading(false);
  }, [params.id]);

  useEffect(() => { fetchOrder(); }, [fetchOrder]);

  const handleSend = async () => {
    setSending(true);
    await fetch(`/api/purchase-orders/${params.id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "SENT" }),
    });
    setSending(false);
    setConfirmSend(false);
    fetchOrder();
  };

  const handleCancel = async () => {
    setCancelling(true);
    await fetch(`/api/purchase-orders/${params.id}`, { method: "DELETE" });
    setCancelling(false);
    setConfirmCancel(false);
    fetchOrder();
  };

  const handleReceive = async () => {
    setReceiveError("");
    setReceiving(true);

    const res = await fetch(`/api/purchase-orders/${params.id}/receive`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: receiveRows }),
    });
    const json = await res.json();
    if (!res.ok) { setReceiveError(json.error ?? "Error al recibir"); setReceiving(false); return; }

    // Create supplier invoice if requested
    if (invoiceForm.createInvoice && order) {
      const amount = parseFloat(invoiceForm.amount);
      if (!isNaN(amount) && amount > 0) {
        await fetch("/api/supplier-invoices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            supplierId: order.supplier.id,
            amount,
            currency: "ARS",
            date: invoiceForm.date || today,
            dueDate: invoiceForm.dueDate || null,
            invoiceNumber: invoiceForm.invoiceNumber || null,
            notes: invoiceForm.notes || null,
          }),
        });
      }
    }

    setReceiving(false);
    fetchOrder();
  };

  const handleUploadInvoice = async () => {
    if (!invoiceFile) return;
    setUploadingInvoice(true);
    try {
      const fd = new FormData();
      fd.append("file", invoiceFile);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: fd });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error ?? "Upload failed");

      await fetch(`/api/purchase-orders/${params.id}/invoices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileUrl: uploadData.url,
          fileName: invoiceFile.name,
          fileType: invoiceFile.type,
        }),
      });
      setInvoiceFile(null);
      fetchOrder();
    } catch {
      alert("Error al subir factura");
    } finally {
      setUploadingInvoice(false);
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    await fetch(`/api/purchase-orders/${params.id}/invoices/${invoiceId}`, { method: "DELETE" });
    fetchOrder();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  if (!order) {
    return <div className="text-center text-gray-500 py-16">Pedido no encontrado.</div>;
  }

  const receiveActualTotal = receiveRows.reduce((s, r) => s + r.receivedQty * r.actualUnitCost, 0);

  // Sync invoice amount with actual total when it changes (only if user hasn't overridden it)
  const syncedAmount = receiveActualTotal.toFixed(2);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/pedidos-proveedores")} className="text-gray-400 hover:text-gray-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold font-mono text-gray-900">{order.number}</h1>
              <Badge variant={STATUS_VARIANT[order.status] ?? "neutral"}>
                {STATUS_LABELS[order.status] ?? order.status}
              </Badge>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              {order.supplier.name} · {format(new Date(order.createdAt), "dd MMM yyyy", { locale: es })}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          {order.status === "DRAFT" && (
            <>
              <Button variant="secondary" onClick={() => setConfirmSend(true)}>
                Marcar como enviado
              </Button>
              <Button variant="danger" onClick={() => setConfirmCancel(true)}>
                Cancelar pedido
              </Button>
            </>
          )}
          {order.status === "SENT" && (
            <Button variant="danger" onClick={() => setConfirmCancel(true)}>
              Cancelar pedido
            </Button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total esperado</p>
          <p className="text-xl font-bold font-mono text-gray-900 mt-1">
            ${Number(order.expectedTotal).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total real</p>
          <p className="text-xl font-bold font-mono text-emerald-700 mt-1">
            {order.actualTotal != null
              ? `$${Number(order.actualTotal).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`
              : "—"}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Items</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{order.items.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Facturas</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{order.invoices.length}</p>
        </div>
      </div>

      {/* Items table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Ingredientes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                <th className="text-left px-5 py-3">Ingrediente</th>
                <th className="text-center px-3 py-3">Unidad</th>
                <th className="text-right px-3 py-3">Cant. esperada</th>
                {order.status === "RECEIVED" && <th className="text-right px-3 py-3">Cant. recibida</th>}
                <th className="text-right px-3 py-3">Costo esp.</th>
                {order.status === "RECEIVED" && <th className="text-right px-3 py-3">Costo real</th>}
                <th className="text-right px-5 py-3">Subtotal</th>
                {order.status === "RECEIVED" && <th className="text-right px-5 py-3">Real</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {order.items.map((item) => {
                const diff = item.actualSubtotal != null
                  ? Number(item.actualSubtotal) - Number(item.expectedSubtotal)
                  : null;
                return (
                  <tr key={item.id}>
                    <td className="px-5 py-3 font-medium">{item.ingredientNameSnapshot}</td>
                    <td className="px-3 py-3 text-center text-gray-500">{item.unit}</td>
                    <td className="px-3 py-3 text-right font-mono">{Number(item.expectedQty).toFixed(2)}</td>
                    {order.status === "RECEIVED" && (
                      <td className="px-3 py-3 text-right font-mono">{item.receivedQty != null ? Number(item.receivedQty).toFixed(2) : "—"}</td>
                    )}
                    <td className="px-3 py-3 text-right font-mono">${Number(item.expectedUnitCost).toFixed(2)}</td>
                    {order.status === "RECEIVED" && (
                      <td className="px-3 py-3 text-right font-mono">
                        {item.actualUnitCost != null ? (
                          <span className={Number(item.actualUnitCost) > Number(item.expectedUnitCost) ? "text-red-600" : "text-emerald-600"}>
                            ${Number(item.actualUnitCost).toFixed(2)}
                          </span>
                        ) : "—"}
                      </td>
                    )}
                    <td className="px-5 py-3 text-right font-mono">${Number(item.expectedSubtotal).toFixed(2)}</td>
                    {order.status === "RECEIVED" && (
                      <td className="px-5 py-3 text-right font-mono">
                        {diff != null ? (
                          <span className={diff > 0 ? "text-red-600" : diff < 0 ? "text-emerald-600" : "text-gray-600"}>
                            ${Number(item.actualSubtotal).toFixed(2)}
                            {diff !== 0 && (
                              <span className="text-xs ml-1">({diff > 0 ? "+" : ""}{diff.toFixed(2)})</span>
                            )}
                          </span>
                        ) : "—"}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SENT: Receive section */}
      {order.status === "SENT" && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Recepción de mercadería</h2>
            <p className="text-sm text-gray-500 mt-0.5">Ingresá las cantidades y costos reales recibidos.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-5 py-3">Ingrediente</th>
                  <th className="text-center px-3 py-3">Unidad</th>
                  <th className="text-right px-3 py-3 w-32">Cant. pedida</th>
                  <th className="text-right px-3 py-3 w-36">Cant. recibida</th>
                  <th className="text-right px-3 py-3 w-32">Costo esp.</th>
                  <th className="text-right px-3 py-3 w-36">Costo real</th>
                  <th className="text-right px-5 py-3 w-32">Subtotal real</th>
                  <th className="text-right px-5 py-3 w-28">Diferencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {order.items.map((item, idx) => {
                  const row = receiveRows[idx];
                  if (!row) return null;
                  const actualSubtotal = row.receivedQty * row.actualUnitCost;
                  const diff = actualSubtotal - Number(item.expectedSubtotal);
                  return (
                    <tr key={item.id}>
                      <td className="px-5 py-3 font-medium">{item.ingredientNameSnapshot}</td>
                      <td className="px-3 py-3 text-center text-gray-500">{item.unit}</td>
                      <td className="px-3 py-3 text-right font-mono text-gray-500">{Number(item.expectedQty).toFixed(2)}</td>
                      <td className="px-3 py-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.receivedQty}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value) || 0;
                            setReceiveRows((prev) => prev.map((r, i) => i === idx ? { ...r, receivedQty: v } : r));
                          }}
                          className="w-full text-right rounded border border-gray-200 px-2 py-1 text-sm focus:border-emerald-500 focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-gray-500">${Number(item.expectedUnitCost).toFixed(2)}</td>
                      <td className="px-3 py-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.actualUnitCost}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value) || 0;
                            setReceiveRows((prev) => prev.map((r, i) => i === idx ? { ...r, actualUnitCost: v } : r));
                          }}
                          className="w-full text-right rounded border border-gray-200 px-2 py-1 text-sm focus:border-emerald-500 focus:outline-none"
                        />
                      </td>
                      <td className="px-5 py-3 text-right font-mono">${actualSubtotal.toFixed(2)}</td>
                      <td className="px-5 py-3 text-right font-mono">
                        <span className={diff > 0.005 ? "text-red-600" : diff < -0.005 ? "text-emerald-600" : "text-gray-500"}>
                          {diff > 0 ? "+" : ""}{diff.toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t border-gray-200 bg-gray-50">
                <tr>
                  <td colSpan={5} className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Total
                  </td>
                  <td></td>
                  <td className="px-5 py-3 text-right font-mono font-bold text-emerald-700">
                    ${receiveActualTotal.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-5 py-3 text-right font-mono font-bold">
                    <span className={receiveActualTotal - Number(order.expectedTotal) > 0.005 ? "text-red-600" : "text-emerald-600"}>
                      {(receiveActualTotal - Number(order.expectedTotal) > 0 ? "+" : "")}
                      {(receiveActualTotal - Number(order.expectedTotal)).toFixed(2)}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {receiveError && <p className="px-5 py-3 text-sm text-red-600">{receiveError}</p>}

          {/* Supplier invoice creation */}
          <div className="px-5 py-4 border-t border-gray-100 space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => {
                  setInvoiceForm((f) => ({
                    ...f,
                    createInvoice: !f.createInvoice,
                    amount: !f.createInvoice ? syncedAmount : f.amount,
                  }));
                }}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${invoiceForm.createInvoice ? "bg-[#0f2f26]" : "bg-gray-200"}`}
              >
                <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${invoiceForm.createInvoice ? "translate-x-4" : "translate-x-0.5"}`} />
              </div>
              <span className="text-sm font-medium text-gray-700">Registrar factura del proveedor al confirmar</span>
            </label>

            {invoiceForm.createInvoice && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">N° Factura</label>
                  <input
                    type="text"
                    placeholder="Ej: A-0001-00000123"
                    value={invoiceForm.invoiceNumber}
                    onChange={(e) => setInvoiceForm((f) => ({ ...f, invoiceNumber: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-[#0f2f26] focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Monto *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={invoiceForm.amount}
                    onChange={(e) => setInvoiceForm((f) => ({ ...f, amount: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-[#0f2f26] focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Fecha</label>
                  <input
                    type="date"
                    value={invoiceForm.date}
                    onChange={(e) => setInvoiceForm((f) => ({ ...f, date: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-[#0f2f26] focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Vencimiento</label>
                  <input
                    type="date"
                    value={invoiceForm.dueDate}
                    onChange={(e) => setInvoiceForm((f) => ({ ...f, dueDate: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-[#0f2f26] focus:outline-none"
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Notas</label>
                  <input
                    type="text"
                    placeholder="Opcional"
                    value={invoiceForm.notes}
                    onChange={(e) => setInvoiceForm((f) => ({ ...f, notes: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-[#0f2f26] focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Invoice upload for SENT */}
          <div className="px-5 py-4 border-t border-gray-100 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Adjuntar facturas</h3>
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setInvoiceFile(e.target.files?.[0] ?? null)}
                className="text-sm text-gray-600"
              />
              {invoiceFile && (
                <Button size="sm" onClick={handleUploadInvoice} isLoading={uploadingInvoice}>
                  Subir
                </Button>
              )}
            </div>
            {order.invoices.length > 0 && (
              <ul className="space-y-1">
                {order.invoices.map((inv) => (
                  <li key={inv.id} className="flex items-center gap-2 text-sm">
                    <a href={inv.fileUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-700 hover:underline truncate max-w-xs">
                      {inv.fileName}
                    </a>
                    <span className="text-gray-400 text-xs">{format(new Date(inv.uploadedAt), "dd MMM", { locale: es })}</span>
                    <button onClick={() => handleDeleteInvoice(inv.id)} className="text-gray-300 hover:text-red-400 text-xs">✕</button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="px-5 py-4 border-t border-gray-100 flex justify-end">
            <Button onClick={handleReceive} isLoading={receiving}>
              Confirmar recepción
            </Button>
          </div>
        </div>
      )}

      {/* RECEIVED: Invoices and cost history */}
      {order.status === "RECEIVED" && (
        <>
          {/* Upload new invoice */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
            <h2 className="font-semibold text-gray-900">Facturas adjuntas</h2>
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setInvoiceFile(e.target.files?.[0] ?? null)}
                className="text-sm text-gray-600"
              />
              {invoiceFile && (
                <Button size="sm" onClick={handleUploadInvoice} isLoading={uploadingInvoice}>
                  Subir
                </Button>
              )}
            </div>
            {order.invoices.length === 0 ? (
              <p className="text-sm text-gray-400">Sin facturas adjuntas.</p>
            ) : (
              <ul className="space-y-2">
                {order.invoices.map((inv) => (
                  <li key={inv.id} className="flex items-center gap-3">
                    <svg className="h-4 w-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    <a href={inv.fileUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-700 hover:underline text-sm truncate max-w-xs">
                      {inv.fileName}
                    </a>
                    <span className="text-gray-400 text-xs">{format(new Date(inv.uploadedAt), "dd MMM yyyy", { locale: es })}</span>
                    <button onClick={() => handleDeleteInvoice(inv.id)} className="text-gray-300 hover:text-red-400 text-xs ml-auto">Eliminar</button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Cost history */}
          {order.costHistory.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">Cambios de costo</h2>
                <p className="text-sm text-gray-500 mt-0.5">Ingredientes cuyo costo fue actualizado en esta recepción.</p>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    <th className="text-left px-5 py-3">Ingrediente</th>
                    <th className="text-right px-4 py-3">Anterior</th>
                    <th className="text-right px-4 py-3">Nuevo</th>
                    <th className="text-right px-4 py-3">Variación</th>
                    <th className="text-right px-5 py-3">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {order.costHistory.map((h) => {
                    const diff = Number(h.newCost) - Number(h.previousCost);
                    const pct = Number(h.previousCost) > 0 ? (diff / Number(h.previousCost)) * 100 : 0;
                    return (
                      <tr key={h.id}>
                        <td className="px-5 py-3 font-medium">{h.ingredient?.name ?? "—"}</td>
                        <td className="px-4 py-3 text-right font-mono text-gray-500">${Number(h.previousCost).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-mono font-medium">${Number(h.newCost).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-mono">
                          <span className={diff > 0 ? "text-red-600" : "text-emerald-600"}>
                            {diff > 0 ? "+" : ""}{diff.toFixed(2)} ({pct > 0 ? "+" : ""}{pct.toFixed(1)}%)
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right text-gray-500">
                          {format(new Date(h.effectiveDate), "dd MMM yyyy", { locale: es })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Notes */}
      {order.notes && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
          <p className="text-sm font-medium text-amber-800">Notas</p>
          <p className="text-sm text-amber-700 mt-1">{order.notes}</p>
        </div>
      )}

      {/* Confirm dialogs */}
      <ConfirmDialog
        isOpen={confirmSend}
        onClose={() => setConfirmSend(false)}
        onConfirm={handleSend}
        title="Marcar como enviado"
        message="¿Confirmar que este pedido fue enviado al proveedor?"
        confirmLabel="Marcar enviado"
        isLoading={sending}
      />
      <ConfirmDialog
        isOpen={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        onConfirm={handleCancel}
        title="Cancelar pedido"
        message="¿Cancelar este pedido? No se modificará el stock."
        confirmLabel="Cancelar pedido"
        isLoading={cancelling}
      />
    </div>
  );
}
