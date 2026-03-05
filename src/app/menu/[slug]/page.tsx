"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { formatCurrency } from "@/utils/currency";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PaymentMethodConfig {
  enabled: boolean;
  alias?: string;
  bank?: string;
  holder?: string;
  link?: string;
  adjustmentType?: "discount" | "surcharge" | "none";
  adjustmentPct?: number;
}

interface OrgData {
  name: string;
  slug: string;
  modalities: { salon: boolean; delivery: boolean; takeaway: boolean } | null;
  paymentMethods: Record<string, PaymentMethodConfig> | null;
  deliveryFee: number | null;
  colorPrimary: string | null;
  colorSecondary: string | null;
  colorAccent: string | null;
  coverImageUrl: string | null;
}

interface MenuProduct {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  salePrice: number;
  currency: string;
  categoryId: string | null;
}

interface MenuCategory {
  id: string | null;
  name: string;
  color: string;
  products: MenuProduct[];
}

interface CartItem {
  productId: string;
  name: string;
  price: number;
  currency: string;
  quantity: number;
}

type OrderType = "SALON" | "TAKEAWAY" | "DELIVERY";
type Step = "menu" | "checkout" | "success";

// ── Helpers ───────────────────────────────────────────────────────────────────

const DEFAULT_MODALITIES = { salon: true, delivery: false, takeaway: false };

const MODALITY_LABELS: Record<OrderType, string> = {
  SALON: "Mesa / Salón",
  TAKEAWAY: "Para llevar",
  DELIVERY: "Delivery",
};

const MODALITY_ICONS: Record<OrderType, React.ReactNode> = {
  SALON: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13h2v7H3v-7zm4-4h2v11H7V9zm4-4h2v15h-2V5zm4 2h2v13h-2V7zm4 4h2v7h-2v-7z" />
    </svg>
  ),
  TAKEAWAY: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
  ),
  DELIVERY: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
  ),
};

const PAYMENT_LABELS: Record<string, string> = {
  EFECTIVO: "Efectivo",
  TRANSFERENCIA: "Transferencia",
  ONLINE: "Mercado Pago",
  DEBITO: "Débito",
  CREDITO: "Crédito",
};

const PAYMENT_ICONS: Record<string, React.ReactNode> = {
  EFECTIVO: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  TRANSFERENCIA: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
  ),
  ONLINE: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ),
  DEBITO: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  ),
  CREDITO: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  ),
};

function getEnabledModalities(modalities: OrgData["modalities"]): OrderType[] {
  const m = modalities ?? DEFAULT_MODALITIES;
  const result: OrderType[] = [];
  if (m.salon) result.push("SALON");
  if (m.takeaway) result.push("TAKEAWAY");
  if (m.delivery) result.push("DELIVERY");
  return result.length > 0 ? result : ["SALON"];
}

function getEnabledPayments(paymentMethods: OrgData["paymentMethods"]): string[] {
  if (!paymentMethods) return ["EFECTIVO"];
  return Object.entries(paymentMethods)
    .filter(([, cfg]) => cfg.enabled)
    .map(([key]) => key.toUpperCase());
}

function getMethodConfig(paymentMethods: OrgData["paymentMethods"], displayKey: string): PaymentMethodConfig | null {
  if (!paymentMethods) return null;
  for (const [k, v] of Object.entries(paymentMethods)) {
    if (k.toUpperCase() === displayKey) return v;
  }
  return null;
}

