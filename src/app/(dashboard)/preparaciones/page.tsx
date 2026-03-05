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

  // Produce modal
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

  // Preview of deduction when producing
  const hasOutputWastage = producingPrep ? parseFloat(producingPrep.wastagePct ?? "0") > 0 : false;
  const prepWastagePct = producingPrep ? parseFloat(producingPrep.wastagePct ?? "0") : 0;

  const produceIngredientPreview = producingPrep ? producingPrep.ingredients.map((b) => ({
    name: b.ingredient.name,
    total: hasOutputWastage
      ? parseFloat(b.qty) * produceBatches
      : parseFloat(b.qty) * (1 + parseFloat(b.wastagePct) / 100) * produceBatches,
    unit: b.unit,
    isPrep: false,
  })) : [];

  const produceSubPrepPreview = producingPrep ? (producingPrep.subPreparations ?? []).map((b) => ({
    name: b.subPrep.name,
    total: hasOutputWastage
      ? parseFloat(b.qty) * produceBatches
      : parseFloat(b.qty) * (1 + parseFloat(b.wastagePct) / 100) * produceBatches,
    unit: b.unit,
    isPrep: true,
  })) : [];

  const producePreview = [...produceIngredientPreview, ...produceSubPrepPreview];

  const produceYield = producingPrep
    ? hasOutputWastage
      ? produceBatches * (1 - prepWastagePct / 100)
      : parseFloat(producingPrep.yieldQty) * produceBatches
    : 0;

  // Available preparations for sub-prep selector (exclude the one being edited)
  const availableSubPreps = preparations.filter((p) => p.isActive && p.id !== editingItem?.id);

  const columns: Column<Preparation>[] = [
    {
      key: "name",
      header: "Nombre",
      render: (p) => (
        <div>
          <span className="font-medium text-gray-900">{p.name}</span>
          {!p.isActive && <Badge variant="neutral" className="ml-2">Inactiva</Badge>}
        </div>
      ),
    },
    {
      key: "unit",
      header: "Unidad",
      className: "hidden sm:table-cell",
      render: (p) => <span className="text-xs text-gray-500 uppercase font-medium">{p.unit}</span>,
    },
    {
      key: "yieldQty",
      header: "Rendimiento",
      className: "hidden sm:table-cell",
      render: (p) => (
        <span className="text-sm text-gray-600">
          {formatQty(p.yieldQty, p.unit as Unit)} / tanda
        </span>
      ),
    },
    {
      key: "onHand",
      header: "Stock",
      render: (p) => (
        <span className="font-semibold text-gray-900">
          {formatQty(p.onHand, p.unit as Unit)}
        </span>
      ),
    },
    {
      key: "costPrice",
      header: "Costo / ud",
      className: "hidden sm:table-cell",
      render: (p) => {
        const cost = parseFloat(p.costPrice ?? "0");
        return cost > 0
          ? <span className="text-sm text-gray-700">{formatCurrency(p.costPrice, "ARS")}</span>
          : <span className="text-gray-300 text-xs">—</span>;
      },
    },
    {
      key: "ingredients",
      header: "Sub-receta",
      className: "hidden sm:table-cell",
      render: (p) => (
        <div className="flex gap-1 flex-wrap">
          {p.ingredients.length > 0 && <Badge variant="neutral">{p.ingredients.length} ing.</Badge>}
          {(p.subPreparations ?? []).length > 0 && <Badge variant="info">{p.subPreparations.length} prep.</Badge>}
          {p.ingredients.length === 0 && (p.subPreparations ?? []).length === 0 && <span className="text-gray-300 text-xs">—</span>}
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (p) => (
        <div className="flex gap-2 justify-end">
          {p.isActive && (
            <Button size="sm" variant="secondary" onClick={() => { setProducingPrep(p); setProduceBatches(1); setProduceError(""); }}>
              Producir
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => openEdit(p)}>Editar</Button>
          {p.isActive && (
            <Button size="sm" variant="danger" onClick={() => setDeactivatingId(p.id)}>Desactivar</Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Preparaciones</h1>
          <p className="text-sm text-gray-500 mt-1">Sub-recetas reutilizables como ingredientes</p>
        </div>
        <Button onClick={openCreate}>+ Nueva Preparación</Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <Table
          columns={columns}
          data={preparations}
          isLoading={loading}
          rowKey={(p) => p.id}
          emptyMessage="No hay preparaciones registradas."
        />
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? "Editar Preparación" : "Nueva Preparación"}
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
                label="Rendimiento / tanda"
                type="number"
                step="0.001"
                min="0.001"
                {...register("yieldQty", { valueAsNumber: true, min: 0.001 })}
              />
              <p className="text-xs text-gray-400 mt-1">Se usa cuando Merma % = 0</p>
            </div>
            <div>
              <Input
                label="Merma % (salida)"
                type="number"
                step="0.1"
                min="0"
                max="100"
                {...register("wastagePct", { valueAsNumber: true })}
                placeholder="0"
              />
              <p className="text-xs text-gray-400 mt-1">Si &gt; 0: producido × (1 - merma%)</p>
            </div>
          </div>

          {/* Raw ingredients BOM */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">Ingredientes crudos</h3>
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
                Sin ingredientes crudos.
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
                        {ingredients.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Input label="Cantidad" type="number" step="0.001" {...register(`ingredients.${index}.qty`, { valueAsNumber: true, min: 0.001 })} />
                    </div>
                    <div className="col-span-2">
                      <Select label="Unidad" {...register(`ingredients.${index}.unit`)}>
                        {availableUnits.map((u) => <option key={u} value={u}>{u}</option>)}
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Input label="Merma %" type="number" step="0.1" min="0" max="100" {...register(`ingredients.${index}.wastagePct`, { valueAsNumber: true })} />
                    </div>
                    <div className="col-span-2">
                      <Button type="button" variant="danger" size="sm" className="w-full" onClick={() => remove(index)}>Quitar</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sub-preparations BOM */}
          {availableSubPreps.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">Preparaciones en receta</h3>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => appendSubPrep({ subPrepId: "", qty: 0, unit: "UNIT", wastagePct: 0 })}
                >
                  + Agregar preparación
                </Button>
              </div>
              {subPrepFields.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-3 border border-dashed border-gray-200 rounded-lg">
                  Sin preparaciones. Opcional.
                </p>
              )}
              <div className="space-y-3">
                {subPrepFields.map((field, index) => {
                  const selPrepId = watchedSubPreps[index]?.subPrepId;
                  const selPrep = availableSubPreps.find((p) => p.id === selPrepId);
                  const availableUnits = selPrep ? compatibleUnits(selPrep.unit) : UNITS;
                  return (
                    <div key={field.id} className="grid grid-cols-12 gap-2 items-end p-3 bg-blue-50 rounded-lg">
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
                          placeholder="Seleccionar..."
                        >
                          {availableSubPreps.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </Select>
                      </div>
                      <div className="col-span-2">
                        <Input label="Cantidad" type="number" step="0.001" {...register(`subPreparations.${index}.qty`, { valueAsNumber: true, min: 0.001 })} />
                      </div>
                      <div className="col-span-2">
                        <Select label="Unidad" {...register(`subPreparations.${index}.unit`)}>
                          {availableUnits.map((u) => <option key={u} value={u}>{u}</option>)}
                        </Select>
                      </div>
                      <div className="col-span-2">
                        <Input label="Merma %" type="number" step="0.1" min="0" max="100" {...register(`subPreparations.${index}.wastagePct`, { valueAsNumber: true })} />
                      </div>
                      <div className="col-span-2">
                        <Button type="button" variant="danger" size="sm" className="w-full" onClick={() => removeSubPrep(index)}>Quitar</Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {saveError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{saveError}</p>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button type="submit" isLoading={saving}>{editingItem ? "Guardar cambios" : "Crear preparación"}</Button>
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
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {hasOutputWastage
                ? `Cantidad cruda a procesar (${producingPrep?.unit})`
                : "Cantidad de tandas"}
            </label>
            <input
              type="number"
              min="0.001"
              step={hasOutputWastage ? "0.001" : "1"}
              value={produceBatches}
              onChange={(e) => setProduceBatches(Math.max(0.001, parseFloat(e.target.value) || 0.001))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {hasOutputWastage && (
              <p className="text-xs text-gray-400 mt-1">
                El ingrediente se descuenta al 100%. La merma ({prepWastagePct}%) reduce el stock producido.
              </p>
            )}
          </div>

          {producingPrep && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 space-y-1.5">
              <p className="text-xs font-semibold text-emerald-700">
                Resultado: +{produceYield.toLocaleString("es-AR", { maximumFractionDigits: 3 })} {producingPrep.unit} de {producingPrep.name}
                {hasOutputWastage && (
                  <span className="text-emerald-500 font-normal ml-1">
                    ({produceBatches} − {prepWastagePct}% merma)
                  </span>
                )}
              </p>
              {producePreview.length > 0 && (
                <>
                  <p className="text-xs text-emerald-600 font-medium mt-2">Descuenta:</p>
                  {producePreview.map((item, i) => (
                    <p key={i} className="text-xs text-gray-600">
                      − {item.total.toLocaleString("es-AR", { maximumFractionDigits: 3 })} {item.unit} de{" "}
                      <span className={item.isPrep ? "text-blue-600 font-medium" : ""}>{item.name}</span>
                      {item.isPrep && <span className="text-blue-400 text-xs ml-1">(prep.)</span>}
                    </p>
                  ))}
                </>
              )}
            </div>
          )}

          {produceError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{produceError}</p>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setProducingPrep(null)}>Cancelar</Button>
            <Button onClick={handleProduce} isLoading={isProducing}>Confirmar producción</Button>
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
