"use client";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Table, Column } from "@/components/ui/Table";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Badge } from "@/components/ui/Badge";
import { ImportButton } from "@/components/ui/ImportButton";
import { downloadExcel } from "@/utils/excel";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { PAYMENT_TERMS_LABELS } from "@/types";

interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  paymentTerms: string;
  creditDays: number;
  _count?: { ingredients: number };
}

interface SupplierForm {
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
  paymentTerms?: string;
  creditDays?: number;
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<SupplierForm>();
  const watchedTerms = watch("paymentTerms");

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/suppliers");
    const data = await res.json();
    setSuppliers(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

  const openCreate = () => {
    setEditingSupplier(null);
    reset({ name: "", phone: "", email: "", notes: "", paymentTerms: "ON_DELIVERY", creditDays: 0 });
    setIsModalOpen(true);
  };

  const openEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    reset({
      name: supplier.name,
      phone: supplier.phone ?? "",
      email: supplier.email ?? "",
      notes: supplier.notes ?? "",
      paymentTerms: supplier.paymentTerms ?? "ON_DELIVERY",
      creditDays: supplier.creditDays ?? 0,
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (data: SupplierForm) => {
    setSaving(true);
    try {
      if (editingSupplier) {
        await fetch(`/api/suppliers/${editingSupplier.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      } else {
        await fetch("/api/suppliers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      }
      setIsModalOpen(false);
      fetchSuppliers();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    await fetch(`/api/suppliers/${deletingId}`, { method: "DELETE" });
    setDeletingId(null);
    setIsDeleting(false);
    fetchSuppliers();
  };

  const columns: Column<Supplier>[] = [
    {
      key: "name",
      header: "Nombre",
      render: (s) => (
        <Link href={`/suppliers/${s.id}`} className="font-medium text-emerald-700 hover:underline">
          {s.name}
        </Link>
      ),
    },
    { key: "phone", header: "Teléfono", className: "hidden sm:table-cell", render: (s) => s.phone ?? <span className="text-gray-400">—</span> },
    { key: "email", header: "Email", className: "hidden sm:table-cell", render: (s) => s.email ?? <span className="text-gray-400">—</span> },
    {
      key: "paymentTerms",
      header: "Cond. pago",
      render: (s) => (
        <Badge variant={s.paymentTerms === "CREDIT" ? "warning" : "neutral"}>
          {PAYMENT_TERMS_LABELS[s.paymentTerms as keyof typeof PAYMENT_TERMS_LABELS] ?? s.paymentTerms}
          {s.paymentTerms === "CREDIT" && s.creditDays > 0 ? ` (${s.creditDays}d)` : ""}
        </Badge>
      ),
    },
    {
      key: "ingredients",
      header: "Ingredientes",
      className: "hidden sm:table-cell",
      render: (s) => (
        <Badge variant="neutral">{s._count?.ingredients ?? 0} ingredientes</Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (s) => (
        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="ghost" onClick={() => openEdit(s)}>Editar</Button>
          <Button size="sm" variant="danger" onClick={() => setDeletingId(s.id)}>Eliminar</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Proveedores</h1>
          <p className="text-sm text-gray-500 mt-1">{suppliers.length} proveedores registrados</p>
        </div>
        <div className="flex flex-wrap items-start gap-3">
          <ImportButton
            endpoint="/api/suppliers/import"
            templateHeaders={["Nombre", "Teléfono", "Email", "Notas"]}
            templateExampleRow={["Proveedor ABC", "+54 11 1234-5678", "proveedor@mail.com", "Notas opcionales"]}
            onSuccess={fetchSuppliers}
          />
          <Button variant="secondary" onClick={() => downloadExcel("/api/suppliers?format=xlsx", "proveedores.xlsx")}>
            Exportar Excel
          </Button>
          <Button onClick={openCreate}>+ Nuevo Proveedor</Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <Table
          columns={columns}
          data={suppliers}
          isLoading={loading}
          rowKey={(s) => s.id}
          emptyMessage="No hay proveedores registrados"
        />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSupplier ? "Editar Proveedor" : "Nuevo Proveedor"}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Nombre *"
            {...register("name", { required: "Nombre requerido" })}
            error={errors.name?.message}
          />
          <Input label="Teléfono" {...register("phone")} />
          <Input label="Email" type="email" {...register("email")} />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Condición de pago</label>
            <select
              {...register("paymentTerms")}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="ON_DELIVERY">Contra entrega</option>
              <option value="IMMEDIATE">En el momento</option>
              <option value="CREDIT">Cuenta corriente</option>
            </select>
          </div>
          {watchedTerms === "CREDIT" && (
            <Input
              label="Días de crédito"
              type="number"
              min="0"
              {...register("creditDays", { valueAsNumber: true })}
            />
          )}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Notas</label>
            <textarea
              {...register("notes")}
              rows={3}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={saving}>
              {editingSupplier ? "Guardar cambios" : "Crear proveedor"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDelete}
        title="Eliminar proveedor"
        message="¿Estás seguro? Los ingredientes asociados quedarán sin proveedor asignado."
        confirmLabel="Eliminar"
        isLoading={isDeleting}
      />
    </div>
  );
}
