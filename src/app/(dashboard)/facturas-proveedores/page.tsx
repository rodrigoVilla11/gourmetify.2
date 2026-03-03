"use client";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Table, Column } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { formatCurrency } from "@/utils/currency";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { INVOICE_STATUS_LABELS } from "@/types";
import type { InvoiceStatus } from "@/types";

interface Supplier { id: string; name: string }

interface SupplierInvoice {
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
  supplier: Supplier;
}

const STATUS_BADGE: Record<string, "danger" | "warning" | "success" | "neutral"> = {
  PENDING: "danger",
  PARTIAL: "warning",
  PAID: "success",
};

export default function FacturasProveedoresPage() {
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Filters
  const [supplierFilter, setSupplierFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Form
  const [supplierId, setSupplierId] = useState("");
  const [amount, setAmount] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [date, setDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "100" });
    if (supplierFilter) params.set("supplierId", supplierFilter);
    if (statusFilter) params.set("status", statusFilter);
    const res = await fetch(`/api/supplier-invoices?${params}`);
    const data = await res.json();
    setInvoices(data.data ?? []);
    setLoading(false);
  }, [supplierFilter, statusFilter]);

  useEffect(() => {
    fetch("/api/suppliers")
      .then((r) => r.json())
      .then((d) => setSuppliers(Array.isArray(d) ? d : []));
  }, []);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const openCreate = () => {
    setSupplierId("");
    setAmount("");
    setInvoiceNumber("");
    setDate("");
    setDueDate("");
    setNotes("");
    setImageFile(null);
    setError("");
    setModal(true);
  };

  const handleSave = async () => {
    setError("");
    if (!supplierId) { setError("Seleccioná un proveedor"); return; }
    if (!amount || parseFloat(amount) <= 0) { setError("Ingresá un monto válido"); return; }

    setSaving(true);
    try {
      let imageUrl: string | undefined;

      // Upload image if provided
      if (imageFile) {
        setUploadingImage(true);
        const fd = new FormData();
        fd.append("file", imageFile);
        const upRes = await fetch("/api/upload", { method: "POST", body: fd });
        if (upRes.ok) {
          const upData = await upRes.json();
          imageUrl = upData.url;
        }
        setUploadingImage(false);
      }

      const body = {
        supplierId,
        amount: parseFloat(amount),
        invoiceNumber: invoiceNumber || undefined,
        date: date || undefined,
        dueDate: dueDate || undefined,
        notes: notes || undefined,
        imageUrl,
      };

      const res = await fetch("/api/supplier-invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Error al crear factura"); return; }
      setModal(false);
      fetchInvoices();
    } catch {
      setError("Error al guardar factura");
    } finally {
      setSaving(false);
      setUploadingImage(false);
    }
  };

  const columns: Column<SupplierInvoice>[] = [
    {
      key: "date",
      header: "Fecha",
      render: (i) => format(new Date(i.date), "dd/MM/yyyy", { locale: es }),
    },
    {
      key: "supplier",
      header: "Proveedor",
      render: (i) => (
        <Link href={`/suppliers/${i.supplierId}`} className="font-medium text-emerald-700 hover:underline">
          {i.supplier.name}
        </Link>
      ),
    },
    {
      key: "invoiceNumber",
      header: "N° Factura",
      className: "hidden sm:table-cell",
      render: (i) => i.invoiceNumber ?? <span className="text-gray-400">—</span>,
    },
    {
      key: "amount",
      header: "Monto",
      render: (i) => (
        <span className="font-semibold text-gray-900">{formatCurrency(i.amount, "ARS")}</span>
      ),
    },
    {
      key: "dueDate",
      header: "Vencimiento",
      className: "hidden sm:table-cell",
      render: (i) =>
        i.dueDate ? format(new Date(i.dueDate), "dd/MM/yyyy", { locale: es }) : <span className="text-gray-400">—</span>,
    },
    {
      key: "status",
      header: "Estado",
      render: (i) => (
        <Badge variant={STATUS_BADGE[i.status] ?? "neutral"}>
          {INVOICE_STATUS_LABELS[i.status as InvoiceStatus] ?? i.status}
        </Badge>
      ),
    },
    {
      key: "image",
      header: "",
      className: "hidden sm:table-cell",
      render: (i) =>
        i.imageUrl ? (
          <a href={i.imageUrl} target="_blank" rel="noreferrer" className="text-xs text-emerald-600 hover:underline">
            Ver foto
          </a>
        ) : null,
    },
    {
      key: "actions",
      header: "",
      render: (i) => (
        <Link href={`/facturas-proveedores/${i.id}`}>
          <Button size="sm" variant="ghost">Ver detalle</Button>
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Facturas de Proveedores</h1>
          <p className="text-sm text-gray-500 mt-1">Gestión de deudas y cuenta corriente</p>
        </div>
        <Button onClick={openCreate}>+ Nueva Factura</Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3 items-end">
        <div className="w-full sm:w-auto">
          <label className="block text-xs font-medium text-gray-600 mb-1">Proveedor</label>
          <select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Todos</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div className="w-full sm:w-auto">
          <label className="block text-xs font-medium text-gray-600 mb-1">Estado</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Todos</option>
            <option value="PENDING">Pendiente</option>
            <option value="PARTIAL">Parcial</option>
            <option value="PAID">Pagado</option>
          </select>
        </div>
      </div>

      {/* Summary */}
      {!loading && (
        <div className="grid grid-cols-3 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500">Pendientes</p>
            <p className="text-2xl font-bold text-red-600">
              {invoices.filter((i) => i.status === "PENDING").length}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500">Parciales</p>
            <p className="text-2xl font-bold text-amber-600">
              {invoices.filter((i) => i.status === "PARTIAL").length}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500">Pagadas</p>
            <p className="text-2xl font-bold text-emerald-600">
              {invoices.filter((i) => i.status === "PAID").length}
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <Table
          columns={columns}
          data={invoices}
          isLoading={loading}
          rowKey={(i) => i.id}
          emptyMessage="No hay facturas registradas"
        />
      </div>

      <Modal isOpen={modal} onClose={() => setModal(false)} title="Nueva Factura">
        <div className="space-y-4">
          {error && <Alert variant="error">{error}</Alert>}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Proveedor *</label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">Seleccionar proveedor...</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <Input
            label="Monto *"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <Input
            label="N° de factura"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            placeholder="Ej: 0001-00001234"
          />
          <Input
            label="Fecha"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <Input
            label="Fecha de vencimiento"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Foto de la factura</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
            />
            {imageFile && (
              <p className="text-xs text-gray-400 mt-1">{imageFile.name}</p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Notas</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModal(false)}>Cancelar</Button>
            <Button onClick={handleSave} isLoading={saving || uploadingImage}>
              {uploadingImage ? "Subiendo foto…" : "Crear factura"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
