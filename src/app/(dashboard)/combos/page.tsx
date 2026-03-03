"use client";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Table, Column } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useForm, useFieldArray } from "react-hook-form";
import { CURRENCIES, type Currency } from "@/types";
import { formatCurrency } from "@/utils/currency";

interface Product { id: string; name: string; salePrice: string; costPrice: string; currency: Currency }
interface ComboProductEntry { productId: string; quantity: number }
interface Combo {
  id: string;
  name: string;
  sku: string | null;
  salePrice: string;
  currency: Currency;
  isActive: boolean;
  notes: string | null;
  products: { productId: string; quantity: string; product: Product }[];
}
interface ComboForm {
  name: string;
  sku?: string;
  salePrice: number;
  currency: Currency;
  notes?: string;
  products: ComboProductEntry[];
}

export default function CombosPage() {
  const [combos, setCombos] = useState<Combo[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Combo | null>(null);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, reset, watch, control, formState: { errors } } = useForm<ComboForm>({
    defaultValues: { currency: "ARS", salePrice: 0, products: [] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "products" });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [comboRes, prodRes] = await Promise.all([
      fetch("/api/combos"),
      fetch("/api/products?isActive=true"),
    ]);
    const { data: combosData } = await comboRes.json();
    const { data: prodsData } = await prodRes.json();
    setCombos(combosData ?? []);
    setProducts(prodsData ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setEditingItem(null);
    reset({ name: "", sku: "", salePrice: 0, currency: "ARS", notes: "", products: [] });
    setIsModalOpen(true);
  };

  const openEdit = (c: Combo) => {
    setEditingItem(c);
    reset({
      name: c.name,
      sku: c.sku ?? "",
      salePrice: parseFloat(c.salePrice),
      currency: c.currency,
      notes: c.notes ?? "",
      products: c.products.map((cp) => ({
        productId: cp.productId,
        quantity: parseFloat(cp.quantity),
      })),
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (data: ComboForm) => {
    setSaving(true);
    const body = { ...data, sku: data.sku || null, notes: data.notes || null };
    try {
      if (editingItem) {
        await fetch(`/api/combos/${editingItem.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        await fetch("/api/combos", {
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

  const handleDeactivate = async () => {
    if (!deactivatingId) return;
    setIsDeactivating(true);
    await fetch(`/api/combos/${deactivatingId}`, { method: "DELETE" });
    setDeactivatingId(null);
    setIsDeactivating(false);
    fetchData();
  };

  const watchedCurrency = watch("currency");
  const watchedProducts = watch("products");
  const watchedSalePrice = watch("salePrice");

  const computedComboCost = watchedProducts.reduce((sum, cp) => {
    const p = products.find((x) => x.id === cp.productId);
    if (!p || !cp.quantity) return sum;
    return sum + Number(p.costPrice) * cp.quantity;
  }, 0);

  const comboMargin = computedComboCost > 0 && watchedSalePrice > 0
    ? ((watchedSalePrice - computedComboCost) / watchedSalePrice) * 100
    : null;

  const columns: Column<Combo>[] = [
    {
      key: "name",
      header: "Nombre",
      render: (c) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900">{c.name}</span>
          {c.sku && <span className="text-xs text-gray-400">{c.sku}</span>}
          {!c.isActive && <Badge variant="neutral">Inactivo</Badge>}
        </div>
      ),
    },
    {
      key: "salePrice",
      header: "Precio",
      render: (c) => (
        <span className="font-semibold text-emerald-600">{formatCurrency(c.salePrice, c.currency)}</span>
      ),
    },
    {
      key: "margin",
      header: "Margen",
      className: "hidden sm:table-cell",
      render: (c) => {
        const cost = c.products.reduce((sum, cp) => sum + Number(cp.product.costPrice) * Number(cp.quantity), 0);
        const sale = parseFloat(c.salePrice);
        if (cost <= 0 || sale <= 0) return <span className="text-gray-300">—</span>;
        const margin = ((sale - cost) / sale) * 100;
        return (
          <span className={margin >= 0 ? "text-emerald-600 font-medium" : "text-red-500 font-medium"}>
            {margin >= 0 ? "+" : ""}{margin.toFixed(1)}%
          </span>
        );
      },
    },
    {
      key: "products",
      header: "Productos",
      render: (c) => (
        <div className="flex flex-wrap gap-1">
          {c.products.map((cp) => (
            <Badge key={cp.productId} variant="info">
              {parseFloat(cp.quantity)}× {cp.product.name}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (c) => (
        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="ghost" onClick={() => openEdit(c)}>Editar</Button>
          {c.isActive && (
            <Button size="sm" variant="danger" onClick={() => setDeactivatingId(c.id)}>Desactivar</Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Combos</h1>
          <p className="text-sm text-gray-500 mt-1">Agrupaciones de productos con precio fijo</p>
        </div>
        <Button onClick={openCreate}>+ Nuevo Combo</Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <Table
          columns={columns}
          data={combos}
          isLoading={loading}
          rowKey={(c) => c.id}
          emptyMessage="No hay combos registrados."
        />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? "Editar Combo" : "Nuevo Combo"}
        size="xl"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <Input label="Nombre *" {...register("name", { required: "Nombre requerido" })} error={errors.name?.message} />
          <div className="grid grid-cols-3 gap-4">
            <Input label="SKU" {...register("sku")} placeholder="Opcional" />
            <div>
              <Input label="Precio de venta" type="number" step="0.01" {...register("salePrice", { valueAsNumber: true })} />
              {computedComboCost > 0 && (
                <p className="text-xs mt-1 text-gray-500">
                  Costo estimado: {formatCurrency(computedComboCost.toFixed(2), watchedCurrency)}
                  {comboMargin !== null && (
                    <span className={`ml-2 font-medium ${comboMargin >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                      ({comboMargin >= 0 ? "+" : ""}{comboMargin.toFixed(1)}% margen)
                    </span>
                  )}
                </p>
              )}
            </div>
            <Select label="Moneda" {...register("currency")}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </div>
          <Input label="Notas" {...register("notes")} placeholder="Opcional" />

          {/* Products */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">Productos del combo</h3>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => append({ productId: "", quantity: 1 })}
              >
                + Agregar producto
              </Button>
            </div>
            {fields.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4 border border-dashed border-gray-200 rounded-lg">
                Agregá al menos un producto al combo.
              </p>
            )}
            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-12 gap-2 items-end p-3 bg-gray-50 rounded-lg">
                  <div className="col-span-7">
                    <Select
                      label="Producto"
                      {...register(`products.${index}.productId`, { required: true })}
                      placeholder="Seleccionar..."
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} — {formatCurrency(p.salePrice, p.currency)}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="col-span-3">
                    <Input
                      label="Cantidad"
                      type="number"
                      step="0.1"
                      min="0.1"
                      {...register(`products.${index}.quantity`, { valueAsNumber: true, min: 0.1 })}
                    />
                  </div>
                  <div className="col-span-2">
                    <Button type="button" variant="danger" size="sm" className="w-full" onClick={() => remove(index)}>
                      Quitar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button type="submit" isLoading={saving}>{editingItem ? "Guardar cambios" : "Crear combo"}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deactivatingId}
        onClose={() => setDeactivatingId(null)}
        onConfirm={handleDeactivate}
        title="Desactivar combo"
        message="El combo quedará inactivo y no podrá usarse en nuevas ventas."
        confirmLabel="Desactivar"
        isLoading={isDeactivating}
      />
    </div>
  );
}
