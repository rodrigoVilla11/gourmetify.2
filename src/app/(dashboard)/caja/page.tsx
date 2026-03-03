"use client";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Table, Column } from "@/components/ui/Table";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatCurrency } from "@/utils/currency";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from "@/types";
import type { PaymentMethod } from "@/types";

interface CashSession {
  id: string;
  openedAt: string;
  closedAt: string | null;
  openingBalance: string;
  closingBalance: string | null;
  notes: string | null;
}

interface CajaSummary {
  incomeByPaymentMethod: { method: string; total: number }[];
  expensesByCategory: { category: string; color: string; total: number }[];
  supplierPaymentsTotal: number;
  totalSales: number;
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
}

interface IncomeEntry {
  id: string;
  amount: string;
  date: string;
  paymentMethod: string;
  description: string;
  notes: string | null;
}

export default function CajaPage() {
  const [recentSessions, setRecentSessions] = useState<CashSession[]>([]);
  const [summary, setSummary] = useState<CajaSummary | null>(null);
  const [incomeEntries, setIncomeEntries] = useState<IncomeEntry[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [incomeLoading, setIncomeLoading] = useState(false);

  // Income modal
  const [incomeModal, setIncomeModal] = useState(false);
  const [editingIncome, setEditingIncome] = useState<IncomeEntry | null>(null);
  const [incomeAmount, setIncomeAmount] = useState("");
  const [incomeDesc, setIncomeDesc] = useState("");
  const [incomeMethod, setIncomeMethod] = useState<PaymentMethod>("EFECTIVO");
  const [incomeNotes, setIncomeNotes] = useState("");
  const [incomeDate, setIncomeDate] = useState("");
  const [incomeSaving, setIncomeSaving] = useState(false);
  const [incomeError, setIncomeError] = useState("");
  const [deletingIncomeId, setDeletingIncomeId] = useState<string | null>(null);
  const [isDeletingIncome, setIsDeletingIncome] = useState(false);

  // Period filter
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const [from, setFrom] = useState(firstOfMonth.toISOString().slice(0, 10));
  const [to, setTo] = useState(today.toISOString().slice(0, 10));

  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    const res = await fetch(`/api/caja/summary?from=${from}&to=${to}`);
    const data = await res.json();
    setSummary(res.ok ? data : null);
    setSummaryLoading(false);
  }, [from, to]);

  const fetchIncome = useCallback(async () => {
    setIncomeLoading(true);
    const params = new URLSearchParams({ from, to, limit: "100" });
    const res = await fetch(`/api/income?${params}`);
    const data = await res.json();
    setIncomeEntries(data.data ?? []);
    setIncomeLoading(false);
  }, [from, to]);

  const fetchSessions = useCallback(async () => {
    const res = await fetch("/api/cash-sessions");
    const data = await res.json();
    setRecentSessions(data.recent ?? []);
  }, []);

  useEffect(() => {
    fetchSummary();
    fetchIncome();
    fetchSessions();
  }, [fetchSummary, fetchIncome, fetchSessions]);

  // ── Income handlers ──────────────────────────────────────────────────────────
  const openCreateIncome = () => {
    setEditingIncome(null);
    setIncomeAmount("");
    setIncomeDesc("");
    setIncomeMethod("EFECTIVO");
    setIncomeNotes("");
    setIncomeDate("");
    setIncomeError("");
    setIncomeModal(true);
  };

  const openEditIncome = (income: IncomeEntry) => {
    setEditingIncome(income);
    setIncomeAmount(parseFloat(income.amount).toString());
    setIncomeDesc(income.description);
    setIncomeMethod(income.paymentMethod as PaymentMethod);
    setIncomeNotes(income.notes ?? "");
    setIncomeDate(income.date.slice(0, 10));
    setIncomeError("");
    setIncomeModal(true);
  };

  const saveIncome = async () => {
    setIncomeError("");
    if (!incomeAmount || parseFloat(incomeAmount) <= 0) {
      setIncomeError("Ingresá un monto válido");
      return;
    }
    if (!incomeDesc.trim()) {
      setIncomeError("Ingresá una descripción");
      return;
    }
    setIncomeSaving(true);
    const body = {
      amount: parseFloat(incomeAmount),
      description: incomeDesc.trim(),
      paymentMethod: incomeMethod,
      notes: incomeNotes || undefined,
      date: incomeDate || undefined,
    };
    try {
      if (editingIncome) {
        await fetch(`/api/income/${editingIncome.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        await fetch("/api/income", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }
      setIncomeModal(false);
      fetchIncome();
      fetchSummary();
    } catch {
      setIncomeError("Error al guardar ingreso");
    } finally {
      setIncomeSaving(false);
    }
  };

  const deleteIncome = async () => {
    if (!deletingIncomeId) return;
    setIsDeletingIncome(true);
    await fetch(`/api/income/${deletingIncomeId}`, { method: "DELETE" });
    setDeletingIncomeId(null);
    setIsDeletingIncome(false);
    fetchIncome();
    fetchSummary();
  };

  const incomeColumns: Column<IncomeEntry>[] = [
    {
      key: "date",
      header: "Fecha",
      render: (i) => format(new Date(i.date), "dd/MM/yyyy", { locale: es }),
    },
    {
      key: "description",
      header: "Descripción",
      render: (i) => <span className="font-medium text-gray-900">{i.description}</span>,
    },
    {
      key: "paymentMethod",
      header: "Método",
      render: (i) => PAYMENT_METHOD_LABELS[i.paymentMethod as PaymentMethod] ?? i.paymentMethod,
    },
    {
      key: "amount",
      header: "Monto",
      render: (i) => (
        <span className="font-semibold text-emerald-600">{formatCurrency(i.amount, "ARS")}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (i) => (
        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="ghost" onClick={() => openEditIncome(i)}>Editar</Button>
          <Button size="sm" variant="danger" onClick={() => setDeletingIncomeId(i.id)}>Eliminar</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Caja general</h1>
          <p className="text-sm text-gray-500 mt-1">Resumen financiero por período</p>
        </div>
      </div>

      {/* Period selector */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3 items-end">
        <div className="w-full sm:w-auto">
          <label className="block text-xs font-medium text-gray-600 mb-1">Desde</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div className="w-full sm:w-auto">
          <label className="block text-xs font-medium text-gray-600 mb-1">Hasta</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <Button variant="secondary" onClick={() => { fetchSummary(); fetchIncome(); }} isLoading={summaryLoading}>
          Actualizar
        </Button>
      </div>

      {/* Summary */}
      {summaryLoading ? (
        <div className="h-32 flex items-center justify-center text-gray-400 text-sm">Cargando resumen…</div>
      ) : summary ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
              <p className="text-xs text-gray-500">Ventas</p>
              <p className="text-2xl font-bold text-emerald-800">{formatCurrency(summary.totalSales, "ARS")}</p>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <p className="text-xs text-gray-500">Ingresos extra</p>
              <p className="text-2xl font-bold text-blue-800">{formatCurrency(summary.totalIncome, "ARS")}</p>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-xl p-4">
              <p className="text-xs text-gray-500">Gastos</p>
              <p className="text-2xl font-bold text-red-700">{formatCurrency(summary.totalExpenses, "ARS")}</p>
            </div>
            <div
              className={`rounded-xl p-4 border ${
                summary.netBalance >= 0 ? "bg-gray-50 border-gray-200" : "bg-red-50 border-red-200"
              }`}
            >
              <p className="text-xs text-gray-500">Balance neto</p>
              <p
                className={`text-2xl font-bold ${
                  summary.netBalance >= 0 ? "text-gray-900" : "text-red-700"
                }`}
              >
                {formatCurrency(summary.netBalance, "ARS")}
              </p>
            </div>
          </div>

          {summary.supplierPaymentsTotal > 0 && (
            <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-purple-600">Pagos a proveedores (incluidos en gastos)</p>
                <p className="text-lg font-bold text-purple-800 mt-0.5">
                  {formatCurrency(summary.supplierPaymentsTotal, "ARS")}
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {summary.incomeByPaymentMethod.length > 0 && (
              <Card title="Ingresos por método de pago">
                <div className="divide-y divide-gray-100">
                  {summary.incomeByPaymentMethod.map((row) => (
                    <div key={row.method} className="flex items-center justify-between py-3">
                      <span className="text-gray-700">
                        {PAYMENT_METHOD_LABELS[row.method as PaymentMethod] ?? row.method}
                      </span>
                      <span className="font-semibold text-gray-900">{formatCurrency(row.total, "ARS")}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {summary.expensesByCategory.length > 0 && (
              <Card title="Gastos por categoría">
                <div className="divide-y divide-gray-100">
                  {summary.expensesByCategory.map((row) => (
                    <div key={row.category} className="flex items-center justify-between py-3">
                      <span
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium text-white"
                        style={{ backgroundColor: row.color }}
                      >
                        {row.category}
                      </span>
                      <span className="font-semibold text-red-600">{formatCurrency(row.total, "ARS")}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </>
      ) : null}

      {/* Income entries */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Ingresos extra</h2>
          <Button onClick={openCreateIncome}>+ Nuevo Ingreso</Button>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <Table
            columns={incomeColumns}
            data={incomeEntries}
            isLoading={incomeLoading}
            rowKey={(i) => i.id}
            emptyMessage="No hay ingresos registrados en el período"
          />
        </div>
      </div>

      {/* Recent sessions */}
      {recentSessions.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Turnos recientes</h2>
          <div className="space-y-2">
            {recentSessions.map((session) => (
              <div
                key={session.id}
                className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {format(new Date(session.openedAt), "dd/MM/yyyy HH:mm", { locale: es })}
                    {session.closedAt && (
                      <span className="text-gray-400">
                        {" → "}
                        {format(new Date(session.closedAt), "HH:mm")}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Apertura: {formatCurrency(session.openingBalance, "ARS")}
                    {session.closingBalance && ` · Cierre: ${formatCurrency(session.closingBalance, "ARS")}`}
                  </p>
                </div>
                <Badge variant={session.closedAt ? "neutral" : "success"}>
                  {session.closedAt ? "Cerrado" : "Activo"}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Income modal */}
      <Modal
        isOpen={incomeModal}
        onClose={() => setIncomeModal(false)}
        title={editingIncome ? "Editar Ingreso" : "Nuevo Ingreso"}
      >
        <div className="space-y-4">
          {incomeError && <Alert variant="error">{incomeError}</Alert>}
          <Input
            label="Monto *"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={incomeAmount}
            onChange={(e) => setIncomeAmount(e.target.value)}
          />
          <Input
            label="Descripción *"
            value={incomeDesc}
            onChange={(e) => setIncomeDesc(e.target.value)}
            placeholder="Ej: Venta de mercadería"
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Método de pago *</label>
            <select
              value={incomeMethod}
              onChange={(e) => setIncomeMethod(e.target.value as PaymentMethod)}
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
            value={incomeDate}
            onChange={(e) => setIncomeDate(e.target.value)}
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Notas</label>
            <textarea
              value={incomeNotes}
              onChange={(e) => setIncomeNotes(e.target.value)}
              rows={2}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setIncomeModal(false)}>Cancelar</Button>
            <Button onClick={saveIncome} isLoading={incomeSaving}>
              {editingIncome ? "Guardar cambios" : "Crear ingreso"}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deletingIncomeId}
        onClose={() => setDeletingIncomeId(null)}
        onConfirm={deleteIncome}
        title="Eliminar ingreso"
        message="¿Estás seguro de que querés eliminar este ingreso?"
        confirmLabel="Eliminar"
        isLoading={isDeletingIncome}
      />
    </div>
  );
}
