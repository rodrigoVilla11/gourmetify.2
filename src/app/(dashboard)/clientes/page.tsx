"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const BRAND = "#0f2f26";
const BRAND_HOVER = "#1a4d3f";

function PrimaryBtn({ onClick, disabled, children, type = "button" }: { onClick?: () => void; disabled?: boolean; children: React.ReactNode; type?: "button" | "submit" }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      style={{ background: disabled ? "#9ca3af" : BRAND }}
      className="px-4 py-2 rounded-xl text-white text-sm font-semibold transition-colors hover:opacity-90 disabled:cursor-not-allowed">
      {children}
    </button>
  );
}
function SecondaryBtn({ onClick, children }: { onClick?: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className="px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 transition-colors">
      {children}
    </button>
  );
}

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

function Avatar({ name }: { name: string }) {
  const initials = name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
      style={{ background: BRAND }}>
      {initials}
    </div>
  );
}

export default function ClientesPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

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

  useEffect(() => {
    const t = setTimeout(() => fetchCustomers(search || undefined), 300);
    return () => clearTimeout(t);
  }, [search, fetchCustomers]);

  const stats = useMemo(() => {
    const total = customers.length;
    const conPedidos = customers.filter((c) => c._count.sales > 0).length;
    const sinPedidos = total - conPedidos;
    return { total, conPedidos, sinPedidos };
  }, [customers]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", phone: "", email: "", address: "", notes: "" });
    setSaveError("");
    setIsModalOpen(true);
  };

  const openEdit = (c: Customer, e: React.MouseEvent) => {
    e.stopPropagation();
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
          <p className="text-sm text-gray-500 mt-0.5">{stats.total} cliente{stats.total !== 1 ? "s" : ""} registrado{stats.total !== 1 ? "s" : ""}</p>
        </div>
        <PrimaryBtn onClick={openCreate}>+ Nuevo cliente</PrimaryBtn>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            icon: (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            ),
            value: stats.total,
            label: "Total clientes",
          },
          {
            icon: (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            ),
            value: stats.conPedidos,
            label: "Con pedidos",
          },
          {
            icon: (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
            ),
            value: stats.sinPedidos,
            label: "Sin pedidos",
          },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0"
              style={{ background: BRAND }}>
              {s.icon}
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-3">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar por nombre, teléfono o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 bg-gray-50"
            style={{ ["--tw-ring-color" as string]: BRAND }}
          />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Table */}
        <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <svg className="animate-spin h-6 w-6 text-gray-300" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            </div>
          ) : customers.length === 0 ? (
            <div className="text-center py-20 text-gray-400 text-sm">
              {search ? "Sin resultados para la búsqueda" : "No hay clientes registrados"}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cliente</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Teléfono</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Email</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Pedidos</th>
                  <th className="px-4 py-3 w-20" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {customers.map((c) => (
                  <tr
                    key={c.id}
                    className={`group hover:bg-gray-50 cursor-pointer transition-colors ${detail?.id === c.id ? "bg-emerald-50" : ""}`}
                    onClick={() => openDetail(c)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={c.name} />
                        <div>
                          <p className="font-semibold text-gray-900">{c.name}</p>
                          {c.address && <p className="text-xs text-gray-400 truncate max-w-[160px]">{c.address}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell font-mono text-xs">{c.phone ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-400 hidden md:table-cell truncate max-w-[180px] text-xs">{c.email ?? "—"}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center min-w-[24px] h-6 rounded-full text-xs font-bold px-2"
                        style={{ background: c._count.sales > 0 ? "#d1fae5" : "#f3f4f6", color: c._count.sales > 0 ? "#065f46" : "#9ca3af" }}>
                        {c._count.sales}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                        <button onClick={(e) => openEdit(c, e)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Editar">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setDeletingId(c.id); }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Eliminar">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
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
          <div className="lg:w-80 xl:w-96 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
            {loadingDetail ? (
              <div className="flex-1 flex items-center justify-center py-16">
                <svg className="animate-spin h-5 w-5 text-gray-300" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              </div>
            ) : detail && (
              <>
                {/* Panel header */}
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                      style={{ background: BRAND }}>
                      {detail.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="font-bold text-gray-900 text-base truncate">{detail.name}</h2>
                      {detail.phone && (
                        <p className="text-sm text-gray-500 font-mono">{detail.phone}</p>
                      )}
                      {detail.email && (
                        <p className="text-xs text-gray-400 truncate">{detail.email}</p>
                      )}
                      {detail.address && (
                        <p className="text-xs text-gray-400 mt-0.5">📍 {detail.address}</p>
                      )}
                    </div>
                    <button onClick={() => setDetail(null)}
                      className="text-gray-300 hover:text-gray-500 transition-colors flex-shrink-0 mt-0.5">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                  {detail.notes && (
                    <p className="text-xs text-gray-500 mt-3 bg-gray-50 rounded-xl p-2.5 border border-gray-100">{detail.notes}</p>
                  )}
                  <div className="mt-3 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{ background: "#d1fae5", color: "#065f46" }}>
                      {detail._count.sales} pedido{detail._count.sales !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                {/* Sale history */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Historial de pedidos</p>
                  {detail.sales.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">Sin pedidos registrados</p>
                  ) : (
                    detail.sales.map((sale) => (
                      <Link
                        key={sale.id}
                        href={`/sales/${sale.id}`}
                        className="block p-3 rounded-xl border border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/40 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-500">
                            {format(new Date(sale.date), "dd/MM/yyyy HH:mm", { locale: es })}
                          </p>
                          <p className="text-sm font-bold" style={{ color: BRAND }}>{fmt(sale.total)}</p>
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
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nombre *</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Nombre del cliente"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Teléfono</label>
              <input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+54 11 1234-5678"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="cliente@email.com"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Dirección</label>
            <input
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              placeholder="Calle 123, Piso 2, Dpto A..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notas</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              placeholder="Anotaciones opcionales..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 resize-none"
            />
          </div>
          {saveError && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{saveError}</div>
          )}
          <div className="flex justify-end gap-3 pt-1">
            <SecondaryBtn onClick={() => setIsModalOpen(false)}>Cancelar</SecondaryBtn>
            <PrimaryBtn onClick={handleSave} disabled={saving}>
              {saving ? "Guardando..." : editing ? "Guardar" : "Crear"}
            </PrimaryBtn>
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