// Lighten a hex color by mixing with white
function lighten(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lr = Math.round(r + (255 - r) * amount);
  const lg = Math.round(g + (255 - g) * amount);
  const lb = Math.round(b + (255 - b) * amount);
  return `rgb(${lr},${lg},${lb})`;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PublicMenuPage() {
  const { slug } = useParams<{ slug: string }>();
  const categoryRefs = useRef<Record<string, HTMLElement | null>>({});

  const [orgData, setOrgData] = useState<OrgData | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [orderType, setOrderType] = useState<OrderType>("SALON");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [step, setStep] = useState<Step>("menu");

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [selectedMethods, setSelectedMethods] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);

  const fetchMenu = useCallback(async () => {
    try {
      const res = await fetch(`/api/public/${slug}`);
      if (!res.ok) { setError("Local no encontrado"); return; }
      const data = await res.json();
      setOrgData(data.org);
      setCategories(data.categories);
      if (data.categories.length > 0) setActiveCategory(data.categories[0].id ?? "otros");
      const enabledModalities = getEnabledModalities(data.org.modalities);
      setOrderType(enabledModalities[0]);
    } catch {
      setError("Error al cargar el menú");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { fetchMenu(); }, [fetchMenu]);

  // ── Cart helpers ──────────────────────────────────────────────────────────

  const addToCart = (product: MenuProduct) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) return prev.map((i) => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { productId: product.id, name: product.name, price: product.salePrice, currency: product.currency, quantity: 1 }];
    });
  };

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) => prev.map((i) => i.productId === productId ? { ...i, quantity: i.quantity + delta } : i).filter((i) => i.quantity > 0));
  };

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const deliveryFee = orderType === "DELIVERY" ? (orgData?.deliveryFee ?? 0) : 0;
  const orderTotal = cartTotal + deliveryFee;

  // ── Payment helpers ───────────────────────────────────────────────────────

  const enabledPayments = orgData ? getEnabledPayments(orgData.paymentMethods) : ["EFECTIVO"];

  const togglePayment = (method: string) => {
    setSelectedMethods((prev) =>
      prev.includes(method) ? prev.filter((m) => m !== method) : [...prev, method]
    );
  };

  // ── Category scroll ───────────────────────────────────────────────────────

  const scrollToCategory = (catKey: string) => {
    setActiveCategory(catKey);
    const el = categoryRefs.current[catKey];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const submitOrder = async () => {
    setSubmitAttempted(true);
    if (!customerName.trim() || cart.length === 0) return;
    if (orderType === "DELIVERY" && !customerAddress.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/public/${slug}/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim() || null,
          customerAddress: orderType === "DELIVERY" ? customerAddress.trim() || null : null,
          orderType,
          payments: selectedMethods.map((m) => ({ paymentMethod: m })),
          items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          comboItems: [],
        }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error ?? "Error al enviar pedido"); return; }
      setOrderId(data.id);
      setStep("success");
    } catch {
      alert("Error de conexión");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Colors ────────────────────────────────────────────────────────────────

  const primary = orgData?.colorPrimary ?? "#111827";
  const primaryLight = primary.startsWith("#") && primary.length === 7 ? lighten(primary, 0.88) : "#F3F4F6";

  // ── Loading / Error ───────────────────────────────────────────────────────

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#E5E7EB", borderTopColor: "#111827" }} />
        <p className="text-sm text-gray-400">Cargando menú...</p>
      </div>
    </div>
  );

  if (error || !orgData) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <p className="text-5xl mb-4">🍽️</p>
        <p className="text-xl font-bold text-gray-800 mb-2">Menú no disponible</p>
        <p className="text-gray-400 text-sm">{error ?? "No pudimos encontrar este local."}</p>
      </div>
    </div>
  );

  const enabledModalities = getEnabledModalities(orgData.modalities);

  // ── Success screen ────────────────────────────────────────────────────────

  if (step === "success") return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-xs w-full">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 shadow-lg"
          style={{ backgroundColor: primary }}
        >
          <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">¡Pedido enviado!</h1>
        <p className="text-gray-400 text-sm mb-1">Pedido <span className="font-mono font-semibold text-gray-600">#{orderId?.slice(-6).toUpperCase()}</span></p>
        <p className="text-gray-400 text-sm mb-8">El local lo confirmará en breve.</p>
        <div
          className="rounded-2xl p-4 mb-6 text-left space-y-1"
          style={{ backgroundColor: primaryLight }}
        >
          {cart.map((item) => (
            <div key={item.productId} className="flex justify-between text-sm">
              <span className="text-gray-700">{item.name} × {item.quantity}</span>
              <span className="font-medium text-gray-900">{formatCurrency(item.price * item.quantity, item.currency)}</span>
            </div>
          ))}
          <div className="border-t border-black/5 pt-1 mt-1 flex justify-between font-semibold text-sm">
            <span>Total</span>
            <span>{formatCurrency(orderTotal, "ARS")}</span>
          </div>
        </div>
        <button
          onClick={() => { setCart([]); setSelectedMethods([]); setCustomerName(""); setCustomerPhone(""); setCustomerAddress(""); setStep("menu"); }}
          className="w-full py-3 rounded-2xl text-white font-semibold text-sm shadow-md transition-opacity hover:opacity-85 active:opacity-70"
          style={{ backgroundColor: primary }}
        >
          Hacer otro pedido
        </button>
      </div>
    </div>
  );

  // ── Main menu layout ──────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Cover + Header */}
      <div className="relative">
        {orgData.coverImageUrl ? (
          <>
            <div className="w-full h-44 overflow-hidden">
              <img src={orgData.coverImageUrl} alt={orgData.name} className="w-full h-full object-cover" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
              <h1 className="text-2xl font-bold text-white drop-shadow-md">{orgData.name}</h1>
            </div>
          </>
        ) : (
          <div className="px-4 py-5" style={{ backgroundColor: primary }}>
            <h1 className="text-2xl font-bold text-white">{orgData.name}</h1>
          </div>
        )}
      </div>

      {/* Sticky nav: modality + category tabs */}
      <div className="sticky top-0 z-30 bg-white shadow-sm">
        {/* Modality selector */}
        {enabledModalities.length > 1 && (
          <div className="px-4 pt-3 pb-0 border-b border-gray-100">
            <div className="flex gap-1">
              {enabledModalities.map((m) => (
                <button
                  key={m}
                  onClick={() => setOrderType(m)}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2"
                  style={
                    orderType === m
                      ? { color: primary, borderColor: primary, backgroundColor: primaryLight }
                      : { color: "#6B7280", borderColor: "transparent", backgroundColor: "transparent" }
                  }
                >
                  <span style={{ color: orderType === m ? primary : "#9CA3AF" }}>{MODALITY_ICONS[m]}</span>
                  {MODALITY_LABELS[m]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Category tabs */}
        {categories.length > 1 && (
          <div className="flex overflow-x-auto gap-1 px-3 py-2 scrollbar-none">
            {categories.map((cat) => {
              const key = cat.id ?? "otros";
              const isActive = activeCategory === key;
              return (
                <button
                  key={key}
                  onClick={() => scrollToCategory(key)}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap"
                  style={
                    isActive
                      ? { backgroundColor: primary, color: "#fff" }
                      : { backgroundColor: "#F3F4F6", color: "#374151" }
                  }
                >
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: isActive ? "rgba(255,255,255,0.6)" : cat.color }} />
                  {cat.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Products */}
      <div className="max-w-2xl mx-auto px-3 py-5 pb-32 space-y-8">
        {categories.map((cat) => {
          const key = cat.id ?? "otros";
          return (
            <section
              key={key}
              ref={(el) => { categoryRefs.current[key] = el; }}
            >
              {/* Category heading */}
              <div className="flex items-center gap-2 mb-3 px-1">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">{cat.name}</h2>
                <div className="flex-1 h-px bg-gray-100" />
              </div>

              <div className="space-y-2">
                {cat.products.map((product) => {
                  const inCart = cart.find((i) => i.productId === product.id);
                  return (
                    <div
                      key={product.id}
                      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex transition-shadow hover:shadow-md"
                    >
                      {/* Info */}
                      <div className="flex-1 p-3.5 flex flex-col justify-between min-w-0">
                        <div className="mb-3">
                          <p className="font-semibold text-gray-900 text-sm leading-snug">{product.name}</p>
                          {product.description && (
                            <p className="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed">{product.description}</p>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-base font-bold" style={{ color: primary }}>
                            {formatCurrency(product.salePrice, product.currency)}
                          </span>
                          {inCart ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => updateQty(product.id, -1)}
                                className="w-7 h-7 rounded-full flex items-center justify-center text-base font-bold transition-opacity hover:opacity-80"
                                style={{ backgroundColor: primary, color: "#fff" }}
                              >
                                −
                              </button>
                              <span className="text-sm font-bold w-5 text-center text-gray-900">{inCart.quantity}</span>
                              <button
                                onClick={() => updateQty(product.id, 1)}
                                className="w-7 h-7 rounded-full flex items-center justify-center text-base font-bold transition-opacity hover:opacity-80"
                                style={{ backgroundColor: primary, color: "#fff" }}
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => addToCart(product)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all hover:opacity-85 active:scale-95"
                              style={{ backgroundColor: primaryLight, color: primary }}
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                              </svg>
                              Agregar
                            </button>
                          )}
                        </div>
                      </div>
                      {/* Image */}
                      {product.imageUrl && (
                        <div className="w-28 flex-shrink-0">
                          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        {categories.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🍽️</p>
            <p className="text-gray-400 text-sm">No hay productos disponibles por el momento.</p>
          </div>
        )}
      </div>

      {/* Cart FAB */}
      {cartCount > 0 && step === "menu" && !cartOpen && (
        <div className="fixed bottom-5 left-0 right-0 flex justify-center px-4 z-40">
          <button
            onClick={() => setCartOpen(true)}
            className="flex items-center justify-between gap-3 text-white px-5 py-3.5 rounded-2xl shadow-xl w-full max-w-sm font-semibold text-sm transition-all hover:opacity-90 active:scale-95"
            style={{ backgroundColor: primary }}
          >
            <span
              className="flex items-center justify-center w-6 h-6 rounded-lg text-xs font-bold"
              style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
            >
              {cartCount}
            </span>
            <span className="flex-1 text-center">Ver pedido</span>
            <span className="font-bold">{formatCurrency(orderTotal, "ARS")}</span>
          </button>
        </div>
      )}

      {/* Cart drawer */}
      {cartOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setCartOpen(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>
            <div className="flex items-center justify-between px-5 py-3 shrink-0">
              <h2 className="font-bold text-gray-900 text-base">Tu pedido</h2>
              <button onClick={() => setCartOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-lg font-bold hover:bg-gray-200 transition-colors">×</button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-2 space-y-2">
              {cart.map((item) => (
                <div key={item.productId} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                    <p className="text-xs text-gray-400">{formatCurrency(item.price, item.currency)} c/u</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => updateQty(item.productId, -1)} className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm transition-opacity hover:opacity-80" style={{ backgroundColor: primary, color: "#fff" }}>−</button>
                    <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                    <button onClick={() => updateQty(item.productId, 1)} className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm transition-opacity hover:opacity-80" style={{ backgroundColor: primary, color: "#fff" }}>+</button>
                  </div>
                  <span className="text-sm font-bold text-gray-900 w-16 text-right">{formatCurrency(item.price * item.quantity, item.currency)}</span>
                </div>
              ))}
            </div>

            <div className="px-5 pb-6 pt-3 shrink-0 border-t border-gray-50 space-y-3">
              {deliveryFee > 0 && (
                <div className="flex justify-between text-sm text-gray-400">
                  <span>Costo de envío</span>
                  <span>{formatCurrency(deliveryFee, "ARS")}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-gray-900 text-base">
                <span>Total</span>
                <span>{formatCurrency(orderTotal, "ARS")}</span>
              </div>
              <button
                onClick={() => { setCartOpen(false); setStep("checkout"); }}
                className="w-full py-4 rounded-2xl text-white font-bold text-sm shadow-md transition-opacity hover:opacity-90 active:opacity-75"
                style={{ backgroundColor: primary }}
              >
                Ir a pagar →
              </button>
            </div>
          </div>
        </>
      )}

      {/* Checkout screen */}
      {step === "checkout" && (
        <div className="fixed inset-0 z-50 bg-gray-50 flex flex-col">

          {/* Sticky header */}
          <div className="bg-white border-b border-gray-100 shadow-sm shrink-0">
            <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
              <button
                onClick={() => { setStep("menu"); setSubmitAttempted(false); }}
                className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="flex-1">
                <h2 className="text-base font-bold text-gray-900">Finalizar pedido</h2>
              </div>
              <span
                className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ backgroundColor: primaryLight, color: primary }}
              >
                {MODALITY_LABELS[orderType]}
              </span>
            </div>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-md mx-auto px-4 py-4 space-y-3 pb-32">

              {/* ── 1. Tus datos ── */}
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-4 pt-4 pb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ backgroundColor: primary }}>1</span>
                  <h3 className="text-sm font-bold text-gray-800">Tus datos</h3>
                </div>

                {/* Name */}
                <div className="px-4 pb-1">
                  <div className={`flex items-center gap-3 border rounded-xl px-3 py-2.5 transition-colors ${submitAttempted && !customerName.trim() ? "border-red-300 bg-red-50" : "border-gray-200 focus-within:border-gray-400"}`}>
                    <svg className="w-4 h-4 shrink-0 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <input
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Tu nombre *"
                      autoComplete="name"
                      className="flex-1 text-sm bg-transparent focus:outline-none placeholder-gray-300 text-gray-900"
                    />
                    {customerName.trim() && (
                      <svg className="w-4 h-4 shrink-0" style={{ color: primary }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  {submitAttempted && !customerName.trim() && (
                    <p className="text-xs text-red-500 mt-1 ml-1">Ingresá tu nombre para continuar</p>
                  )}
                </div>

                {/* Phone */}
                <div className="px-4 pb-1 pt-2">
                  <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-3 py-2.5 focus-within:border-gray-400 transition-colors">
                    <svg className="w-4 h-4 shrink-0 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <input
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="Teléfono (opcional)"
                      type="tel"
                      autoComplete="tel"
                      className="flex-1 text-sm bg-transparent focus:outline-none placeholder-gray-300 text-gray-900"
                    />
                  </div>
                </div>

                {/* Address (delivery only) */}
                {orderType === "DELIVERY" && (
                  <div className="px-4 pb-1 pt-2">
                    <div className={`flex items-start gap-3 border rounded-xl px-3 py-2.5 transition-colors ${submitAttempted && !customerAddress.trim() ? "border-red-300 bg-red-50" : "border-gray-200 focus-within:border-gray-400"}`}>
                      <svg className="w-4 h-4 shrink-0 text-gray-300 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <textarea
                        value={customerAddress}
                        onChange={(e) => setCustomerAddress(e.target.value)}
                        placeholder="Dirección de entrega *"
                        rows={2}
                        autoComplete="street-address"
                        className="flex-1 text-sm bg-transparent focus:outline-none placeholder-gray-300 text-gray-900 resize-none"
                      />
                      {customerAddress.trim() && (
                        <svg className="w-4 h-4 shrink-0 mt-0.5" style={{ color: primary }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    {submitAttempted && !customerAddress.trim() && (
                      <p className="text-xs text-red-500 mt-1 ml-1">Ingresá la dirección de entrega</p>
                    )}
                  </div>
                )}
                <div className="h-4" />
              </div>

              {/* ── 2. Forma de pago ── */}
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-4 pt-4 pb-3 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ backgroundColor: primary }}>2</span>
                  <h3 className="text-sm font-bold text-gray-800">Forma de pago</h3>
                  <span className="text-xs text-gray-400 ml-auto">¿Cómo vas a pagar?</span>
                </div>

                {/* Method grid */}
                <div className="px-4 grid grid-cols-2 gap-2 pb-4">
                  {enabledPayments.map((method) => {
                    const selected = selectedMethods.includes(method);
                    const cfg = getMethodConfig(orgData?.paymentMethods ?? null, method);
                    const hasDiscount = cfg?.adjustmentType === "discount" && cfg.adjustmentPct;
                    const hasSurcharge = cfg?.adjustmentType === "surcharge" && cfg.adjustmentPct;
                    return (
                      <div key={method} className="flex flex-col gap-1.5">
                        <button
                          onClick={() => togglePayment(method)}
                          className="relative flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all font-semibold text-xs"
                          style={
                            selected
                              ? { backgroundColor: primaryLight, borderColor: primary, color: primary }
                              : { backgroundColor: "#F9FAFB", borderColor: "#E5E7EB", color: "#6B7280" }
                          }
                        >
                          {selected && (
                            <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: primary }}>
                              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </span>
                          )}
                          <span style={{ color: selected ? primary : "#9CA3AF" }}>
                            {PAYMENT_ICONS[method] ?? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                          </span>
                          <span>{PAYMENT_LABELS[method] ?? method}</span>
                          {hasDiscount && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 -mt-0.5">
                              {cfg.adjustmentPct}% OFF
                            </span>
                          )}
                          {hasSurcharge && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 -mt-0.5">
                              +{cfg.adjustmentPct}%
                            </span>
                          )}
                        </button>

                        {/* Transfer details box */}
                        {selected && cfg && (cfg.alias || cfg.bank || cfg.holder) && (
                          <div className="rounded-xl px-3 py-2.5 space-y-1 text-xs" style={{ backgroundColor: primaryLight }}>
                            {cfg.alias && (
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-gray-500">Alias</span>
                                <span className="font-bold text-gray-900 font-mono">{cfg.alias}</span>
                              </div>
                            )}
                            {cfg.bank && (
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-gray-500">Banco</span>
                                <span className="font-semibold text-gray-800">{cfg.bank}</span>
                              </div>
                            )}
                            {cfg.holder && (
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-gray-500">Titular</span>
                                <span className="font-semibold text-gray-800">{cfg.holder}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── 3. Tu pedido ── */}
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <button
                  onClick={() => setSummaryOpen((v) => !v)}
                  className="w-full px-4 pt-4 pb-4 flex items-center gap-2 text-left"
                >
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ backgroundColor: primary }}>3</span>
                  <h3 className="text-sm font-bold text-gray-800 flex-1">Tu pedido</h3>
                  <span className="text-xs text-gray-400 mr-1">{cartCount} {cartCount === 1 ? "ítem" : "ítems"}</span>
                  <svg
                    className="w-4 h-4 text-gray-400 transition-transform"
                    style={{ transform: summaryOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {summaryOpen && (
                  <div className="px-4 pb-3 space-y-2 border-t border-gray-50 pt-2">
                    {cart.map((item) => (
                      <div key={item.productId} className="flex items-center justify-between gap-3 py-1">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span
                            className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                            style={{ backgroundColor: primaryLight, color: primary }}
                          >
                            {item.quantity}
                          </span>
                          <span className="text-sm text-gray-700 truncate">{item.name}</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-900 flex-shrink-0">{formatCurrency(item.price * item.quantity, item.currency)}</span>
                      </div>
                    ))}
                    {deliveryFee > 0 && (
                      <div className="flex justify-between text-xs text-gray-400 pt-1 border-t border-gray-50">
                        <span>Envío</span>
                        <span>{formatCurrency(deliveryFee, "ARS")}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="px-4 py-3 border-t border-gray-50 flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-900">Total</span>
                  <span className="text-base font-bold" style={{ color: primary }}>{formatCurrency(orderTotal, "ARS")}</span>
                </div>
              </div>

            </div>
          </div>

          {/* Sticky bottom CTA */}
          <div className="shrink-0 bg-white border-t border-gray-100 px-4 py-4 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
            <div className="max-w-md mx-auto">
              <button
                onClick={submitOrder}
                disabled={submitting}
                className="w-full py-4 rounded-2xl text-white font-bold text-sm shadow-md transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ backgroundColor: primary }}
              >
                {submitting ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Enviando...
                  </>
                ) : (
                  <>
                    Confirmar pedido
                    <span className="opacity-70">·</span>
                    <span>{formatCurrency(orderTotal, "ARS")}</span>
                  </>
                )}
              </button>
              <p className="text-center text-xs text-gray-300 mt-2">Powered by StockQuickly</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
