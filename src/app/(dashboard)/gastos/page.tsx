"use client";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Table, Column } from "@/components/ui/Table";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { formatCurrency } from "@/utils/currency";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from "@/types";
import type { PaymentMethod } from "@/types";

interface ExpenseCategory {
  id: string;
  name: string;
  color: string;
  _count?: { expenses: number };
}

interface Expense {
  id: string;
  amount: string;
  currency: string;
  date: string;
  description: string;
  paymentMethod: string | null;
  notes: string | null;
  category: ExpenseCategory | null;
  categoryId: string | null;
}

type Tab = "gastos" | "categorias";

export default function GastosPage() {
  const [tab, setTab] = useState<Tab>("gastos");

  // ── Categories ──────────────────────────────────────────────────────────────
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [catLoading, setCatLoading] = useState(true);
  const [catModal, setCatModal] = useState(false);
  const [editingCat, setEditingCat] = useState<ExpenseCategory | null>(null);
  const [catName, setCatName] = useState("");
  const [catColor, setCatColor] = useState("#6B7280");
  const [catSaving, setCatSaving] = useState(false);
  const [catError, setCatError] = useState("");
  const [deletingCatId, setDeletingCatId] = useState<string | null>(null);
  const [isDeletingCat, setIsDeletingCat] = useState(false);

  // ── Expenses ─────────────────────────────────────────────────────────────────
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expLoading, setExpLoading] = useState(true);
  const [expModal, setExpModal] = useState(false);
  const [editingExp, setEditingExp] = useState<Expense | null>(null);
  const [expSaving, setExpSaving] = useState(false);
  const [deletingExpId, setDeletingExpId] = useState<string | null>(null);
  const [isDeletingExp, setIsDeletingExp] = useState(false);
  const [expError, setExpError] = useState("");

  // Filters
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const [from, setFrom] = useState(firstOfMonth.toISOString().slice(0, 10));
  const [to, setTo] = useState(today.toISOString().slice(0, 10));
  const [catFilter, setCatFilter] = useState("");

  // Expense form
  const [expAmount, setExpAmount] = useState("");
  const [expDesc, setExpDesc] = useState("");
  const [expCatId, setExpCatId] = useState("");
  const [expMethod, setExpMethod] = useState<PaymentMethod | "">("");
  const [expNotes, setExpNotes] = useState("");
  const [expDate, setExpDate] = useState("");

  // ── Fetch ───────────────────────────────────────────────────────────────────
  const fetchCategories = useCallback(async () => {
    setCatLoading(true);
    const res = await fetch("/api/expense-categories");
    const data = await res.json();
    setCategories(Array.isArray(data) ? data : []);
    setCatLoading(false);
  }, []);

  const fetchExpenses = useCallback(async () => {
    setExpLoading(true);
    const params = new URLSearchParams({ from, to, limit: "200" });
    if (catFilter) params.set("categoryId", catFilter);
    const res = await fetch(`/api/expenses?${params}`);
    const data = await res.json();
    setExpenses(data.data ?? []);
    setExpLoading(false);
  }, [from, to, catFilter]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);
  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  // ── Category handlers ────────────────────────────────────────────────────────
  const openCreateCat = () => {
    setEditingCat(null);
    setCatName("");
    setCatColor("#6B7280");
    setCatError("");
    setCatModal(true);
  };

  const openEditCat = (cat: ExpenseCategory) => {
    setEditingCat(cat);
    setCatName(cat.name);
    setCatColor(cat.color);
    setCatError("");
    setCatModal(true);
  };

  const saveCat = async () => {
    if (!catName.trim()) return;
    setCatSaving(true);
    setCatError("");
    const body = { name: catName.trim(), color: catColor };
    let res: Response;
    if (editingCat) {
      res = await fetch(`/api/expense-categories/${editingCat.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else {
      res = await fetch("/api/expense-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }
    setCatSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setCatError(d.error ?? "Error al guardar la categoría");
      return;
    }
    setCatModal(false);
    fetchCategories();
  };

  const deleteCat = async () => {
    if (!deletingCatId) return;
    setIsDeletingCat(true);
    const res = await fetch(`/api/expense-categories/${deletingCatId}`, { method: "DELETE" });
    setIsDeletingCat(false);
    if (!res.ok) {
      setDeletingCatId(null);
      return;
    }
    setDeletingCatId(null);
    fetchCategories();
  };

  // ── Expense handlers ─────────────────────────────────────────────────────────
  const openCreateExp = () => {
    setEditingExp(null);
    setExpAmount("");
    setExpDesc("");
    setExpCatId("");
    setExpMethod("");
    setExpNotes("");
    setExpDate("");
    setExpError("");
    setExpModal(true);
  };

  const openEditExp = (exp: Expense) => {
    setEditingExp(exp);
    setExpAmount(parseFloat(exp.amount).toString());
    setExpDesc(exp.description);
    setExpCatId(exp.categoryId ?? "");
    setExpMethod((exp.paymentMethod as PaymentMethod | "") ?? "");
    setExpNotes(exp.notes ?? "");
    setExpDate(exp.date ? exp.date.slice(0, 10) : "");
    setExpError("");
    setExpModal(true);
  };

  const saveExp = async () => {
    setExpError("");
    if (!expAmount || parseFloat(expAmount) <= 0) {
      setExpError("Ingresá un monto válido");
      return;
    }
    if (!expDesc.trim()) {
      setExpError("Ingresá una descripción");
      return;
    }
    setExpSaving(true);
    const body = {
      amount: parseFloat(expAmount),
      description: expDesc.trim(),
      categoryId: expCatId || undefined,
      paymentMethod: expMethod || undefined,
      notes: expNotes || undefined,
      date: expDate || undefined,
    };
    try {
      const res = editingExp
        ? await fetch(`/api/expenses/${editingExp.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch("/api/expenses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setExpError(d.error ?? "Error al guardar gasto");
        return;
      }
      setExpModal(false);
      fetchExpenses();
    } catch {
      setExpError("Error al guardar gasto");
    } finally {
      setExpSaving(false);
    }
  };

  const deleteExp = async () => {
    if (!deletingExpId) return;
    setIsDeletingExp(true);
    const res = await fetch(`/api/expenses/${deletingExpId}`, { method: "DELETE" });
    setIsDeletingExp(false);
    if (!res.ok) {
      setDeletingExpId(null);
      return;
    }
    setDeletingExpId(null);
    fetchExpenses();
  };

  // ── Summary ──────────────────────────────────────────────────────────────────
  const totalExpenses = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);

  // ── Columns ──────────────────────────────────────────────────────────────────
  const expColumns: Column<Expense>[] = [
    {
      key: "date",
      header: "Fecha",
      render: (e) => format(new Date(e.date), "dd/MM/yyyy", { locale: es }),
    },
    {
      key: "description",
      header: "Descripción",
      render: (e) => <span className="font-medium text-gray-900">{e.description}</span>,
    },
    {
      key: "category",
      header: "Categoría",
      className: "hidden sm:table-cell",
      render: (e) =>
        e.category ? (
          <span
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium text-white"
            style={{ backgroundColor: e.category.color }}
          >
            {e.category.name}
          </span>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
    {
      key: "paymentMethod",
      header: "Método",
      className: "hidden sm:table-cell",
      render: (e) =>
        e.paymentMethod
          ? PAYMENT_METHOD_LABELS[e.paymentMethod as PaymentMethod] ?? e.paymentMethod
          : <span className="text-gray-400">—</span>,
    },
    {
      key: "amount",
      header: "Monto",
      render: (e) => (
        <span className="font-semibold text-red-600">{formatCurrency(e.amount, "ARS")}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (e) => (
        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="ghost" onClick={() => openEditExp(e)}>Editar</Button>
          <Button size="sm" variant="danger" onClick={() => setDeletingExpId(e.id)}>Eliminar</Button>
        </div>
      ),
    },
  ];

  const catColumns: Column<ExpenseCategory>[] = [
    {
      key: "color",
      header: "",
      render: (c) => (
        <span
          className="inline-block w-5 h-5 rounded-full border border-gray-200"
          style={{ backgroundColor: c.color }}
        />
      ),
    },
    { key: "name", header: "Nombre", render: (c) => <span className="font-medium">{c.name}</span> },
    {
      key: "expenses",
      header: "Gastos",
      render: (c) => <Badge variant="neutral">{c._count?.expenses ?? 0} gastos</Badge>,
    },
    {
      key: "actions",
      header: "",
      render: (c) => (
        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="ghost" onClick={() => openEditCat(c)}>Editar</Button>
          <Button size="sm" variant="danger" onClick={() => setDeletingCatId(c.id)}>Eliminar</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gastos</h1>
          <p className="text-sm text-gray-500 mt-1">Control de egresos por categoría</p>
        </div>
        {tab === "gastos" ? (
          <Button onClick={openCreateExp}>+ Nuevo Gasto</Button>
        ) : (
          <Button onClick={openCreateCat}>+ Nueva Categoría</Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {(["gastos", "categorias"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
              tab === t
                ? "border-b-2 border-emerald-600 text-emerald-700"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "gastos" ? "Gastos" : "Categorías"}
          </button>
        ))}
      </div>

      {tab === "gastos" && (
        <>
          {/* Filters */}
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
            <div className="w-full sm:w-auto">
              <label className="block text-xs font-medium text-gray-600 mb-1">Categoría</label>
              <select
                value={catFilter}
                onChange={(e) => setCatFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Todas</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Summary */}
          {!expLoading && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-xs text-gray-500">Gastos en período</p>
                <p className="text-2xl font-bold text-gray-900">{expenses.length}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-xs text-gray-500">Total egresos</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses, "ARS")}</p>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <Table
              columns={expColumns}
              data={expenses}
              isLoading={expLoading}
              rowKey={(e) => e.id}
              emptyMessage="No hay gastos en el período seleccionado"
            />
          </div>
        </>
      )}

      {tab === "categorias" && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <Table
            columns={catColumns}
            data={categories}
            isLoading={catLoading}
            rowKey={(c) => c.id}
            emptyMessage="No hay categorías creadas"
          />
        </div>
      )}

      {/* Expense Modal */}
      <Modal
        isOpen={expModal}
        onClose={() => setExpModal(false)}
        title={editingExp ? "Editar Gasto" : "Nuevo Gasto"}
      >
        <div className="space-y-4">
          {expError && <Alert variant="error">{expError}</Alert>}
          <Input
            label="Monto *"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={expAmount}
            onChange={(e) => setExpAmount(e.target.value)}
          />
          <Input
            label="Descripción *"
            value={expDesc}
            onChange={(e) => setExpDesc(e.target.value)}
            placeholder="Ej: Compra de insumos"
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Categoría</label>
            <select
              value={expCatId}
              onChange={(e) => setExpCatId(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">Sin categoría</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Método de pago</label>
            <select
              value={expMethod}
              onChange={(e) => setExpMethod(e.target.value as PaymentMethod | "")}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">Sin especificar</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>
              ))}
            </select>
          </div>
          <Input
            label="Fecha (opcional)"
            type="date"
            value={expDate}
            onChange={(e) => setExpDate(e.target.value)}
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Notas</label>
            <textarea
              value={expNotes}
              onChange={(e) => setExpNotes(e.target.value)}
              rows={2}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setExpModal(false)}>Cancelar</Button>
            <Button onClick={saveExp} isLoading={expSaving}>
              {editingExp ? "Guardar cambios" : "Crear gasto"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Category Modal */}
      <Modal
        isOpen={catModal}
        onClose={() => setCatModal(false)}
        title={editingCat ? "Editar Categoría" : "Nueva Categoría"}
      >
        <div className="space-y-4">
          {catError && <Alert variant="error">{catError}</Alert>}
          <Input
            label="Nombre *"
            value={catName}
            onChange={(e) => setCatName(e.target.value)}
            placeholder="Ej: Servicios"
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={catColor}
                onChange={(e) => setCatColor(e.target.value)}
                className="h-10 w-16 rounded border border-gray-300 cursor-pointer p-1"
              />
              <span
                className="px-3 py-1 rounded-full text-white text-sm font-medium"
                style={{ backgroundColor: catColor }}
              >
                {catName || "Vista previa"}
              </span>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setCatModal(false)}>Cancelar</Button>
            <Button onClick={saveCat} isLoading={catSaving}>
              {editingCat ? "Guardar cambios" : "Crear categoría"}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deletingExpId}
        onClose={() => setDeletingExpId(null)}
        onConfirm={deleteExp}
        title="Eliminar gasto"
        message="¿Estás seguro de que querés eliminar este gasto?"
        confirmLabel="Eliminar"
        isLoading={isDeletingExp}
      />

      <ConfirmDialog
        isOpen={!!deletingCatId}
        onClose={() => setDeletingCatId(null)}
        onConfirm={deleteCat}
        title="Eliminar categoría"
        message="Los gastos de esta categoría quedarán sin categoría asignada."
        confirmLabel="Eliminar"
        isLoading={isDeletingCat}
      />
    </div>
  );
}
