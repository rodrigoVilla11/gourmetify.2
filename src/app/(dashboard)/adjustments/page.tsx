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
interface Movement {
  id: string;
  delta: string;
  reason: string | null;
  createdAt: string;
  ingredient: { name: string; unit: Unit };
}
interface AdjustmentForm {
  ingredientId: string;
  delta: number;
  reason?: string;
}

export default function AdjustmentsPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<AdjustmentForm>();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [ingRes, movRes] = await Promise.all([
      fetch("/api/ingredients?isActive=true"),
      fetch("/api/adjustments"),
    ]);
    const { data: ingData } = await ingRes.json();
    const movData = await movRes.json();
    setIngredients(ingData);
    setMovements(movData);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onSubmit = async (data: AdjustmentForm) => {
    setSaving(true);
    setSuccess(false);
    try {
      const res = await fetch("/api/adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, delta: Number(data.delta) }),
      });
      if (res.ok) {
        setSuccess(true);
        reset({ ingredientId: "", delta: 0, reason: "" });
        fetchData();
      }
    } finally {
      setSaving(false);
    }
  };

  const selectedIngredientId = watch("ingredientId");
  const selectedIngredient = ingredients.find((i) => i.id === selectedIngredientId);

  const columns: Column<Movement>[] = [
    {
      key: "date",
      header: "Fecha",
      render: (m) => format(new Date(m.createdAt), "dd/MM/yyyy HH:mm", { locale: es }),
    },
    { key: "ingredient", header: "Ingrediente", render: (m) => m.ingredient.name },
    {
      key: "delta",
      header: "Delta",
      render: (m) => {
        const d = parseFloat(m.delta);
        return (
          <Badge variant={d > 0 ? "success" : "danger"}>
            {d > 0 ? "+" : ""}{formatQty(d, m.ingredient.unit)}
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
        {success && (
          <Alert variant="success" className="mb-4">Ajuste registrado correctamente</Alert>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-xl">
          <Select
            label="Ingrediente *"
            {...register("ingredientId", { required: "Seleccioná un ingrediente" })}
            error={errors.ingredientId?.message}
            placeholder="Seleccionar..."
          >
            {ingredients.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name} — Stock actual: {formatQty(i.onHand, i.unit)}
              </option>
            ))}
          </Select>

          <Input
            label={`Delta${selectedIngredient ? ` (${unitLabel(selectedIngredient.unit)})` : ""} *`}
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
