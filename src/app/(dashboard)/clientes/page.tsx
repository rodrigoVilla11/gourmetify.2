"use client";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Sale {
  id: string;
  date: string;
  total: string;
  payments: { paymentMethod: string; amount: string }[];
}
interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  createdAt: string;
  _count: { sales: number };
}
interface CustomerDetail extends Customer {
  sales: Sale[];
}

function fmt(n: string | number) {
  return "$" + Number(n).toLocaleString("es-AR", { maximumFractionDigits: 0 });
}

export default function ClientesPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modal create/edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Detail panel
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Delete
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchCustomers = useCallback(async (q?: string) => {
    setLoading(true);
    const url = q ? `/api/customers?q=${encodeURIComponent(q)}` : "/api/customers";
    const res = await fetch(url);
    const data = await res.json();
    setCustomers(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => fetchCustomers(search || undefined), 300);
    return () => clearTimeout(t);
  }, [search, fetchCustomers]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", phone: "", email: "", address: "", notes: "" });
    setSaveError("");
    setIsModalOpen(true);
  };

  const openEdit = (c: Customer) => {
    setEditing(c);
    setForm({ name: c.name, phone: c.phone ?? "", email: c.email ?? "", address: c.address ?? "", notes: c.notes ?? "" });
    setSaveError("");
    setIsModalOpen(true);
  };

  const openDetail = async (c: Customer) => {
    setDetail(null);
    setLoadingDetail(true);
    const res = await fetch(`/api/customers/${c.id}`);
    const data = await res.json();
    setDetail(data);
    setLoadingDetail(false);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setSaveError("El nombre es requerido"); return; }
    setSaving(true);
    setSaveError("");
    const body = { name: form.name.trim(), phone: form.phone.trim() || null, email: form.email.trim() || null, address: form.address.trim() || null, notes: form.notes.trim() || null };
    try {
      const res = editing
        ? await fetch(`/api/customers/${editing.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        : await fetch("/api/customers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) {
        const err = await res.json();
        setSaveError(err.error ?? "Error al guardar");
        return;
      }
      setIsModalOpen(false);
      fetchCustomers(search || undefined);
      if (detail && editing?.id === detail.id) {
        const updated = await res.json();
        setDetail((prev) => prev ? { ...prev, ...updated } : null);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    await fetch(`/api/customers/${deletingId}`, { method: "DELETE" });
    setDeletingId(null);
    setIsDeleting(false);
    if (detail?.id === deletingId) setDetail(null);
    fetchCustomers(search || undefined);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-500 mt-1">{customers.length} cliente{customers.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={openCreate}>+ Nuevo cliente</Button>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Buscar por nombre o teléfono..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white shadow-sm"
        />
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Table */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="text-center py-16 text-gray-400 text-sm">Cargando...</div>
          ) : customers.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-sm">
              {search ? "Sin resultados para la búsqueda" : "No hay clientes registrados"}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nombre</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Teléfono</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Email</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Pedidos</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {customers.map((c) => (
                  <tr
                    key={c.id}
                    className={`hover:bg-gray-50 cursor-pointer transition-colors ${detail?.id === c.id ? "bg-emerald-50" : ""}`}
                    onClick={() => openDetail(c)}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{c.phone ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell truncate max-w-[180px]">{c.email ?? "—"}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center min-w-[24px] h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold px-2">
                        {c._count.sales}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" variant="ghost" onClick={() => openEdit(c)}>Editar</Button>
                        <Button size="sm" variant="danger" onClick={() => setDeletingId(c.id)}>Eliminar</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Detail panel */}
        {(loadingDetail || detail) && (
          <div className="lg:w-80 xl:w-96 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col">
            {loadingDetail ? (
              <div className="flex-1 flex items-center justify-center py-16 text-gray-400 text-sm">Cargando...</div>
            ) : detail && (
              <>
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="font-bold text-gray-900 text-lg">{detail.name}</h2>
                      {detail.phone && <p className="text-sm text-gray-500">{detail.phone}</p>}
                      {detail.email && <p className="text-xs text-gray-400">{detail.email}</p>}
                      {detail.address && <p className="text-xs text-gray-400">📍 {detail.address}</p>}
                    </div>
                    <button onClick={() => setDetail(null)} className="text-gray-300 hover:text-gray-500 mt-0.5">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                  {detail.notes && <p className="text-xs text-gray-400 mt-2 bg-gray-50 rounded p-2">{detail.notes}</p>}
                  <p className="text-xs text-gray-400 mt-2">{detail._count.sales} pedido{detail._count.sales !== 1 ? "s" : ""} en total</p>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Historial de pedidos</p>
                  {detail.sales.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">Sin pedidos registrados</p>
                  ) : (
                    detail.sales.map((sale) => (
                      <Link
                        key={sale.id}
                        href={`/sales/${sale.id}`}
                        className="block p-3 rounded-lg border border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-500">
                            {format(new Date(sale.date), "dd/MM/yyyy HH:mm", { locale: es })}
                          </p>
                          <p className="text-sm font-bold text-emerald-600">{fmt(sale.total)}</p>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Create/Edit modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editing ? "Editar cliente" : "Nuevo cliente"} size="sm">
        <div className="space-y-4">
          <Input
            label="Nombre *"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Nombre del cliente"
          />
          <Input
            label="Teléfono"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder="+54 11 1234-5678"
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="cliente@email.com"
          />
          <Input
            label="Dirección"
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            placeholder="Calle 123, Piso 2, Dpto A..."
          />
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notas</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              placeholder="Anotaciones opcionales..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>
          {saveError && <p className="text-xs text-red-500 bg-red-50 rounded px-3 py-2">{saveError}</p>}
          <div className="flex justify-end gap-3 pt-1">
            <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} isLoading={saving}>{editing ? "Guardar" : "Crear"}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDelete}
        title="Eliminar cliente"
        message="Se eliminará el cliente. Sus ventas quedarán registradas sin cliente asociado."
        confirmLabel="Eliminar"
        isLoading={isDeleting}
      />
    </div>
  );
}
