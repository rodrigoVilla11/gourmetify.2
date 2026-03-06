"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import Link from "next/link";
import { printKitchenTicket, printReceipt } from "@/components/print/Ticket";

type Category         = { id: string; name: string; color: string };
type Product          = { id: string; name: string; salePrice: number; categoryId: string | null };
type Combo            = { id: string; name: string; salePrice: number };
type OrderItem        = { id: string; type: "product" | "combo"; name: string; price: number; quantity: number };
type Payment          = { method: string; amount: string };
type Status           = "idle" | "loading" | "success" | "error";
type SelectedCustomer = { id: string; name: string; phone: string | null; address?: string | null } | null;
type CustomerSearchStatus = "idle" | "searching" | "found" | "not-found";
type OrderType        = "SALON" | "TAKEAWAY" | "DELIVERY";

type OrgPMConfig = {
  enabled: boolean;
  adjustmentType: "none" | "discount" | "surcharge";
  adjustmentPct: number;
  alias?: string; bank?: string; holder?: string; link?: string;
};
type OrgPaymentMethods = {
  cash?: OrgPMConfig; transfer?: OrgPMConfig; mercadopago?: OrgPMConfig;
  debit?: OrgPMConfig; credit?: OrgPMConfig;
};
type OrgModalities = { salon: boolean; delivery: boolean; takeaway: boolean };
type OrgConfig = { paymentMethods?: OrgPaymentMethods | null; modalities?: OrgModalities | null; deliveryFee?: number | null };
type Repartidor = { id: string; name: string; phone: string | null };

type KanbanOrder = {
  id: string;
  date: string;
  total: string;
  orderStatus: string;
  orderType: string;
  isPaid: boolean;
  deliveryAddress: string | null;
  deliveryFee: string | null;
  repartidorId: string | null;
  repartidor: { name: string } | null;
  customerName: string | null;
  dailyOrderNumber: number | null;
  delayMinutes: number | null;
  customer: { name: string } | null;
  items: { productId: string; product: { name: string }; quantity: string }[];
  combos: { comboId: string; combo: { name: string }; quantity: string }[];
  payments: { paymentMethod: string; amount: string }[];
};

const KANBAN_COLUMNS = [
  { status: "NUEVO",          label: "Nuevos",         wrapClass: "border-blue-200",   headClass: "bg-blue-50",   bodyClass: "bg-blue-50/30",   badgeClass: "bg-blue-100 text-blue-700" },
  { status: "EN_PREPARACION", label: "En preparación", wrapClass: "border-amber-200",  headClass: "bg-amber-50",  bodyClass: "bg-amber-50/30",  badgeClass: "bg-amber-100 text-amber-700" },
  { status: "LISTO",          label: "Listos",         wrapClass: "border-emerald-200",headClass: "bg-emerald-50",bodyClass: "bg-emerald-50/30",badgeClass: "bg-emerald-100 text-emerald-700" },
];

const STATUS_NEXT: Record<string, string>      = { NUEVO: "EN_PREPARACION", EN_PREPARACION: "LISTO", LISTO: "ENTREGADO" };
const STATUS_NEXT_LABEL: Record<string, string> = { NUEVO: "Preparar →", EN_PREPARACION: "Listo →", LISTO: "Entregar ✓" };
const STATUS_NEXT_BTN: Record<string, string>   = {
  NUEVO:          "bg-amber-500 hover:bg-amber-600 text-white",
  EN_PREPARACION: "bg-emerald-600 hover:bg-emerald-700 text-white",
  LISTO:          "bg-emerald-700 hover:bg-emerald-800 text-white",
};

// Static map: key matches OrgPaymentMethods keys, value = payment method string stored in DB
const PM_MAP: { key: keyof OrgPaymentMethods; value: string; label: string; icon: string }[] = [
  { key: "cash",        value: "EFECTIVO",      label: "Efectivo",      icon: "💵" },
  { key: "transfer",    value: "TRANSFERENCIA", label: "Transferencia", icon: "🏦" },
  { key: "mercadopago", value: "ONLINE",        label: "Mercado Pago",  icon: "🔵" },
  { key: "debit",       value: "DEBITO",        label: "Débito",        icon: "💳" },
  { key: "credit",      value: "CREDITO",       label: "Crédito",       icon: "💰" },
];

const ORDER_TYPES: { value: OrderType; label: string; icon: string }[] = [
  { value: "SALON",    label: "Salón",       icon: "🏠" },
  { value: "TAKEAWAY", label: "Para llevar", icon: "🥡" },
  { value: "DELIVERY", label: "Delivery",    icon: "🛵" },
];

const ORDER_TYPE_LABELS: Record<string, string> = {
  SALON: "Salón", TAKEAWAY: "Para llevar", DELIVERY: "Delivery",
};

function fmt(n: number) {
  return "$" + n.toLocaleString("es-AR", { maximumFractionDigits: 0 });
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  return `hace ${Math.floor(hrs / 24)}d`;
}

