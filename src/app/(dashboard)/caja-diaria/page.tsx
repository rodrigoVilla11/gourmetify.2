"use client";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
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

interface SessionSummary {
  incomeByPaymentMethod: { method: string; total: number }[];
  expensesByCategory: { categoryId: string | null; category: string; color: string; total: number }[];
  totalSales: number;
  totalExpenses: number;
  netBalance: number;
  openingBalance: number;
}

interface SessionExpense {
  id: string;
  amount: string;
  date: string;
  description: string;
  paymentMethod: string | null;
  notes: string | null;
  category: { id: string; name: string; color: string } | null;
}

interface ExpenseCategory {
  id: string;
  name: string;
  color: string;
}

export default function CajaDiariaPage() {
  const [activeSession, setActiveSession] = useState<CashSession | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [expenses, setExpenses] = useState<SessionExpense[]>([]);
  const [expensesLoading, setExpensesLoading] = useState(false);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [error, setError] = useState("");

  // Open session modal
  const [openModal, setOpenModal] = useState(false);
  const [openBalance, setOpenBalance] = useState("0");
  const [openNotes, setOpenNotes] = useState("");
  const [openSaving, setOpenSaving] = useState(false);

  // Close session modal
  const [closeModal, setCloseModal] = useState(false);
  const [closeBalance, setCloseBalance] = useState("");
  const [closeNotes, setCloseNotes] = useState("");
  const [closeSaving, setCloseSaving] = useState(false);

  // Expense modal
  const [expenseModal, setExpenseModal] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDesc, setExpenseDesc] = useState("");
  const [expenseCategoryId, setExpenseCategoryId] = useState("");
  const [expenseMethod, setExpenseMethod] = useState<PaymentMethod | "">("");
  const [expenseNotes, setExpenseNotes] = useState("");
  const [expenseSaving, setExpenseSaving] = useState(false);
  const [expenseError, setExpenseError] = useState("");
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);
  const [isDeletingExpense, setIsDeletingExpense] = useState(false);

  // ── Fetchers ────────────────────────────────────────────────────────────────

  const fetchSummary = useCallback(async (sessionId: string) => {
    setSummaryLoading(true);
    const res = await fetch(`/api/caja-diaria/summary?sessionId=${sessionId}`);
    setSummary(res.ok ? await res.json() : null);
    setSummaryLoading(false);
  }, []);

  const fetchExpenses = useCallback(async (sessionId: string) => {
    setExpensesLoading(true);
    const res = await fetch(`/api/expenses?cashSessionId=${sessionId}&limit=100`);
    const data = await res.json();
    setExpenses(data.data ?? []);
    setExpensesLoading(false);
  }, []);

  const fetchCategories = useCallback(async () => {
    const res = await fetch("/api/expense-categories");
    const data = await res.json();
    setCategories(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    fetchCategories();
    (async () => {
      setSessionLoading(true);
      const res = await fetch("/api/cash-sessions");
      const data = await res.json();
      const session: CashSession | null = data.active ?? null;
      setActiveSession(session);
      setSessionLoading(false);
      if (session) {
        fetchSummary(session.id);
        fetchExpenses(session.id);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = () => {
    if (activeSession) {
      fetchSummary(activeSession.id);
      fetchExpenses(activeSession.id);
    }
  };

  // ── Session handlers ─────────────────────────────────────────────────────────

  const openSession = async () => {
    setOpenSaving(true);
    setError("");
    const res = await fetch("/api/cash-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ openingBalance: parseFloat(openBalance) || 0, notes: openNotes || undefined }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Error al abrir caja");
      setOpenSaving(false);
      return;
    }
    setOpenModal(false);
    setOpenBalance("0");
    setOpenNotes("");
    // Reload session then fetch isolated summary
    const sr = await fetch("/api/cash-sessions");
    const sd = await sr.json();
    const session: CashSession | null = sd.active ?? null;
    setActiveSession(session);
    if (session) {
      fetchSummary(session.id);
      fetchExpenses(session.id);
    }
    setOpenSaving(false);
  };

  const closeSession = async () => {
    if (!activeSession) return;
    setCloseSaving(true);
    await fetch(`/api/cash-sessions/${activeSession.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        closingBalance: parseFloat(closeBalance) || 0,
        notes: closeNotes || undefined,
      }),
    });
    setCloseModal(false);
    setCloseBalance("");
    setCloseNotes("");
    setActiveSession(null);
    setSummary(null);
    setExpenses([]);
    setCloseSaving(false);
  };

  // ── Expense handlers ─────────────────────────────────────────────────────────

  const saveExpense = async () => {
    if (!activeSession) return;
    setExpenseError("");
    if (!expenseAmount || parseFloat(expenseAmount) <= 0) {
      setExpenseError("Ingresá un monto válido");
      return;
    }
    if (!expenseDesc.trim()) {
      setExpenseError("Ingresá una descripción");
      return;
    }
    setExpenseSaving(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(expenseAmount),
          description: expenseDesc.trim(),
          categoryId: expenseCategoryId || null,
          paymentMethod: expenseMethod || null,
          notes: expenseNotes || null,
          cashSessionId: activeSession.id,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setExpenseError(d.error ?? "Error al guardar gasto");
        return;
      }
      setExpenseModal(false);
      fetchExpenses(activeSession.id);
      fetchSummary(activeSession.id);
    } catch {
      setExpenseError("Error al guardar gasto");
    } finally {
      setExpenseSaving(false);
    }
  };

  const deleteExpense = async () => {
    if (!deletingExpenseId || !activeSession) return;
    setIsDeletingExpense(true);
    await fetch(`/api/expenses/${deletingExpenseId}`, { method: "DELETE" });
    setDeletingExpenseId(null);
    setIsDeletingExpense(false);
    fetchExpenses(activeSession.id);
    fetchSummary(activeSession.id);
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Caja del Día</h1>
          <p className="text-sm text-gray-500 mt-1 capitalize">
            {format(new Date(), "EEEE d 'de' MMMM yyyy", { locale: es })}
          </p>
        </div>
        {activeSession && (
          <Button variant="secondary" onClick={refresh} isLoading={summaryLoading}>
            Actualizar
          </Button>
        )}
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {/* Session Banner */}
      {!sessionLoading && (
        <div
          className={`rounded-xl border p-5 flex items-center justify-between ${
            activeSession ? "bg-emerald-50 border-emerald-200" : "bg-gray-50 border-gray-200"
          }`}
        >
          <div>
            {activeSession ? (
              <>
                <p className="font-semibold text-emerald-800">Turno en curso</p>
                <p className="text-sm text-emerald-700 mt-0.5">
                  Desde {format(new Date(activeSession.openedAt), "dd/MM/yyyy HH:mm", { locale: es })} ·
                  Saldo apertura: {formatCurrency(activeSession.openingBalance, "ARS")}
                </p>
              </>
            ) : (
              <>
                <p className="font-semibold text-gray-700">No hay turno activo</p>
                <p className="text-sm text-gray-500 mt-0.5">
                  Abrí una caja para registrar ventas y gastos del turno
                </p>
              </>
            )}
          </div>
          <div className="flex gap-3">
            {activeSession ? (
              <Button
                variant="danger"
                onClick={() => { setCloseBalance(""); setCloseNotes(""); setCloseModal(true); }}
              >
                Cerrar caja
              </Button>
            ) : (
              <Button onClick={() => setOpenModal(true)}>Abrir caja</Button>
            )}
          </div>
        </div>
      )}

      {/* Content: only when there's an active session */}
      {activeSession && (
        <>
          {summaryLoading ? (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
              Cargando resumen del turno…
            </div>
          ) : summary ? (
            <>
              {/* KPI cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-5">
                  <p className="text-xs font-medium text-emerald-600">Ventas cobradas</p>
                  <p className="text-2xl font-bold text-emerald-800 mt-1">
                    {formatCurrency(summary.totalSales, "ARS")}
                  </p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                  <p className="text-xs font-medium text-gray-500">Saldo apertura</p>
                  <p className="text-2xl font-bold text-gray-800 mt-1">
                    {formatCurrency(summary.openingBalance, "ARS")}
                  </p>
                </div>
                <div className="bg-red-50 border border-red-100 rounded-xl p-5">
                  <p className="text-xs font-medium text-red-600">Gastos del turno</p>
                  <p className="text-2xl font-bold text-red-800 mt-1">
                    {formatCurrency(summary.totalExpenses, "ARS")}
                  </p>
                </div>
                <div
                  className={`rounded-xl p-5 border ${
                    summary.netBalance >= 0 ? "bg-gray-50 border-gray-200" : "bg-red-50 border-red-200"
                  }`}
                >
                  <p className="text-xs font-medium text-gray-600">Balance neto</p>
                  <p
                    className={`text-2xl font-bold mt-1 ${
                      summary.netBalance >= 0 ? "text-gray-900" : "text-red-700"
                    }`}
                  >
                    {formatCurrency(summary.netBalance, "ARS")}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Income by method */}
                <Card title="Ingresos por método de pago">
                  {summary.incomeByPaymentMethod.length === 0 ? (
                    <p className="text-sm text-gray-400 py-4 text-center">Sin ventas en este turno</p>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {summary.incomeByPaymentMethod.map((row) => (
                        <div key={row.method} className="flex items-center justify-between py-3">
                          <span className="text-gray-700">
                            {PAYMENT_METHOD_LABELS[row.method as PaymentMethod] ?? row.method}
                          </span>
                          <span className="font-semibold text-gray-900">
                            {formatCurrency(row.total, "ARS")}
                          </span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between py-3">
                        <span className="text-sm font-medium text-gray-500">Total cobrado</span>
                        <span className="font-bold text-gray-900">
                          {formatCurrency(summary.totalSales, "ARS")}
                        </span>
                      </div>
                    </div>
                  )}
                </Card>

                {/* Expenses by category */}
                <Card title="Gastos del turno por categoría">
                  {summary.expensesByCategory.length === 0 ? (
                    <p className="text-sm text-gray-400 py-4 text-center">Sin gastos en este turno</p>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {summary.expensesByCategory.map((row) => (
                        <div key={row.category} className="flex items-center justify-between py-3">
                          <span
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium text-white"
                            style={{ backgroundColor: row.color }}
                          >
                            {row.category}
                          </span>
                          <span className="font-semibold text-red-600">
                            {formatCurrency(row.total, "ARS")}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>

              {/* Balance bar */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-4">
                  Resumen del turno
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Saldo apertura</span>
                    <span className="font-medium text-gray-700">
                      + {formatCurrency(summary.openingBalance, "ARS")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Ventas cobradas</span>
                    <span className="font-medium text-emerald-600">
                      + {formatCurrency(summary.totalSales, "ARS")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Gastos del turno</span>
                    <span className="font-medium text-red-600">
                      − {formatCurrency(summary.totalExpenses, "ARS")}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-gray-100 flex justify-between font-semibold text-base">
                    <span className="text-gray-900">Balance neto</span>
                    <span className={summary.netBalance >= 0 ? "text-gray-900" : "text-red-600"}>
                      {summary.netBalance >= 0 ? "" : "− "}
                      {formatCurrency(Math.abs(summary.netBalance), "ARS")}
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="h-32 flex items-center justify-center text-gray-400 text-sm">
              No se pudo cargar el resumen del turno
            </div>
          )}

          {/* Expense list */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Gastos del turno</h2>
              <Button
                onClick={() => {
                  setExpenseAmount("");
                  setExpenseDesc("");
                  setExpenseCategoryId("");
                  setExpenseMethod("");
                  setExpenseNotes("");
                  setExpenseError("");
                  setExpenseModal(true);
                }}
              >
                + Registrar gasto
              </Button>
            </div>

            {expensesLoading ? (
              <div className="h-24 flex items-center justify-center text-gray-400 text-sm">
                Cargando…
              </div>
            ) : expenses.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
                No hay gastos en este turno todavía
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">
                {expenses.map((e) => (
                  <div key={e.id} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {e.category ? (
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white shrink-0"
                          style={{ backgroundColor: e.category.color }}
                        >
                          {e.category.name}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 shrink-0">
                          Sin categoría
                        </span>
                      )}
                      <span className="text-sm text-gray-800 truncate">{e.description}</span>
                      {e.paymentMethod && (
                        <span className="text-xs text-gray-400 shrink-0">
                          · {PAYMENT_METHOD_LABELS[e.paymentMethod as PaymentMethod] ?? e.paymentMethod}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 shrink-0 ml-4">
                      <span className="font-semibold text-red-600 text-sm">
                        {formatCurrency(e.amount, "ARS")}
                      </span>
                      <button
                        onClick={() => setDeletingExpenseId(e.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors text-lg leading-none"
                        title="Eliminar"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Open session modal */}
      <Modal isOpen={openModal} onClose={() => setOpenModal(false)} title="Abrir Caja">
        <div className="space-y-4">
          <Input
            label="Saldo inicial en efectivo"
            type="number"
            min="0"
            step="0.01"
            value={openBalance}
            onChange={(e) => setOpenBalance(e.target.value)}
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Notas (opcional)</label>
            <textarea
              value={openNotes}
              onChange={(e) => setOpenNotes(e.target.value)}
              rows={2}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setOpenModal(false)}>Cancelar</Button>
            <Button onClick={openSession} isLoading={openSaving}>Abrir caja</Button>
          </div>
        </div>
      </Modal>

      {/* Close session modal */}
      <Modal isOpen={closeModal} onClose={() => setCloseModal(false)} title="Cerrar Caja">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Al cerrar el turno, las ventas y gastos pasan a verse en la Caja general.
          </p>
          <Input
            label="Saldo final en efectivo"
            type="number"
            min="0"
            step="0.01"
            value={closeBalance}
            onChange={(e) => setCloseBalance(e.target.value)}
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Notas (opcional)</label>
            <textarea
              value={closeNotes}
              onChange={(e) => setCloseNotes(e.target.value)}
              rows={2}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setCloseModal(false)}>Cancelar</Button>
            <Button variant="danger" onClick={closeSession} isLoading={closeSaving}>
              Cerrar caja
            </Button>
          </div>
        </div>
      </Modal>

      {/* Expense modal */}
      <Modal isOpen={expenseModal} onClose={() => setExpenseModal(false)} title="Registrar gasto del turno">
        <div className="space-y-4">
          {expenseError && <Alert variant="error">{expenseError}</Alert>}
          <Input
            label="Monto *"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={expenseAmount}
            onChange={(e) => setExpenseAmount(e.target.value)}
          />
          <Input
            label="Descripción *"
            value={expenseDesc}
            onChange={(e) => setExpenseDesc(e.target.value)}
            placeholder="Ej: Compra de insumos"
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Categoría (opcional)</label>
            <select
              value={expenseCategoryId}
              onChange={(e) => setExpenseCategoryId(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">Sin categoría</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Método de pago (opcional)</label>
            <select
              value={expenseMethod}
              onChange={(e) => setExpenseMethod(e.target.value as PaymentMethod | "")}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">Sin especificar</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Notas</label>
            <textarea
              value={expenseNotes}
              onChange={(e) => setExpenseNotes(e.target.value)}
              rows={2}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setExpenseModal(false)}>Cancelar</Button>
            <Button onClick={saveExpense} isLoading={expenseSaving}>Registrar gasto</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deletingExpenseId}
        onClose={() => setDeletingExpenseId(null)}
        onConfirm={deleteExpense}
        title="Eliminar gasto"
        message="¿Estás seguro de que querés eliminar este gasto del turno?"
        confirmLabel="Eliminar"
        isLoading={isDeletingExpense}
      />
    </div>
  );
}
