"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface Supplier {
  id: string;
  name: string;
}

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  costPerUnit: number;
  supplierId: string | null;
}

interface OrderItem {
  ingredientId: string;
  ingredientNameSnapshot: string;
  unit: string;
  expectedQty: number;
  expectedUnitCost: number;
}

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [items, setItems] = useState<OrderItem[]>([]);
  const [notes, setNotes] = useState("");
  const [expectedDeliveryAt, setExpectedDeliveryAt] = useState("");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/suppliers").then((r) => r.json()).then(setSuppliers);
    fetch("/api/ingredients?isActive=true").then((r) => r.json()).then((json) => setIngredients(json.data ?? []));
  }, []);

  const filteredIngredients = ingredients.filter((ing) => {
    if (!search) return false;
    const matchesSearch = ing.name.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && !items.some((item) => item.ingredientId === ing.id);
  });

  const addItem = (ing: Ingredient) => {
    setItems((prev) => [
      ...prev,
      {
        ingredientId: ing.id,
        ingredientNameSnapshot: ing.name,
        unit: ing.unit,
        expectedQty: 1,
        expectedUnitCost: Number(ing.costPerUnit),
      },
    ]);
    setSearch("");
  };

  const updateItem = (idx: number, field: keyof OrderItem, value: string | number) => {
    setItems((prev) => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const totalExpected = items.reduce((sum, item) => sum + item.expectedQty * item.expectedUnitCost, 0);

  const handleSubmit = async (sendNow: boolean) => {
    if (!supplierId) { setError("Seleccioná un proveedor"); return; }
    if (items.length === 0) { setError("Agregá al menos un ingrediente"); return; }
    setError("");
    setSaving(true);

    try {
      const res = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierId, items, notes: notes || null, expectedDeliveryAt: expectedDeliveryAt || null }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Error al crear pedido"); setSaving(false); return; }

      if (sendNow) {
        await fetch(`/api/purchase-orders/${json.id}/status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "SENT" }),
        });
      }

      router.push(`/pedidos-proveedores/${json.id}`);
    } catch {
      setError("Error inesperado");
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Nuevo Pedido a Proveedor</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
        {/* Proveedor */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Proveedor *</label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">Seleccioná un proveedor</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <Input
            label="Entrega esperada"
            type="date"
            value={expectedDeliveryAt}
            onChange={(e) => setExpectedDeliveryAt(e.target.value)}
          />
        </div>

        {/* Buscador de ingredientes */}
        <div className="relative">
          <Input
            label="Agregar ingrediente"
            placeholder="Buscar por nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {filteredIngredients.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-10 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
              {filteredIngredients.map((ing) => (
                <button
                  key={ing.id}
                  onClick={() => addItem(ing)}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center justify-between"
                >
                  <span className="font-medium">{ing.name}</span>
                  <span className="text-gray-400 text-xs">{ing.unit} · ${Number(ing.costPerUnit).toFixed(2)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Items table */}
        {items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  <th className="text-left py-2 pr-3">Ingrediente</th>
                  <th className="text-center py-2 px-2 w-20">Unidad</th>
                  <th className="text-right py-2 px-2 w-28">Cantidad</th>
                  <th className="text-right py-2 px-2 w-32">Costo unit.</th>
                  <th className="text-right py-2 px-2 w-28">Subtotal</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-100">
                    <td className="py-2 pr-3 font-medium">{item.ingredientNameSnapshot}</td>
                    <td className="py-2 px-2 text-center text-gray-500">{item.unit}</td>
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.expectedQty}
                        onChange={(e) => updateItem(idx, "expectedQty", parseFloat(e.target.value) || 0)}
                        className="w-full text-right rounded border border-gray-200 px-2 py-1 text-sm focus:border-emerald-500 focus:outline-none"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.expectedUnitCost}
                        onChange={(e) => updateItem(idx, "expectedUnitCost", parseFloat(e.target.value) || 0)}
                        className="w-full text-right rounded border border-gray-200 px-2 py-1 text-sm focus:border-emerald-500 focus:outline-none"
                      />
                    </td>
                    <td className="py-2 px-2 text-right font-mono text-gray-700">
                      ${(item.expectedQty * item.expectedUnitCost).toFixed(2)}
                    </td>
                    <td className="py-2 pl-2">
                      <button
                        onClick={() => removeItem(idx)}
                        className="text-gray-300 hover:text-red-400 transition-colors"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} className="pt-3 text-right font-semibold text-gray-700 pr-2">
                    Total esperado
                  </td>
                  <td className="pt-3 text-right font-mono font-bold text-emerald-700">
                    ${totalExpected.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Notas */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Notas</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Notas opcionales..."
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex flex-wrap justify-end gap-3 pt-2">
          <Button variant="secondary" type="button" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button variant="secondary" onClick={() => handleSubmit(false)} isLoading={saving}>
            Guardar borrador
          </Button>
          <Button onClick={() => handleSubmit(true)} isLoading={saving}>
            Guardar y enviar
          </Button>
        </div>
      </div>
    </div>
  );
}
