"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useForm } from "react-hook-form";
import { UNITS, CURRENCIES, type Unit, type Currency } from "@/types";
import { unitLabel, formatQty } from "@/utils/units";
import { formatCurrency } from "@/utils/currency";
import { ImportButton } from "@/components/ui/ImportButton";
import { downloadExcel } from "@/utils/excel";
import { MovementPanel } from "@/components/ingredients/MovementPanel";

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

interface Prediction {
  ingredientId: string;
  avgDailyConsumption: number;
  daysRemaining: number | null;
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
  const [predictions, setPredictions] = useState<Map<string, Prediction>>(new Map());
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [search, setSearch] = useState("");
  const [unitFilter, setUnitFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState<"all" | "low" | "ok">("all");

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<IngredientForm>({
    defaultValues: { unit: "KG", currency: "ARS", onHand: 0, minQty: 0, costPerUnit: 0 },
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [ingRes, supRes, predRes] = await Promise.all([
      fetch("/api/ingredients"),
      fetch("/api/suppliers"),
      fetch("/api/ingredients/predictions"),
    ]);
    const { data } = await ingRes.json();
    const supData = await supRes.json();
    const predData: Prediction[] = await predRes.json();
    setIngredients(data);
    setSuppliers(supData);
    setPredictions(new Map(predData.map((p) => [p.ingredientId, p])));
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

  const stats = useMemo(() => {
    const active = ingredients.filter((i) => i.isActive);
    return {
      total: active.length,
      low: active.filter((i) => i.isLow).length,
      noSupplier: active.filter((i) => !i.supplier).length,
    };
  }, [ingredients]);

  const visible = useMemo(() => {
    return ingredients.filter((i) => {
      if (!showInactive && !i.isActive) return false;
      if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (unitFilter !== "all" && i.unit !== unitFilter) return false;
      if (supplierFilter !== "all" && i.supplier?.id !== supplierFilter) return false;
      if (stockFilter === "low" && !i.isLow) return false;
      if (stockFilter === "ok" && i.isLow) return false;
      return true;
    });
  }, [ingredients, showInactive, search, unitFilter, supplierFilter, stockFilter]);

  const selectedUnit = watch("unit") as Unit;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Ingredientes</h1>
          <p className="text-sm text-gray-500 mt-0.5">{visible.length} resultado{visible.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <ImportButton
            endpoint="/api/ingredients/import"
            templateHeaders={["Nombre", "Unidad", "Stock Actual", "Stock Mínimo", "Costo/Unidad", "Moneda", "Proveedor"]}
            templateExampleRow={["Harina", "KG", 50, 10, 1500, "ARS", "Proveedor ABC"]}
            onSuccess={fetchData}
          />
          <button
            onClick={() => downloadExcel("/api/ingredients?format=xlsx", "ingredientes.xlsx")}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Exportar
          </button>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors shadow-sm"
            style={{ backgroundColor: "#0f2f26" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#1a4d3f"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#0f2f26"; }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nuevo ingrediente
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: "rgba(15,47,38,0.08)" }}
          >
            <svg className="w-5 h-5" style={{ color: "#0f2f26" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-xs text-gray-500 font-medium">Activos</p>
          </div>
        </div>
        <div className={`bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3 ${stats.low > 0 ? "border border-amber-200" : "border border-gray-200"}`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${stats.low > 0 ? "bg-amber-50" : "bg-gray-50"}`}>
            <svg className={`w-5 h-5 ${stats.low > 0 ? "text-amber-500" : "text-gray-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <p className={`text-2xl font-bold ${stats.low > 0 ? "text-amber-600" : "text-gray-900"}`}>{stats.low}</p>
            <p className="text-xs text-gray-500 font-medium">Stock bajo</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-gray-50">
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-700">{stats.noSupplier}</p>
            <p className="text-xs text-gray-500 font-medium">Sin proveedor</p>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-3">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-gray-400"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {/* Stock status pills */}
          <div className="flex rounded-xl border border-gray-200 overflow-hidden text-sm shrink-0">
            {(["all", "low", "ok"] as const).map((f, idx) => (
              <button
                key={f}
                onClick={() => setStockFilter(f)}
                className={`px-3 py-1.5 font-medium transition-colors ${idx > 0 ? "border-l border-gray-200" : ""} ${
                  stockFilter === f ? "text-white" : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
                style={stockFilter === f ? { backgroundColor: "#0f2f26" } : {}}
              >
                {f === "all" ? "Todos" : f === "low" ? "Stock bajo" : "OK"}
              </button>
            ))}
          </div>

          {/* Unit filter */}
          <select
            value={unitFilter}
            onChange={(e) => setUnitFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-gray-200 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          >
            <option value="all">Todas las unidades</option>
            {UNITS.map((u) => (
              <option key={u} value={u}>{u} — {unitLabel(u)}</option>
            ))}
          </select>

          {/* Supplier filter */}
          <select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-gray-200 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          >
            <option value="all">Todos los proveedores</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          {/* Inactive toggle */}
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer ml-auto select-none">
            <div
              className="w-9 h-5 rounded-full relative transition-colors cursor-pointer shrink-0"
              style={showInactive ? { backgroundColor: "#0f2f26" } : { backgroundColor: "#e5e7eb" }}
              onClick={() => setShowInactive((v) => !v)}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                  showInactive ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </div>
            Mostrar inactivos
          </label>
        </div>
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
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <p className="text-sm font-medium text-gray-500">No hay ingredientes</p>
            <p className="text-xs mt-1">Ajustá los filtros o creá uno nuevo</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid #f3f4f6", backgroundColor: "#fafafa" }}>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">Ingrediente</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Unidad</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">Stock</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Mínimo</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">Duración</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Costo/u</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Proveedor</th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {visible.map((ingredient) => {
                const pred = predictions.get(ingredient.id);
                const daysRemaining = pred?.daysRemaining != null ? Math.round(pred.daysRemaining) : null;

                return (
                  <tr
                    key={ingredient.id}
                    className={`group transition-colors hover:bg-gray-50/60 ${!ingredient.isActive ? "opacity-50" : ""}`}
                  >
                    {/* Name */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-xs font-bold uppercase"
                          style={
                            ingredient.isLow
                              ? { backgroundColor: "#fef3c7", color: "#d97706" }
                              : { backgroundColor: "rgba(15,47,38,0.08)", color: "#0f2f26" }
                          }
                        >
                          {ingredient.name.charAt(0)}
                        </div>
                        <div>
                          <button
                            className="text-sm font-semibold text-gray-900 hover:text-emerald-700 text-left transition-colors leading-tight"
                            onClick={() => setSelectedIngredient(ingredient)}
                          >
                            {ingredient.name}
                          </button>
                          {!ingredient.isActive && (
                            <p className="text-xs text-gray-400 leading-tight">Inactivo</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Unit */}
                    <td className="px-4 py-3.5 hidden sm:table-cell">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600">
                        {ingredient.unit}
                      </span>
                    </td>

                    {/* Stock */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-semibold ${ingredient.isLow ? "text-amber-600" : "text-gray-900"}`}>
                          {formatQty(ingredient.onHand, ingredient.unit)}
                        </span>
                        {ingredient.isLow && (
                          <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100">
                            <span className="w-1 h-1 rounded-full bg-amber-400 animate-pulse" />
                            bajo
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Min */}
                    <td className="px-4 py-3.5 hidden sm:table-cell">
                      <span className="text-sm text-gray-500">
                        {parseFloat(ingredient.minQty) > 0
                          ? formatQty(ingredient.minQty, ingredient.unit)
                          : <span className="text-gray-300">—</span>
                        }
                      </span>
                    </td>

                    {/* Days remaining */}
                    <td className="px-4 py-3.5 hidden lg:table-cell">
                      {daysRemaining === null ? (
                        <span className="text-gray-300 text-sm">—</span>
                      ) : (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold border ${
                            daysRemaining < 3
                              ? "bg-red-50 text-red-600 border-red-100"
                              : daysRemaining < 7
                              ? "bg-amber-50 text-amber-600 border-amber-100"
                              : "bg-emerald-50 text-emerald-700 border-emerald-100"
                          }`}
                        >
                          {daysRemaining}d
                        </span>
                      )}
                    </td>

                    {/* Cost */}
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      <span className="text-sm text-gray-600">
                        {parseFloat(ingredient.costPerUnit) > 0
                          ? formatCurrency(ingredient.costPerUnit, ingredient.currency)
                          : <span className="text-gray-300">—</span>
                        }
                      </span>
                    </td>

                    {/* Supplier */}
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      {ingredient.supplier ? (
                        <span className="text-sm text-gray-600">{ingredient.supplier.name}</span>
                      ) : (
                        <span className="text-gray-300 text-sm">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEdit(ingredient)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                          title="Editar"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                          </svg>
                        </button>
                        {ingredient.isActive && (
                          <button
                            onClick={() => setDeletingId(ingredient.id)}
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

      {/* Create/Edit Modal */}
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
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-60"
              style={{ backgroundColor: "#0f2f26" }}
              onMouseEnter={(e) => { if (!saving) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#1a4d3f"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#0f2f26"; }}
            >
              {saving ? "Guardando..." : editingItem ? "Guardar cambios" : "Crear ingrediente"}
            </button>
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

      {selectedIngredient && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-30"
            onClick={() => setSelectedIngredient(null)}
          />
          <MovementPanel
            ingredientId={selectedIngredient.id}
            ingredientName={selectedIngredient.name}
            unit={selectedIngredient.unit}
            onHand={selectedIngredient.onHand}
            daysRemaining={predictions.get(selectedIngredient.id)?.daysRemaining ?? null}
            avgDailyConsumption={predictions.get(selectedIngredient.id)?.avgDailyConsumption ?? 0}
            onClose={() => setSelectedIngredient(null)}
          />
        </>
      )}
    </div>
  );
}
