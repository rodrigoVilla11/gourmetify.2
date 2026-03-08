"use client";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatCurrency } from "@/utils/currency";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from "@/types";
import type { PaymentMethod } from "@/types";

function PrimaryBtn({ onClick, children, disabled }: { onClick?: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gray-900 hover:bg-gray-800 transition-colors disabled:opacity-60"
    >
      {children}
    </button>
  );
}

function SecondaryBtn({ onClick, children, disabled }: { onClick?: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-60"
    >
      {children}
    </button>
  );
}

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
    setError("");
    const res = await fetch(`/api/cash-sessions/${activeSession.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        closingBalance: parseFloat(closeBalance) || 0,
        notes: closeNotes || undefined,
      }),
    });
    setCloseSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Error al cerrar la caja. Intentá de nuevo.");
      return;
    }
    setCloseModal(false);
    setCloseBalance("");
    setCloseNotes("");
    setActiveSession(null);
    setSummary(null);
    setExpenses([]);
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
    const res = await fetch(`/api/expenses/${deletingExpenseId}`, { method: "DELETE" });
    setIsDeletingExpense(false);
    if (!res.ok) {
      setError("Error al eliminar el gasto. Intentá de nuevo.");
      setDeletingExpenseId(null);
      return;
    }
    setDeletingExpenseId(null);
    fetchExpenses(activeSession.id);
    fetchSummary(activeSession.id);
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Caja del Día</h1>
          <p className="text-sm text-gray-500 mt-0.5 capitalize">
            {format(new Date(), "EEEE d 'de' MMMM yyyy", { locale: es })}
          </p>
        </div>
        {activeSession && (
          <SecondaryBtn onClick={refresh} disabled={summaryLoading}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            {summaryLoading ? "Actualizando…" : "Actualizar"}
          </SecondaryBtn>
        )}
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {/* Session Banner */}
      {!sessionLoading && (
        <div className={`rounded-2xl border shadow-sm p-5 flex items-center justify-between gap-4 ${
          activeSession ? "bg-emerald-50 border-emerald-200" : "bg-white border-gray-200"
        }`}>
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              activeSession ? "bg-emerald-100" : "bg-gray-100"
            }`}>
              <svg className={`w-5 h-5 ${activeSession ? "text-emerald-600" : "text-gray-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
              </svg>
            </div>
            <div>
              {activeSession ? (
                <>
                  <p className="font-semibold text-emerald-800">Turno en curso</p>
                  <p className="text-sm text-emerald-700 mt-0.5">
                    Desde {format(new Date(activeSession.openedAt), "HH:mm", { locale: es })} · Apertura: {formatCurrency(activeSession.openingBalance, "ARS")}
                  </p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-gray-800">Sin turno activo</p>
                  <p className="text-sm text-gray-500 mt-0.5">Abrí una caja para registrar ventas y gastos del turno</p>
                </>
              )}
            </div>
          </div>
          <div className="shrink-0">
            {activeSession ? (
              <button
                onClick={() => { setCloseBalance(""); setCloseNotes(""); setCloseModal(true); }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-red-200 text-sm font-semibold text-red-600 bg-white hover:bg-red-50 transition-colors"
              >
                Cerrar caja
              </button>
            ) : (
              <PrimaryBtn onClick={() => setOpenModal(true)}>Abrir caja</PrimaryBtn>
            )}
          </div>
        </div>
      )}

      {/* Content: only when there's an active session */}
      {activeSession && (
        <>
          {summaryLoading ? (
            <div className="h-40 flex items-center justify-center text-gray-400 text-sm">
              Cargando resumen del turno…
            </div>
          ) : summary ? (
            <>
              {/* KPI cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-emerald-700">{formatCurrency(summary.totalSales, "ARS")}</p>
                    <p className="text-xs text-gray-500 font-medium">Ventas cobradas</p>
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-gray-900">{formatCurrency(summary.openingBalance, "ARS")}</p>
                    <p className="text-xs text-gray-500 font-medium">Saldo apertura</p>
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-rose-100 shadow-sm p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-rose-600">{formatCurrency(summary.totalExpenses, "ARS")}</p>
                    <p className="text-xs text-gray-500 font-medium">Gastos del turno</p>
                  </div>
                </div>
                <div className={`bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3 ${
                  summary.netBalance >= 0 ? "border border-gray-200" : "border border-rose-200"
                }`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    summary.netBalance >= 0 ? "bg-gray-50" : "bg-rose-50"
                  }`}>
                    <svg className={`w-5 h-5 ${summary.netBalance >= 0 ? "text-gray-600" : "text-rose-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                    </svg>
                  </div>
                  <div>
                    <p className={`text-xl font-bold ${summary.netBalance >= 0 ? "text-gray-900" : "text-rose-600"}`}>
                      {summary.netBalance < 0 ? "−" : ""}{formatCurrency(Math.abs(summary.netBalance), "ARS")}
                    </p>
                    <p className="text-xs text-gray-500 font-medium">Balance neto</p>
                  </div>
                </div>
              </div>

              {/* Breakdown + Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Income by method */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-800">Ingresos por método de pago</p>
                  </div>
                  {summary.incomeByPaymentMethod.length === 0 ? (
                    <p className="text-sm text-gray-400 py-8 text-center">Sin ventas en este turno</p>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {summary.incomeByPaymentMethod.map((row) => (
                        <div key={row.method} className="flex items-center justify-between px-5 py-3">
                          <span className="text-sm text-gray-700">
                            {PAYMENT_METHOD_LABELS[row.method as PaymentMethod] ?? row.method}
                          </span>
                          <span className="text-sm font-semibold text-gray-900">{formatCurrency(row.total, "ARS")}</span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between px-5 py-3 bg-gray-50">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total cobrado</span>
                        <span className="font-bold text-gray-900">{formatCurrency(summary.totalSales, "ARS")}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Expenses by category */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-800">Gastos por categoría</p>
                  </div>
                  {summary.expensesByCategory.length === 0 ? (
                    <p className="text-sm text-gray-400 py-8 text-center">Sin gastos en este turno</p>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {summary.expensesByCategory.map((row) => (
                        <div key={row.category} className="flex items-center justify-between px-5 py-3">
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold text-white"
                            style={{ backgroundColor: row.color }}
                          >
                            {row.category}
                          </span>
                          <span className="text-sm font-semibold text-rose-600">{formatCurrency(row.total, "ARS")}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Balance summary */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Resumen del turno</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Saldo apertura</span>
                    <span className="font-medium text-gray-700">+ {formatCurrency(summary.openingBalance, "ARS")}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Ventas cobradas</span>
                    <span className="font-semibold text-emerald-600">+ {formatCurrency(summary.totalSales, "ARS")}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Gastos del turno</span>
                    <span className="font-semibold text-rose-500">− {formatCurrency(summary.totalExpenses, "ARS")}</span>
                  </div>
                  <div className="pt-2.5 border-t border-gray-100 flex justify-between items-center">
                    <span className="font-semibold text-gray-900">Balance neto</span>
                    <span className={`font-bold text-base ${summary.netBalance >= 0 ? "text-gray-900" : "text-rose-600"}`}>
                      {summary.netBalance < 0 ? "− " : ""}{formatCurrency(Math.abs(summary.netBalance), "ARS")}
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
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-gray-900">Gastos del turno</h2>
              <PrimaryBtn onClick={() => {
                setExpenseAmount("");
                setExpenseDesc("");
                setExpenseCategoryId("");
                setExpenseMethod("");
                setExpenseNotes("");
                setExpenseError("");
                setExpenseModal(true);
              }}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Registrar gasto
              </PrimaryBtn>
            </div>

            {expensesLoading ? (
              <div className="h-24 flex items-center justify-center text-gray-400 text-sm">Cargando…</div>
            ) : expenses.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 flex flex-col items-center gap-2 text-center">
                <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                </svg>
                <p className="text-sm text-gray-400">Sin gastos registrados en este turno</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="divide-y divide-gray-50">
                  {expenses.map((e) => (
                    <div key={e.id} className="flex items-center justify-between px-5 py-3.5">
                      <div className="flex items-center gap-3 min-w-0">
                        {e.category ? (
                          <span
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold text-white shrink-0"
                            style={{ backgroundColor: e.category.color }}
                          >
                            {e.category.name}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500 shrink-0">
                            Sin cat.
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm text-gray-800 truncate">{e.description}</p>
                          {e.paymentMethod && (
                            <p className="text-xs text-gray-400">{PAYMENT_METHOD_LABELS[e.paymentMethod as PaymentMethod] ?? e.paymentMethod}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-4">
                        <span className="font-bold text-rose-600 text-sm">{formatCurrency(e.amount, "ARS")}</span>
                        <button
                          onClick={() => setDeletingExpenseId(e.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Eliminar"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
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
