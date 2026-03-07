"use client";
import { useState, useEffect, useCallback } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

type Discount = {
  id: string; name: string; description?: string | null; isActive: boolean;
  discountType: string; value: number; priority: number; label?: string | null;
  dateFrom?: string | null; dateTo?: string | null;
  timeFrom?: string | null; timeTo?: string | null;
  weekdays?: number[] | null;
  appliesTo: string;
  productIds?: string[] | null; categoryIds?: string[] | null;
  paymentMethods?: string[] | null;
  sortOrder: number;
};

type Extra = {
  id: string; name: string; description?: string | null; isActive: boolean;
  price: number; isFree: boolean; affectsStock: boolean;
  ingredientId?: string | null; ingredientQty?: number | null;
  appliesTo: string;
  productIds?: string[] | null; categoryIds?: string[] | null;
  maxQuantity?: number | null; sortOrder: number;
  ingredient?: { id: string; name: string; unit: string } | null;
};

type Product  = { id: string; name: string; categoryId: string | null };
type Category = { id: string; name: string };
type Ingredient = { id: string; name: string; unit: string };
type OrgPaymentMethods = Record<string, { enabled: boolean; alias?: string }>;
type OrgConfig = { paymentMethods?: OrgPaymentMethods | null };

const PM_LABELS: Record<string, string> = {
  cash: "Efectivo", transfer: "Transferencia", mercadopago: "Mercado Pago",
  debit: "Débito", credit: "Crédito",
};
const PM_CANONICAL: Record<string, string> = {
  cash: "EFECTIVO", transfer: "TRANSFERENCIA", mercadopago: "ONLINE",
  debit: "DEBITO", credit: "CREDITO",
};
const WEEKDAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function fmt(n: number) {
  return "$" + n.toLocaleString("es-AR", { maximumFractionDigits: 0 });
}

const emptyDiscount = (): Partial<Discount> => ({
  name: "", isActive: true, discountType: "PERCENTAGE", value: 0, priority: 0,
  appliesTo: "ORDER", sortOrder: 0,
});

const emptyExtra = (): Partial<Extra> => ({
  name: "", isActive: true, price: 0, isFree: false, affectsStock: false,
  appliesTo: "ALL", sortOrder: 0,
});

// ── Main component ────────────────────────────────────────────────────────────