export default function ComandasPage() {
  // ── Product grid state ─────────────────────────────────────────────────────
  const [products, setProducts]     = useState<Product[]>([]);
  const [combos, setCombos]         = useState<Combo[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tab, setTab]               = useState<string>("all");
  const [search, setSearch]         = useState("");
  const [order, setOrder]           = useState<OrderItem[]>([]);
  const [payments, setPayments]     = useState<Payment[]>([]);
  const [status, setStatus]         = useState<Status>("idle");
  const [message, setMessage]       = useState("");
  const [saleId, setSaleId]         = useState("");
  const [warnings, setWarnings]     = useState<string[]>([]);
  const [showOrder, setShowOrder]   = useState(false);

  // ── Page / POS state ───────────────────────────────────────────────────────
  const [pageTab, setPageTab]     = useState<"nueva" | "activos">("nueva");
  const [orderType, setOrderType] = useState<OrderType>("SALON");

  // ── Kanban state ───────────────────────────────────────────────────────────
  const [kanbanOrders, setKanbanOrders]   = useState<KanbanOrder[]>([]);
  const [loadingKanban, setLoadingKanban] = useState(false);
  const [movingId, setMovingId]           = useState<string | null>(null);
  const [cancellingId, setCancellingId]   = useState<string | null>(null);
  const [cancelRollback, setCancelRollback] = useState(true);
  const [cancellingStatus, setCancellingStatus] = useState<"idle" | "loading" | "error">("idle");
  const [cancelError, setCancelError]     = useState<string | null>(null);
  const prevNuevoIds = useRef<Set<string>>(new Set());

  // ── Detail modal state ─────────────────────────────────────────────────────
  type DetailEditItem = { id: string; type: "product" | "combo"; name: string; qty: number };
  const [detailId, setDetailId]                             = useState<string | null>(null);
  const [detailEditRepartidorId, setDetailEditRepartidorId] = useState("");
  const [detailEditDeliveryAddress, setDetailEditDeliveryAddress] = useState("");
  const [detailEditCustomerName, setDetailEditCustomerName] = useState("");
  const [detailEditItems, setDetailEditItems]               = useState<DetailEditItem[]>([]);
  const [detailItemSearch, setDetailItemSearch]             = useState("");
  const [detailEditPayments, setDetailEditPayments]         = useState<Payment[]>([]);
  const [detailSaving, setDetailSaving]                     = useState(false);

  // ── Cobrar state ───────────────────────────────────────────────────────────
  const [cobrandoId, setCobrandoId]         = useState<string | null>(null);
  const [cobrarPayments, setCobrarPayments] = useState<Payment[]>([]);
  const [cobrarStatus, setCobrarStatus]     = useState<"idle" | "loading">("idle");
  const [cobrarIsCobrado, setCobrarIsCobrado] = useState(true);

  // ── Nueva comanda "cobrado" toggle ─────────────────────────────────────────
  const [isCobrado, setIsCobrado] = useState(false);

  // ── Cancel payments rollback ────────────────────────────────────────────────
  const [cancelRollbackPayments, setCancelRollbackPayments] = useState(true);

  // ── Unpay (reverse cobro) ───────────────────────────────────────────────────
  const [unpayingId, setUnpayingId] = useState<string | null>(null);

  // ── Customer state ─────────────────────────────────────────────────────────
  const [customerPhone, setCustomerPhone]               = useState("");
  const [selectedCustomer, setSelectedCustomer]         = useState<SelectedCustomer>(null);
  const [customerSearchStatus, setCustomerSearchStatus] = useState<CustomerSearchStatus>("idle");
  const [customerName, setCustomerName]                 = useState("");
  const [showCreateCustomer, setShowCreateCustomer]     = useState(false);
  const [newCustomerName, setNewCustomerName]           = useState("");
  const [creatingCustomer, setCreatingCustomer]         = useState(false);
  const [deliveryAddress, setDeliveryAddress]           = useState("");
  const [repartidorId, setRepartidorId]                 = useState<string>("");
  const [repartidores, setRepartidores]                 = useState<Repartidor[]>([]);

  // ── Org config ─────────────────────────────────────────────────────────────
  const [orgConfig, setOrgConfig] = useState<OrgConfig | null>(null);

  // Reset orderType to first active modality when config loads
  useEffect(() => {
    if (!orgConfig?.modalities) return;
    const mod = orgConfig.modalities;
    const valid = (orderType === "SALON" && mod.salon !== false) ||
                  (orderType === "DELIVERY" && mod.delivery) ||
                  (orderType === "TAKEAWAY" && mod.takeaway);
    if (!valid) {
      if (mod.salon !== false)  setOrderType("SALON");
      else if (mod.delivery)    setOrderType("DELIVERY");
      else if (mod.takeaway)    setOrderType("TAKEAWAY");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgConfig]);

  // ── Load catalog ───────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/organizations/me").then((r) => r.json()).then((d: OrgConfig) => setOrgConfig(d));
    fetch("/api/repartidores").then((r) => r.ok ? r.json() : []).then((d) => { if (Array.isArray(d)) setRepartidores(d); }).catch(() => {});
    Promise.all([
      fetch("/api/products?isActive=true").then((r) => r.json()),
      fetch("/api/combos?isActive=true").then((r) => r.json()),
      fetch("/api/product-categories").then((r) => r.json()),
    ]).then(([prods, combsData, cats]) => {
      const prodArr  = Array.isArray(prods)     ? prods     : (prods?.data     ?? []);
      const comboArr = Array.isArray(combsData) ? combsData : (combsData?.data ?? []);
      setProducts(prodArr.map((x: { id: string; name: string; salePrice: string | number; categoryId?: string | null }) => ({
        id: x.id, name: x.name, salePrice: Number(x.salePrice), categoryId: x.categoryId ?? null,
      })));
      setCombos(comboArr.map((x: { id: string; name: string; salePrice: string | number }) => ({
        id: x.id, name: x.name, salePrice: Number(x.salePrice),
      })));
      setCategories(Array.isArray(cats) ? cats : []);
    });
  }, []);

  // ── Notification permission ────────────────────────────────────────────────
  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // ── Kanban fetch + auto-refresh ────────────────────────────────────────────
  const fetchKanban = useCallback(async () => {
    setLoadingKanban(true);
    try {
      const res = await fetch("/api/sales?orderStatus=NUEVO,EN_PREPARACION,LISTO&limit=200");
      const { data } = await res.json();
      const orders: KanbanOrder[] = Array.isArray(data) ? data : [];
      setKanbanOrders(orders);

      // Detect new NUEVO orders → browser notification
      const currentNuevoIds = new Set(orders.filter(o => o.orderStatus === "NUEVO").map(o => o.id));
      const newArrivals = Array.from(currentNuevoIds).filter(id => !prevNuevoIds.current.has(id));
      if (newArrivals.length > 0 && prevNuevoIds.current.size > 0) {
        const count = newArrivals.length;
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          new Notification(`🍽️ ${count} pedido${count > 1 ? "s" : ""} nuevo${count > 1 ? "s" : ""}`, {
            body: orders
              .filter(o => newArrivals.includes(o.id))
              .map(o => o.customer?.name ?? o.customerName ?? "Anónimo")
              .join(", "),
            icon: "/favicon.ico",
          });
        }
      }
      prevNuevoIds.current = currentNuevoIds;
    } finally {
      setLoadingKanban(false);
    }
  }, []);

  useEffect(() => {
    if (pageTab !== "activos") return;
    fetchKanban();
    const interval = setInterval(fetchKanban, 30000);
    return () => clearInterval(interval);
  }, [pageTab, fetchKanban]);

  // ── Move order ─────────────────────────────────────────────────────────────
  async function moveOrder(id: string, newStatus: string, rollbackStock?: boolean, rollbackPayments?: boolean): Promise<boolean> {
    setMovingId(id);
    try {
      const order = kanbanOrders.find((o) => o.id === id);
      const res = await fetch(`/api/sales/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, rollbackStock, rollbackPayments }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? `Error ${res.status}`);
      }
      if (newStatus === "EN_PREPARACION" && order) {
        printKitchenTicket({
          orderId: order.id,
          date: new Date(order.date),
          orderType: order.orderType,
          customerName: order.customer?.name ?? order.customerName ?? null,
          deliveryAddress: order.deliveryAddress,
          items: [
            ...order.items.map(i => ({ name: i.product.name, quantity: parseFloat(i.quantity) })),
            ...order.combos.map(c => ({ name: c.combo.name, quantity: parseFloat(c.quantity) })),
          ],
          notes: null,
        });
      }
      await fetchKanban();
      return true;
    } catch (e) {
      throw e;
    } finally {
      setMovingId(null);
    }
  }

  // ── DnD ────────────────────────────────────────────────────────────────────
  function onDragEnd(result: DropResult) {
    if (!result.destination) return;
    const newStatus = result.destination.droppableId;
    const id = result.draggableId;
    const o = kanbanOrders.find((x) => x.id === id);
    if (!o || o.orderStatus === newStatus) return;
    if (STATUS_NEXT[o.orderStatus] !== newStatus) return; // only adjacent
    moveOrder(id, newStatus).catch(() => {});
  }

  // ── Cancel ─────────────────────────────────────────────────────────────────
  async function confirmCancel() {
    if (!cancellingId) return;
    const o = kanbanOrders.find((x) => x.id === cancellingId);
    setCancellingStatus("loading");
    setCancelError(null);
    const needsRollback = o?.orderStatus === "EN_PREPARACION" || o?.orderStatus === "LISTO";
    const needsPaymentRollback = (o?.isPaid ?? false) ? cancelRollbackPayments : false;
    try {
      await moveOrder(cancellingId, "CANCELADO", needsRollback ? cancelRollback : false, needsPaymentRollback);
      setCancellingStatus("idle");
      setCancellingId(null);
      setCancelRollback(true);
      setCancelRollbackPayments(true);
    } catch (e) {
      setCancellingStatus("error");
      setCancelError(e instanceof Error ? e.message : "Error al cancelar");
    }
  }

  // ── Unpay ──────────────────────────────────────────────────────────────────
  async function unpayOrder(id: string) {
    setUnpayingId(id);
    await fetch(`/api/sales/${id}/pay`, { method: "DELETE" });
    await fetchKanban();
    setUnpayingId(null);
  }

  // ── Detail modal helpers ────────────────────────────────────────────────────
  const detailOrder = kanbanOrders.find((o) => o.id === detailId);

  function openDetail(ko: KanbanOrder) {
    setDetailId(ko.id);
    setDetailEditRepartidorId(ko.repartidorId ?? "");
    setDetailEditDeliveryAddress(ko.deliveryAddress ?? "");
    setDetailEditCustomerName(ko.customer?.name ?? ko.customerName ?? "");
    setDetailEditItems([
      ...ko.items.map(i => ({ id: i.productId, type: "product" as const, name: i.product.name, qty: Number(i.quantity) })),
      ...ko.combos.map(c => ({ id: c.comboId, type: "combo" as const, name: c.combo.name, qty: Number(c.quantity) })),
    ]);
    setDetailEditPayments(ko.payments.map(p => ({ method: p.paymentMethod, amount: String(p.amount) })));
    setDetailItemSearch("");
  }

  function detailSetQty(id: string, type: DetailEditItem["type"], qty: number) {
    if (qty <= 0) {
      setDetailEditItems(prev => prev.filter(i => !(i.id === id && i.type === type)));
    } else {
      setDetailEditItems(prev => prev.map(i => i.id === id && i.type === type ? { ...i, qty } : i));
    }
  }

  function detailTogglePayment(method: string) {
    const currentTotal = getDetailTotal();
    setDetailEditPayments(prev => {
      const existing = prev.find(p => p.method === method);
      if (existing) return prev.filter(p => p.method !== method);
      const sumExisting = prev.reduce((s, p) => s + (Number(p.amount) || 0), 0);
      return [...prev, { method, amount: String(Math.max(0, Math.round(currentTotal - sumExisting))) }];
    });
  }

  function detailUpdatePaymentAmount(method: string, val: string) {
    setDetailEditPayments(prev => prev.map(p => p.method === method ? { ...p, amount: val } : p));
  }

  function detailAddItem(item: DetailEditItem) {
    setDetailEditItems(prev => {
      const existing = prev.find(i => i.id === item.id && i.type === item.type);
      if (existing) return prev.map(i => i.id === item.id && i.type === item.type ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...item, qty: 1 }];
    });
    setDetailItemSearch("");
  }

  function getDetailTotal() {
    return detailEditItems.reduce((sum, i) => {
      if (i.type === "product") {
        const p = products.find(p => p.id === i.id);
        return sum + (p ? p.salePrice : 0) * i.qty;
      } else {
        const c = combos.find(c => c.id === i.id);
        return sum + (c ? c.salePrice : 0) * i.qty;
      }
    }, 0) + (detailOrder?.orderType === "DELIVERY" ? (Number(orgConfig?.deliveryFee) || 0) : 0);
  }

  async function saveDetailEdits() {
    if (!detailId || detailEditItems.length === 0) return;
    setDetailSaving(true);
    await fetch(`/api/sales/${detailId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        repartidorId:    detailEditRepartidorId || null,
        deliveryAddress: detailEditDeliveryAddress || null,
        customerName:    detailEditCustomerName || null,
        newItems:      detailEditItems.filter(i => i.type === "product").map(i => ({ productId: i.id, quantity: i.qty })),
        newComboItems: detailEditItems.filter(i => i.type === "combo").map(i => ({ comboId: i.id, quantity: i.qty })),
      }),
    });
    setDetailSaving(false);
    setDetailId(null);
    await fetchKanban();
  }

  // ── Order helpers ──────────────────────────────────────────────────────────
  function addOrIncrement(item: { id: string; type: "product" | "combo"; name: string; price: number }) {
    setOrder((prev) => {
      const existing = prev.find((o) => o.id === item.id && o.type === item.type);
      if (existing) return prev.map((o) => o.id === item.id && o.type === item.type ? { ...o, quantity: o.quantity + 1 } : o);
      return [...prev, { ...item, quantity: 1 }];
    });
  }

  function setQty(id: string, type: OrderItem["type"], qty: number) {
    if (qty <= 0) {
      setOrder((prev) => prev.filter((o) => !(o.id === id && o.type === type)));
    } else {
      setOrder((prev) => prev.map((o) => o.id === id && o.type === type ? { ...o, quantity: qty } : o));
    }
  }

  const orgDeliveryFee = orderType === "DELIVERY" ? (Number(orgConfig?.deliveryFee) || 0) : 0;
  const total       = order.reduce((sum, o) => sum + o.price * o.quantity, 0) + orgDeliveryFee;
  const sumPayments = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  // ── Dynamic methods and modalities from org config ──────────────────────────
  const activePaymentMethods = (() => {
    const pm = orgConfig?.paymentMethods;
    if (!pm) return PM_MAP.map((m) => ({ ...m, cfg: null as OrgPMConfig | null }));
    return PM_MAP
      .map((m) => ({ ...m, cfg: (pm[m.key] ?? null) as OrgPMConfig | null }))
      .filter((m) => m.cfg?.enabled);
  })();

  const activeOrderTypes = (() => {
    const mod = orgConfig?.modalities;
    if (!mod) return ORDER_TYPES;
    return ORDER_TYPES.filter((t) => {
      if (t.value === "SALON")    return mod.salon !== false;
      if (t.value === "DELIVERY") return mod.delivery;
      if (t.value === "TAKEAWAY") return mod.takeaway;
      return true;
    });
  })();

  // Effective total: apply adjustment when exactly one payment method selected
  const effectiveTotal = (() => {
    if (payments.length !== 1) return total;
    const sel = activePaymentMethods.find((m) => m.value === payments[0].method);
    if (!sel?.cfg || sel.cfg.adjustmentType === "none") return total;
    const factor = sel.cfg.adjustmentType === "surcharge"
      ? 1 + sel.cfg.adjustmentPct / 100
      : 1 - sel.cfg.adjustmentPct / 100;
    return Math.round(total * factor);
  })();

  const diff = effectiveTotal - sumPayments;

  // ── Payment helpers ────────────────────────────────────────────────────────
  function getAdjustedTotal(method: string, baseTotal: number): number {
    const sel = activePaymentMethods.find((m) => m.value === method);
    if (!sel?.cfg || sel.cfg.adjustmentType === "none") return baseTotal;
    const factor = sel.cfg.adjustmentType === "surcharge"
      ? 1 + sel.cfg.adjustmentPct / 100
      : 1 - sel.cfg.adjustmentPct / 100;
    return Math.round(baseTotal * factor);
  }

  function togglePaymentMethod(method: string) {
    setPayments((prev) => {
      const existing = prev.find((p) => p.method === method);
      if (existing) {
        const remaining = prev.filter((p) => p.method !== method);
        if (remaining.length > 0) {
          const sumOthers = remaining.slice(0, -1).reduce((s, p) => s + (Number(p.amount) || 0), 0);
          const last = remaining[remaining.length - 1];
          remaining[remaining.length - 1] = { ...last, amount: String(Math.max(0, Math.round(total - sumOthers))) };
        }
        return remaining;
      } else {
        const adjTotal = prev.length === 0 ? getAdjustedTotal(method, total) : total;
        const sumExisting = prev.reduce((s, p) => s + (Number(p.amount) || 0), 0);
        return [...prev, { method, amount: String(Math.max(0, Math.round(adjTotal - sumExisting))) }];
      }
    });
  }

  function updatePaymentAmount(method: string, val: string) {
    setPayments((prev) => prev.map((p) => p.method === method ? { ...p, amount: val } : p));
  }

  // ── Cobrar helpers ─────────────────────────────────────────────────────────
  const cobrarOrder = kanbanOrders.find((o) => o.id === cobrandoId);
  const cobrarTotal = cobrarOrder ? Number(cobrarOrder.total) : 0;
  const sumCobrar   = cobrarPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const cobrarEffectiveTotal = (() => {
    if (cobrarPayments.length !== 1) return cobrarTotal;
    const sel = activePaymentMethods.find((m) => m.value === cobrarPayments[0].method);
    if (!sel?.cfg || sel.cfg.adjustmentType === "none") return cobrarTotal;
    const factor = sel.cfg.adjustmentType === "surcharge"
      ? 1 + sel.cfg.adjustmentPct / 100
      : 1 - sel.cfg.adjustmentPct / 100;
    return Math.round(cobrarTotal * factor);
  })();

  function toggleCobrarMethod(method: string) {
    setCobrarPayments((prev) => {
      const existing = prev.find((p) => p.method === method);
      if (existing) {
        const remaining = prev.filter((p) => p.method !== method);
        if (remaining.length > 0) {
          const sumOthers = remaining.slice(0, -1).reduce((s, p) => s + (Number(p.amount) || 0), 0);
          const last = remaining[remaining.length - 1];
          remaining[remaining.length - 1] = { ...last, amount: String(Math.max(0, Math.round(cobrarTotal - sumOthers))) };
        }
        return remaining;
      } else {
        const adjTotal = prev.length === 0 ? getAdjustedTotal(method, cobrarTotal) : cobrarTotal;
        const sumExisting = prev.reduce((s, p) => s + (Number(p.amount) || 0), 0);
        return [...prev, { method, amount: String(Math.max(0, Math.round(adjTotal - sumExisting))) }];
      }
    });
  }

  function updateCobrarAmount(method: string, val: string) {
    setCobrarPayments((prev) => prev.map((p) => p.method === method ? { ...p, amount: val } : p));
  }

  async function confirmCobrar() {
    if (!cobrandoId || cobrarPayments.length === 0) return;
    setCobrarStatus("loading");
    const savedOrder        = cobrarOrder;
    const savedTotal        = cobrarEffectiveTotal;
    const savedPayments     = cobrarIsCobrado
      ? cobrarPayments.filter((p) => p.method && Number(p.amount) > 0)
      : cobrarPayments.filter((p) => p.method);
    const effectiveTotalNow = cobrarEffectiveTotal;
    const rawTotalNow       = cobrarTotal;
    const res = await fetch(`/api/sales/${cobrandoId}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        payments: savedPayments.map((p) => ({ paymentMethod: p.method, amount: Number(p.amount) || 0 })),
        isPaid: cobrarIsCobrado,
        ...(cobrarIsCobrado && effectiveTotalNow !== rawTotalNow ? { total: effectiveTotalNow } : {}),
      }),
    });
    if (res.ok) {
      setCobrandoId(null);
      setCobrarPayments([]);
      fetchKanban();
      if (savedOrder) {
        printReceipt({
          orderId: savedOrder.id,
          date: new Date(savedOrder.date),
          orderType: savedOrder.orderType,
          customerName: savedOrder.customer?.name ?? savedOrder.customerName ?? null,
          items: [
            ...savedOrder.items.map(i => ({ name: i.product.name, quantity: parseFloat(i.quantity), unitPrice: 0 })),
            ...savedOrder.combos.map(c => ({ name: c.combo.name, quantity: parseFloat(c.quantity), unitPrice: 0 })),
          ],
          total: savedTotal,
          payments: savedPayments.map((p) => ({ method: p.method, amount: Number(p.amount) })),
        });
      }
    } else {
      const err = await res.json().catch(() => ({}));
      alert(`Error al cobrar: ${err?.error ?? res.status}`);
    }
    setCobrarStatus("idle");
  }

  // ── Customer helpers ───────────────────────────────────────────────────────
  async function searchCustomer() {
    const phone = customerPhone.trim();
    if (!phone) return;
    setCustomerSearchStatus("searching");
    setShowCreateCustomer(false);
    setSelectedCustomer(null);
    const res  = await fetch(`/api/customers?phone=${encodeURIComponent(phone)}`);
    const data = await res.json();
    if (data && data.id) {
      setSelectedCustomer({ id: data.id, name: data.name, phone: data.phone, address: data.address ?? null });
      setCustomerSearchStatus("found");
      if (orderType === "DELIVERY" && data.address) setDeliveryAddress(data.address);
    } else {
      setCustomerSearchStatus("not-found");
      setNewCustomerName("");
    }
  }

  async function createAndSelectCustomer() {
    if (!newCustomerName.trim()) return;
    setCreatingCustomer(true);
    const res  = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCustomerName.trim(), phone: customerPhone.trim() || null }),
    });
    const data = await res.json();
    if (res.ok) {
      setSelectedCustomer({ id: data.id, name: data.name, phone: data.phone, address: data.address ?? null });
      setCustomerSearchStatus("found");
      setShowCreateCustomer(false);
    }
    setCreatingCustomer(false);
  }

  function clearCustomer() {
    setSelectedCustomer(null);
    setCustomerPhone("");
    setCustomerSearchStatus("idle");
    setShowCreateCustomer(false);
    setNewCustomerName("");
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit(opts: { withPayment: boolean }) {
    if (order.length === 0) return;
    const withCobrado = opts.withPayment && isCobrado;
    const paymentsToSend = opts.withPayment
      ? payments.filter((p) => p.method)
      : [];
    if (opts.withPayment && paymentsToSend.length === 0) {
      setStatus("error"); setMessage("Seleccioná al menos un método de pago"); return;
    }
    // Validate amounts only when actually collecting payment
    if (withCobrado && Math.abs(effectiveTotal - paymentsToSend.reduce((s, p) => s + (Number(p.amount) || 0), 0)) > 0.01) {
      const d = effectiveTotal - paymentsToSend.reduce((s, p) => s + (Number(p.amount) || 0), 0);
      setStatus("error"); setMessage(d > 0 ? `Faltan ${fmt(d)} para completar el pago` : `El pago excede el total por ${fmt(-d)}`); return;
    }
    setStatus("loading");
    const body = {
      items:       order.filter((o) => o.type === "product").map((o) => ({ productId: o.id, quantity: o.quantity })),
      comboItems:  order.filter((o) => o.type === "combo").map((o)   => ({ comboId: o.id,   quantity: o.quantity })),
      payments:    paymentsToSend.map((p) => ({ paymentMethod: p.method, amount: Number(p.amount) || 0 })),
      isPaid:      withCobrado,
      orderType,
      deliveryAddress: orderType === "DELIVERY" && deliveryAddress.trim() ? deliveryAddress.trim() : null,
      repartidorId: orderType === "DELIVERY" && repartidorId ? repartidorId : null,
      customerId:  selectedCustomer?.id ?? null,
      customerName: !selectedCustomer && customerName.trim() ? customerName.trim() : null,
    };
    const res  = await fetch("/api/sales", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    if (res.ok) {
      setSaleId(data.sale?.id ?? "");
      setWarnings((data.warnings ?? []).map((w: { name: string }) => w.name));
      setStatus("success");
      setMessage(withCobrado ? "¡Venta registrada y cobrada!" : opts.withPayment ? "¡Pedido guardado con método de pago!" : "¡Pedido comandado!");
      fetchKanban(); // update badge
    } else {
      setStatus("error");
      setMessage(data.error ?? "Error al registrar la venta");
    }
  }

  function resetOrder() {
    setOrder([]); setPayments([]); setStatus("idle"); setMessage(""); setSaleId(""); setWarnings([]); setShowOrder(false);
    clearCustomer(); setCustomerName(""); setOrderType("SALON"); setDeliveryAddress(""); setRepartidorId(""); setIsCobrado(false);
  }

  // ── Filtered items ─────────────────────────────────────────────────────────
  const q = search.toLowerCase();
  const filteredProducts = tab === "combos"
    ? []
    : products.filter((p) => p.name.toLowerCase().includes(q) && (tab === "all" || p.categoryId === tab));
  const filteredCombos = (tab === "all" || tab === "combos")
    ? combos.filter((c) => c.name.toLowerCase().includes(q))
    : [];
  const orderCount = order.reduce((sum, o) => sum + o.quantity, 0);

  // ── Order panel (inline var to avoid focus loss) ───────────────────────────
  const orderPanelContent = (
    <div className="flex flex-col h-full bg-white">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
        <h2 className="font-semibold text-gray-900">Pedido</h2>
        {orderCount > 0 && (
          <span className="text-xs bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full">
            {orderCount} ítem{orderCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {status === "success" ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
            <svg className="h-7 w-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-gray-900 text-lg">{message}</p>
            {warnings.length > 0 && <p className="text-xs text-amber-600 mt-1">Stock bajo: {warnings.join(", ")}</p>}
          </div>
          <div className="flex flex-col gap-2 w-full">
            <button onClick={resetOrder} className="w-full py-2.5 text-white rounded-xl font-semibold text-sm transition-colors hover:opacity-90" style={{ background: "#0f2f26" }}>
              Nueva comanda
            </button>
            {saleId && (
              <Link href={`/sales/${saleId}`} className="w-full py-2.5 border border-gray-200 text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-50 transition-colors text-center block">
                Ver venta
              </Link>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Order type */}
          {activeOrderTypes.length > 1 && (
            <div className="px-4 pt-3 pb-2 shrink-0">
              <div className="flex gap-1 p-0.5 bg-gray-100 rounded-lg">
                {activeOrderTypes.map((t) => (
                  <button key={t.value} onClick={() => {
                    setOrderType(t.value);
                    if (t.value === "DELIVERY" && !deliveryAddress && selectedCustomer?.address) setDeliveryAddress(selectedCustomer.address);
                  }}
                    className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${orderType === t.value ? "bg-white shadow-sm text-emerald-700 font-semibold" : "text-gray-500 hover:text-gray-700"}`}
                  >
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Delivery address + repartidor */}
          {orderType === "DELIVERY" && (
            <div className="px-4 pb-2 shrink-0 space-y-1.5">
              <input type="text" placeholder="Dirección de entrega..." value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)}
                className="w-full border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400 bg-amber-50/60 placeholder-amber-400"
              />
              {repartidores.length > 0 && (
                <select value={repartidorId} onChange={(e) => setRepartidorId(e.target.value)}
                  className="w-full border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400 bg-amber-50/60 text-amber-800"
                >
                  <option value="">🛵 Repartidor (opcional)</option>
                  {repartidores.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}{r.phone ? ` · ${r.phone}` : ""}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Customer */}
          <div className="px-4 pb-3 border-b border-gray-100 space-y-2 shrink-0 bg-gray-50/60">
            {selectedCustomer ? (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <svg className="h-4 w-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{selectedCustomer.name}</p>
                    {selectedCustomer.phone && <p className="text-[10px] text-gray-400">{selectedCustomer.phone}</p>}
                  </div>
                </div>
                <button onClick={clearCustomer} className="text-gray-300 hover:text-rose-500 transition-colors shrink-0">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ) : (
              <>
                <div className="flex gap-1.5">
                  <input type="tel" placeholder="Teléfono del cliente..." value={customerPhone}
                    onChange={(e) => { setCustomerPhone(e.target.value); setCustomerSearchStatus("idle"); setShowCreateCustomer(false); }}
                    onKeyDown={(e) => e.key === "Enter" && searchCustomer()}
                    className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                  <button onClick={searchCustomer} disabled={!customerPhone.trim() || customerSearchStatus === "searching"}
                    className="px-2.5 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-40 transition-colors shrink-0"
                  >
                    {customerSearchStatus === "searching" ? "..." : "Buscar"}
                  </button>
                </div>
                {customerSearchStatus === "not-found" && (
                  <div className="space-y-1.5">
                    <p className="text-xs text-amber-600">Cliente no encontrado.</p>
                    {!showCreateCustomer ? (
                      <button onClick={() => setShowCreateCustomer(true)} className="text-xs text-emerald-600 font-medium hover:text-emerald-700">+ Crear cliente</button>
                    ) : (
                      <div className="flex gap-1.5">
                        <input type="text" placeholder="Nombre del cliente *" value={newCustomerName}
                          onChange={(e) => setNewCustomerName(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && createAndSelectCustomer()}
                          className="flex-1 border border-emerald-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white" autoFocus
                        />
                        <button onClick={createAndSelectCustomer} disabled={!newCustomerName.trim() || creatingCustomer}
                          className="px-2.5 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-40 transition-colors shrink-0"
                        >
                          {creatingCustomer ? "..." : "Crear"}
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {customerSearchStatus === "idle" && (
                  <input type="text" placeholder="Nombre del pedido (opcional)..." value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                )}
              </>
            )}
          </div>

          {/* Items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {order.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Sin productos aún</p>
            ) : (
              order.map((item) => (
                <div key={`${item.type}-${item.id}`} className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                    <p className="text-xs text-gray-500">{fmt(item.price)} c/u</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => setQty(item.id, item.type, item.quantity - 1)} className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 text-sm font-bold">−</button>
                    <span className="w-6 text-center text-sm font-semibold tabular-nums">{item.quantity}</span>
                    <button onClick={() => setQty(item.id, item.type, item.quantity + 1)} className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 text-sm font-bold">+</button>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 w-16 text-right shrink-0">{fmt(item.price * item.quantity)}</p>
                  <button onClick={() => setQty(item.id, item.type, 0)} className="text-gray-300 hover:text-rose-500 transition-colors shrink-0">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Total + payments + actions */}
          <div className="border-t border-gray-100 p-4 space-y-3 shrink-0">
            {orgDeliveryFee > 0 ? (
              <>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Productos</span>
                  <span className="text-gray-700 tabular-nums">{fmt(total - orgDeliveryFee)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Costo envío</span>
                  <span className="text-amber-600 tabular-nums">+{fmt(orgDeliveryFee)}</span>
                </div>
                <div className="flex justify-between items-center border-t border-gray-100 pt-2">
                  <span className="text-sm text-gray-600 font-medium">Total</span>
                  <span className="text-xl font-bold text-gray-900 tabular-nums">{fmt(total)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Subtotal</span>
                <span className="text-xl font-bold text-gray-900 tabular-nums">{fmt(total)}</span>
              </div>
            )}
            {/* Adjustment row when single method with adjustment */}
            {payments.length === 1 && effectiveTotal !== total && (() => {
              const sel = activePaymentMethods.find((m) => m.value === payments[0].method);
              if (!sel?.cfg) return null;
              const diff2 = effectiveTotal - total;
              return (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500">
                    {sel.cfg.adjustmentType === "discount" ? `Descuento ${sel.cfg.adjustmentPct}%` : `Recargo ${sel.cfg.adjustmentPct}%`}
                  </span>
                  <span className={`font-semibold ${diff2 < 0 ? "text-green-600" : "text-red-500"}`}>
                    {diff2 < 0 ? `−${fmt(-diff2)}` : `+${fmt(diff2)}`} = <span className="text-gray-800">{fmt(effectiveTotal)}</span>
                  </span>
                </div>
              );
            })()}
            <div className={`grid gap-1.5 ${activePaymentMethods.length <= 3 ? "grid-cols-3" : activePaymentMethods.length === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"}`}>
              {activePaymentMethods.map((m) => {
                const selected = payments.find((p) => p.method === m.value);
                return (
                  <button key={m.value} onClick={() => togglePaymentMethod(m.value)}
                    className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-xl border-2 transition-all ${selected ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-gray-100 bg-white text-gray-600 hover:border-emerald-200 hover:bg-emerald-50/40"}`}
                  >
                    <span className="text-base">{m.icon}</span>
                    <span className="text-[10px] font-semibold mt-0.5 leading-tight text-center">{m.label}</span>
                    {m.cfg?.adjustmentType !== "none" && (
                      <span className={`text-[9px] font-bold ${m.cfg?.adjustmentType === "discount" ? "text-green-500" : "text-red-400"}`}>
                        {m.cfg?.adjustmentType === "discount" ? "−" : "+"}{m.cfg?.adjustmentPct}%
                      </span>
                    )}
                    {selected && (
                      <input type="number" min="0" value={selected.amount}
                        onChange={(e) => { e.stopPropagation(); updatePaymentAmount(m.value, e.target.value); }}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1 w-full text-center text-xs font-bold bg-emerald-100 rounded-md px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 tabular-nums"
                      />
                    )}
                  </button>
                );
              })}
            </div>
            {/* Transfer info */}
            {payments.find((p) => p.method === "TRANSFERENCIA") && (() => {
              const cfg = orgConfig?.paymentMethods?.transfer;
              if (!cfg?.alias && !cfg?.bank) return null;
              return (
                <div className="bg-blue-50 rounded-lg px-3 py-2 text-xs text-blue-700 space-y-0.5">
                  {cfg.bank && <p>🏦 <span className="font-medium">{cfg.bank}</span></p>}
                  {cfg.alias && <p>Alias: <span className="font-semibold font-mono">{cfg.alias}</span></p>}
                  {cfg.holder && <p>Titular: {cfg.holder}</p>}
                </div>
              );
            })()}
            {/* MP link */}
            {payments.find((p) => p.method === "ONLINE") && orgConfig?.paymentMethods?.mercadopago?.link && (
              <a href={orgConfig.paymentMethods.mercadopago.link} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline">
                🔵 Abrir link de cobro MP →
              </a>
            )}
            {payments.length > 0 && Math.abs(diff) > 0.01 && (
              <p className="text-xs text-rose-600 text-center">{diff > 0 ? `Faltan ${fmt(diff)}` : `Sobran ${fmt(-diff)}`}</p>
            )}
            {/* "Cobrado" toggle — shown when payment method selected */}
            {payments.length > 0 && (
              <button onClick={() => setIsCobrado(!isCobrado)}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl border-2 transition-all ${isCobrado ? "border-emerald-400 bg-emerald-50" : "border-gray-200 bg-gray-50"}`}
              >
                <span className={`text-xs font-semibold ${isCobrado ? "text-emerald-700" : "text-gray-500"}`}>
                  {isCobrado ? "Cobrado" : "Pendiente de cobro"}
                </span>
                <div className={`w-8 h-5 rounded-full flex items-center px-0.5 transition-colors ${isCobrado ? "bg-emerald-500" : "bg-gray-300"}`}>
                  <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${isCobrado ? "translate-x-3" : "translate-x-0"}`} />
                </div>
              </button>
            )}
            {status === "error" && (
              <p className="text-xs text-rose-600 text-center bg-rose-50 rounded-lg px-3 py-2">{message}</p>
            )}
            <div className="flex gap-2">
              <button onClick={() => handleSubmit({ withPayment: false })} disabled={order.length === 0 || status === "loading"}
                className="flex-1 py-2.5 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {status === "loading" ? "..." : "Comandar"}
              </button>
              <button onClick={() => handleSubmit({ withPayment: true })}
                disabled={order.length === 0 || status === "loading" || payments.length === 0 || (isCobrado && Math.abs(diff) > 0.01)}
                className={`flex-1 py-2.5 rounded-xl font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${isCobrado ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-blue-500 hover:bg-blue-600 text-white"}`}
              >
                {status === "loading" ? "..." : isCobrado ? `Cobrar · ${fmt(effectiveTotal)}` : "Guardar método"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );

  // ── Kanban board ───────────────────────────────────────────────────────────
  const kanbanBoard = (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-3 h-full overflow-x-auto p-3 snap-x snap-mandatory md:snap-none">
        {KANBAN_COLUMNS.map((col) => {
          const colOrders = kanbanOrders.filter((o) => o.orderStatus === col.status);
          return (
            <Droppable key={col.status} droppableId={col.status}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`flex flex-col min-w-[82vw] md:min-w-0 md:flex-1 rounded-xl border-2 snap-start transition-shadow ${col.wrapClass} ${snapshot.isDraggingOver ? "ring-2 ring-emerald-400 ring-offset-1" : ""}`}
                >
                  <div className={`px-3 py-2.5 border-b-2 ${col.wrapClass} ${col.headClass} rounded-t-xl shrink-0`}>
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-gray-800 text-sm">{col.label}</h3>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${col.badgeClass}`}>{colOrders.length}</span>
                    </div>
                  </div>

                  <div className={`flex-1 overflow-y-auto p-2 space-y-2 ${col.bodyClass} rounded-b-xl`}>
                    {loadingKanban && colOrders.length === 0 ? (
                      <p className="text-center text-gray-400 text-xs py-6">Cargando...</p>
                    ) : colOrders.length === 0 ? (
                      <p className="text-center text-gray-300 text-xs py-8">Sin pedidos</p>
                    ) : (
                      colOrders.map((ko, idx) => (
                        <Draggable key={ko.id} draggableId={ko.id} index={idx}>
                          {(prov, snap) => (
                            <div
                              ref={prov.innerRef}
                              {...prov.draggableProps}
                              {...prov.dragHandleProps}
                              onClick={() => { if (!snap.isDragging) openDetail(ko); }}
                            className={`bg-white rounded-xl border border-gray-200 p-3 space-y-2 select-none transition-all cursor-pointer ${snap.isDragging ? "shadow-xl rotate-1 opacity-95" : "shadow-sm hover:shadow-md"} ${movingId === ko.id ? "opacity-40 pointer-events-none" : ""}`}
                            >
                              {/* Header */}
                              <div className="flex items-start justify-between gap-1">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    {ko.dailyOrderNumber != null && (
                                      <span className="flex-shrink-0 font-bold text-gray-500 text-xs bg-gray-100 rounded px-1.5 py-0.5 font-mono">
                                        #{ko.dailyOrderNumber}
                                      </span>
                                    )}
                                    <p className="font-semibold text-gray-900 text-sm truncate">
                                      {ko.customer?.name ?? ko.customerName ?? "Anónimo"}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <p className="text-[11px] text-gray-400">{relativeTime(ko.date)}</p>
                                    {ko.delayMinutes != null && ko.delayMinutes > 0 && (
                                      <span className="text-[10px] bg-amber-100 text-amber-700 rounded px-1.5 py-0.5 font-medium flex items-center gap-0.5">
                                        ⏱ ~{ko.delayMinutes}m
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-1 shrink-0">
                                  {ko.orderType !== "SALON" && (
                                    <span className="text-[9px] bg-gray-100 text-gray-600 rounded px-1.5 py-0.5 font-medium uppercase tracking-wide">
                                      {ORDER_TYPE_LABELS[ko.orderType]}
                                    </span>
                                  )}
                                  {!ko.isPaid && (() => {
                                    const paid = ko.payments.reduce((s, p) => s + Number(p.amount), 0);
                                    const owed = Number(ko.total) - paid;
                                    return paid > 0
                                      ? <span className="text-[9px] bg-amber-100 text-amber-700 rounded px-1.5 py-0.5 font-medium">Falta {fmt(owed)}</span>
                                      : <span className="text-[9px] bg-rose-100 text-rose-600 rounded px-1.5 py-0.5 font-medium">Sin cobrar</span>;
                                  })()}
                                </div>
                              </div>

                              {/* Items */}
                              <p className="text-xs text-gray-600 line-clamp-2">
                                {[
                                  ...ko.items.map((i) => `${Number(i.quantity)}× ${i.product.name}`),
                                  ...ko.combos.map((c) => `${Number(c.quantity)}× ${c.combo.name}`),
                                ].join(", ")}
                              </p>

                              {/* Delivery address + repartidor */}
                              {ko.orderType === "DELIVERY" && (ko.deliveryAddress || ko.repartidor) && (
                                <div className="space-y-0.5">
                                  {ko.deliveryAddress && (
                                    <p className="text-[10px] text-amber-700 bg-amber-50 rounded px-2 py-1 truncate">
                                      📍 {ko.deliveryAddress}
                                    </p>
                                  )}
                                  {ko.repartidor && (
                                    <p className="text-[10px] text-blue-700 bg-blue-50 rounded px-2 py-1 truncate">
                                      🛵 {ko.repartidor.name}
                                    </p>
                                  )}
                                </div>
                              )}

                              {/* Total */}
                              <p className="text-sm font-bold text-gray-900">{fmt(Number(ko.total))}</p>

                              {/* Actions */}
                              <div className="flex gap-1.5">
                                {STATUS_NEXT[ko.orderStatus] && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); moveOrder(ko.id, STATUS_NEXT[ko.orderStatus]); }}
                                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${STATUS_NEXT_BTN[ko.orderStatus]}`}
                                  >
                                    {STATUS_NEXT_LABEL[ko.orderStatus]}
                                  </button>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (ko.isPaid) {
                                      unpayOrder(ko.id);
                                    } else {
                                      setCobrandoId(ko.id); setCobrarPayments([]); setCobrarIsCobrado(true);
                                    }
                                  }}
                                  disabled={unpayingId === ko.id}
                                  title={ko.isPaid ? "Cobrado — click para revertir" : "Cobrar"}
                                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${ko.isPaid ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-gray-100 text-gray-700 hover:bg-gray-200"} disabled:opacity-40`}
                                >
                                  <span className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center shrink-0 ${ko.isPaid ? "bg-emerald-500 border-emerald-500" : "border-gray-400"}`}>
                                    {ko.isPaid && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
                                  </span>
                                  {unpayingId === ko.id ? "..." : ko.isPaid ? "Cobrado" : "Cobrar"}
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setCancellingId(ko.id); }}
                                  className="px-2 py-1.5 rounded-lg text-xs font-semibold text-rose-500 hover:bg-rose-50 transition-colors"
                                  title="Cancelar pedido"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))
                    )}
                    {provided.placeholder}
                  </div>
                </div>
              )}
            </Droppable>
          );
        })}
      </div>
    </DragDropContext>
  );

  const cancellingOrder = kanbanOrders.find((o) => o.id === cancellingId);

  return (
    <div className={`h-[calc(100vh-3.5rem)] lg:h-screen flex flex-col overflow-hidden -m-4 md:-m-6 lg:-m-8 ${
      pageTab !== "activos" ? "lg:grid lg:grid-cols-[1fr_360px]" : ""
    }`}>
      {/* ── Left: product grid / kanban ─────────────────────────────────── */}
      <div className="flex flex-col min-h-0 bg-gray-50 flex-1">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 shrink-0 space-y-2" style={{ borderTop: "2px solid #0f2f26" }}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1 p-0.5 bg-gray-100 rounded-lg">
              <button onClick={() => setPageTab("nueva")}
                className="px-3 py-1.5 rounded-md text-xs font-semibold transition-colors"
                style={pageTab === "nueva" ? { background: "#0f2f26", color: "#fff" } : { color: "#6b7280" }}
              >
                Nueva
              </button>
              <button onClick={() => setPageTab("activos")}
                className="px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1"
                style={pageTab === "activos" ? { background: "#0f2f26", color: "#fff" } : { color: "#6b7280" }}
              >
                Activos
                {kanbanOrders.length > 0 && (
                  <span className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-amber-500 text-white text-[10px] font-bold px-1">
                    {kanbanOrders.length}
                  </span>
                )}
              </button>
            </div>

            {pageTab === "nueva" && (
              <button onClick={() => setShowOrder(true)}
                className="lg:hidden relative px-3 py-1.5 text-white text-sm font-semibold rounded-lg"
                style={{ background: "#0f2f26" }}
              >
                Pedido
                {orderCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-rose-500 text-white text-[10px] font-bold px-1">
                    {orderCount}
                  </span>
                )}
              </button>
            )}
          </div>

          {pageTab === "nueva" && (
            <>
              <input type="text" placeholder="Buscar producto o combo..." value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              />
              <div className="flex flex-wrap gap-1">
                <button onClick={() => setTab("all")}
                className="px-3 py-1 rounded-full text-xs font-semibold transition-colors"
                style={tab === "all" ? { background: "#0f2f26", color: "#fff" } : { background: "#f3f4f6", color: "#4b5563" }}
              >Todo</button>
                {categories.map((cat) => (
                  <button key={cat.id} onClick={() => setTab(tab === cat.id ? "all" : cat.id)}
                    className="px-3 py-1 rounded-full text-xs font-semibold transition-colors"
                    style={tab === cat.id ? { backgroundColor: cat.color, color: "#fff" } : { background: "#f3f4f6", color: "#4b5563" }}
                  >
                    {cat.name}
                  </button>
                ))}
                {combos.length > 0 && (
                  <button onClick={() => setTab("combos")}
                    className="px-3 py-1 rounded-full text-xs font-semibold transition-colors"
                    style={tab === "combos" ? { background: "#7c3aed", color: "#fff" } : { background: "#f3f4f6", color: "#4b5563" }}
                  >Combos</button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Content */}
        {pageTab === "nueva" ? (
          <>
            <div className="flex-1 overflow-y-auto p-3">
              {filteredProducts.length === 0 && filteredCombos.length === 0 && (
                <p className="text-center text-gray-400 text-sm py-12">Sin resultados</p>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {filteredProducts.map((prod) => {
                  const inOrder = order.find((o) => o.id === prod.id && o.type === "product");
                  return (
                    <button key={prod.id} onClick={() => addOrIncrement({ id: prod.id, type: "product", name: prod.name, price: prod.salePrice })}
                      className="relative text-left p-3 rounded-xl border-2 transition-all"
                      style={inOrder ? { borderColor: "#0f2f26", background: "#f0f7f4" } : { borderColor: "#f3f4f6", background: "#fff" }}
                    >
                      {inOrder && (
                        <span className="absolute top-1.5 right-1.5 min-w-[20px] h-5 flex items-center justify-center rounded-full bg-emerald-600 text-white text-[10px] font-bold px-1">{inOrder.quantity}</span>
                      )}
                      <p className="text-sm font-semibold text-gray-800 leading-tight line-clamp-2 pr-5">{prod.name}</p>
                      <p className="text-xs font-bold mt-1" style={{ color: "#0f2f26" }}>{fmt(prod.salePrice)}</p>
                    </button>
                  );
                })}
                {filteredCombos.map((combo) => {
                  const inOrder = order.find((o) => o.id === combo.id && o.type === "combo");
                  return (
                    <button key={combo.id} onClick={() => addOrIncrement({ id: combo.id, type: "combo", name: combo.name, price: combo.salePrice })}
                      className="relative text-left p-3 rounded-xl border-2 transition-all"
                      style={inOrder ? { borderColor: "#7c3aed", background: "#f5f3ff" } : { borderColor: "#f3f4f6", background: "#fff" }}
                    >
                      {inOrder && (
                        <span className="absolute top-1.5 right-1.5 min-w-[20px] h-5 flex items-center justify-center rounded-full bg-violet-600 text-white text-[10px] font-bold px-1">{inOrder.quantity}</span>
                      )}
                      <p className="text-sm font-semibold text-gray-800 leading-tight line-clamp-2 pr-5">{combo.name}</p>
                      <p className="text-xs text-violet-600 font-bold mt-1">{fmt(combo.salePrice)}</p>
                      <span className="absolute bottom-1.5 right-1.5 text-[9px] text-violet-400 font-medium">COMBO</span>
                    </button>
                  );
                })}
              </div>
            </div>
            {order.length > 0 && !showOrder && (
              <div className="lg:hidden shrink-0 border-t border-gray-200 bg-white px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">{orderCount} ítem{orderCount !== 1 ? "s" : ""}</p>
                  <p className="text-base font-bold text-gray-900">{fmt(total)}</p>
                </div>
                <button onClick={() => setShowOrder(true)} className="px-5 py-2.5 text-white font-semibold rounded-xl text-sm transition-colors hover:opacity-90" style={{ background: "#0f2f26" }}>
                  Ver pedido →
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 min-h-0">
            {kanbanBoard}
          </div>
        )}
      </div>

      {/* ── Right: order panel (desktop, nueva tab only) ─────────────────── */}
      {pageTab !== "activos" && (
        <div className="hidden lg:flex flex-col border-l border-gray-200 bg-white">
          {orderPanelContent}
        </div>
      )}

      {/* ── Mobile order sheet ───────────────────────────────────────────── */}
      {showOrder && pageTab === "nueva" && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col">
          <div className="bg-black/40 flex-1" onClick={() => status !== "success" && setShowOrder(false)} />
          <div className="bg-white rounded-t-2xl shadow-xl flex flex-col" style={{ maxHeight: "90vh" }}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
              <span className="font-semibold text-gray-900">Pedido</span>
              {status !== "success" && (
                <button onClick={() => setShowOrder(false)} className="text-gray-400 hover:text-gray-600">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto min-h-0">{orderPanelContent}</div>
          </div>
        </div>
      )}

      {/* ── Cobrar modal (kanban) ─────────────────────────────────────────── */}
      {cobrandoId && cobrarOrder && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-0">
          <div className="absolute inset-0 bg-black/50" onClick={() => { setCobrandoId(null); setCobrarPayments([]); }} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
              <div>
                <p className="font-bold text-gray-900">Cobrar pedido</p>
                <p className="text-xs text-gray-400">{cobrarOrder.customer?.name ?? cobrarOrder.customerName ?? "Anónimo"}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xl font-bold text-gray-900">{fmt(cobrarTotal)}</span>
                <button onClick={() => { setCobrandoId(null); setCobrarPayments([]); }} className="text-gray-400 hover:text-gray-600">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto flex-1">
              {/* Cobrar adjustment row */}
              {cobrarPayments.length === 1 && (() => {
                const sel = activePaymentMethods.find((m) => m.value === cobrarPayments[0].method);
                if (!sel?.cfg || sel.cfg.adjustmentType === "none") return null;
                const adjTotal = Math.round(cobrarTotal * (sel.cfg.adjustmentType === "surcharge" ? 1 + sel.cfg.adjustmentPct / 100 : 1 - sel.cfg.adjustmentPct / 100));
                const diff2 = adjTotal - cobrarTotal;
                return (
                  <div className="flex justify-between items-center text-xs bg-gray-50 rounded-lg px-3 py-1.5">
                    <span className="text-gray-500">{sel.cfg.adjustmentType === "discount" ? `Descuento ${sel.cfg.adjustmentPct}%` : `Recargo ${sel.cfg.adjustmentPct}%`}</span>
                    <span className={`font-semibold ${diff2 < 0 ? "text-green-600" : "text-red-500"}`}>
                      {diff2 < 0 ? `−${fmt(-diff2)}` : `+${fmt(diff2)}`} = {fmt(adjTotal)}
                    </span>
                  </div>
                );
              })()}
              <div className={`grid gap-2 ${activePaymentMethods.length <= 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-3"}`}>
                {activePaymentMethods.map((m) => {
                  const sel = cobrarPayments.find((p) => p.method === m.value);
                  return (
                    <button key={m.value} onClick={() => toggleCobrarMethod(m.value)}
                      className={`flex flex-col items-center justify-center py-3 px-1 rounded-xl border-2 transition-all ${sel ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-gray-100 bg-white text-gray-600 hover:border-emerald-200 hover:bg-emerald-50/40"}`}
                    >
                      <span className="text-xl">{m.icon}</span>
                      <span className="text-[10px] font-semibold mt-1 leading-tight text-center">{m.label}</span>
                      {m.cfg?.adjustmentType !== "none" && (
                        <span className={`text-[9px] font-bold ${m.cfg?.adjustmentType === "discount" ? "text-green-500" : "text-red-400"}`}>
                          {m.cfg?.adjustmentType === "discount" ? "−" : "+"}{m.cfg?.adjustmentPct}%
                        </span>
                      )}
                      {sel && (
                        <input type="number" min="0" value={sel.amount}
                          onChange={(e) => { e.stopPropagation(); updateCobrarAmount(m.value, e.target.value); }}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1.5 w-full text-center text-sm font-bold bg-emerald-100 rounded-md px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 tabular-nums"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
              {/* Transfer info in cobrar modal */}
              {cobrarPayments.find((p) => p.method === "TRANSFERENCIA") && (() => {
                const cfg = orgConfig?.paymentMethods?.transfer;
                if (!cfg?.alias && !cfg?.bank) return null;
                return (
                  <div className="bg-blue-50 rounded-lg px-3 py-2 text-xs text-blue-700 space-y-0.5">
                    {cfg.bank && <p>🏦 <span className="font-medium">{cfg.bank}</span></p>}
                    {cfg.alias && <p>Alias: <span className="font-semibold font-mono">{cfg.alias}</span></p>}
                    {cfg.holder && <p>Titular: {cfg.holder}</p>}
                  </div>
                );
              })()}
              {cobrarPayments.find((p) => p.method === "ONLINE") && orgConfig?.paymentMethods?.mercadopago?.link && (
                <a href={orgConfig.paymentMethods.mercadopago.link} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline">
                  🔵 Abrir link de cobro MP →
                </a>
              )}
              {cobrarIsCobrado && cobrarPayments.length > 0 && Math.abs(cobrarEffectiveTotal - sumCobrar) > 0.01 && (
                <p className="text-xs text-rose-600 text-center">
                  {cobrarEffectiveTotal - sumCobrar > 0 ? `Faltan ${fmt(cobrarEffectiveTotal - sumCobrar)}` : `Sobran ${fmt(sumCobrar - cobrarEffectiveTotal)}`}
                </p>
              )}
              {/* Cobrado toggle */}
              <button onClick={() => setCobrarIsCobrado(!cobrarIsCobrado)}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border-2 transition-all ${cobrarIsCobrado ? "border-emerald-400 bg-emerald-50" : "border-gray-200 bg-gray-50"}`}
              >
                <span className={`text-sm font-semibold ${cobrarIsCobrado ? "text-emerald-700" : "text-gray-500"}`}>
                  {cobrarIsCobrado ? "Cobrado" : "Pendiente de cobro"}
                </span>
                <div className={`w-10 h-6 rounded-full flex items-center px-0.5 transition-colors ${cobrarIsCobrado ? "bg-emerald-500" : "bg-gray-300"}`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${cobrarIsCobrado ? "translate-x-4" : "translate-x-0"}`} />
                </div>
              </button>
            </div>
            <div className="p-4 border-t border-gray-100 shrink-0">
              <button onClick={confirmCobrar}
                disabled={cobrarPayments.length === 0 || (cobrarIsCobrado && Math.abs(cobrarEffectiveTotal - sumCobrar) > 0.01) || cobrarStatus === "loading"}
                className={`w-full py-3.5 text-white rounded-xl font-bold text-base disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${cobrarIsCobrado ? "bg-emerald-600 hover:bg-emerald-700" : "bg-blue-500 hover:bg-blue-600"}`}
              >
                {cobrarStatus === "loading" ? "Procesando..." : cobrarIsCobrado ? `Confirmar cobro · ${fmt(cobrarEffectiveTotal)}` : "Guardar método de pago"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Detail modal ─────────────────────────────────────────────────── */}
      {detailId && detailOrder && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDetailId(null)} />
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md flex flex-col max-h-[92vh] sm:max-h-[85vh]">
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3 shrink-0">
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  {detailOrder.dailyOrderNumber != null && (
                    <span className="font-mono font-bold text-gray-500 text-sm bg-gray-100 rounded px-2 py-0.5 shrink-0">
                      #{detailOrder.dailyOrderNumber}
                    </span>
                  )}
                  <input
                    type="text"
                    value={detailEditCustomerName}
                    onChange={(e) => setDetailEditCustomerName(e.target.value)}
                    placeholder="Nombre del pedido..."
                    className="flex-1 min-w-0 font-bold text-gray-900 text-base bg-transparent border-b border-dashed border-gray-300 focus:border-emerald-500 focus:outline-none pb-0.5"
                  />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-gray-400">{relativeTime(detailOrder.date)}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    detailOrder.orderType === "DELIVERY" ? "bg-amber-100 text-amber-700" :
                    detailOrder.orderType === "TAKEAWAY" ? "bg-blue-100 text-blue-700" :
                    "bg-gray-100 text-gray-600"
                  }`}>{ORDER_TYPE_LABELS[detailOrder.orderType]}</span>
                  {!detailOrder.isPaid && (() => {
                    const paid = detailOrder.payments.reduce((s, p) => s + Number(p.amount), 0);
                    const owed = Number(detailOrder.total) - paid;
                    return paid > 0
                      ? <span className="text-[10px] bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 font-semibold">Falta {fmt(owed)}</span>
                      : <span className="text-[10px] bg-rose-100 text-rose-600 rounded-full px-2 py-0.5 font-semibold">Sin cobrar</span>;
                  })()}
                  {detailOrder.isPaid && <span className="text-[10px] bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5 font-semibold">Cobrado</span>}
                </div>
              </div>
              <button onClick={() => setDetailId(null)} className="text-gray-400 hover:text-gray-600 shrink-0 mt-0.5">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
              {/* Editable Items */}
              <div className="px-5 py-4 space-y-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Items</p>
                {detailEditItems.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-2">Sin items</p>
                )}
                {detailEditItems.map((item) => (
                  <div key={`${item.type}-${item.id}`} className="flex items-center gap-2">
                    <span className="flex-1 text-sm text-gray-800 truncate">
                      {item.name}
                      {item.type === "combo" && <span className="ml-1 text-[9px] text-violet-400 font-medium">COMBO</span>}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => detailSetQty(item.id, item.type, item.qty - 1)} className="w-6 h-6 rounded border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 text-xs font-bold">−</button>
                      <span className="w-6 text-center text-sm font-semibold tabular-nums">{item.qty}</span>
                      <button onClick={() => detailSetQty(item.id, item.type, item.qty + 1)} className="w-6 h-6 rounded border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 text-xs font-bold">+</button>
                    </div>
                    <span className="text-sm font-semibold text-gray-700 w-14 text-right shrink-0 tabular-nums">
                      {fmt((item.type === "product" ? (products.find(p => p.id === item.id)?.salePrice ?? 0) : (combos.find(c => c.id === item.id)?.salePrice ?? 0)) * item.qty)}
                    </span>
                    <button onClick={() => detailSetQty(item.id, item.type, 0)} className="text-gray-300 hover:text-rose-500 transition-colors shrink-0">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                ))}

                {/* Item picker */}
                <div className="relative pt-1">
                  <input
                    type="text"
                    placeholder="+ Agregar ítem..."
                    value={detailItemSearch}
                    onChange={(e) => setDetailItemSearch(e.target.value)}
                    className="w-full border border-dashed border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-solid bg-gray-50"
                  />
                  {detailItemSearch && (() => {
                    const q2 = detailItemSearch.toLowerCase();
                    const matchProds  = products.filter(p => p.name.toLowerCase().includes(q2)).slice(0, 5);
                    const matchCombos = combos.filter(c => c.name.toLowerCase().includes(q2)).slice(0, 3);
                    if (matchProds.length === 0 && matchCombos.length === 0) return (
                      <p className="text-xs text-gray-400 text-center py-2">Sin resultados</p>
                    );
                    return (
                      <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                        {matchProds.map(p => (
                          <button key={p.id} onClick={() => detailAddItem({ id: p.id, type: "product", name: p.name, qty: 1 })}
                            className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-emerald-50 text-left transition-colors">
                            <span className="text-gray-800 truncate">{p.name}</span>
                            <span className="text-emerald-600 font-semibold text-xs shrink-0 ml-2">{fmt(p.salePrice)}</span>
                          </button>
                        ))}
                        {matchCombos.map(c => (
                          <button key={c.id} onClick={() => detailAddItem({ id: c.id, type: "combo", name: c.name, qty: 1 })}
                            className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-violet-50 text-left transition-colors">
                            <span className="text-gray-800 truncate">{c.name} <span className="text-[9px] text-violet-400 font-medium">COMBO</span></span>
                            <span className="text-violet-600 font-semibold text-xs shrink-0 ml-2">{fmt(c.salePrice)}</span>
                          </button>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Delivery editable section */}
              {detailOrder.orderType === "DELIVERY" && (
                <div className="px-5 py-4 space-y-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Delivery</p>
                  <input type="text" placeholder="Dirección de entrega..." value={detailEditDeliveryAddress}
                    onChange={(e) => setDetailEditDeliveryAddress(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {repartidores.length > 0 && (
                    <select value={detailEditRepartidorId} onChange={(e) => setDetailEditRepartidorId(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">🛵 Sin repartidor</option>
                      {repartidores.map((r) => (
                        <option key={r.id} value={r.id}>{r.name}{r.phone ? ` · ${r.phone}` : ""}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Total + Payments */}
              <div className="px-5 py-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Total</span>
                  <span className="text-xl font-bold text-gray-900">{fmt(getDetailTotal())}</span>
                </div>
                {detailOrder.orderType === "DELIVERY" && (Number(orgConfig?.deliveryFee) || 0) > 0 && (
                  <p className="text-xs text-amber-600 text-right -mt-2">incl. {fmt(Number(orgConfig?.deliveryFee))} de envío</p>
                )}

                {/* Payment status — clickable checkbox */}
                <button
                  onClick={() => {
                    if (detailOrder.isPaid) {
                      unpayOrder(detailOrder.id);
                    } else {
                      setDetailId(null); setCobrandoId(detailOrder.id); setCobrarPayments([]); setCobrarIsCobrado(true);
                    }
                  }}
                  disabled={unpayingId === detailOrder.id}
                  className={`flex items-center gap-2 text-xs font-semibold rounded-lg px-2.5 py-1.5 border-2 transition-colors disabled:opacity-40 ${detailOrder.isPaid ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"}`}
                >
                  <span className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${detailOrder.isPaid ? "bg-emerald-500 border-emerald-500" : "border-amber-400"}`}>
                    {detailOrder.isPaid && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
                  </span>
                  {unpayingId === detailOrder.id ? "Revirtiendo..." : detailOrder.isPaid ? "Cobrado" : "Pendiente de cobro"}
                </button>
              </div>
            </div>

            {/* Footer: save + actions */}
            <div className="p-4 border-t border-gray-100 shrink-0 space-y-2">
              <button
                onClick={saveDetailEdits}
                disabled={detailSaving || detailEditItems.length === 0}
                className="w-full py-2.5 text-white rounded-xl text-sm font-semibold disabled:opacity-40 transition-colors hover:opacity-90"
                style={{ background: "#0f2f26" }}
              >
                {detailSaving ? "Guardando..." : "Guardar cambios"}
              </button>
              <div className="flex gap-2">
                {STATUS_NEXT[detailOrder.orderStatus] && (
                  <button
                    onClick={async () => { await moveOrder(detailOrder.id, STATUS_NEXT[detailOrder.orderStatus]); setDetailId(null); }}
                    disabled={movingId === detailOrder.id}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40 ${STATUS_NEXT_BTN[detailOrder.orderStatus]}`}
                  >
                    {movingId === detailOrder.id ? "..." : STATUS_NEXT_LABEL[detailOrder.orderStatus]}
                  </button>
                )}
                <button
                  onClick={() => { setDetailId(null); setCancellingId(detailOrder.id); }}
                  className="px-3 py-2 rounded-xl text-sm font-semibold text-rose-500 hover:bg-rose-50 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Cancel dialog ────────────────────────────────────────────────── */}
      {cancellingId && cancellingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setCancellingId(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xs p-5 space-y-4">
            <h3 className="font-bold text-gray-900 text-base">Cancelar pedido</h3>
            <p className="text-sm text-gray-600">
              {cancellingOrder.customer?.name ?? cancellingOrder.customerName ?? "Anónimo"} — {fmt(Number(cancellingOrder.total))}
            </p>

            {(cancellingOrder.orderStatus === "EN_PREPARACION" || cancellingOrder.orderStatus === "LISTO") && (
              <button
                onClick={() => setCancelRollback(!cancelRollback)}
                className={`w-full flex items-center justify-between gap-3 p-3 rounded-xl border-2 transition-all ${cancelRollback ? "border-amber-400 bg-amber-50" : "border-gray-200 bg-gray-50"}`}
              >
                <span className="text-sm font-medium text-gray-700">Devolver stock al inventario</span>
                <div className={`w-10 h-6 rounded-full transition-colors flex items-center px-0.5 ${cancelRollback ? "bg-amber-500" : "bg-gray-300"}`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${cancelRollback ? "translate-x-4" : "translate-x-0"}`} />
                </div>
              </button>
            )}
            {cancellingOrder.isPaid && (
              <button
                onClick={() => setCancelRollbackPayments(!cancelRollbackPayments)}
                className={`w-full flex items-center justify-between gap-3 p-3 rounded-xl border-2 transition-all ${cancelRollbackPayments ? "border-rose-400 bg-rose-50" : "border-gray-200 bg-gray-50"}`}
              >
                <span className="text-sm font-medium text-gray-700">Devolver cobro</span>
                <div className={`w-10 h-6 rounded-full transition-colors flex items-center px-0.5 ${cancelRollbackPayments ? "bg-rose-500" : "bg-gray-300"}`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${cancelRollbackPayments ? "translate-x-4" : "translate-x-0"}`} />
                </div>
              </button>
            )}

            {cancelError && (
              <p className="text-xs text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{cancelError}</p>
            )}

            <div className="flex gap-2">
              <button onClick={() => { setCancellingId(null); setCancelError(null); setCancellingStatus("idle"); setCancelRollbackPayments(true); }} className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-50 transition-colors">
                Volver
              </button>
              <button onClick={confirmCancel} disabled={cancellingStatus === "loading"}
                className="flex-1 py-2.5 bg-rose-600 text-white rounded-xl font-bold text-sm hover:bg-rose-700 disabled:opacity-50 transition-colors"
              >
                {cancellingStatus === "loading" ? "Cancelando..." : cancellingStatus === "error" ? "Reintentar" : "Cancelar pedido"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
