"use client";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams } from "next/navigation";
import { formatCurrency } from "@/utils/currency";
import { ExtrasModal, getExtrasForProduct, type ExtraConfig } from "@/components/extras/ExtrasModal";
import { findBestDiscount, type DiscountConfig, type DiscountContext } from "@/lib/pricingUtils";

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
  whatsapp: string | null;
  phone: string | null;
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
type ZoneStatus = "idle" | "checking" | "covered" | "uncovered" | "error";

// ── Helpers ───────────────────────────────────────────────────────────────────

const DEFAULT_MODALITIES = { salon: true, delivery: false, takeaway: false };

const MODALITY_LABELS: Record<OrderType, string> = {
  SALON: "Salón",
  TAKEAWAY: "Takeaway",
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

// Maps config keys (from /config paymentMethods) → canonical method codes (same as /comandas PM_MAP)
const KEY_TO_METHOD: Record<string, string> = {
  cash:        "EFECTIVO",
  transfer:    "TRANSFERENCIA",
  mercadopago: "ONLINE",
  debit:       "DEBITO",
  credit:      "CREDITO",
};

const PAYMENT_LABELS: Record<string, string> = {
  EFECTIVO:      "Efectivo",
  TRANSFERENCIA: "Transferencia",
  ONLINE:        "Mercado Pago",
  DEBITO:        "Débito",
  CREDITO:       "Crédito",
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
    .map(([key]) => KEY_TO_METHOD[key])
    .filter(Boolean) as string[];
}

function getMethodConfig(paymentMethods: OrgData["paymentMethods"], displayKey: string): PaymentMethodConfig | null {
  if (!paymentMethods) return null;
  const configKey = Object.entries(KEY_TO_METHOD).find(([, v]) => v === displayKey)?.[0];
  if (!configKey) return null;
  return paymentMethods[configKey] ?? null;
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
  const [menuExtras,    setMenuExtras]    = useState<ExtraConfig[]>([]);
  const [menuDiscounts, setMenuDiscounts] = useState<DiscountConfig[]>([]);
  const [extrasModalProduct, setExtrasModalProduct] = useState<MenuProduct | null>(null);
  const [cartExtras, setCartExtras] = useState<{ extraId: string; quantity: number; name: string; price: number; isFree: boolean }[]>([]);
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
  const [zoneStatus, setZoneStatus] = useState<ZoneStatus>("idle");
  const [matchedZone, setMatchedZone] = useState<{ name: string; price: number } | null>(null);
  const zoneCheckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addressInputRef = useRef<HTMLInputElement>(null);
  const [suggestions, setSuggestions] = useState<{ description: string; placeId: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      if (data.extras) setMenuExtras(data.extras);
      if (data.discounts) setMenuDiscounts(data.discounts.map((d: DiscountConfig) => ({ ...d, value: Number(d.value) })));
    } catch {
      setError("Error al cargar el menú");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { fetchMenu(); }, [fetchMenu]);

  // ── Cart helpers ──────────────────────────────────────────────────────────

  const addToCart = (product: MenuProduct) => {
    const applicable = getExtrasForProduct({ id: product.id, categoryId: product.categoryId }, menuExtras);
    if (applicable.length > 0) {
      setExtrasModalProduct(product);
      return;
    }
    addToCartDirect(product, []);
  };

  const addToCartDirect = (product: MenuProduct, extras: { extraId: string; quantity: number }[]) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) return prev.map((i) => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { productId: product.id, name: product.name, price: product.salePrice, currency: product.currency, quantity: 1 }];
    });
    if (extras.length > 0) {
      setCartExtras((prev) => {
        const next = [...prev];
        for (const sel of extras) {
          const extraConfig = menuExtras.find((e) => e.id === sel.extraId);
          if (!extraConfig) continue;
          const existing = next.find((x) => x.extraId === sel.extraId);
          if (existing) { existing.quantity += sel.quantity; }
          else { next.push({ extraId: sel.extraId, quantity: sel.quantity, name: extraConfig.name, price: extraConfig.price, isFree: extraConfig.isFree }); }
        }
        return next;
      });
    }
  };

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) => prev.map((i) => i.productId === productId ? { ...i, quantity: i.quantity + delta } : i).filter((i) => i.quantity > 0));
  };

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const extrasTotal = cartExtras.reduce((s, e) => s + (e.isFree ? 0 : e.price * e.quantity), 0);
  const deliveryFee = orderType === "DELIVERY"
    ? (matchedZone !== null ? matchedZone.price : (orgData?.deliveryFee ?? 0))
    : 0;
  const subtotalBeforeDiscount = cartTotal + extrasTotal + deliveryFee;

  // Best applicable discount (real-time, depends on selected payment method)
  const bestMenuDiscount = useMemo(() => {
    if (menuDiscounts.length === 0) return null;
    const paymentMethod = selectedMethods.length === 1 ? selectedMethods[0] : undefined;
    const productIds = cart.map((i) => i.productId);
    const categoryIds = cart.map((i) => {
      const product = categories.flatMap((c) => c.products).find((p) => p.id === i.productId);
      return product?.categoryId ?? null;
    }).filter((id): id is string => id !== null);
    const ctx: DiscountContext = { now: new Date(), paymentMethod, productIds, categoryIds };
    return findBestDiscount(menuDiscounts, subtotalBeforeDiscount, ctx);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuDiscounts, selectedMethods, cart, subtotalBeforeDiscount]);
  const menuDiscountAmount = bestMenuDiscount?.amount ?? 0;

  const orderTotal = subtotalBeforeDiscount - menuDiscountAmount;

  // ── Payment helpers ───────────────────────────────────────────────────────

  const enabledPayments = orgData ? getEnabledPayments(orgData.paymentMethods) : ["EFECTIVO"];

  const togglePayment = (method: string) => {
    setSelectedMethods((prev) =>
      prev.includes(method) ? prev.filter((m) => m !== method) : [...prev, method]
    );
  };

  // Adjusted total based on single selected payment method
  const selectedMethodConfig = selectedMethods.length === 1
    ? getMethodConfig(orgData?.paymentMethods ?? null, selectedMethods[0])
    : null;
  const adjType = selectedMethodConfig?.adjustmentType;
  const adjPct  = selectedMethodConfig?.adjustmentPct ?? 0;
  const adjustedOrderTotal = selectedMethodConfig && adjType && adjType !== "none"
    ? Math.round(orderTotal * (adjType === "surcharge" ? 1 + adjPct / 100 : 1 - adjPct / 100))
    : orderTotal;
  const paymentAdjustmentAmount = adjustedOrderTotal - orderTotal; // negative=discount, positive=surcharge

  // ── Address suggestions (server-side proxy, no client-side Maps JS) ────────

  const fetchSuggestions = useCallback(async (input: string) => {
    if (input.trim().length < 3) { setSuggestions([]); setShowSuggestions(false); return; }
    try {
      const res = await fetch(`/api/public/${slug}/places-autocomplete?input=${encodeURIComponent(input)}`);
      const data = await res.json();
      setSuggestions(data.predictions ?? []);
      setShowSuggestions((data.predictions ?? []).length > 0);
    } catch {
      setSuggestions([]);
    }
  }, [slug]);

  // ── Zone check ────────────────────────────────────────────────────────────

  const checkZone = useCallback(async (addr: string) => {
    if (!addr.trim()) { setZoneStatus("idle"); setMatchedZone(null); return; }
    setZoneStatus("checking");
    try {
      const res = await fetch(`/api/public/${slug}/zone-check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: addr }),
      });
      const data = await res.json();
      if (data.covered && data.zone) {
        setZoneStatus("covered");
        setMatchedZone({ name: data.zone.name, price: Number(data.zone.price) });
      } else if (data.covered && !data.zone) {
        // No zones configured — always covered with flat fee
        setZoneStatus("covered");
        setMatchedZone(null);
      } else {
        setZoneStatus("uncovered");
        setMatchedZone(null);
      }
    } catch {
      setZoneStatus("error");
      setMatchedZone(null);
    }
  }, [slug]);

  // Reset zone state when switching away from DELIVERY
  useEffect(() => {
    if (orderType !== "DELIVERY") {
      setZoneStatus("idle");
      setMatchedZone(null);
      setSuggestions([]);
      setShowSuggestions(false);
      if (zoneCheckTimerRef.current) clearTimeout(zoneCheckTimerRef.current);
      if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current);
    }
  }, [orderType]);

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
    if (orderType === "DELIVERY" && zoneStatus === "uncovered") return;
    // If zone hasn't been checked yet, check now and block
    if (orderType === "DELIVERY" && zoneStatus === "idle" && customerAddress.trim()) {
      await checkZone(customerAddress);
      return; // let the user see the result before resubmitting
    }
    setSubmitting(true);
    try {
      const discountSnapshot = bestMenuDiscount ? {
        discountId:    bestMenuDiscount.discount.id,
        name:          bestMenuDiscount.discount.name,
        label:         bestMenuDiscount.discount.label ?? null,
        discountType:  bestMenuDiscount.discount.discountType,
        value:         bestMenuDiscount.discount.value,
        amountApplied: menuDiscountAmount,
      } : null;
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
          selectedExtras: cartExtras.map((e) => ({ extraId: e.extraId, quantity: e.quantity })),
          ...(discountSnapshot ? { appliedDiscount: discountSnapshot, discountAmount: menuDiscountAmount } : {}),
          ...(extrasTotal > 0 ? { extrasAmount: extrasTotal } : {}),
          ...(selectedMethods.length === 1 && adjType && adjType !== "none" ? {
            paymentAdjustmentType:   adjType,
            paymentAdjustmentPct:    adjPct,
            paymentAdjustmentAmount: paymentAdjustmentAmount,
            paymentMethodSnapshot:   orgData?.paymentMethods ?? null,
          } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error ?? "Error al enviar pedido"); return; }
      setOrderId(data.id);
      setStep("success");

      // Send WhatsApp notification to restaurant
      const waPhone = orgData?.whatsapp || orgData?.phone;
      if (waPhone && data.id) {
        const trackUrl = `${window.location.origin}/menu/${slug}/order/${data.id}`;
        const methodLabels = selectedMethods.map((m) => PAYMENT_LABELS[m] ?? m).join(", ");
        const itemsText = cart.map((i) => `  • ${i.quantity}x ${i.name}`).join("\n");
        const deliveryLine = orderType === "DELIVERY" && customerAddress.trim()
          ? `\n🏠 *Dirección:* ${customerAddress.trim()}`
          : orderType === "TAKEAWAY" ? "\n🛍️ *Modalidad:* Takeaway" : "\n🪑 *Modalidad:* Salón";
        const feeLine = deliveryFee > 0 ? `\n💰 *Envío:* ${formatCurrency(deliveryFee, "ARS")}` : "";
        const phoneLine = customerPhone.trim() ? `\n📱 *Tel:* ${customerPhone.trim()}` : "";
        const msg = [
          `🛒 *Nuevo pedido — ${orgData?.name ?? ""}*`,
          `👤 *Cliente:* ${customerName.trim()}${phoneLine}${deliveryLine}`,
          `\n*Productos:*\n${itemsText}${feeLine}`,
          `💳 *Total:* ${formatCurrency(data.total ?? orderTotal, "ARS")}`,
          methodLabels ? `💳 *Pago:* ${methodLabels}` : "",
          `\n🔗 Ver pedido en vivo: ${trackUrl}`,
        ].filter(Boolean).join("\n");
        const waNum = waPhone.replace(/\D/g, "");
        window.open(`https://wa.me/${waNum}?text=${encodeURIComponent(msg)}`, "_blank");
      }
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
    <div className="min-h-screen flex items-center justify-center bg-[#f6f7f7]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#E5E7EB", borderTopColor: "#111827" }} />
        <p className="text-sm text-gray-400">Cargando menú...</p>
      </div>
    </div>
  );

  if (error || !orgData) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f6f7f7] px-4">
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
    <div className="min-h-screen flex items-center justify-center bg-[#f6f7f7] px-4">
      <div className="text-center max-w-xs w-full">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 shadow-xl" style={{ backgroundColor: primary }}>
          <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">¡Pedido enviado!</h1>
        <p className="text-gray-400 text-sm mb-1">Pedido <span className="font-mono font-semibold text-gray-700">#{orderId?.slice(-6).toUpperCase()}</span></p>
        <p className="text-gray-400 text-sm mb-3">El local lo confirmará en breve.</p>

        {selectedMethods.length > 0 && (
          <div className="flex items-start gap-2 text-left bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-5">
            <svg className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-blue-700">Tu método de pago está pendiente de confirmación por la cajera.</p>
          </div>
        )}

        {/* Tracking link */}
        {orderId && (
          <a
            href={`/menu/${slug}/order/${orderId}`}
            className="flex items-center justify-center gap-2 w-full h-12 rounded-2xl border-2 font-semibold text-sm mb-4 transition-all active:scale-[0.98]"
            style={{ borderColor: primary, color: primary }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            Seguir estado del pedido en vivo
          </a>
        )}

        <div className="bg-white rounded-2xl p-4 mb-5 text-left shadow-sm border border-gray-100 space-y-2">
          {cart.map((item) => (
            <div key={item.productId} className="flex justify-between text-sm py-1 border-b border-gray-50 last:border-0">
              <span className="text-gray-600">{item.name} <span className="text-gray-400">× {item.quantity}</span></span>
              <span className="font-semibold text-gray-900">{formatCurrency(item.price * item.quantity, item.currency as import("@/types").Currency)}</span>
            </div>
          ))}
          {deliveryFee > 0 && (
            <div className="flex justify-between text-sm text-gray-400">
              <span>Envío</span><span>{formatCurrency(deliveryFee, "ARS")}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base pt-1 border-t border-gray-100">
            <span>Total</span>
            <span style={{ color: primary }}>{formatCurrency(orderTotal, "ARS")}</span>
          </div>
        </div>
        <button
          onClick={() => { setCart([]); setCartExtras([]); setSelectedMethods([]); setCustomerName(""); setCustomerPhone(""); setCustomerAddress(""); setZoneStatus("idle"); setMatchedZone(null); setSuggestions([]); setShowSuggestions(false); setExtrasModalProduct(null); setStep("menu"); }}
          className="w-full h-14 rounded-2xl text-white font-bold text-base shadow-xl transition-all active:scale-[0.98] hover:opacity-90"
          style={{ backgroundColor: primary }}
        >
          Hacer otro pedido
        </button>
      </div>
    </div>
  );

  // ── Main menu layout ──────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#f6f7f7] pb-32">

      {/* ── Header ── */}
      <header className="relative w-full h-72">
        {orgData.coverImageUrl ? (
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${orgData.coverImageUrl})` }}>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          </div>
        ) : (
          <div className="absolute inset-0" style={{ backgroundColor: primary }} />
        )}
        <div className="absolute bottom-0 left-0 w-full p-6">
          <h1 className="text-4xl font-bold text-white tracking-tight drop-shadow-md">{orgData.name}</h1>
        </div>
      </header>

      {/* ── Modality pill selector — floats over header ── */}
      {enabledModalities.length > 1 && (
        <div className="px-4 -mt-6 relative z-10">
          <div className="flex h-14 w-full items-center justify-between rounded-full bg-white p-1.5 shadow-xl border border-gray-100">
            {enabledModalities.map((m) => (
              <button
                key={m}
                onClick={() => setOrderType(m)}
                className="flex flex-1 h-full items-center justify-center gap-2 rounded-full px-2 text-sm font-semibold transition-all"
                style={orderType === m ? { backgroundColor: primary, color: "#fff" } : { color: "#6B7280" }}
              >
                <span className="[&>svg]:w-4 [&>svg]:h-4">{MODALITY_ICONS[m]}</span>
                {MODALITY_LABELS[m]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Category tabs — sticky with blur ── */}
      {categories.length > 1 && (
        <div className={`sticky z-20 bg-white/80 backdrop-blur-lg border-b border-gray-100 ${enabledModalities.length > 1 ? "mt-6 top-0" : "-mt-6 top-0"}`}>
          <div className="flex overflow-x-auto px-4 gap-6" style={{ scrollbarWidth: "none" }}>
            {categories.map((cat) => {
              const key = cat.id ?? "otros";
              const isActive = activeCategory === key;
              return (
                <button
                  key={key}
                  onClick={() => scrollToCategory(key)}
                  className="flex-shrink-0 pb-3 pt-4 border-b-2 -mb-px text-sm font-semibold whitespace-nowrap transition-all"
                  style={isActive
                    ? { borderColor: primary, color: primary }
                    : { borderColor: "transparent", color: "#6B7280" }
                  }
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Products ── */}
      <main className="p-4 space-y-8">
        {categories.map((cat) => {
          const key = cat.id ?? "otros";
          return (
            <section key={key} ref={(el) => { categoryRefs.current[key] = el; }}>
              <h2 className="text-xl font-bold px-1 mb-3 text-gray-900">{cat.name}</h2>
              <div className="space-y-4">
                {cat.products.map((product) => {
                  const inCart = cart.find((i) => i.productId === product.id);
                  return (
                    <div key={product.id} className="flex items-center gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                      <div className="flex-1 flex flex-col gap-1 min-w-0">
                        <h3 className="font-bold text-lg text-gray-900 leading-snug">{product.name}</h3>
                        {product.description && (
                          <p className="text-gray-400 text-sm line-clamp-2 leading-relaxed">{product.description}</p>
                        )}
                        {(() => {
                          const applicable = menuDiscounts.filter((d) => {
                            if (!d.isActive) return false;
                            if (d.appliesTo === "ORDER") return true;
                            if (d.appliesTo === "PRODUCTS") return d.productIds?.includes(product.id) ?? false;
                            if (d.appliesTo === "CATEGORIES") return product.categoryId ? (d.categoryIds?.includes(product.categoryId) ?? false) : false;
                            return false;
                          });
                          if (applicable.length === 0) return null;
                          const best = applicable.reduce((a, b) => a.value >= b.value ? a : b);
                          const badge = best.label ?? (best.discountType === "PERCENTAGE" ? `${best.value}% OFF` : `-$${best.value}`);
                          return (
                            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full w-fit">
                              {badge}
                            </span>
                          );
                        })()}
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <span className="font-bold text-lg" style={{ color: primary }}>
                            {formatCurrency(product.salePrice, product.currency as import("@/types").Currency)}
                          </span>
                          {inCart ? (
                            <div className="flex items-center bg-gray-100 rounded-full p-1 gap-3">
                              <button
                                onClick={() => updateQty(product.id, -1)}
                                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-700 font-bold hover:bg-gray-200 transition-colors"
                              >
                                −
                              </button>
                              <span className="font-bold text-sm w-4 text-center">{inCart.quantity}</span>
                              <button
                                onClick={() => updateQty(product.id, 1)}
                                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold active:scale-95 transition-transform"
                                style={{ backgroundColor: primary }}
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => addToCart(product)}
                              className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg active:scale-95 transition-transform text-xl font-light"
                              style={{ backgroundColor: primary }}
                            >
                              +
                            </button>
                          )}
                        </div>
                      </div>
                      {product.imageUrl && (
                        <div className="w-32 h-32 rounded-xl bg-gray-100 overflow-hidden shrink-0">
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
          <div className="text-center py-20">
            <p className="text-4xl mb-3">🍽️</p>
            <p className="text-gray-400 text-sm">No hay productos disponibles por el momento.</p>
          </div>
        )}
      </main>

      {/* ── Cart FAB ── */}
      {cartCount > 0 && step === "menu" && !cartOpen && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md z-50">
          <button
            onClick={() => setCartOpen(true)}
            className="w-full h-16 rounded-2xl flex items-center justify-between px-6 shadow-2xl text-white transition-all active:scale-[0.98]"
            style={{ backgroundColor: primary }}
          >
            <div className="flex items-center gap-3">
              <div className="rounded-lg px-2 py-1 text-sm font-bold" style={{ backgroundColor: "rgba(255,255,255,0.2)" }}>
                {cartCount}
              </div>
              <span className="font-bold tracking-wide">Ver pedido</span>
            </div>
            <span className="font-bold text-lg">{formatCurrency(orderTotal, "ARS")}</span>
          </button>
        </div>
      )}

      {/* ── Cart drawer ── */}
      {cartOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setCartOpen(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>
            <div className="flex items-center justify-between px-5 py-3 shrink-0">
              <h2 className="font-bold text-gray-900 text-lg">Tu pedido</h2>
              <button onClick={() => setCartOpen(false)} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-xl font-bold hover:bg-gray-200 transition-colors">×</button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 pb-2 space-y-1">
              {cart.map((item) => (
                <div key={item.productId} className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                    <p className="text-xs text-gray-400">{formatCurrency(item.price, item.currency as import("@/types").Currency)} c/u</p>
                  </div>
                  <div className="flex items-center bg-gray-100 rounded-full p-1 gap-2 shrink-0">
                    <button onClick={() => updateQty(item.productId, -1)} className="w-7 h-7 rounded-full flex items-center justify-center text-gray-700 font-bold hover:bg-gray-200 transition-colors">−</button>
                    <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                    <button onClick={() => updateQty(item.productId, 1)} className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: primary }}>+</button>
                  </div>
                  <span className="text-sm font-bold text-gray-900 w-16 text-right shrink-0">{formatCurrency(item.price * item.quantity, item.currency as import("@/types").Currency)}</span>
                </div>
              ))}
            </div>
            <div className="px-5 pb-7 pt-3 shrink-0 border-t border-gray-100 space-y-4">
              {deliveryFee > 0 && (
                <div className="flex justify-between text-sm text-gray-400">
                  <span>Costo de envío</span>
                  <span>{formatCurrency(deliveryFee, "ARS")}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-gray-900 text-lg">
                <span>Total</span>
                <span>{formatCurrency(orderTotal, "ARS")}</span>
              </div>
              <button
                onClick={() => { setCartOpen(false); setStep("checkout"); }}
                className="w-full h-16 rounded-2xl text-white font-bold text-base shadow-xl transition-all active:scale-[0.98] hover:opacity-90 flex items-center justify-center gap-2"
                style={{ backgroundColor: primary }}
              >
                <span>Ir a pagar</span>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Checkout screen ── */}
      {step === "checkout" && (
        <div className="fixed inset-0 z-50 bg-[#f6f7f7] flex flex-col max-w-md mx-auto">

          {/* Top nav */}
          <div className="sticky top-0 z-50 bg-[#f6f7f7]/80 backdrop-blur-md p-4 flex items-center justify-between border-b border-gray-100 shrink-0">
            <button
              onClick={() => { setStep("menu"); setSubmitAttempted(false); }}
              className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors text-gray-700"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-lg font-bold text-gray-900 text-center flex-1">Finalizar Pedido</h2>
            <div className="w-10" />
          </div>

          {/* Progress pills */}
          <div className="flex w-full items-center justify-center gap-4 py-5 shrink-0">
            {["Datos", "Pago", "Confirmar"].map((label, i) => (
              <div key={label} className="flex flex-col items-center gap-1.5">
                <div className="h-2.5 w-12 rounded-full" style={{ backgroundColor: i === 0 ? primary : "#E5E7EB" }} />
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ opacity: i === 0 ? 0.7 : 0.35 }}>{label}</span>
              </div>
            ))}
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-4 space-y-6 pb-8">

              {/* Step 1 — Tus datos */}
              <section className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full text-white text-sm font-bold shrink-0" style={{ backgroundColor: primary }}>1</span>
                  <h2 className="text-xl font-bold text-gray-900">Tus Datos</h2>
                </div>

                <div className={`flex w-full items-stretch rounded-xl border bg-white focus-within:ring-2 transition-all ${submitAttempted && !customerName.trim() ? "border-red-300" : "border-gray-200"}`}>
                  <input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Nombre completo *"
                    autoComplete="name"
                    className="flex-1 h-14 px-4 text-base bg-transparent focus:outline-none placeholder-gray-300 text-gray-900"
                  />
                  <div className="flex items-center pr-4 text-gray-300">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                </div>
                {submitAttempted && !customerName.trim() && (
                  <p className="text-xs text-red-500 -mt-1 ml-1">Ingresá tu nombre para continuar</p>
                )}

                <div className="flex w-full items-stretch rounded-xl border border-gray-200 bg-white focus-within:ring-2 transition-all">
                  <input
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Teléfono de contacto (opcional)"
                    type="tel"
                    autoComplete="tel"
                    className="flex-1 h-14 px-4 text-base bg-transparent focus:outline-none placeholder-gray-300 text-gray-900"
                  />
                  <div className="flex items-center pr-4 text-gray-300">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                </div>

                {orderType === "DELIVERY" && (
                  <>
                    <div className="relative">
                    <div className={`flex w-full items-stretch rounded-xl border bg-white focus-within:ring-2 transition-all ${
                      zoneStatus === "uncovered" ? "border-red-300 focus-within:ring-red-200" :
                      zoneStatus === "covered"   ? "border-emerald-300 focus-within:ring-emerald-200" :
                      submitAttempted && !customerAddress.trim() ? "border-red-300" : "border-gray-200"
                    }`}>
                      <input
                        ref={addressInputRef}
                        type="text"
                        value={customerAddress}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCustomerAddress(val);
                          setZoneStatus("idle");
                          setMatchedZone(null);
                          if (zoneCheckTimerRef.current) clearTimeout(zoneCheckTimerRef.current);
                          if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current);
                          suggestTimerRef.current = setTimeout(() => fetchSuggestions(val), 300);
                        }}
                        onBlur={(e) => {
                          setTimeout(() => setShowSuggestions(false), 150);
                          if (e.target.value.trim() && zoneStatus === "idle") {
                            checkZone(e.target.value.trim());
                          }
                        }}
                        placeholder="Calle, número, piso..."
                        autoComplete="off"
                        className="flex-1 h-14 px-4 text-base bg-transparent focus:outline-none placeholder-gray-300 text-gray-900"
                      />
                      <div className="flex items-center pr-4 text-gray-300">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                    </div>
                    {/* Suggestions dropdown */}
                    {showSuggestions && suggestions.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden">
                        {suggestions.map((s) => (
                          <button
                            key={s.placeId}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setCustomerAddress(s.description);
                              setSuggestions([]);
                              setShowSuggestions(false);
                              setZoneStatus("idle");
                              setMatchedZone(null);
                              checkZone(s.description);
                            }}
                            className="w-full text-left px-4 py-3 text-sm text-gray-800 hover:bg-gray-50 border-b border-gray-100 last:border-0 flex items-start gap-3"
                          >
                            <svg className="w-4 h-4 mt-0.5 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="leading-snug">{s.description}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    </div>
                    {/* Zone feedback */}
                    {zoneStatus === "checking" && (
                      <div className="flex items-center gap-2 text-xs text-gray-400 ml-1">
                        <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                        Verificando cobertura...
                      </div>
                    )}
                    {zoneStatus === "covered" && matchedZone && (
                      <div className="flex items-center gap-1.5 text-sm text-emerald-700 bg-emerald-50 rounded-xl px-3 py-2">
                        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                        </svg>
                        <span className="font-semibold">{matchedZone.name}</span>
                        <span className="text-emerald-500 ml-auto font-bold">+{formatCurrency(matchedZone.price, "ARS")}</span>
                      </div>
                    )}
                    {zoneStatus === "uncovered" && (
                      <div className="flex items-center gap-1.5 text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">
                        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                        No llegamos a esa dirección. Probá con otra o elegí retiro en local.
                      </div>
                    )}
                    {submitAttempted && !customerAddress.trim() && (
                      <p className="text-xs text-red-500 ml-1">Ingresá la dirección de entrega</p>
                    )}
                    {submitAttempted && zoneStatus === "uncovered" && (
                      <p className="text-xs text-red-500 ml-1">No hay cobertura para esa dirección</p>
                    )}
                  </>
                )}
              </section>

              {/* Step 2 — Metodo de pago */}
              <section className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold shrink-0 bg-gray-200 text-gray-600">2</span>
                  <h2 className="text-xl font-bold text-gray-900">Metodo de Pago</h2>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {enabledPayments.map((method) => {
                    const selected = selectedMethods.includes(method);
                    const cfg = getMethodConfig(orgData?.paymentMethods ?? null, method);
                    const hasDiscount = cfg?.adjustmentType === "discount" && cfg.adjustmentPct;
                    const hasSurcharge = cfg?.adjustmentType === "surcharge" && cfg.adjustmentPct;
                    return (
                      <div key={method} className="flex flex-col gap-2">
                        <button
                          onClick={() => togglePayment(method)}
                          className="relative flex items-center p-4 rounded-xl border-2 transition-all w-full text-left bg-white"
                          style={selected ? { borderColor: primary } : { borderColor: "#E5E7EB" }}
                        >
                          <div className="flex items-center gap-4 w-full">
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: primaryLight }}>
                              <span style={{ color: primary }}>
                                {PAYMENT_ICONS[method] ?? (
                                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                )}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-gray-900">{PAYMENT_LABELS[method] ?? method}</p>
                              {hasDiscount && <p className="text-xs font-semibold text-emerald-600">{cfg!.adjustmentPct}% de descuento</p>}
                              {hasSurcharge && <p className="text-xs font-semibold text-amber-600">+{cfg!.adjustmentPct}% recargo</p>}
                            </div>
                            <div
                              className="w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all"
                              style={selected ? { backgroundColor: primary, borderColor: primary } : { borderColor: "#D1D5DB" }}
                            >
                              {selected && <div className="w-2 h-2 rounded-full bg-white" />}
                            </div>
                          </div>
                        </button>
                        {selected && cfg && (cfg.alias || cfg.bank || cfg.holder) && (
                          <div className="rounded-xl px-4 py-3 space-y-1.5 text-sm" style={{ backgroundColor: primaryLight }}>
                            {cfg.alias && <div className="flex justify-between"><span className="text-gray-500">Alias</span><span className="font-bold text-gray-900 font-mono">{cfg.alias}</span></div>}
                            {cfg.bank && <div className="flex justify-between"><span className="text-gray-500">Banco</span><span className="font-semibold text-gray-800">{cfg.bank}</span></div>}
                            {cfg.holder && <div className="flex justify-between"><span className="text-gray-500">Titular</span><span className="font-semibold text-gray-800">{cfg.holder}</span></div>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Step 3 — Resumen */}
              <section>
                <details className="group bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm" open>
                  <summary className="flex items-center justify-between p-4 cursor-pointer list-none select-none">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                      <span className="font-bold text-gray-900">Resumen de tu pedido</span>
                    </div>
                    <svg className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="px-4 pb-4 pt-0 space-y-1 border-t border-gray-50">
                    {cart.map((item) => (
                      <div key={item.productId} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                          <p className="text-xs text-gray-400">× {item.quantity}</p>
                        </div>
                        <span className="text-sm font-semibold text-gray-900 shrink-0">{formatCurrency(item.price * item.quantity, item.currency as import("@/types").Currency)}</span>
                      </div>
                    ))}
                    {deliveryFee > 0 && (
                      <div className="flex justify-between text-sm text-gray-400 pt-1">
                        <span>Envio</span><span>{formatCurrency(deliveryFee, "ARS")}</span>
                      </div>
                    )}
                  </div>
                </details>
              </section>

            </div>
          </div>

          {/* Footer CTA */}
          <footer className="shrink-0 p-4 bg-[#f6f7f7]/90 backdrop-blur-xl border-t border-gray-100">
            <div className="flex flex-col gap-4">
              {/* Pricing breakdown */}
              {(extrasTotal > 0 || menuDiscountAmount > 0 || adjustedOrderTotal !== orderTotal) ? (
                <div className="space-y-1 px-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Subtotal</span>
                    <span className="text-sm text-gray-500">{formatCurrency(cartTotal, "ARS")}</span>
                  </div>
                  {extrasTotal > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Adicionales</span>
                      <span className="text-sm text-blue-600">+{formatCurrency(extrasTotal, "ARS")}</span>
                    </div>
                  )}
                  {menuDiscountAmount > 0 && bestMenuDiscount && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-emerald-600">{bestMenuDiscount.discount.label ?? bestMenuDiscount.discount.name}</span>
                      <span className="text-sm font-semibold text-emerald-600">−{formatCurrency(menuDiscountAmount, "ARS")}</span>
                    </div>
                  )}
                  {adjustedOrderTotal !== orderTotal && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium" style={{ color: adjType === "discount" ? "#16a34a" : "#d97706" }}>
                        {adjType === "discount" ? `Descuento pago ${adjPct}%` : `Recargo pago ${adjPct}%`}
                      </span>
                      <span className="text-sm font-semibold" style={{ color: adjType === "discount" ? "#16a34a" : "#d97706" }}>
                        {adjType === "discount" ? `−${formatCurrency(-paymentAdjustmentAmount, "ARS")}` : `+${formatCurrency(paymentAdjustmentAmount, "ARS")}`}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-1 border-t border-gray-200">
                    <span className="text-sm font-semibold text-gray-500">Total a pagar</span>
                    <span className="text-2xl font-black text-gray-900">{formatCurrency(adjustedOrderTotal, "ARS")}</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between px-2">
                  <span className="text-sm font-semibold text-gray-500">Total a pagar</span>
                  <span className="text-2xl font-black text-gray-900">{formatCurrency(orderTotal, "ARS")}</span>
                </div>
              )}
              <button
                onClick={submitOrder}
                disabled={submitting || zoneStatus === "checking" || zoneStatus === "uncovered"}
                className="w-full h-16 rounded-xl text-white font-bold text-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-xl disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ backgroundColor: zoneStatus === "uncovered" ? "#EF4444" : primary }}
              >
                {submitting ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Enviando...
                  </>
                ) : (
                  <>
                    <span>Confirmar Pedido</span>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </>
                )}
              </button>
              <div className="flex items-center justify-center gap-1.5 opacity-40">
                <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500">Pago 100% seguro</span>
              </div>
            </div>
          </footer>
        </div>
      )}

      {/* ── ExtrasModal ── */}
      {extrasModalProduct && (
        <ExtrasModal
          isOpen={true}
          onClose={() => setExtrasModalProduct(null)}
          productName={extrasModalProduct.name}
          extras={getExtrasForProduct({ id: extrasModalProduct.id, categoryId: extrasModalProduct.categoryId }, menuExtras)}
          onConfirm={(sel) => { addToCartDirect(extrasModalProduct, sel); setExtrasModalProduct(null); }}
          primaryColor={primary}
          confirmLabel="Agregar al carrito"
        />
      )}
    </div>
  );
}
