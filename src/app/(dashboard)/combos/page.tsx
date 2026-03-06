"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
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

const BRAND = "#0f2f26";
const BRAND_HOVER = "#1a4d3f";

function PrimaryBtn({ onClick, disabled, children, type = "button" }: {
  onClick?: () => void; disabled?: boolean; children: React.ReactNode; type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-60"
      style={{ backgroundColor: BRAND }}
      onMouseEnter={(e) => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.backgroundColor = BRAND_HOVER; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = BRAND; }}
    >
      {children}
    </button>
  );
}

function SecondaryBtn({ onClick, children, type = "button" }: {
  onClick?: () => void; children: React.ReactNode; type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
    >
      {children}
    </button>
  );
}

function SmallAddBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-dashed border-gray-300 text-xs font-medium text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors"
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
      {children}
    </button>
  );
}

function RemoveBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
      title="Quitar"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  );
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
  const [saveError, setSaveError] = useState("");
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);

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
    setSaveError("");
    reset({ name: "", sku: "", salePrice: 0, currency: "ARS", notes: "", products: [] });
    setIsModalOpen(true);
  };

  const openEdit = (c: Combo) => {
    setEditingItem(c);
    setSaveError("");
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
    setSaveError("");
    const body = { ...data, sku: data.sku || null, notes: data.notes || null };
    try {
      const res = editingItem
        ? await fetch(`/api/combos/${editingItem.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        : await fetch("/api/combos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setSaveError(err.error ?? `Error ${res.status}`);
        return;
      }
      setIsModalOpen(false);
      fetchData();
    } catch {
      setSaveError("Error de conexión");
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

  const stats = useMemo(() => {
    const active = combos.filter((c) => c.isActive);
    return {
      total: active.length,
      withProducts: active.filter((c) => c.products.length > 0).length,
      inactive: combos.filter((c) => !c.isActive).length,
    };
  }, [combos]);

  const visible = useMemo(() => {
    return combos.filter((c) => {
      if (!showInactive && !c.isActive) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!c.name.toLowerCase().includes(q) && !(c.sku?.toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [combos, showInactive, search]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Combos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Agrupaciones de productos con precio fijo</p>
        </div>
        <PrimaryBtn onClick={openCreate}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nuevo combo
        </PrimaryBtn>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(15,47,38,0.08)" }}>
            <svg className="w-5 h-5" style={{ color: BRAND }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-xs text-gray-500 font-medium">Activos</p>
          </div>
        </div>
        <div className={`bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3 ${stats.withProducts > 0 ? "border border-emerald-200" : "border border-gray-200"}`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${stats.withProducts > 0 ? "bg-emerald-50" : "bg-gray-50"}`}>
            <svg className={`w-5 h-5 ${stats.withProducts > 0 ? "text-emerald-500" : "text-gray-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className={`text-2xl font-bold ${stats.withProducts > 0 ? "text-emerald-600" : "text-gray-900"}`}>{stats.withProducts}</p>
            <p className="text-xs text-gray-500 font-medium">Configurados</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-gray-50">
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-700">{stats.inactive}</p>
            <p className="text-xs text-gray-500 font-medium">Inactivos</p>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar combo..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-gray-400"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none ml-auto">
          <div
            className="w-9 h-5 rounded-full relative transition-colors cursor-pointer shrink-0"
            style={showInactive ? { backgroundColor: BRAND } : { backgroundColor: "#e5e7eb" }}
            onClick={() => setShowInactive((v) => !v)}
          >
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${showInactive ? "translate-x-4" : "translate-x-0.5"}`} />
          </div>
          Mostrar inactivos
        </label>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-3 text-gray-400">
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-sm font-medium">Cargando...</span>
            </div>
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <svg className="w-12 h-12 mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
            <p className="text-sm font-medium text-gray-500">No hay combos</p>
            <p className="text-xs mt-1">Creá uno nuevo para empezar</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid #f3f4f6", backgroundColor: "#fafafa" }}>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">Combo</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Precio</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Costo / Margen</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Productos</th>
                <th className="px-4 py-3 w-24" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {visible.map((combo) => {
                const cost = combo.products.reduce((sum, cp) => sum + Number(cp.product.costPrice) * Number(cp.quantity), 0);
                const sale = parseFloat(combo.salePrice);
                const margin = cost > 0 && sale > 0 ? ((sale - cost) / sale) * 100 : null;

                return (
                  <tr key={combo.id} className={`group transition-colors hover:bg-gray-50/60 ${!combo.isActive ? "opacity-50" : ""}`}>
                    {/* Name */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center text-xs font-bold uppercase"
                          style={{ backgroundColor: "rgba(15,47,38,0.08)", color: BRAND }}
                        >
                          {combo.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-gray-900 leading-tight">{combo.name}</p>
                            {combo.sku && <span className="text-xs text-gray-400 font-mono">{combo.sku}</span>}
                            {!combo.isActive && <span className="text-xs text-gray-400">Inactivo</span>}
                          </div>
                          {combo.notes && (
                            <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{combo.notes}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Precio */}
                    <td className="px-4 py-3.5 hidden sm:table-cell">
                      <span className="text-sm font-semibold text-gray-900">{formatCurrency(combo.salePrice, combo.currency)}</span>
                    </td>

                    {/* Costo / Margen */}
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      {cost > 0 ? (
                        <div>
                          <p className="text-sm text-gray-500">{formatCurrency(cost.toFixed(2), combo.currency)}</p>
                          {margin !== null && (
                            <p className={`text-xs font-semibold mt-0.5 ${margin >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                              {margin >= 0 ? "+" : ""}{margin.toFixed(1)}% margen
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-300 text-sm">—</span>
                      )}
                    </td>

                    {/* Productos */}
                    <td className="px-4 py-3.5 hidden sm:table-cell">
                      {combo.products.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {combo.products.map((cp) => (
                            <span
                              key={cp.productId}
                              className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600"
                            >
                              {parseFloat(cp.quantity) !== 1 && <span className="font-bold mr-1">{parseFloat(cp.quantity)}×</span>}
                              {cp.product.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-300 text-sm">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEdit(combo)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                          title="Editar"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                          </svg>
                        </button>
                        {combo.isActive && (
                          <button
                            onClick={() => setDeactivatingId(combo.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Desactivar"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Combo Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? "Editar combo" : "Nuevo combo"}
        size="xl"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <Input label="Nombre *" {...register("name", { required: "Nombre requerido" })} error={errors.name?.message} />

          <div className="grid grid-cols-3 gap-4">
            <Input label="SKU" {...register("sku")} placeholder="Opcional" />
            <div>
              <Input
                label="Precio de venta"
                type="number"
                step="0.01"
                {...register("salePrice", { valueAsNumber: true })}
              />
              {computedComboCost > 0 && (
                <p className="text-xs mt-1 text-gray-500">
                  Costo: {formatCurrency(computedComboCost.toFixed(2), watchedCurrency)}
                  {comboMargin !== null && (
                    <span className={`ml-2 font-semibold ${comboMargin >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                      ({comboMargin >= 0 ? "+" : ""}{comboMargin.toFixed(1)}%)
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
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-700">Productos del combo</h3>
              <SmallAddBtn onClick={() => append({ productId: "", quantity: 1 })}>
                Agregar producto
              </SmallAddBtn>
            </div>
            {fields.length === 0 ? (
              <div className="text-center py-4 border border-dashed border-gray-200 rounded-xl">
                <p className="text-sm text-gray-400">Agregá al menos un producto al combo</p>
              </div>
            ) : (
              <div className="space-y-2">
                {fields.map((field, index) => {
                  const selProductId = watchedProducts[index]?.productId;
                  const selProduct = products.find((p) => p.id === selProductId);
                  const lineCost = selProduct && watchedProducts[index]?.quantity
                    ? Number(selProduct.costPrice) * watchedProducts[index].quantity
                    : null;

                  return (
                    <div key={field.id} className="grid grid-cols-12 gap-2 items-end p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="col-span-7">
                        <Select
                          label="Producto"
                          {...register(`products.${index}.productId`, { required: true })}
                        >
                          <option value="">Seleccionar...</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} — {formatCurrency(p.salePrice, p.currency)}
                            </option>
                          ))}
                        </Select>
                        {lineCost !== null && lineCost > 0 && (
                          <p className="text-xs text-gray-400 mt-1">Costo línea: {formatCurrency(lineCost.toFixed(2), watchedCurrency)}</p>
                        )}
                      </div>
                      <div className="col-span-4">
                        <Input
                          label="Cantidad"
                          type="number"
                          step="0.1"
                          min="0.1"
                          {...register(`products.${index}.quantity`, { valueAsNumber: true, min: 0.1 })}
                        />
                      </div>
                      <div className="col-span-1 flex justify-center pb-1">
                        <RemoveBtn onClick={() => remove(index)} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {saveError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{saveError}</p>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <SecondaryBtn type="button" onClick={() => setIsModalOpen(false)}>Cancelar</SecondaryBtn>
            <PrimaryBtn type="submit" disabled={saving}>
              {saving ? "Guardando..." : editingItem ? "Guardar cambios" : "Crear combo"}
            </PrimaryBtn>
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
