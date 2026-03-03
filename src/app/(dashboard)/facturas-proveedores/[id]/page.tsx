"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatCurrency } from "@/utils/currency";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS, INVOICE_STATUS_LABELS } from "@/types";
import type { PaymentMethod, InvoiceStatus } from "@/types";

interface SupplierPayment {
  id: string;
  amount: string;
  currency: string;
  date: string;
  paymentMethod: string;
  notes: string | null;
}

interface InvoiceDetail {
  id: string;
  supplierId: string;
  amount: string;
  currency: string;
  date: string;
  dueDate: string | null;
  invoiceNumber: string | null;
  imageUrl: string | null;
  notes: string | null;
  status: string;
  supplier: { id: string; name: string };
  supplierPayments: SupplierPayment[];
}

const STATUS_BADGE: Record<string, "danger" | "warning" | "success" | "neutral"> = {
  PENDING: "danger",
  PARTIAL: "warning",
  PAID: "success",
};

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Payment modal
  const [payModal, setPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<PaymentMethod>("EFECTIVO");
  const [payNotes, setPayNotes] = useState("");
  const [payDate, setPayDate] = useState("");
  const [paySaving, setPaySaving] = useState(false);
  const [payError, setPayError] = useState("");
  const [deletingPayId, setDeletingPayId] = useState<string | null>(null);
  const [isDeletingPay, setIsDeletingPay] = useState(false);

  const fetchInvoice = useCallback(async () => {
    const res = await fetch(`/api/supplier-invoices/${id}`);
    const data = await res.json();
    setInvoice(data);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchInvoice(); }, [fetchInvoice]);

  const openPayModal = () => {
    setPayAmount("");
    setPayMethod("EFECTIVO");
    setPayNotes("");
    setPayDate("");
    setPayError("");
    setPayModal(true);
  };

  const savePayment = async () => {
    setPayError("");
    if (!payAmount || parseFloat(payAmount) <= 0) {
      setPayError("Ingresá un monto válido");
      return;
    }
    setPaySaving(true);
    try {
      const res = await fetch("/api/supplier-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: invoice!.supplierId,
          invoiceId: invoice!.id,
          amount: parseFloat(payAmount),
          paymentMethod: payMethod,
          notes: payNotes || undefined,
          date: payDate || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setPayError(data.error ?? "Error al registrar pago"); return; }
      setPayModal(false);
      fetchInvoice();
    } catch {
      setPayError("Error de conexión");
    } finally {
      setPaySaving(false);
    }
  };

  const deletePayment = async () => {
    if (!deletingPayId) return;
    setIsDeletingPay(true);
    await fetch(`/api/supplier-payments/${deletingPayId}`, { method: "DELETE" });
    setDeletingPayId(null);
    setIsDeletingPay(false);
    fetchInvoice();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Spinner />
      </div>
    );
  }

  if (!invoice) {
    return <p className="text-gray-500">Factura no encontrada</p>;
  }

  const totalPaid = invoice.supplierPayments.reduce((s, p) => s + parseFloat(p.amount), 0);
  const remaining = parseFloat(invoice.amount) - totalPaid;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Factura {invoice.invoiceNumber ? `#${invoice.invoiceNumber}` : ""}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {format(new Date(invoice.date), "dd/MM/yyyy", { locale: es })} ·{" "}
            <Link href={`/suppliers/${invoice.supplierId}`} className="text-emerald-700 hover:underline">
              {invoice.supplier.name}
            </Link>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={STATUS_BADGE[invoice.status] ?? "neutral"}>
            {INVOICE_STATUS_LABELS[invoice.status as InvoiceStatus] ?? invoice.status}
          </Badge>
          <Link href="/facturas-proveedores">
            <Button variant="secondary">← Volver</Button>
          </Link>
        </div>
      </div>

      {/* Invoice info */}
      <Card title="Información de la factura">
        <div className="grid grid-cols-2 gap-4 py-2">
          <div>
            <p className="text-xs text-gray-500">Monto total</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(invoice.amount, "ARS")}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Saldo pendiente</p>
            <p className={`text-xl font-bold ${remaining > 0 ? "text-red-600" : "text-emerald-600"}`}>
              {formatCurrency(remaining, "ARS")}
            </p>
          </div>
          {invoice.dueDate && (
            <div>
              <p className="text-xs text-gray-500">Vencimiento</p>
              <p className="text-sm font-medium text-gray-900">
                {format(new Date(invoice.dueDate), "dd/MM/yyyy", { locale: es })}
              </p>
            </div>
          )}
          {invoice.notes && (
            <div className="col-span-2">
              <p className="text-xs text-gray-500">Notas</p>
              <p className="text-sm text-gray-700 italic">{invoice.notes}</p>
            </div>
          )}
        </div>

        {invoice.imageUrl && (
          <div className="mt-4">
            <p className="text-xs text-gray-500 mb-2">Foto de la factura</p>
            <a href={invoice.imageUrl} target="_blank" rel="noreferrer">
              <img
                src={invoice.imageUrl}
                alt="Factura"
                className="max-h-48 rounded-lg border border-gray-200 object-contain cursor-pointer hover:opacity-90 transition-opacity"
              />
            </a>
          </div>
        )}
      </Card>

      {/* Payments */}
      <Card title="Pagos registrados">
        <div className="divide-y divide-gray-100">
          {invoice.supplierPayments.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">Sin pagos registrados</p>
          ) : (
            invoice.supplierPayments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {PAYMENT_METHOD_LABELS[payment.paymentMethod as PaymentMethod] ?? payment.paymentMethod}
                  </p>
                  <p className="text-xs text-gray-400">
                    {format(new Date(payment.date), "dd/MM/yyyy", { locale: es })}
                    {payment.notes && ` · ${payment.notes}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(payment.amount, "ARS")}
                  </span>
                  <button
                    onClick={() => setDeletingPayId(payment.id)}
                    className="text-gray-300 hover:text-red-500 transition-colors text-sm"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">Total pagado</p>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(totalPaid, "ARS")}</p>
          </div>
          {invoice.status !== "PAID" && (
            <Button onClick={openPayModal}>+ Registrar pago</Button>
          )}
        </div>
      </Card>

      {/* Payment modal */}
      <Modal isOpen={payModal} onClose={() => setPayModal(false)} title="Registrar Pago">
        <div className="space-y-4">
          {payError && <Alert variant="error">{payError}</Alert>}
          <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">
            Saldo pendiente: <strong>{formatCurrency(remaining, "ARS")}</strong>
          </div>
          <Input
            label="Monto *"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={payAmount}
            onChange={(e) => setPayAmount(e.target.value)}
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Método de pago *</label>
            <select
              value={payMethod}
              onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>
              ))}
            </select>
          </div>
          <Input
            label="Fecha (opcional)"
            type="date"
            value={payDate}
            onChange={(e) => setPayDate(e.target.value)}
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Notas</label>
            <textarea
              value={payNotes}
              onChange={(e) => setPayNotes(e.target.value)}
              rows={2}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setPayModal(false)}>Cancelar</Button>
            <Button onClick={savePayment} isLoading={paySaving}>Registrar pago</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deletingPayId}
        onClose={() => setDeletingPayId(null)}
        onConfirm={deletePayment}
        title="Eliminar pago"
        message="¿Estás seguro de que querés eliminar este pago? El estado de la factura se recalculará automáticamente."
        confirmLabel="Eliminar"
        isLoading={isDeletingPay}
      />
    </div>
  );
}
