"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useForm, useFieldArray } from "react-hook-form";
import { CURRENCIES, UNITS, type Unit, type Currency } from "@/types";
import { unitLabel, compatibleUnits, convertUnit } from "@/utils/units";
import { formatCurrency } from "@/utils/currency";
import { ImportButton } from "@/components/ui/ImportButton";
import { downloadExcel } from "@/utils/excel";
import HelpButton from "@/components/tutorial/HelpButton";

interface ProductCategory { id: string; name: string; color: string; _count?: { products: number } }
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
  categoryId: string | null;
  category: ProductCategory | null;
  isActive: boolean;
  imageUrl: string | null;
  description: string | null;
  ingredients: { ingredientId: string; qty: string; unit: Unit; wastagePct: string; ingredient: Ingredient }[];
  preparations: { preparationId: string; qty: string; unit: Unit; wastagePct: string; preparation: Preparation }[];
}
interface ProductForm {
  name: string;
  sku?: string;
  salePrice: number;
  currency: Currency;
  categoryId?: string;
  imageUrl?: string | null;
  description?: string | null;
  ingredients: BOMEntry[];
  preparations: PrepBOMEntry[];
}

const BRAND = "#0f2f26";
const BRAND_HOVER = "#1a4d3f";

const PRESET_COLORS = [
  "#6B7280", "#EF4444", "#F97316", "#EAB308",
  "#22C55E", "#10B981", "#06B6D4", "#3B82F6",
  "#8B5CF6", "#EC4899",
];

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

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [preparations, setPreparations] = useState<Preparation[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Product | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCategoryId, setFilterCategoryId] = useState<string>("all");

  // Inline category creation (inside product modal)
  const [showInlineCatForm, setShowInlineCatForm] = useState(false);
  const [inlineCatName, setInlineCatName] = useState("");
  const [inlineCatColor, setInlineCatColor] = useState("#6B7280");
  const [savingInlineCat, setSavingInlineCat] = useState(false);

  // Category management
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<ProductCategory | null>(null);
  const [catName, setCatName] = useState("");
  const [catColor, setCatColor] = useState("#6B7280");
  const [savingCat, setSavingCat] = useState(false);
  const [deletingCatId, setDeletingCatId] = useState<string | null>(null);
  const [isDeletingCat, setIsDeletingCat] = useState(false);

  const { register, handleSubmit, reset, watch, control, setValue, formState: { errors } } = useForm<ProductForm>({
    defaultValues: { currency: "ARS", salePrice: 0, ingredients: [], preparations: [] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "ingredients" });
  const { fields: prepFields, append: appendPrep, remove: removePrep } = useFieldArray({ control, name: "preparations" });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [prodRes, ingRes, prepRes, catRes] = await Promise.all([
      fetch("/api/products"),
      fetch("/api/ingredients?isActive=true"),
      fetch("/api/preparations?isActive=true"),
      fetch("/api/product-categories"),
    ]);
    const { data: prods } = await prodRes.json();
    const { data: ings } = await ingRes.json();
    const { data: preps } = await prepRes.json();
    const cats = await catRes.json();
    setProducts(prods ?? []);
    setIngredients(ings ?? []);
    setPreparations(preps ?? []);
    setCategories(Array.isArray(cats) ? cats : []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setEditingItem(null);
    setSaveError("");
    setShowInlineCatForm(false);
    reset({ name: "", sku: "", salePrice: 0, currency: "ARS", categoryId: "", imageUrl: null, description: null, ingredients: [], preparations: [] });
    setIsModalOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditingItem(p);
    setSaveError("");
    setShowInlineCatForm(false);
    reset({
      name: p.name,
      sku: p.sku ?? "",
      salePrice: parseFloat(p.salePrice),
      currency: p.currency,
      categoryId: p.categoryId ?? "",
      imageUrl: p.imageUrl ?? null,
      description: p.description ?? null,
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload?folder=productos", { method: "POST", body: fd });
      const { url } = await res.json();
      if (url) setValue("imageUrl", url);
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  };

  const onSubmit = async (data: ProductForm) => {
    setSaving(true);
    setSaveError("");
    const body = { ...data, sku: data.sku || null, categoryId: data.categoryId || null, imageUrl: data.imageUrl || null, description: data.description || null };
    try {
      const res = editingItem
        ? await fetch(`/api/products/${editingItem.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        : await fetch("/api/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
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

  const handleDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    await fetch(`/api/products/${deletingId}`, { method: "DELETE" });
    setDeletingId(null);
    setIsDeleting(false);
    fetchData();
  };

  const openCreateCat = () => {
    setEditingCat(null);
    setCatName("");
    setCatColor("#6B7280");
    setIsCatModalOpen(true);
  };

  const openEditCat = (cat: ProductCategory) => {
    setEditingCat(cat);
    setCatName(cat.name);
    setCatColor(cat.color);
    setIsCatModalOpen(true);
  };

  const saveCat = async () => {
    if (!catName.trim()) return;
    setSavingCat(true);
    try {
      if (editingCat) {
        await fetch(`/api/product-categories/${editingCat.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: catName.trim(), color: catColor }),
        });
      } else {
        await fetch("/api/product-categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: catName.trim(), color: catColor }),
        });
      }
      setIsCatModalOpen(false);
      fetchData();
    } finally {
      setSavingCat(false);
    }
  };

  const handleDeleteCat = async () => {
    if (!deletingCatId) return;
    setIsDeletingCat(true);
    await fetch(`/api/product-categories/${deletingCatId}`, { method: "DELETE" });
    setDeletingCatId(null);
    setIsDeletingCat(false);
    fetchData();
  };

  const createInlineCat = async () => {
    if (!inlineCatName.trim()) return;
    setSavingInlineCat(true);
    try {
      const res = await fetch("/api/product-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: inlineCatName.trim(), color: inlineCatColor }),
      });
      if (res.ok) {
        const newCat = await res.json();
        setCategories((prev) => [...prev, newCat]);
        setValue("categoryId", newCat.id);
        setShowInlineCatForm(false);
        setInlineCatName("");
        setInlineCatColor("#6B7280");
      }
    } finally {
      setSavingInlineCat(false);
    }
  };

  const watchedIngredients = watch("ingredients");
  const watchedPreparations = watch("preparations");
  const watchedSalePrice = watch("salePrice");
  const watchedImageUrl = watch("imageUrl");

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

  const stats = useMemo(() => {
    const active = products.filter((p) => p.isActive);
    return {
      total: active.length,
      withBom: active.filter((p) => p.ingredients.length + (p.preparations ?? []).length > 0).length,
      inactive: products.filter((p) => !p.isActive).length,
    };
  }, [products]);

  const visible = useMemo(() => {
    return products.filter((p) => {
      if (!showInactive && !p.isActive) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !(p.sku?.toLowerCase().includes(q))) return false;
      }
      if (filterCategoryId === "none") return !p.categoryId;
      if (filterCategoryId !== "all") return p.categoryId === filterCategoryId;
      return true;
    });
  }, [products, showInactive, search, filterCategoryId]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4" data-tour="products-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Productos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Menú y recetas del negocio</p>
          <HelpButton tutorialSlug="productos" className="mt-1" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <SecondaryBtn onClick={() => downloadExcel("/api/products?format=xlsx", "productos.xlsx")}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Exportar
          </SecondaryBtn>
          <span data-tour="products-import">
          <ImportButton
            endpoint="/api/products/import"
            templateHeaders={["Nombre", "SKU", "Precio de Venta", "Moneda"]}
            templateExampleRow={["Pizza Mozzarella", "PIZ-001", 2500, "ARS"]}
            onSuccess={fetchData}
          />
          </span>
          <SecondaryBtn onClick={openCreateCat}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
            </svg>
            Categorías
          </SecondaryBtn>
          <span data-tour="new-product-btn"><PrimaryBtn onClick={openCreate}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nuevo producto
          </PrimaryBtn></span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(15,47,38,0.08)" }}>
            <svg className="w-5 h-5" style={{ color: BRAND }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
            </svg>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-xs text-gray-500 font-medium">Activos</p>
          </div>
        </div>
        <div className={`bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3 ${stats.withBom > 0 ? "border border-emerald-200" : "border border-gray-200"}`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${stats.withBom > 0 ? "bg-emerald-50" : "bg-gray-50"}`}>
            <svg className={`w-5 h-5 ${stats.withBom > 0 ? "text-emerald-500" : "text-gray-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className={`text-2xl font-bold ${stats.withBom > 0 ? "text-emerald-600" : "text-gray-900"}`}>{stats.withBom}</p>
            <p className="text-xs text-gray-500 font-medium">Con receta</p>
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
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-wrap gap-3 items-center" data-tour="products-filter">
        <div className="relative flex-1 min-w-48">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o SKU..."
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

        {categories.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setFilterCategoryId("all")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterCategoryId === "all" ? "text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
              style={filterCategoryId === "all" ? { backgroundColor: BRAND } : {}}
            >
              Todos
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setFilterCategoryId(filterCategoryId === cat.id ? "all" : cat.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterCategoryId === cat.id ? "text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                style={filterCategoryId === cat.id ? { backgroundColor: cat.color } : {}}
              >
                {cat.name}
              </button>
            ))}
            <button
              onClick={() => setFilterCategoryId(filterCategoryId === "none" ? "all" : "none")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterCategoryId === "none" ? "text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
              style={filterCategoryId === "none" ? { backgroundColor: BRAND } : {}}
            >
              Sin categoría
            </button>
          </div>
        )}

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
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden" data-tour="products-table">
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
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
            </svg>
            <p className="text-sm font-medium text-gray-500">No hay productos</p>
            <p className="text-xs mt-1">Creá uno nuevo para empezar</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid #f3f4f6", backgroundColor: "#fafafa" }}>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">Producto</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Precio</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Costo / Margen</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Receta</th>
                <th className="px-4 py-3 w-24" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {visible.map((product) => {
                const cost = parseFloat(product.costPrice ?? "0");
                const sale = parseFloat(product.salePrice);
                const margin = cost > 0 && sale > 0 ? ((sale - cost) / sale) * 100 : null;
                const bomCount = product.ingredients.length + (product.preparations ?? []).length;

                return (
                  <tr key={product.id} className={`group transition-colors hover:bg-gray-50/60 ${!product.isActive ? "opacity-50" : ""}`}>
                    {/* Name */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt={product.name} className="w-9 h-9 rounded-xl object-cover shrink-0 border border-gray-100" />
                        ) : (
                          <div
                            className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center text-xs font-bold uppercase"
                            style={
                              product.category
                                ? { backgroundColor: product.category.color + "22", color: product.category.color }
                                : { backgroundColor: "rgba(15,47,38,0.08)", color: BRAND }
                            }
                          >
                            {product.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-gray-900 leading-tight">{product.name}</p>
                            {product.sku && <span className="text-xs text-gray-400 font-mono">{product.sku}</span>}
                            {product.category && (
                              <span
                                className="inline-flex items-center px-1.5 py-0 rounded text-xs font-medium text-white"
                                style={{ backgroundColor: product.category.color }}
                              >
                                {product.category.name}
                              </span>
                            )}
                            {!product.isActive && <span className="text-xs text-gray-400">Inactivo</span>}
                          </div>
                          {product.description && (
                            <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{product.description}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Precio */}
                    <td className="px-4 py-3.5 hidden sm:table-cell">
                      <span className="text-sm font-semibold text-gray-900">{formatCurrency(product.salePrice, product.currency)}</span>
                    </td>

                    {/* Costo / Margen */}
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      {cost > 0 ? (
                        <div>
                          <p className="text-sm text-gray-500">{formatCurrency(product.costPrice, product.currency)}</p>
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

                    {/* Receta */}
                    <td className="px-4 py-3.5 hidden sm:table-cell">
                      {bomCount > 0 ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {product.ingredients.length > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600">
                              {product.ingredients.length} ing.
                            </span>
                          )}
                          {(product.preparations ?? []).length > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                              {product.preparations.length} prep.
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-300 text-sm">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEdit(product)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                          title="Editar"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                          </svg>
                        </button>
                        {product.isActive && (
                          <button
                            onClick={() => setDeletingId(product.id)}
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

      {/* Product Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingItem ? "Editar producto" : "Nuevo producto"} size="xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <Input label="Nombre *" {...register("name", { required: "Nombre requerido" })} error={errors.name?.message} />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Input label="SKU" {...register("sku")} placeholder="Opcional" />
            <div>
              <Input
                label="Precio de venta"
                type="number"
                step="0.01"
                {...register("salePrice", { valueAsNumber: true })}
              />
              {computedCost > 0 && (
                <p className="text-xs mt-1 text-gray-500">
                  Costo: {formatCurrency(computedCost.toFixed(2), "ARS")}
                  {formMargin !== null && (
                    <span className={`ml-2 font-semibold ${formMargin >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                      ({formMargin >= 0 ? "+" : ""}{formMargin.toFixed(1)}%)
                    </span>
                  )}
                </p>
              )}
            </div>
            <Select label="Moneda" {...register("currency")}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-700">Categoría</span>
                <button
                  type="button"
                  onClick={() => { setShowInlineCatForm((v) => !v); setInlineCatName(""); setInlineCatColor("#6B7280"); }}
                  className="inline-flex items-center gap-0.5 text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Nueva
                </button>
              </div>
              <Select {...register("categoryId")}>
                <option value="">Sin categoría</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </Select>
              {showInlineCatForm && (
                <div className="mt-2 p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                  <input
                    type="text"
                    value={inlineCatName}
                    onChange={(e) => setInlineCatName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); createInlineCat(); } }}
                    placeholder="Nombre de categoría"
                    autoFocus
                    className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setInlineCatColor(c)}
                        className="w-5 h-5 rounded-full border-2 transition-all"
                        style={{ backgroundColor: c, borderColor: inlineCatColor === c ? "#111" : "transparent" }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-0.5">
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: inlineCatColor }}
                    >
                      {inlineCatName || "Vista previa"}
                    </span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setShowInlineCatForm(false)}
                        className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={createInlineCat}
                        disabled={savingInlineCat || !inlineCatName.trim()}
                        className="text-xs font-semibold text-white px-2.5 py-1 rounded-lg disabled:opacity-60 transition-colors"
                        style={{ backgroundColor: BRAND }}
                      >
                        {savingInlineCat ? "..." : "Crear"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Description + Image */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Descripción</label>
              <textarea
                {...register("description")}
                rows={2}
                placeholder="Ej: Hamburguesa con queso cheddar..."
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Imagen</label>
              {watchedImageUrl ? (
                <div className="flex items-center gap-3">
                  <img src={watchedImageUrl} alt="preview" className="w-12 h-12 rounded-xl object-cover border border-gray-200 shrink-0" />
                  <div className="space-y-1">
                    <label className="cursor-pointer block">
                      <span className="inline-flex items-center px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors">
                        {uploadingImage ? "Subiendo..." : "Cambiar"}
                      </span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
                    </label>
                    <button type="button" onClick={() => setValue("imageUrl", null)} className="block text-xs text-red-500 hover:text-red-700">Quitar</button>
                  </div>
                </div>
              ) : (
                <label className="cursor-pointer block">
                  <div className="flex flex-col items-center justify-center h-16 rounded-xl border-2 border-dashed border-gray-200 hover:border-gray-300 transition-colors">
                    <svg className="w-5 h-5 text-gray-300 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909" />
                    </svg>
                    <span className="text-xs text-gray-400">{uploadingImage ? "Subiendo..." : "Subir imagen"}</span>
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
                </label>
              )}
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
                  const bom = watchedIngredients[index];
                  const selIng = ingredients.find((i) => i.id === bom?.ingredientId);
                  const availableUnits = selIng ? compatibleUnits(selIng.unit) : UNITS;
                  const rowCost = (() => {
                    if (!selIng || !bom?.qty || bom.qty <= 0) return null;
                    try {
                      const effectiveQty = bom.qty * (1 + (bom.wastagePct || 0) / 100);
                      return Number(selIng.costPerUnit) * convertUnit(effectiveQty, bom.unit, selIng.unit);
                    } catch { return null; }
                  })();
                  return (
                    <div key={field.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
                      <div className="grid grid-cols-12 gap-2 items-end">
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
                      <div className="flex justify-end pr-8">
                        {rowCost !== null ? (
                          <span className="text-xs text-gray-500">
                            Costo:{" "}
                            <span className="font-semibold text-gray-700">{formatCurrency(rowCost, "ARS")}</span>
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">Costo: —</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Preparations BOM */}
          {preparations.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-700">Preparaciones en receta</h3>
                <SmallAddBtn onClick={() => appendPrep({ preparationId: "", qty: 0, unit: "UNIT", wastagePct: 0 })}>
                  Agregar preparación
                </SmallAddBtn>
              </div>
              {prepFields.length === 0 ? (
                <div className="text-center py-4 border border-dashed border-emerald-200 rounded-xl">
                  <p className="text-sm text-gray-400">Sin preparaciones. Opcional.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {prepFields.map((field, index) => {
                    const bom = watchedPreparations[index];
                    const selPrep = preparations.find((p) => p.id === bom?.preparationId);
                    const availableUnits = selPrep ? compatibleUnits(selPrep.unit) : UNITS;
                    const rowCost = (() => {
                      if (!selPrep || !bom?.qty || bom.qty <= 0) return null;
                      try {
                        const effectiveQty = bom.qty * (1 + (bom.wastagePct || 0) / 100);
                        return Number(selPrep.costPrice) * convertUnit(effectiveQty, bom.unit, selPrep.unit);
                      } catch { return null; }
                    })();
                    return (
                      <div key={field.id} className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-2">
                        <div className="grid grid-cols-12 gap-2 items-end">
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
                            >
                              <option value="">Seleccionar...</option>
                              {preparations.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </Select>
                          </div>
                          <div className="col-span-2">
                            <Input label="Cant." type="number" step="0.001" {...register(`preparations.${index}.qty`, { valueAsNumber: true, min: 0.001 })} />
                          </div>
                          <div className="col-span-2">
                            <Select label="Unidad" {...register(`preparations.${index}.unit`)}>
                              {availableUnits.map((u) => <option key={u} value={u}>{u}</option>)}
                            </Select>
                          </div>
                          <div className="col-span-3">
                            <Input label="Merma %" type="number" step="0.1" min="0" max="100" {...register(`preparations.${index}.wastagePct`, { valueAsNumber: true })} />
                          </div>
                          <div className="col-span-1 flex justify-center pb-1">
                            <RemoveBtn onClick={() => removePrep(index)} />
                          </div>
                        </div>
                        <div className="flex justify-end pr-8">
                          {rowCost !== null ? (
                            <span className="text-xs text-gray-500">
                              Costo:{" "}
                              <span className="font-semibold text-emerald-700">{formatCurrency(rowCost, "ARS")}</span>
                            </span>
                          ) : (
                            <span className="text-xs text-gray-300">Costo: —</span>
                          )}
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
              {saving ? "Guardando..." : editingItem ? "Guardar cambios" : "Crear producto"}
            </PrimaryBtn>
          </div>
        </form>
      </Modal>

      {/* Category management modal */}
      <Modal isOpen={isCatModalOpen} onClose={() => setIsCatModalOpen(false)} title="Gestionar categorías" size="md">
        <div className="space-y-4">
          <div className="space-y-3 p-4 bg-gray-50 rounded-2xl">
            <h3 className="text-sm font-semibold text-gray-700">{editingCat ? "Editar categoría" : "Nueva categoría"}</h3>
            <Input
              label="Nombre"
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              placeholder="Ej: Bebidas, Hamburguesas..."
            />
            <div>
              <p className="text-xs font-medium text-gray-600 mb-2">Color</p>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCatColor(c)}
                    className="w-7 h-7 rounded-full border-2 transition-all"
                    style={{ backgroundColor: c, borderColor: catColor === c ? "#111" : "transparent" }}
                  />
                ))}
                <input
                  type="color"
                  value={catColor}
                  onChange={(e) => setCatColor(e.target.value)}
                  className="w-7 h-7 rounded-full cursor-pointer border border-gray-300"
                  title="Color personalizado"
                />
              </div>
              <div className="mt-2">
                <span
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-white"
                  style={{ backgroundColor: catColor }}
                >
                  {catName || "Vista previa"}
                </span>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              {editingCat && (
                <SecondaryBtn onClick={() => { setEditingCat(null); setCatName(""); setCatColor("#6B7280"); }}>
                  Cancelar
                </SecondaryBtn>
              )}
              <PrimaryBtn onClick={saveCat} disabled={savingCat || !catName.trim()}>
                {savingCat ? "Guardando..." : editingCat ? "Guardar" : "Crear"}
              </PrimaryBtn>
            </div>
          </div>

          {categories.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">Categorías existentes</p>
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <span className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="text-sm font-medium text-gray-800">{cat.name}</span>
                    {cat._count && (
                      <span className="text-xs text-gray-400">{cat._count.products} prod.</span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEditCat(cat)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                      title="Editar"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setDeletingCatId(cat.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Eliminar"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
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

      <ConfirmDialog
        isOpen={!!deletingCatId}
        onClose={() => setDeletingCatId(null)}
        onConfirm={handleDeleteCat}
        title="Eliminar categoría"
        message="Los productos de esta categoría quedarán sin categoría asignada."
        confirmLabel="Eliminar"
        isLoading={isDeletingCat}
      />
    </div>
  );
}
