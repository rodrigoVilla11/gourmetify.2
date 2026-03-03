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
import { CURRENCIES, UNITS, type Unit, type Currency } from "@/types";
import { unitLabel, compatibleUnits, convertUnit } from "@/utils/units";
import { formatCurrency } from "@/utils/currency";
import { ImportButton } from "@/components/ui/ImportButton";
import { downloadExcel } from "@/utils/excel";

interface Ingredient { id: string; name: string; unit: Unit; costPerUnit: string }
interface Preparation { id: string; name: string; unit: Unit; costPrice: string }
interface BOMEntry { ingredientId: string; qty: number; unit: Unit; wastagePct: number }
interface PrepBOMEntry { preparationId: string; qty: number; unit: Unit; wastagePct: number }
interface Product {
  id: string;
  name: string;
  sku: string | null;
  salePrice: string;
  costPrice: string;
  currency: Currency;
  isActive: boolean;
  ingredients: { ingredientId: string; qty: string; unit: Unit; wastagePct: string; ingredient: Ingredient }[];
  preparations: { preparationId: string; qty: string; unit: Unit; wastagePct: string; preparation: Preparation }[];
}
interface ProductForm {
  name: string;
  sku?: string;
  salePrice: number;
  currency: Currency;
  ingredients: BOMEntry[];
  preparations: PrepBOMEntry[];
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [preparations, setPreparations] = useState<Preparation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Product | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  const { register, handleSubmit, reset, watch, control, setValue, formState: { errors } } = useForm<ProductForm>({
    defaultValues: { currency: "ARS", salePrice: 0, ingredients: [], preparations: [] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "ingredients" });
  const { fields: prepFields, append: appendPrep, remove: removePrep } = useFieldArray({ control, name: "preparations" });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [prodRes, ingRes, prepRes] = await Promise.all([
      fetch("/api/products"),
      fetch("/api/ingredients?isActive=true"),
      fetch("/api/preparations?isActive=true"),
    ]);
    const { data: prods } = await prodRes.json();
    const { data: ings } = await ingRes.json();
    const { data: preps } = await prepRes.json();
    setProducts(prods ?? []);
    setIngredients(ings ?? []);
    setPreparations(preps ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setEditingItem(null);
    reset({ name: "", sku: "", salePrice: 0, currency: "ARS", ingredients: [], preparations: [] });
    setIsModalOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditingItem(p);
    reset({
      name: p.name,
      sku: p.sku ?? "",
      salePrice: parseFloat(p.salePrice),
      currency: p.currency,
      ingredients: p.ingredients.map((b) => ({
        ingredientId: b.ingredientId,
        qty: parseFloat(b.qty),
        unit: b.unit,
        wastagePct: parseFloat(b.wastagePct),
      })),
      preparations: (p.preparations ?? []).map((b) => ({
        preparationId: b.preparationId,
        qty: parseFloat(b.qty),
        unit: b.unit,
        wastagePct: parseFloat(b.wastagePct),
      })),
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (data: ProductForm) => {
    setSaving(true);
    const body = { ...data, sku: data.sku || null };
    try {
      if (editingItem) {
        await fetch(`/api/products/${editingItem.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        await fetch("/api/products", {
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
    await fetch(`/api/products/${deletingId}`, { method: "DELETE" });
    setDeletingId(null);
    setIsDeleting(false);
    fetchData();
  };

  const watchedIngredients = watch("ingredients");
  const watchedPreparations = watch("preparations");
  const watchedSalePrice = watch("salePrice");

  // Live cost computed from current BOM selections
  const computedCost = (() => {
    let total = 0;
    for (const bom of watchedIngredients) {
      const ing = ingredients.find((i) => i.id === bom.ingredientId);
      if (!ing || !bom.qty || bom.qty <= 0) continue;
      const effectiveQty = bom.qty * (1 + (bom.wastagePct || 0) / 100);
      try { total += Number(ing.costPerUnit) * convertUnit(effectiveQty, bom.unit, ing.unit); } catch { /* skip */ }
    }
    for (const bom of watchedPreparations) {
      const prep = preparations.find((p) => p.id === bom.preparationId);
      if (!prep || !bom.qty || bom.qty <= 0) continue;
      const effectiveQty = bom.qty * (1 + (bom.wastagePct || 0) / 100);
      try { total += Number(prep.costPrice) * convertUnit(effectiveQty, bom.unit, prep.unit); } catch { /* skip */ }
    }
    return total;
  })();

  const formMargin = watchedSalePrice > 0 && computedCost > 0
    ? ((watchedSalePrice - computedCost) / watchedSalePrice) * 100
    : null;

  const visible = products.filter((p) => showInactive || p.isActive);

  const columns: Column<Product>[] = [
    {
      key: "name",
      header: "Nombre",
      render: (p) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{p.name}</span>
          {p.sku && <span className="text-xs text-gray-400">{p.sku}</span>}
          {!p.isActive && <Badge variant="neutral">Inactivo</Badge>}
        </div>
      ),
    },
    {
      key: "price",
      header: "Precio venta",
      render: (p) => formatCurrency(p.salePrice, p.currency),
    },
    {
      key: "margin",
      header: "Margen",
      className: "hidden sm:table-cell",
      render: (p) => {
        const cost = parseFloat(p.costPrice ?? "0");
        const sale = parseFloat(p.salePrice);
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
      key: "bom",
      header: "Ingredientes (BOM)",
      className: "hidden sm:table-cell",
      render: (p) => <Badge variant="neutral">{p.ingredients.length} ingredientes</Badge>,
    },
    {
      key: "actions",
      header: "",
      render: (p) => (
        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="ghost" onClick={() => openEdit(p)}>Editar</Button>
          {p.isActive && (
            <Button size="sm" variant="danger" onClick={() => setDeletingId(p.id)}>Desactivar</Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Productos</h1>
          <p className="text-sm text-gray-500 mt-1">{visible.length} productos</p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="rounded" />
            Mostrar inactivos
          </label>
          <div className="flex items-start gap-3">
            <ImportButton
              endpoint="/api/products/import"
              templateHeaders={["Nombre", "SKU", "Precio de Venta", "Moneda"]}
              templateExampleRow={["Pizza Mozzarella", "PIZ-001", 2500, "ARS"]}
              onSuccess={fetchData}
            />
            <Button variant="secondary" onClick={() => downloadExcel("/api/products?format=xlsx", "productos.xlsx")}>
              Exportar Excel
            </Button>
            <Button onClick={openCreate}>+ Nuevo Producto</Button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <Table columns={columns} data={visible} isLoading={loading} rowKey={(p) => p.id} emptyMessage="No hay productos registrados" />
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingItem ? "Editar Producto" : "Nuevo Producto"} size="xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <Input label="Nombre *" {...register("name", { required: "Nombre requerido" })} error={errors.name?.message} />
          <div className="grid grid-cols-3 gap-4">
            <Input label="SKU" {...register("sku")} placeholder="Opcional" />
            <div>
              <Input label="Precio de venta" type="number" step="0.01" {...register("salePrice", { valueAsNumber: true })} />
              {computedCost > 0 && (
                <p className="text-xs mt-1 text-gray-500">
                  Costo estimado: {formatCurrency(computedCost.toFixed(2), "ARS")}
                  {formMargin !== null && (
                    <span className={`ml-2 font-medium ${formMargin >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                      ({formMargin >= 0 ? "+" : ""}{formMargin.toFixed(1)}% margen)
                    </span>
                  )}
                </p>
              )}
            </div>
            <Select label="Moneda" {...register("currency")}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </div>

          {/* BOM */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">Receta / BOM</h3>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => append({ ingredientId: "", qty: 0, unit: "KG", wastagePct: 0 })}
              >
                + Agregar ingrediente
              </Button>
            </div>
            {fields.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4 border border-dashed border-gray-200 rounded-lg">
                Sin ingredientes. Agregá uno para definir la receta.
              </p>
            )}
            <div className="space-y-3">
              {fields.map((field, index) => {
                const selIngId = watchedIngredients[index]?.ingredientId;
                const selIng = ingredients.find((i) => i.id === selIngId);
                const availableUnits = selIng ? compatibleUnits(selIng.unit) : UNITS;

                return (
                  <div key={field.id} className="grid grid-cols-12 gap-2 items-end p-3 bg-gray-50 rounded-lg">
                    <div className="col-span-4">
                      <Select
                        label="Ingrediente"
                        {...register(`ingredients.${index}.ingredientId`, {
                          required: true,
                          onChange: (e) => {
                            const ing = ingredients.find((i) => i.id === e.target.value);
                            if (ing) setValue(`ingredients.${index}.unit`, ing.unit);
                          },
                        })}
                        placeholder="Seleccionar..."
                      >
                        {ingredients.map((i) => (
                          <option key={i.id} value={i.id}>{i.name}</option>
                        ))}
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Input
                        label="Cantidad"
                        type="number"
                        step="0.001"
                        {...register(`ingredients.${index}.qty`, { valueAsNumber: true, min: 0.001 })}
                      />
                    </div>
                    <div className="col-span-2">
                      <Select label="Unidad" {...register(`ingredients.${index}.unit`)}>
                        {availableUnits.map((u) => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Input
                        label="Merma %"
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        {...register(`ingredients.${index}.wastagePct`, { valueAsNumber: true })}
                      />
                    </div>
                    <div className="col-span-2">
                      <Button type="button" variant="danger" size="sm" className="w-full" onClick={() => remove(index)}>
                        Quitar
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Preparations BOM */}
          {preparations.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">Preparaciones en receta</h3>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => appendPrep({ preparationId: "", qty: 0, unit: "UNIT", wastagePct: 0 })}
                >
                  + Agregar preparación
                </Button>
              </div>
              {prepFields.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-3 border border-dashed border-gray-200 rounded-lg">
                  Sin preparaciones. Opcional.
                </p>
              )}
              <div className="space-y-3">
                {prepFields.map((field, index) => {
                  const selPrepId = watchedPreparations[index]?.preparationId;
                  const selPrep = preparations.find((p) => p.id === selPrepId);
                  const availableUnits = selPrep ? compatibleUnits(selPrep.unit) : UNITS;
                  return (
                    <div key={field.id} className="grid grid-cols-12 gap-2 items-end p-3 bg-blue-50 rounded-lg">
                      <div className="col-span-4">
                        <Select
                          label="Preparación"
                          {...register(`preparations.${index}.preparationId`, {
                            required: true,
                            onChange: (e) => {
                              const prep = preparations.find((p) => p.id === e.target.value);
                              if (prep) setValue(`preparations.${index}.unit`, prep.unit);
                            },
                          })}
                          placeholder="Seleccionar..."
                        >
                          {preparations.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </Select>
                      </div>
                      <div className="col-span-2">
                        <Input label="Cantidad" type="number" step="0.001" {...register(`preparations.${index}.qty`, { valueAsNumber: true, min: 0.001 })} />
                      </div>
                      <div className="col-span-2">
                        <Select label="Unidad" {...register(`preparations.${index}.unit`)}>
                          {availableUnits.map((u) => <option key={u} value={u}>{u}</option>)}
                        </Select>
                      </div>
                      <div className="col-span-2">
                        <Input label="Merma %" type="number" step="0.1" min="0" max="100" {...register(`preparations.${index}.wastagePct`, { valueAsNumber: true })} />
                      </div>
                      <div className="col-span-2">
                        <Button type="button" variant="danger" size="sm" className="w-full" onClick={() => removePrep(index)}>Quitar</Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button type="submit" isLoading={saving}>{editingItem ? "Guardar cambios" : "Crear producto"}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDelete}
        title="Desactivar producto"
        message="El producto quedará inactivo y no podrá usarse en nuevas ventas."
        confirmLabel="Desactivar"
        isLoading={isDeleting}
      />
    </div>
  );
}
