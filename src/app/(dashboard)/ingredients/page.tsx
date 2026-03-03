"use client";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Table, Column } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useForm } from "react-hook-form";
import { UNITS, CURRENCIES, type Unit, type Currency } from "@/types";
import { unitLabel, formatQty } from "@/utils/units";
import { formatCurrency } from "@/utils/currency";
import { ImportButton } from "@/components/ui/ImportButton";
import { downloadExcel } from "@/utils/excel";

interface Supplier { id: string; name: string }
interface Ingredient {
  id: string;
  name: string;
  unit: Unit;
  onHand: string;
  minQty: string;
  costPerUnit: string;
  currency: Currency;
  isActive: boolean;
  supplier: Supplier | null;
  isLow?: boolean;
}

interface IngredientForm {
  name: string;
  unit: Unit;
  onHand: number;
  minQty: number;
  costPerUnit: number;
  currency: Currency;
  supplierId?: string;
}

export default function IngredientsPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Ingredient | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<IngredientForm>({
    defaultValues: { unit: "KG", currency: "ARS", onHand: 0, minQty: 0, costPerUnit: 0 },
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [ingRes, supRes] = await Promise.all([
      fetch("/api/ingredients"),
      fetch("/api/suppliers"),
    ]);
    const { data } = await ingRes.json();
    const supData = await supRes.json();
    setIngredients(data);
    setSuppliers(supData);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setEditingItem(null);
    reset({ name: "", unit: "KG", currency: "ARS", onHand: 0, minQty: 0, costPerUnit: 0, supplierId: "" });
    setIsModalOpen(true);
  };

  const openEdit = (item: Ingredient) => {
    setEditingItem(item);
    reset({
      name: item.name,
      unit: item.unit,
      onHand: parseFloat(item.onHand),
      minQty: parseFloat(item.minQty),
      costPerUnit: parseFloat(item.costPerUnit),
      currency: item.currency,
      supplierId: item.supplier?.id ?? "",
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (data: IngredientForm) => {
    setSaving(true);
    const body = { ...data, supplierId: data.supplierId || null };
    try {
      if (editingItem) {
        await fetch(`/api/ingredients/${editingItem.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        await fetch("/api/ingredients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }
      setIsModalOpen(false);
      fetchData();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    await fetch(`/api/ingredients/${deletingId}`, { method: "DELETE" });
    setDeletingId(null);
    setIsDeleting(false);
    fetchData();
  };

  const visible = ingredients.filter((i) => showInactive || i.isActive);

  const columns: Column<Ingredient>[] = [
    {
      key: "name",
      header: "Nombre",
      render: (i) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{i.name}</span>
          {i.isLow && <Badge variant="warning">Stock bajo</Badge>}
          {!i.isActive && <Badge variant="neutral">Inactivo</Badge>}
        </div>
      ),
    },
    { key: "unit", header: "Unidad", className: "hidden sm:table-cell", render: (i) => <Badge variant="info">{i.unit}</Badge> },
    {
      key: "onHand",
      header: "Stock actual",
      render: (i) => (
        <span className={i.isLow ? "text-amber-600 font-semibold" : ""}>
          {formatQty(i.onHand, i.unit)}
        </span>
      ),
    },
    {
      key: "minQty",
      header: "Mínimo",
      className: "hidden sm:table-cell",
      render: (i) =>
        parseFloat(i.minQty) > 0
          ? formatQty(i.minQty, i.unit)
          : <span className="text-gray-400">—</span>,
    },
    {
      key: "cost",
      header: "Costo/unidad",
      className: "hidden sm:table-cell",
      render: (i) =>
        parseFloat(i.costPerUnit) > 0
          ? formatCurrency(i.costPerUnit, i.currency)
          : <span className="text-gray-400">—</span>,
    },
    {
      key: "supplier",
      header: "Proveedor",
      className: "hidden sm:table-cell",
      render: (i) => i.supplier?.name ?? <span className="text-gray-400">—</span>,
    },
    {
      key: "actions",
      header: "",
      render: (i) => (
        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="ghost" onClick={() => openEdit(i)}>Editar</Button>
          {i.isActive && (
            <Button size="sm" variant="danger" onClick={() => setDeletingId(i.id)}>Desactivar</Button>
          )}
        </div>
      ),
    },
  ];

  const selectedUnit = watch("unit") as Unit;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ingredientes</h1>
          <p className="text-sm text-gray-500 mt-1">{visible.length} ingredientes</p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded"
            />
            Mostrar inactivos
          </label>
          <div className="flex items-start gap-3">
            <ImportButton
              endpoint="/api/ingredients/import"
              templateHeaders={["Nombre", "Unidad", "Stock Actual", "Stock Mínimo", "Costo/Unidad", "Moneda", "Proveedor"]}
              templateExampleRow={["Harina", "KG", 50, 10, 1500, "ARS", "Proveedor ABC"]}
              onSuccess={fetchData}
            />
            <Button variant="secondary" onClick={() => downloadExcel("/api/ingredients?format=xlsx", "ingredientes.xlsx")}>
              Exportar Excel
            </Button>
            <Button onClick={openCreate}>+ Nuevo Ingrediente</Button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <Table
          columns={columns}
          data={visible}
          isLoading={loading}
          rowKey={(i) => i.id}
          emptyMessage="No hay ingredientes registrados"
        />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? "Editar Ingrediente" : "Nuevo Ingrediente"}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Nombre *"
            {...register("name", { required: "Nombre requerido" })}
            error={errors.name?.message}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Unidad *" {...register("unit", { required: true })}>
              {UNITS.map((u) => (
                <option key={u} value={u}>{u} — {unitLabel(u)}</option>
              ))}
            </Select>
            <Input
              label={`Stock actual (${unitLabel(selectedUnit)})`}
              type="number"
              step="0.001"
              {...register("onHand", { valueAsNumber: true })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={`Mínimo (${unitLabel(selectedUnit)})`}
              type="number"
              step="0.001"
              {...register("minQty", { valueAsNumber: true })}
              helper="Alerta de stock bajo"
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Costo/unidad"
                type="number"
                step="0.01"
                {...register("costPerUnit", { valueAsNumber: true })}
              />
              <Select label="Moneda" {...register("currency")}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </div>
          </div>
          <Select label="Proveedor" {...register("supplierId")}>
            <option value="">Sin proveedor</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button type="submit" isLoading={saving}>
              {editingItem ? "Guardar cambios" : "Crear ingrediente"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDelete}
        title="Desactivar ingrediente"
        message="El ingrediente quedará inactivo. El stock existente no se modificará."
        confirmLabel="Desactivar"
        isLoading={isDeleting}
      />
    </div>
  );
}
