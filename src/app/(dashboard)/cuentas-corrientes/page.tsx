"use client";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { formatCurrency } from "@/utils/currency";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS, PAYMENT_TERMS_LABELS, INVOICE_STATUS_LABELS } from "@/types";
import type { PaymentMethod, PaymentTerms, InvoiceStatus } from "@/types";

interface PendingInvoice {
  id: string;
  amount: number;
  status: string;
  invoiceNumber: string | null;
  date: string;
  dueDate: string | null;
}

interface SupplierBalance {
  id: string;
  name: string;
  phone: string | null;
  paymentTerms: string;
  creditDays: number;
  totalInvoiced: number;
  totalPaid: number;
  balance: number;
  pendingInvoices: PendingInvoice[];
}

const STATUS_BADGE: Record<string, "danger" | "warning" | "success" | "neutral"> = {
  PENDING: "danger",
  PARTIAL: "warning",
  PAID: "success",
};

export default function CuentasCorrientesPage() {
  const [suppliers, setSuppliers] = useState<SupplierBalance[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter
  const [onlyWithBalance, setOnlyWithBalance] = useState(false);
  const [search, setSearch] = useState("");

  // Payment modal
  const [payModal, setPayModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierBalance | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<PaymentMethod>("EFECTIVO");
  const [payInvoiceId, setPayInvoiceId] = useState("");
  const [payNotes, setPayNotes] = useState("");
  const [payDate, setPayDate] = useState("");
  const [paySaving, setPaySaving] = useState(false);
  const [payError, setPayError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/cuentas-corrientes");
    const data = await res.json();
    setSuppliers(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

  const openPayModal = (supplier: SupplierBalance) => {
    setSelectedSupplier(supplier);
    setPayAmount(supplier.balance > 0 ? supplier.balance.toFixed(2) : "");
    setPayMethod("EFECTIVO");
    setPayInvoiceId("");
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
    if (!selectedSupplier) return;
    setPaySaving(true);
    try {
      const res = await fetch("/api/supplier-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: selectedSupplier.id,
          invoiceId: payInvoiceId || undefined,
          amount: parseFloat(payAmount),
          paymentMethod: payMethod,
          notes: payNotes || undefined,
          date: payDate || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPayError(data.error ?? "Error al registrar pago");
        return;
      }
      setPayModal(false);
      fetchSuppliers();
      if (data.autoAllocated && data.payments?.length > 0) {
        const covered = data.payments.filter((p: { invoiceId: string | null }) => p.invoiceId).length;
        setSuccessMsg(
          `Pago distribuido automáticamente en ${covered} factura${covered !== 1 ? "s" : ""} (de la más antigua a la más nueva).`
        );
        setTimeout(() => setSuccessMsg(""), 6000);
      }
    } catch {
      setPayError("Error de conexión");
    } finally {
      setPaySaving(false);
    }
  };

  const filtered = suppliers.filter((s) => {
    if (onlyWithBalance && s.balance <= 0) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalDebt = suppliers.reduce((sum, s) => sum + Math.max(0, s.balance), 0);
  const suppliersWithDebt = suppliers.filter((s) => s.balance > 0).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cuentas Corrientes</h1>
          <p className="text-sm text-gray-500 mt-1">Saldos pendientes con proveedores</p>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-800">
          {successMsg}
        </div>
      )}

      {/* Summary KPIs */}
      {!loading && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500">Proveedores con deuda</p>
            <p className="text-2xl font-bold text-red-600">{suppliersWithDebt}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500">Deuda total</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(totalDebt, "ARS")}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500">Proveedores en cuenta cte.</p>
            <p className="text-2xl font-bold text-gray-900">
              {suppliers.filter((s) => s.paymentTerms === "CREDIT").length}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Buscar proveedor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-56 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={onlyWithBalance}
            onChange={(e) => setOnlyWithBalance(e.target.checked)}
            className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
          />
          Solo con saldo pendiente
        </label>
      </div>

      {/* Supplier list */}
      {loading ? (
        <div className="h-32 flex items-center justify-center text-gray-400 text-sm">Cargando…</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
          No hay proveedores con datos financieros
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((supplier) => (
            <div
              key={supplier.id}
              className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
            >
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <Link
                    href={`/suppliers/${supplier.id}`}
                    className="font-semibold text-gray-900 hover:text-emerald-700 hover:underline"
                  >
                    {supplier.name}
                  </Link>
                  <Badge variant="neutral">
                    {PAYMENT_TERMS_LABELS[supplier.paymentTerms as PaymentTerms] ?? supplier.paymentTerms}
                    {supplier.paymentTerms === "CREDIT" && supplier.creditDays > 0
                      ? ` · ${supplier.creditDays}d`
                      : ""}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Saldo pendiente</p>
                    <p
                      className={`text-base font-bold ${
                        supplier.balance > 0
                          ? "text-red-600"
                          : supplier.balance < 0
                          ? "text-emerald-600"
                          : "text-gray-400"
                      }`}
                    >
                      {formatCurrency(supplier.balance, "ARS")}
                    </p>
                  </div>
                  {supplier.balance > 0 && (
                    <Button size="sm" onClick={() => openPayModal(supplier)}>
                      Pagar
                    </Button>
                  )}
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 divide-x divide-gray-100 px-4 py-3 text-sm">
                <div className="pr-4">
                  <p className="text-xs text-gray-400">Facturado</p>
                  <p className="font-medium text-gray-700">{formatCurrency(supplier.totalInvoiced, "ARS")}</p>
                </div>
                <div className="px-4">
                  <p className="text-xs text-gray-400">Pagado</p>
                  <p className="font-medium text-emerald-600">{formatCurrency(supplier.totalPaid, "ARS")}</p>
                </div>
                <div className="pl-4">
                  <p className="text-xs text-gray-400">Facturas pendientes</p>
                  <p className="font-medium text-gray-700">{supplier.pendingInvoices.length}</p>
                </div>
              </div>

              {/* Pending invoices */}
              {supplier.pendingInvoices.length > 0 && (
                <div className="border-t border-gray-100 px-5 py-3">
                  <p className="text-xs font-medium text-gray-500 mb-2">Facturas pendientes</p>
                  <div className="space-y-1.5">
                    {supplier.pendingInvoices.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/facturas-proveedores/${inv.id}`}
                            className="text-emerald-700 hover:underline"
                          >
                            {inv.invoiceNumber ? `#${inv.invoiceNumber}` : "Sin número"} ·{" "}
                            {format(new Date(inv.date), "dd/MM/yyyy", { locale: es })}
                          </Link>
                          {inv.dueDate && new Date(inv.dueDate) < new Date() && (
                            <Badge variant="danger">Vencida</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-gray-900">
                            {formatCurrency(inv.amount, "ARS")}
                          </span>
                          <Badge variant={STATUS_BADGE[inv.status] ?? "neutral"}>
                            {INVOICE_STATUS_LABELS[inv.status as InvoiceStatus] ?? inv.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Payment Modal */}
      <Modal
        isOpen={payModal}
        onClose={() => setPayModal(false)}
        title={`Pagar a ${selectedSupplier?.name ?? ""}`}
      >
        <div className="space-y-4">
          {payError && <Alert variant="error">{payError}</Alert>}

          {selectedSupplier && selectedSupplier.balance > 0 && (
            <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-sm text-red-700">
              Saldo pendiente: <strong>{formatCurrency(selectedSupplier.balance, "ARS")}</strong>
            </div>
          )}

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

          {selectedSupplier && selectedSupplier.pendingInvoices.length > 0 && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Aplicar a factura (opcional)</label>
              <select
                value={payInvoiceId}
                onChange={(e) => setPayInvoiceId(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">Sin factura específica</option>
                {selectedSupplier.pendingInvoices.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoiceNumber ? `#${inv.invoiceNumber}` : "Sin número"} —{" "}
                    {formatCurrency(inv.amount, "ARS")} —{" "}
                    {INVOICE_STATUS_LABELS[inv.status as InvoiceStatus] ?? inv.status}
                  </option>
                ))}
              </select>
            </div>
          )}

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
    </div>
  );
}
