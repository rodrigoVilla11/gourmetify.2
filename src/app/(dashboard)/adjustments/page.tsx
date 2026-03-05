"use client";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Table, Column } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { useForm } from "react-hook-form";
import { formatQty, unitLabel } from "@/utils/units";
import type { Unit } from "@/types";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Ingredient { id: string; name: string; unit: Unit; onHand: string }
interface Preparation { id: string; name: string; unit: string; onHand: string }
interface Movement {
  id: string;
  kind: "ingredient" | "preparation";
  name: string;
  unit: string;
  delta: string;
  reason: string | null;
  createdAt: string;
}
interface AdjustmentForm {
  subjectId: string;
  delta: number;
  reason?: string;
}

export default function AdjustmentsPage() {
  const [adjType, setAdjType] = useState<"ingredient" | "preparation">("ingredient");
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [preparations, setPreparations] = useState<Preparation[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<AdjustmentForm>();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [ingRes, prepRes, movRes] = await Promise.all([
      fetch("/api/ingredients?isActive=true"),
      fetch("/api/preparations?isActive=true"),
      fetch("/api/adjustments"),
    ]);
    const { data: ingData } = await ingRes.json();
    const { data: prepData } = await prepRes.json();
    const movData = await movRes.json();
    setIngredients(ingData ?? []);
    setPreparations(prepData ?? []);
    setMovements(movData ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onSubmit = async (data: AdjustmentForm) => {
    setSaving(true);
    setSuccess(false);
    setErrorMsg("");
    try {
      const body = adjType === "ingredient"
        ? { type: "ingredient", ingredientId: data.subjectId, delta: Number(data.delta), reason: data.reason }
        : { type: "preparation", preparationId: data.subjectId, delta: Number(data.delta), reason: data.reason };
      const res = await fetch("/api/adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setSuccess(true);
        reset({ subjectId: "", delta: 0, reason: "" });
        fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(err.error ?? "Error al registrar ajuste");
      }
    } finally {
      setSaving(false);
    }
  };

  const selectedId = watch("subjectId");
  const selectedIng  = ingredients.find((i) => i.id === selectedId);
  const selectedPrep = preparations.find((p) => p.id === selectedId);
  const selectedUnit = adjType === "ingredient" ? selectedIng?.unit : selectedPrep?.unit;
  const selectedOnHand = adjType === "ingredient"
    ? (selectedIng ? formatQty(selectedIng.onHand, selectedIng.unit as Unit) : null)
    : (selectedPrep ? `${Number(selectedPrep.onHand)} ${selectedPrep.unit}` : null);

  const columns: Column<Movement>[] = [
    {
      key: "date",
      header: "Fecha",
      render: (m) => format(new Date(m.createdAt), "dd/MM/yyyy HH:mm", { locale: es }),
    },
    {
      key: "kind",
      header: "Tipo",
      render: (m) => (
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.kind === "preparation" ? "bg-violet-100 text-violet-700" : "bg-sky-100 text-sky-700"}`}>
          {m.kind === "preparation" ? "Preparación" : "Ingrediente"}
        </span>
      ),
    },
    { key: "name", header: "Nombre", render: (m) => m.name },
    {
      key: "delta",
      header: "Delta",
      render: (m) => {
        const d = parseFloat(m.delta);
        return (
          <Badge variant={d > 0 ? "success" : "danger"}>
            {d > 0 ? "+" : ""}{d} {m.unit}
          </Badge>
        );
      },
    },
    { key: "reason", header: "Motivo", render: (m) => m.reason ?? <span className="text-gray-400">—</span> },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Ajustes de Stock</h1>
        <p className="text-sm text-gray-500 mt-1">Registrá entradas, mermas o correcciones manuales</p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Nuevo ajuste</h2>
        {success && <Alert variant="success" className="mb-4">Ajuste registrado correctamente</Alert>}
        {errorMsg && <Alert variant="error" className="mb-4">{errorMsg}</Alert>}

        {/* Type toggle */}
        <div className="flex gap-2 mb-5">
          {(["ingredient", "preparation"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => { setAdjType(t); reset({ subjectId: "", delta: 0, reason: "" }); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${adjType === t ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}
            >
              {t === "ingredient" ? "Ingrediente" : "Preparación"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-xl">
          <Select
            label={`${adjType === "ingredient" ? "Ingrediente" : "Preparación"} *`}
            {...register("subjectId", { required: `Seleccioná un${adjType === "ingredient" ? " ingrediente" : "a preparación"}` })}
            error={errors.subjectId?.message}
            placeholder="Seleccionar..."
          >
            {adjType === "ingredient"
              ? ingredients.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name} — Stock: {formatQty(i.onHand, i.unit as Unit)} {i.unit}
                  </option>
                ))
              : preparations.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — Stock: {Number(p.onHand)} {p.unit}
                  </option>
                ))
            }
          </Select>

          {selectedOnHand && (
            <p className="text-xs text-gray-500 -mt-2">Stock actual: <span className="font-semibold text-gray-700">{selectedOnHand}</span></p>
          )}

          <Input
            label={`Delta${selectedUnit ? ` (${adjType === "ingredient" ? unitLabel(selectedUnit as Unit) : selectedUnit})` : ""} *`}
            type="number"
            step="0.001"
            {...register("delta", {
              required: "Delta requerido",
              validate: (v) => Number(v) !== 0 || "Delta no puede ser cero",
            })}
            error={errors.delta?.message}
            helper="Positivo = entrada de stock. Negativo = salida/merma."
          />
          <Input
            label="Motivo"
            placeholder="ej. Compra a proveedor, merma por vencimiento..."
            {...register("reason")}
          />
          <Button type="submit" isLoading={saving}>Registrar ajuste</Button>
        </form>
      </div>

      {/* History */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-4">Historial de ajustes</h2>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <Table
            columns={columns}
            data={movements}
            isLoading={loading}
            rowKey={(m) => m.id}
            emptyMessage="No hay ajustes registrados"
          />
        </div>
      </div>
    </div>
  );
}
