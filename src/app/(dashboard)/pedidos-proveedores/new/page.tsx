"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";

const BRAND = "#0f2f26";

function PrimaryBtn({ onClick, disabled, children }: { onClick?: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      style={{ background: disabled ? "#9ca3af" : BRAND }}
      className="px-4 py-2 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:cursor-not-allowed">
      {children}
    </button>
  );
}
function SecondaryBtn({ onClick, children }: { onClick?: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className="px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 transition-colors">
      {children}
    </button>
  );
}

interface Supplier { id: string; name: string }
interface Ingredient { id: string; name: string; unit: string; costPerUnit: number; supplierId: string | null; onHand: number; minQty: number }
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
  const [onlyLowStock, setOnlyLowStock] = useState(false);

  useEffect(() => {
    fetch("/api/suppliers").then((r) => r.json()).then(setSuppliers);
    fetch("/api/ingredients?isActive=true").then((r) => r.json()).then((json) => setIngredients(json.data ?? []));
  }, []);

  // Ingredients linked to the selected supplier (not already in order)
  const supplierIngredients = useMemo(() => {
    if (!supplierId) return [];
    const base = ingredients.filter((i) => i.supplierId === supplierId && !items.some((item) => item.ingredientId === i.id));
    return onlyLowStock ? base.filter((i) => i.onHand <= i.minQty) : base;
  }, [supplierId, ingredients, items, onlyLowStock]);

  const lowStockCount = useMemo(() => {
    if (!supplierId) return 0;
    return ingredients.filter((i) => i.supplierId === supplierId && i.onHand <= i.minQty && !items.some((item) => item.ingredientId === i.id)).length;
  }, [supplierId, ingredients, items]);

  // Search dropdown (any ingredient not already in order, filtered by search text)
  const searchResults = useMemo(() => {
    if (!search) return [];
    const q = search.toLowerCase();
    return ingredients
      .filter((i) => i.name.toLowerCase().includes(q) && !items.some((item) => item.ingredientId === i.id))
      .slice(0, 8);
  }, [search, ingredients, items]);

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
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()}
          className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-lg hover:bg-gray-100">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nuevo Pedido</h1>
          <p className="text-sm text-gray-500 mt-0.5">Completá los datos del pedido a proveedor</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Supplier + Date */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Datos del pedido</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Proveedor *</label>
              <select
                value={supplierId}
                onChange={(e) => { setSupplierId(e.target.value); setItems([]); }}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
              >
                <option value="">Seleccioná un proveedor...</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Entrega esperada</label>
              <input
                type="date"
                value={expectedDeliveryAt}
                onChange={(e) => setExpectedDeliveryAt(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>
        </div>

        {/* Supplier ingredients quick-add */}
        {supplierId && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            {/* Panel header */}
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white flex-shrink-0" style={{ background: BRAND }}>
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Ingredientes de este proveedor</p>
                  <p className="text-xs text-gray-400">
                    {supplierIngredients.length} {onlyLowStock ? "con stock bajo" : "disponible"}{supplierIngredients.length !== 1 ? "s" : ""} — clic para agregar
                  </p>
                </div>
              </div>

              {/* Low stock toggle */}
              {lowStockCount > 0 && (
                <button
                  onClick={() => setOnlyLowStock(!onlyLowStock)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all shrink-0 ${
                    onlyLowStock
                      ? "border-amber-400 bg-amber-50 text-amber-700"
                      : "border-gray-200 bg-white text-gray-500 hover:border-amber-300 hover:bg-amber-50/40"
                  }`}
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Stock bajo ({lowStockCount})
                </button>
              )}
            </div>

            {/* Chips with scroll */}
            {supplierIngredients.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4 border border-dashed border-gray-100 rounded-xl">
                {onlyLowStock ? "No hay ingredientes de este proveedor con stock bajo" : "Todos los ingredientes ya están en el pedido"}
              </p>
            ) : (
              <div className="overflow-y-auto max-h-44 pr-1">
                <div className="flex flex-wrap gap-2">
                  {supplierIngredients.map((ing) => {
                    const isLow = ing.onHand <= ing.minQty;
                    return (
                      <button
                        key={ing.id}
                        onClick={() => addItem(ing)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-dashed transition-all text-left group ${
                          isLow
                            ? "border-amber-300 bg-amber-50/60 hover:border-amber-500 hover:bg-amber-50"
                            : "border-gray-200 hover:border-emerald-400 hover:bg-emerald-50/40"
                        }`}
                      >
                        <svg className={`h-3.5 w-3.5 flex-shrink-0 transition-colors ${isLow ? "text-amber-400 group-hover:text-amber-600" : "text-gray-300 group-hover:text-emerald-500"}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-semibold text-gray-800">{ing.name}</p>
                            {isLow && (
                              <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-amber-200 text-amber-800 leading-none">
                                ↓ stock
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-gray-400">
                            {ing.unit} · ${Number(ing.costPerUnit).toFixed(2)}
                            {isLow && <span className="text-amber-500 ml-1">· {Number(ing.onHand).toFixed(1)} / {Number(ing.minQty).toFixed(1)}</span>}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Item list + search */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Ingredientes del pedido</h2>
            {items.length > 0 && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                {items.length} ítem{items.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Buscar y agregar ingrediente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-10 bg-white border border-gray-200 rounded-xl shadow-lg mt-1 overflow-hidden">
                {searchResults.map((ing) => (
                  <button
                    key={ing.id}
                    onClick={() => addItem(ing)}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center justify-between transition-colors"
                  >
                    <div>
                      <span className="font-medium text-gray-900">{ing.name}</span>
                      {ing.supplierId === supplierId && (
                        <span className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">este proveedor</span>
                      )}
                    </div>
                    <span className="text-gray-400 text-xs ml-3 shrink-0">{ing.unit} · ${Number(ing.costPerUnit).toFixed(2)}</span>
                  </button>
                ))}
              </div>
            )}
            {search && searchResults.length === 0 && (
              <div className="absolute top-full left-0 right-0 z-10 bg-white border border-gray-200 rounded-xl shadow-lg mt-1 px-4 py-3 text-sm text-gray-400">
                Sin resultados para "{search}"
              </div>
            )}
          </div>

          {/* Items table */}
          {items.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-100 rounded-xl">
              {supplierId
                ? "Usá el panel de arriba o el buscador para agregar ingredientes"
                : "Seleccioná un proveedor para comenzar"}
            </div>
          ) : (
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <th className="text-left py-2 pr-3 pl-1">Ingrediente</th>
                    <th className="text-center py-2 px-2 w-20">Unidad</th>
                    <th className="text-right py-2 px-2 w-28">Cantidad</th>
                    <th className="text-right py-2 px-2 w-32">Costo unit.</th>
                    <th className="text-right py-2 px-2 w-28">Subtotal</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50/40 transition-colors">
                      <td className="py-2.5 pr-3 pl-1 font-medium text-gray-900">{item.ingredientNameSnapshot}</td>
                      <td className="py-2.5 px-2 text-center text-gray-500 text-xs">{item.unit}</td>
                      <td className="py-2.5 px-2">
                        <input
                          type="number" min="0" step="0.01"
                          value={item.expectedQty}
                          onChange={(e) => updateItem(idx, "expectedQty", parseFloat(e.target.value) || 0)}
                          className="w-full text-right rounded-lg border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                        />
                      </td>
                      <td className="py-2.5 px-2">
                        <input
                          type="number" min="0" step="0.01"
                          value={item.expectedUnitCost}
                          onChange={(e) => updateItem(idx, "expectedUnitCost", parseFloat(e.target.value) || 0)}
                          className="w-full text-right rounded-lg border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                        />
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-gray-700 font-semibold">
                        ${(item.expectedQty * item.expectedUnitCost).toFixed(2)}
                      </td>
                      <td className="py-2.5 pl-2">
                        <button onClick={() => removeItem(idx)}
                          className="text-gray-300 hover:text-red-500 transition-colors">
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
                    <td colSpan={4} className="pt-4 text-right font-semibold text-gray-700 pr-2 text-sm">
                      Total esperado
                    </td>
                    <td className="pt-4 text-right font-mono font-bold text-lg" style={{ color: BRAND }}>
                      ${totalExpected.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <label className="block text-xs font-medium text-gray-600 mb-2">Notas (opcional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Indicaciones para el proveedor..."
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 resize-none"
          />
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</div>
        )}

        <div className="flex flex-wrap justify-end gap-3 pb-4">
          <SecondaryBtn onClick={() => router.back()}>Cancelar</SecondaryBtn>
          <SecondaryBtn onClick={() => handleSubmit(false)}>
            {saving ? "Guardando..." : "Guardar borrador"}
          </SecondaryBtn>
          <PrimaryBtn onClick={() => handleSubmit(true)} disabled={saving}>
            {saving ? "Guardando..." : "Guardar y enviar"}
          </PrimaryBtn>
        </div>
      </div>
    </div>
  );
}