export default function AdicionalesDescuentosPage() {
  const [tab, setTab] = useState<"descuentos" | "adicionales">("descuentos");

  // ── Data ───────────────────────────────────────────────────────────────────
  const [discounts,   setDiscounts]   = useState<Discount[]>([]);
  const [extras,      setExtras]      = useState<Extra[]>([]);
  const [products,    setProducts]    = useState<Product[]>([]);
  const [categories,  setCategories]  = useState<Category[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [orgConfig,   setOrgConfig]   = useState<OrgConfig | null>(null);
  const [loading,     setLoading]     = useState(true);

  // ── Discount modal ─────────────────────────────────────────────────────────
  const [discountModal,  setDiscountModal]  = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
  const [dForm, setDForm] = useState<Partial<Discount>>(emptyDiscount());
  const [dSaving, setDSaving] = useState(false);
  const [dError,  setDError]  = useState("");

  // ── Extra modal ────────────────────────────────────────────────────────────
  const [extraModal,  setExtraModal]  = useState(false);
  const [editingExtra, setEditingExtra] = useState<Extra | null>(null);
  const [eForm, setEForm] = useState<Partial<Extra>>(emptyExtra());
  const [eSaving, setESaving] = useState(false);
  const [eError,  setEError]  = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [d, e, prods, cats, ings, org] = await Promise.all([
      fetch("/api/discounts").then((r) => r.json()),
      fetch("/api/extras").then((r) => r.json()),
      fetch("/api/products?isActive=true&limit=200").then((r) => r.json()),
      fetch("/api/product-categories").then((r) => r.json()),
      fetch("/api/ingredients?isActive=true&limit=200").then((r) => r.json()),
      fetch("/api/organizations/me").then((r) => r.json()),
    ]);
    setDiscounts(Array.isArray(d) ? d : []);
    setExtras(Array.isArray(e) ? e : []);
    const prodsArr = Array.isArray(prods) ? prods : (prods?.data ?? []);
    const ingsArr  = Array.isArray(ings)  ? ings  : (ings?.data  ?? []);
    setProducts(prodsArr);
    setCategories(Array.isArray(cats) ? cats : []);
    setIngredients(ingsArr);
    setOrgConfig(org);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Discount CRUD ──────────────────────────────────────────────────────────
  function openNewDiscount() {
    setEditingDiscount(null);
    setDForm(emptyDiscount());
    setDError("");
    setDiscountModal(true);
  }
  function openEditDiscount(d: Discount) {
    setEditingDiscount(d);
    setDForm({ ...d });
    setDError("");
    setDiscountModal(true);
  }

  async function saveDiscount() {
    setDSaving(true); setDError("");
    const payload = {
      ...dForm,
      weekdays: dForm.weekdays ?? null,
      productIds: dForm.productIds ?? null,
      categoryIds: dForm.categoryIds ?? null,
      paymentMethods: dForm.paymentMethods ?? null,
    };
    const url    = editingDiscount ? `/api/discounts/${editingDiscount.id}` : "/api/discounts";
    const method = editingDiscount ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) { setDError(data.error ?? "Error"); setDSaving(false); return; }
    setDiscountModal(false);
    await load();
    setDSaving(false);
  }

  async function toggleDiscountActive(d: Discount) {
    await fetch(`/api/discounts/${d.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !d.isActive }),
    });
    await load();
  }

  async function deleteDiscount(id: string) {
    if (!confirm("¿Eliminar este descuento?")) return;
    await fetch(`/api/discounts/${id}`, { method: "DELETE" });
    await load();
  }

  // ── Extra CRUD ─────────────────────────────────────────────────────────────
  function openNewExtra() {
    setEditingExtra(null);
    setEForm(emptyExtra());
    setEError("");
    setExtraModal(true);
  }
  function openEditExtra(e: Extra) {
    setEditingExtra(e);
    setEForm({ ...e });
    setEError("");
    setExtraModal(true);
  }

  async function saveExtra() {
    setESaving(true); setEError("");
    const payload = { ...eForm, productIds: eForm.productIds ?? null, categoryIds: eForm.categoryIds ?? null };
    const url    = editingExtra ? `/api/extras/${editingExtra.id}` : "/api/extras";
    const method = editingExtra ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) { setEError(data.error ?? "Error"); setESaving(false); return; }
    setExtraModal(false);
    await load();
    setESaving(false);
  }

  async function toggleExtraActive(e: Extra) {
    await fetch(`/api/extras/${e.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !e.isActive }),
    });
    await load();
  }

  async function deleteExtra(id: string) {
    if (!confirm("¿Eliminar este adicional?")) return;
    await fetch(`/api/extras/${id}`, { method: "DELETE" });
    await load();
  }

  // ── Enabled payment methods from org config ─────────────────────────────────
  const enabledPMs: { key: string; label: string; canonical: string }[] = orgConfig?.paymentMethods
    ? Object.entries(orgConfig.paymentMethods)
        .filter(([, cfg]) => cfg.enabled)
        .map(([key]) => ({ key, label: PM_LABELS[key] ?? key, canonical: PM_CANONICAL[key] ?? key }))
    : Object.entries(PM_CANONICAL).map(([k, v]) => ({ key: k, label: PM_LABELS[k] ?? k, canonical: v }));

  // ── Helpers ────────────────────────────────────────────────────────────────
  const toggleArr = <T,>(arr: T[] | null | undefined, item: T): T[] => {
    const a = arr ?? [];
    return a.includes(item) ? a.filter((x) => x !== item) : [...a, item];
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Descuentos y Extras</h1>
          <p className="text-sm text-gray-500 mt-0.5">Administra promociones y adicionales por producto</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit mb-6">
        {(["descuentos", "adicionales"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${tab === t ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
            {t === "descuentos" ? "Descuentos" : "Adicionales"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Cargando...</div>
      ) : tab === "descuentos" ? (
        <DiscountsTab
          discounts={discounts}
          onNew={openNewDiscount}
          onEdit={openEditDiscount}
          onToggle={toggleDiscountActive}
          onDelete={deleteDiscount}
        />
      ) : (
        <ExtrasTab
          extras={extras}
          onNew={openNewExtra}
          onEdit={openEditExtra}
          onToggle={toggleExtraActive}
          onDelete={deleteExtra}
        />
      )}

      {/* Discount Modal */}
      {discountModal && (
        <Modal title={editingDiscount ? "Editar descuento" : "Nuevo descuento"} onClose={() => setDiscountModal(false)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="label">Nombre*</label>
                <input className="input" value={dForm.name ?? ""} onChange={(e) => setDForm({ ...dForm, name: e.target.value })} placeholder="Ej: 10% Efectivo" />
              </div>
              <div>
                <label className="label">Tipo</label>
                <select className="input" value={dForm.discountType ?? "PERCENTAGE"} onChange={(e) => setDForm({ ...dForm, discountType: e.target.value })}>
                  <option value="PERCENTAGE">Porcentaje (%)</option>
                  <option value="FIXED">Monto fijo ($)</option>
                </select>
              </div>
              <div>
                <label className="label">Valor*</label>
                <input className="input" type="number" min={0} step="0.01"
                  value={dForm.value ?? 0}
                  onChange={(e) => setDForm({ ...dForm, value: parseFloat(e.target.value) || 0 })}
                  placeholder={dForm.discountType === "PERCENTAGE" ? "Ej: 10" : "Ej: 500"} />
              </div>
              <div>
                <label className="label">Prioridad</label>
                <input className="input" type="number" min={0} value={dForm.priority ?? 0}
                  onChange={(e) => setDForm({ ...dForm, priority: parseInt(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="label">Label promo (visible al cliente)</label>
                <input className="input" value={dForm.label ?? ""} onChange={(e) => setDForm({ ...dForm, label: e.target.value || null })} placeholder="Ej: Pago en efectivo" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="d-active" checked={dForm.isActive ?? true}
                onChange={(e) => setDForm({ ...dForm, isActive: e.target.checked })} className="h-4 w-4 rounded border-gray-300" />
              <label htmlFor="d-active" className="text-sm text-gray-700">Activo</label>
            </div>

            {/* Date range */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Desde (fecha)</label>
                <input className="input" type="date" value={dForm.dateFrom ?? ""} onChange={(e) => setDForm({ ...dForm, dateFrom: e.target.value || null })} />
              </div>
              <div>
                <label className="label">Hasta (fecha)</label>
                <input className="input" type="date" value={dForm.dateTo ?? ""} onChange={(e) => setDForm({ ...dForm, dateTo: e.target.value || null })} />
              </div>
              <div>
                <label className="label">Desde (hora)</label>
                <input className="input" type="time" value={dForm.timeFrom ?? ""} onChange={(e) => setDForm({ ...dForm, timeFrom: e.target.value || null })} />
              </div>
              <div>
                <label className="label">Hasta (hora)</label>
                <input className="input" type="time" value={dForm.timeTo ?? ""} onChange={(e) => setDForm({ ...dForm, timeTo: e.target.value || null })} />
              </div>
            </div>

            {/* Weekdays */}
            <div>
              <label className="label">Días de semana (vacío = todos)</label>
              <div className="flex gap-1 flex-wrap mt-1">
                {WEEKDAY_LABELS.map((label, i) => {
                  const active = dForm.weekdays?.includes(i) ?? false;
                  return (
                    <button key={i} type="button"
                      onClick={() => setDForm({ ...dForm, weekdays: toggleArr(dForm.weekdays, i) })}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${active ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"}`}>
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Applies to */}
            <div>
              <label className="label">Aplicable a</label>
              <select className="input" value={dForm.appliesTo ?? "ORDER"}
                onChange={(e) => setDForm({ ...dForm, appliesTo: e.target.value, productIds: null, categoryIds: null })}>
                <option value="ORDER">Todo el pedido</option>
                <option value="PRODUCTS">Productos específicos</option>
                <option value="CATEGORIES">Categorías específicas</option>
              </select>
            </div>
            {dForm.appliesTo === "PRODUCTS" && (
              <div>
                <label className="label">Productos</label>
                <div className="border border-gray-200 rounded-lg max-h-36 overflow-y-auto p-2 space-y-1">
                  {products.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={dForm.productIds?.includes(p.id) ?? false}
                        onChange={() => setDForm({ ...dForm, productIds: toggleArr(dForm.productIds, p.id) })} />
                      {p.name}
                    </label>
                  ))}
                </div>
              </div>
            )}
            {dForm.appliesTo === "CATEGORIES" && (
              <div>
                <label className="label">Categorías</label>
                <div className="border border-gray-200 rounded-lg max-h-32 overflow-y-auto p-2 space-y-1">
                  {categories.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={dForm.categoryIds?.includes(c.id) ?? false}
                        onChange={() => setDForm({ ...dForm, categoryIds: toggleArr(dForm.categoryIds, c.id) })} />
                      {c.name}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Payment methods */}
            <div>
              <label className="label">Medios de pago (vacío = todos)</label>
              <div className="flex gap-2 flex-wrap mt-1">
                {enabledPMs.map((pm) => {
                  const active = dForm.paymentMethods?.includes(pm.canonical) ?? false;
                  return (
                    <button key={pm.key} type="button"
                      onClick={() => setDForm({ ...dForm, paymentMethods: toggleArr(dForm.paymentMethods, pm.canonical) })}
                      className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${active ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"}`}>
                      {pm.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {dError && <p className="text-sm text-red-600">{dError}</p>}

            <div className="flex gap-2 pt-2">
              <button onClick={() => setDiscountModal(false)} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
              <button onClick={saveDiscount} disabled={dSaving} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60">
                {dSaving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Extra Modal */}
      {extraModal && (
        <Modal title={editingExtra ? "Editar adicional" : "Nuevo adicional"} onClose={() => setExtraModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="label">Nombre*</label>
              <input className="input" value={eForm.name ?? ""} onChange={(e) => setEForm({ ...eForm, name: e.target.value })} placeholder="Ej: Salsa extra" />
            </div>
            <div>
              <label className="label">Descripción</label>
              <input className="input" value={eForm.description ?? ""} onChange={(e) => setEForm({ ...eForm, description: e.target.value || null })} />
            </div>

            <div className="flex items-center gap-6 flex-wrap">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={eForm.isActive ?? true}
                  onChange={(e) => setEForm({ ...eForm, isActive: e.target.checked })} className="h-4 w-4 rounded" />
                Activo
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={eForm.isFree ?? false}
                  onChange={(e) => setEForm({ ...eForm, isFree: e.target.checked, price: e.target.checked ? 0 : eForm.price })}
                  className="h-4 w-4 rounded" />
                Sin cargo
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Precio</label>
                <input className="input" type="number" min={0} step="0.01"
                  value={eForm.price ?? 0} disabled={eForm.isFree}
                  onChange={(e) => setEForm({ ...eForm, price: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="label">Cant. máxima</label>
                <input className="input" type="number" min={1} placeholder="Sin límite"
                  value={eForm.maxQuantity ?? ""}
                  onChange={(e) => setEForm({ ...eForm, maxQuantity: e.target.value ? parseInt(e.target.value) : null })} />
              </div>
            </div>

            {/* Stock */}
            <div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={eForm.affectsStock ?? false}
                  onChange={(e) => setEForm({ ...eForm, affectsStock: e.target.checked, ingredientId: e.target.checked ? eForm.ingredientId : null, ingredientQty: e.target.checked ? eForm.ingredientQty : null })}
                  className="h-4 w-4 rounded" />
                Afecta stock
              </label>
              {eForm.affectsStock && (
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div>
                    <label className="label">Ingrediente</label>
                    <select className="input" value={eForm.ingredientId ?? ""}
                      onChange={(e) => setEForm({ ...eForm, ingredientId: e.target.value || null })}>
                      <option value="">Seleccionar...</option>
                      {ingredients.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Cantidad a descontar</label>
                    <input className="input" type="number" min={0} step="0.001"
                      value={eForm.ingredientQty ?? ""}
                      onChange={(e) => setEForm({ ...eForm, ingredientQty: e.target.value ? parseFloat(e.target.value) : null })} />
                  </div>
                </div>
              )}
            </div>

            {/* Applies to */}
            <div>
              <label className="label">Aplicable a</label>
              <select className="input" value={eForm.appliesTo ?? "ALL"}
                onChange={(e) => setEForm({ ...eForm, appliesTo: e.target.value, productIds: null, categoryIds: null })}>
                <option value="ALL">Todo el menú</option>
                <option value="PRODUCTS">Productos específicos</option>
                <option value="CATEGORIES">Categorías específicas</option>
              </select>
            </div>
            {eForm.appliesTo === "PRODUCTS" && (
              <div>
                <label className="label">Productos</label>
                <div className="border border-gray-200 rounded-lg max-h-36 overflow-y-auto p-2 space-y-1">
                  {products.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={eForm.productIds?.includes(p.id) ?? false}
                        onChange={() => setEForm({ ...eForm, productIds: toggleArr(eForm.productIds, p.id) })} />
                      {p.name}
                    </label>
                  ))}
                </div>
              </div>
            )}
            {eForm.appliesTo === "CATEGORIES" && (
              <div>
                <label className="label">Categorías</label>
                <div className="border border-gray-200 rounded-lg max-h-32 overflow-y-auto p-2 space-y-1">
                  {categories.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={eForm.categoryIds?.includes(c.id) ?? false}
                        onChange={() => setEForm({ ...eForm, categoryIds: toggleArr(eForm.categoryIds, c.id) })} />
                      {c.name}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {eError && <p className="text-sm text-red-600">{eError}</p>}

            <div className="flex gap-2 pt-2">
              <button onClick={() => setExtraModal(false)} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
              <button onClick={saveExtra} disabled={eSaving} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60">
                {eSaving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      <style jsx global>{`
        .label { display: block; font-size: 0.75rem; font-weight: 600; color: #374151; margin-bottom: 0.25rem; }
        .input { width: 100%; border: 1px solid #D1D5DB; border-radius: 0.5rem; padding: 0.5rem 0.75rem; font-size: 0.875rem; outline: none; }
        .input:focus { border-color: #059669; box-shadow: 0 0 0 2px rgba(5,150,105,0.15); }
        .input:disabled { background: #F9FAFB; color: #9CA3AF; cursor: not-allowed; }
      `}</style>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function DiscountsTab({ discounts, onNew, onEdit, onToggle, onDelete }: {
  discounts: Discount[];
  onNew: () => void;
  onEdit: (d: Discount) => void;
  onToggle: (d: Discount) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{discounts.length} descuento{discounts.length !== 1 ? "s" : ""}</p>
        <button onClick={onNew} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors">
          + Nuevo descuento
        </button>
      </div>

      {discounts.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          <p>No hay descuentos configurados</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Activo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nombre</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Valor</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Condiciones</th>
                <th className="text-right px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {discounts.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <button onClick={() => onToggle(d)} className={`w-9 h-5 rounded-full transition-colors ${d.isActive ? "bg-emerald-500" : "bg-gray-300"}`} style={{ position: "relative" }}>
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${d.isActive ? "left-4" : "left-0.5"}`} />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{d.name}</p>
                    {d.label && <p className="text-xs text-gray-400">{d.label}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {d.discountType === "PERCENTAGE" ? "%" : "$"}
                  </td>
                  <td className="px-4 py-3 font-semibold text-emerald-700">
                    {d.discountType === "PERCENTAGE" ? `${d.value}%` : `$${d.value}`}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <div className="flex gap-1 flex-wrap">
                      {d.dateFrom && <span className="badge-gray">Fecha</span>}
                      {d.timeFrom && <span className="badge-gray">Hora</span>}
                      {d.weekdays && d.weekdays.length > 0 && <span className="badge-gray">{d.weekdays.length}d</span>}
                      {d.paymentMethods && d.paymentMethods.length > 0 && <span className="badge-blue">{d.paymentMethods.length} pago{d.paymentMethods.length !== 1 ? "s" : ""}</span>}
                      {d.appliesTo !== "ORDER" && <span className="badge-purple">{d.appliesTo === "PRODUCTS" ? "Productos" : "Categorías"}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => onEdit(d)} className="text-gray-400 hover:text-gray-700 p-1 mr-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button onClick={() => onDelete(d.id)} className="text-gray-400 hover:text-red-600 p-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <style jsx global>{`
        .badge-gray   { display:inline-flex; align-items:center; padding:2px 8px; border-radius:9999px; font-size:0.65rem; font-weight:600; background:#F3F4F6; color:#374151; }
        .badge-blue   { display:inline-flex; align-items:center; padding:2px 8px; border-radius:9999px; font-size:0.65rem; font-weight:600; background:#EFF6FF; color:#1D4ED8; }
        .badge-purple { display:inline-flex; align-items:center; padding:2px 8px; border-radius:9999px; font-size:0.65rem; font-weight:600; background:#F5F3FF; color:#6D28D9; }
      `}</style>
    </div>
  );
}

function ExtrasTab({ extras, onNew, onEdit, onToggle, onDelete }: {
  extras: Extra[];
  onNew: () => void;
  onEdit: (e: Extra) => void;
  onToggle: (e: Extra) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{extras.length} adicional{extras.length !== 1 ? "es" : ""}</p>
        <button onClick={onNew} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors">
          + Nuevo adicional
        </button>
      </div>

      {extras.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>No hay adicionales configurados</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Activo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nombre</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Precio</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Stock</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Alcance</th>
                <th className="text-right px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {extras.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <button onClick={() => onToggle(e)} className={`w-9 h-5 rounded-full transition-colors ${e.isActive ? "bg-emerald-500" : "bg-gray-300"}`} style={{ position: "relative" }}>
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${e.isActive ? "left-4" : "left-0.5"}`} />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{e.name}</p>
                    {e.description && <p className="text-xs text-gray-400">{e.description}</p>}
                  </td>
                  <td className="px-4 py-3">
                    {e.isFree
                      ? <span className="text-emerald-600 font-semibold text-xs">Sin cargo</span>
                      : <span className="font-semibold text-gray-800">{fmt(e.price)}</span>}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {e.affectsStock
                      ? <span className="badge-blue">{e.ingredient?.name ?? "Sí"}</span>
                      : <span className="text-gray-400 text-xs">No</span>}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className={`text-xs font-medium ${e.appliesTo === "ALL" ? "text-gray-500" : "text-purple-600"}`}>
                      {e.appliesTo === "ALL" ? "Todo el menú" : e.appliesTo === "PRODUCTS" ? "Productos" : "Categorías"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => onEdit(e)} className="text-gray-400 hover:text-gray-700 p-1 mr-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button onClick={() => onDelete(e.id)} className="text-gray-400 hover:text-red-600 p-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 sticky top-0 bg-white z-10">
            <h2 className="text-base font-bold text-gray-900">{title}</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="px-6 py-5">{children}</div>
        </div>
      </div>
    </>
  );
}
