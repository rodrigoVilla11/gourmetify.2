"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useForm, useFieldArray } from "react-hook-form";
import { UNITS, type Unit } from "@/types";
import { unitLabel, compatibleUnits, formatQty } from "@/utils/units";
import { formatCurrency } from "@/utils/currency";

interface Ingredient { id: string; name: string; unit: Unit }
interface PreparationBasic { id: string; name: string; unit: Unit }
interface BOMEntry { ingredientId: string; qty: number; unit: Unit; wastagePct: number }
interface SubPrepEntry { subPrepId: string; qty: number; unit: Unit; wastagePct: number }
interface Preparation {
  id: string;
  name: string;
  unit: Unit;
  yieldQty: string;
  wastagePct: string;
  onHand: string;
  costPrice: string;
  notes: string | null;
  isActive: boolean;
  ingredients: { ingredientId: string; qty: string; unit: Unit; wastagePct: string; ingredient: Ingredient }[];
  subPreparations: { subPrepId: string; qty: string; unit: Unit; wastagePct: string; subPrep: PreparationBasic }[];
}
interface PrepForm {
  name: string;
  unit: Unit;
  yieldQty: number;
  wastagePct: number;
  notes?: string;
  ingredients: BOMEntry[];
  subPreparations: SubPrepEntry[];
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

export default function PreparacionesPage() {
  const [preparations, setPreparations] = useState<Preparation[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Preparation | null>(null);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  const [producingPrep, setProducingPrep] = useState<Preparation | null>(null);
  const [produceBatches, setProduceBatches] = useState(1);
  const [isProducing, setIsProducing] = useState(false);
  const [produceError, setProduceError] = useState("");

  const { register, handleSubmit, reset, watch, control, setValue, formState: { errors } } = useForm<PrepForm>({
    defaultValues: { unit: "UNIT", yieldQty: 1, ingredients: [], subPreparations: [] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "ingredients" });
  const { fields: subPrepFields, append: appendSubPrep, remove: removeSubPrep } = useFieldArray({ control, name: "subPreparations" });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [prepRes, ingRes] = await Promise.all([
      fetch("/api/preparations"),
      fetch("/api/ingredients?isActive=true"),
    ]);
    const { data: preps } = await prepRes.json();
    const { data: ings } = await ingRes.json();
    setPreparations(preps ?? []);
    setIngredients(ings ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setEditingItem(null);
    setSaveError("");
    reset({ name: "", unit: "UNIT", yieldQty: 1, wastagePct: 0, notes: "", ingredients: [], subPreparations: [] });
    setIsModalOpen(true);
  };

  const openEdit = (p: Preparation) => {
    setEditingItem(p);
    setSaveError("");
    reset({
      name: p.name,
      unit: p.unit,
      yieldQty: parseFloat(p.yieldQty),
      wastagePct: parseFloat(p.wastagePct ?? "0"),
      notes: p.notes ?? "",
      ingredients: p.ingredients.map((b) => ({
        ingredientId: b.ingredientId,
        qty: parseFloat(b.qty),
        unit: b.unit,
        wastagePct: parseFloat(b.wastagePct),
      })),
      subPreparations: (p.subPreparations ?? []).map((b) => ({
        subPrepId: b.subPrepId,
        qty: parseFloat(b.qty),
        unit: b.unit,
        wastagePct: parseFloat(b.wastagePct),
      })),
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (data: PrepForm) => {
    setSaving(true);
    setSaveError("");
    const body = { ...data, notes: data.notes || null };
    try {
      const res = editingItem
        ? await fetch(`/api/preparations/${editingItem.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch("/api/preparations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
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
    await fetch(`/api/preparations/${deactivatingId}`, { method: "DELETE" });
    setDeactivatingId(null);
    setIsDeactivating(false);
    fetchData();
  };

  const handleProduce = async () => {
    if (!producingPrep) return;
    setIsProducing(true);
    setProduceError("");
    try {
      const res = await fetch(`/api/preparations/${producingPrep.id}/produce`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batches: produceBatches }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setProduceError(err.error ?? `Error ${res.status}`);
        return;
      }
      setProducingPrep(null);
      fetchData();
    } catch {
      setProduceError("Error de conexión");
    } finally {
      setIsProducing(false);
    }
  };

  const watchedIngredients = watch("ingredients");
  const watchedSubPreps = watch("subPreparations");

  const prepWastagePct = producingPrep ? parseFloat(producingPrep.wastagePct ?? "0") : 0;

  const produceIngredientPreview = producingPrep ? producingPrep.ingredients.map((b) => ({
    name: b.ingredient.name,
    total: parseFloat(b.qty) * (1 + parseFloat(b.wastagePct) / 100) * produceBatches,
    unit: b.unit,
    isPrep: false,
  })) : [];

  const produceSubPrepPreview = producingPrep ? (producingPrep.subPreparations ?? []).map((b) => ({
    name: b.subPrep.name,
    total: parseFloat(b.qty) * (1 + parseFloat(b.wastagePct) / 100) * produceBatches,
    unit: b.unit,
    isPrep: true,
  })) : [];

  const producePreview = [...produceIngredientPreview, ...produceSubPrepPreview];

  const produceYield = producingPrep
    ? parseFloat(producingPrep.yieldQty) * (1 - prepWastagePct / 100) * produceBatches
    : 0;

  const availableSubPreps = preparations.filter((p) => p.isActive && p.id !== editingItem?.id);

  const stats = useMemo(() => {
    const active = preparations.filter((p) => p.isActive);
    return {
      total: active.length,
      withStock: active.filter((p) => parseFloat(p.onHand) > 0).length,
      inactive: preparations.filter((p) => !p.isActive).length,
    };
  }, [preparations]);

  const visible = useMemo(() => {
    return preparations.filter((p) => {
      if (!showInactive && !p.isActive) return false;
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [preparations, search, showInactive]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Preparaciones</h1>
          <p className="text-sm text-gray-500 mt-0.5">Sub-recetas reutilizables como ingredientes</p>
        </div>
        <PrimaryBtn onClick={openCreate}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nueva preparación
        </PrimaryBtn>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(15,47,38,0.08)" }}>
            <svg className="w-5 h-5" style={{ color: BRAND }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-xs text-gray-500 font-medium">Activas</p>
          </div>
        </div>
        <div className={`bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3 ${stats.withStock > 0 ? "border border-emerald-200" : "border border-gray-200"}`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${stats.withStock > 0 ? "bg-emerald-50" : "bg-gray-50"}`}>
            <svg className={`w-5 h-5 ${stats.withStock > 0 ? "text-emerald-500" : "text-gray-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className={`text-2xl font-bold ${stats.withStock > 0 ? "text-emerald-600" : "text-gray-900"}`}>{stats.withStock}</p>
            <p className="text-xs text-gray-500 font-medium">Con stock</p>
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
            <p className="text-xs text-gray-500 font-medium">Inactivas</p>
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
            placeholder="Buscar preparación..."
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
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
          <div
            className="w-9 h-5 rounded-full relative transition-colors cursor-pointer shrink-0"
            style={showInactive ? { backgroundColor: BRAND } : { backgroundColor: "#e5e7eb" }}
            onClick={() => setShowInactive((v) => !v)}
          >
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${showInactive ? "translate-x-4" : "translate-x-0.5"}`} />
          </div>
          Mostrar inactivas
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
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="text-sm font-medium text-gray-500">No hay preparaciones</p>
            <p className="text-xs mt-1">Creá una nueva para empezar</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid #f3f4f6", backgroundColor: "#fafafa" }}>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">Preparación</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Rendimiento</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3">Stock</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Costo/u</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Receta</th>
                <th className="px-4 py-3 w-40" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {visible.map((prep) => {
                const cost = parseFloat(prep.costPrice ?? "0");
                const bomCount = prep.ingredients.length + (prep.subPreparations ?? []).length;
                const hasStock = parseFloat(prep.onHand) > 0;

                return (
                  <tr key={prep.id} className={`group transition-colors hover:bg-gray-50/60 ${!prep.isActive ? "opacity-50" : ""}`}>
                    {/* Name */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-xs font-bold uppercase"
                          style={
                            hasStock
                              ? { backgroundColor: "rgba(16,185,129,0.1)", color: "#059669" }
                              : { backgroundColor: "rgba(15,47,38,0.08)", color: BRAND }
                          }
                        >
                          {prep.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900 leading-tight">{prep.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="inline-flex items-center px-1.5 py-0 rounded text-xs font-medium bg-gray-100 text-gray-500">{prep.unit}</span>
                            {!prep.isActive && <span className="text-xs text-gray-400">Inactiva</span>}
                            {prep.notes && <span className="text-xs text-gray-400 truncate max-w-32">{prep.notes}</span>}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Rendimiento */}
                    <td className="px-4 py-3.5 hidden sm:table-cell">
                      <span className="text-sm text-gray-600">
                        {formatQty(prep.yieldQty, prep.unit as Unit)}
                        <span className="text-gray-400 text-xs ml-1">/ tanda</span>
                      </span>
                    </td>

                    {/* Stock */}
                    <td className="px-4 py-3.5">
                      <span className={`text-sm font-semibold ${hasStock ? "text-emerald-700" : "text-gray-400"}`}>
                        {formatQty(prep.onHand, prep.unit as Unit)}
                      </span>
                    </td>

                    {/* Cost */}
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      {cost > 0
                        ? <span className="text-sm text-gray-600">{formatCurrency(prep.costPrice, "ARS")}</span>
                        : <span className="text-gray-300 text-sm">—</span>
                      }
                    </td>

                    {/* BOM */}
                    <td className="px-4 py-3.5 hidden sm:table-cell">
                      {bomCount > 0 ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {prep.ingredients.length > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600">
                              {prep.ingredients.length} ing.
                            </span>
                          )}
                          {(prep.subPreparations ?? []).length > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                              {prep.subPreparations.length} prep.
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-300 text-sm">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 justify-end">
                        {prep.isActive && (
                          <button
                            onClick={() => { setProducingPrep(prep); setProduceBatches(1); setProduceError(""); }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" />
                            </svg>
                            Producir
                          </button>
                        )}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEdit(prep)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                            title="Editar"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                            </svg>
                          </button>
                          {prep.isActive && (
                            <button
                              onClick={() => setDeactivatingId(prep.id)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Desactivar"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                            </button>
                          )}
                        </div>
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
        title={editingItem ? "Editar preparación" : "Nueva preparación"}
        size="xl"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <Input label="Nombre *" {...register("name", { required: "Nombre requerido" })} error={errors.name?.message} />

          <div className="grid grid-cols-2 gap-4">
            <Select label="Unidad de salida" {...register("unit")}>
              {UNITS.map((u) => <option key={u} value={u}>{u} — {unitLabel(u)}</option>)}
            </Select>
            <Input label="Notas" {...register("notes")} placeholder="Opcional" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Input
                label="Rendimiento base / tanda"
                type="number"
                step="0.001"
                min="0.001"
                {...register("yieldQty", { valueAsNumber: true, min: 0.001 })}
              />
              <p className="text-xs text-gray-400 mt-1">Cantidad producida por tanda antes de merma</p>
            </div>
            <div>
              <Input
                label="Merma de preparación %"
                type="number"
                step="0.1"
                min="0"
                max="100"
                {...register("wastagePct", { valueAsNumber: true })}
                placeholder="0"
              />
              <p className="text-xs text-gray-400 mt-1">Reduce el rendimiento final. Ej: 15% → yieldQty × 0.85 por tanda</p>
            </div>
          </div>

          {/* Raw ingredients BOM */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-700">Ingredientes crudos</h3>
              <SmallAddBtn onClick={() => append({ ingredientId: "", qty: 0, unit: "KG", wastagePct: 0 })}>
                Agregar ingrediente
              </SmallAddBtn>
            </div>
            {fields.length === 0 ? (
              <div className="text-center py-4 border border-dashed border-gray-200 rounded-xl">
                <p className="text-sm text-gray-400">Sin ingredientes crudos</p>
              </div>
            ) : (
              <div className="space-y-2">
                {fields.map((field, index) => {
                  const selIngId = watchedIngredients[index]?.ingredientId;
                  const selIng = ingredients.find((i) => i.id === selIngId);
                  const availableUnits = selIng ? compatibleUnits(selIng.unit) : UNITS;
                  return (
                    <div key={field.id} className="grid grid-cols-12 gap-2 items-end p-3 bg-gray-50 rounded-xl border border-gray-100">
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
                        >
                          <option value="">Seleccionar...</option>
                          {ingredients.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                        </Select>
                      </div>
                      <div className="col-span-2">
                        <Input label="Cant." type="number" step="0.001" {...register(`ingredients.${index}.qty`, { valueAsNumber: true, min: 0.001 })} />
                      </div>
                      <div className="col-span-2">
                        <Select label="Unidad" {...register(`ingredients.${index}.unit`)}>
                          {availableUnits.map((u) => <option key={u} value={u}>{u}</option>)}
                        </Select>
                      </div>
                      <div className="col-span-3">
                        <Input label="Merma %" type="number" step="0.1" min="0" max="100" {...register(`ingredients.${index}.wastagePct`, { valueAsNumber: true })} />
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

          {/* Sub-preparations BOM */}
          {availableSubPreps.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-700">Preparaciones en receta</h3>
                <SmallAddBtn onClick={() => appendSubPrep({ subPrepId: "", qty: 0, unit: "UNIT", wastagePct: 0 })}>
                  Agregar preparación
                </SmallAddBtn>
              </div>
              {subPrepFields.length === 0 ? (
                <div className="text-center py-4 border border-dashed border-emerald-200 rounded-xl">
                  <p className="text-sm text-gray-400">Sin preparaciones. Opcional.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {subPrepFields.map((field, index) => {
                    const selPrepId = watchedSubPreps[index]?.subPrepId;
                    const selPrep = availableSubPreps.find((p) => p.id === selPrepId);
                    const availableUnits = selPrep ? compatibleUnits(selPrep.unit) : UNITS;
                    return (
                      <div key={field.id} className="grid grid-cols-12 gap-2 items-end p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                        <div className="col-span-4">
                          <Select
                            label="Preparación"
                            {...register(`subPreparations.${index}.subPrepId`, {
                              required: true,
                              onChange: (e) => {
                                const prep = availableSubPreps.find((p) => p.id === e.target.value);
                                if (prep) setValue(`subPreparations.${index}.unit`, prep.unit);
                              },
                            })}
                          >
                            <option value="">Seleccionar...</option>
                            {availableSubPreps.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </Select>
                        </div>
                        <div className="col-span-2">
                          <Input label="Cant." type="number" step="0.001" {...register(`subPreparations.${index}.qty`, { valueAsNumber: true, min: 0.001 })} />
                        </div>
                        <div className="col-span-2">
                          <Select label="Unidad" {...register(`subPreparations.${index}.unit`)}>
                            {availableUnits.map((u) => <option key={u} value={u}>{u}</option>)}
                          </Select>
                        </div>
                        <div className="col-span-3">
                          <Input label="Merma %" type="number" step="0.1" min="0" max="100" {...register(`subPreparations.${index}.wastagePct`, { valueAsNumber: true })} />
                        </div>
                        <div className="col-span-1 flex justify-center pb-1">
                          <RemoveBtn onClick={() => removeSubPrep(index)} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {saveError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{saveError}</p>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <SecondaryBtn type="button" onClick={() => setIsModalOpen(false)}>Cancelar</SecondaryBtn>
            <PrimaryBtn type="submit" disabled={saving}>
              {saving ? "Guardando..." : editingItem ? "Guardar cambios" : "Crear preparación"}
            </PrimaryBtn>
          </div>
        </form>
      </Modal>

      {/* Produce Modal */}
      <Modal
        isOpen={!!producingPrep}
        onClose={() => setProducingPrep(null)}
        title={`Producir: ${producingPrep?.name}`}
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Número de tandas</label>
            <input
              type="number"
              min="0.001"
              step="1"
              value={produceBatches}
              onChange={(e) => setProduceBatches(Math.max(0.001, parseFloat(e.target.value) || 0.001))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
            {prepWastagePct > 0 && (
              <p className="text-xs text-gray-400 mt-1">
                Merma de preparación {prepWastagePct}% aplicada al rendimiento final.
              </p>
            )}
          </div>

          {producingPrep && (
            <div className="rounded-xl border border-emerald-100 overflow-hidden">
              <div className="px-3 py-2.5 bg-emerald-50">
                <p className="text-sm font-semibold text-emerald-800">
                  +{produceYield.toLocaleString("es-AR", { maximumFractionDigits: 3 })} {producingPrep.unit}
                  <span className="font-normal text-emerald-600 ml-1">de {producingPrep.name}</span>
                  {prepWastagePct > 0 && (
                    <span className="text-emerald-500 font-normal ml-1 text-xs">
                      ({producingPrep.yieldQty} × {produceBatches} tanda{produceBatches !== 1 ? "s" : ""} − {prepWastagePct}% merma)
                    </span>
                  )}
                </p>
              </div>
              {producePreview.length > 0 && (
                <div className="px-3 py-2 bg-white space-y-1.5 border-t border-emerald-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Descuenta:</p>
                  {producePreview.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="text-gray-400">−</span>
                      <span className="font-medium">{item.total.toLocaleString("es-AR", { maximumFractionDigits: 3 })} {item.unit}</span>
                      <span>de</span>
                      <span className={item.isPrep ? "text-emerald-700 font-medium" : ""}>{item.name}</span>
                      {item.isPrep && <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-100">prep.</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {produceError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{produceError}</p>
          )}
          <div className="flex justify-end gap-3">
            <SecondaryBtn onClick={() => setProducingPrep(null)}>Cancelar</SecondaryBtn>
            <PrimaryBtn onClick={handleProduce} disabled={isProducing}>
              {isProducing ? "Produciendo..." : "Confirmar producción"}
            </PrimaryBtn>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deactivatingId}
        onClose={() => setDeactivatingId(null)}
        onConfirm={handleDeactivate}
        title="Desactivar preparación"
        message="La preparación quedará inactiva y no podrá usarse en nuevas recetas."
        confirmLabel="Desactivar"
        isLoading={isDeactivating}
      />
    </div>
  );
}
