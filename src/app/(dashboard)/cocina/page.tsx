"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ── Types ──────────────────────────────────────────────────────────────────────
interface KitchenItem {
  productId: string;
  quantity: number;
  isUnavailable: boolean;
  product: { name: string };
}

interface KitchenCombo {
  id: string;
  quantity: number;
  combo: { name: string };
}

interface KitchenOrder {
  id: string;
  date: string;
  orderType: string;
  orderStatus: string;
  customerName: string | null;
  notes: string | null;
  delayMinutes: number | null;
  dailyOrderNumber: number | null;
  total: number;
  items: KitchenItem[];
  combos: KitchenCombo[];
  startedAt: string | null;
  readyAt: string | null;
}

// ── Constants ──────────────────────────────────────────────────────────────────
const COLUMNS = [
  {
    status: "NUEVO",
    label: "Nuevas",
    borderColor: "border-amber-500/40",
    bgColor: "bg-amber-500/10",
    textColor: "text-amber-300",
    dotColor: "bg-amber-400",
    cardBorder: "border-amber-500/25",
  },
  {
    status: "EN_PREPARACION",
    label: "En preparación",
    borderColor: "border-blue-500/40",
    bgColor: "bg-blue-500/10",
    textColor: "text-blue-300",
    dotColor: "bg-blue-400",
    cardBorder: "border-blue-500/25",
  },
  {
    status: "LISTO",
    label: "Listos",
    borderColor: "border-emerald-500/40",
    bgColor: "bg-emerald-500/10",
    textColor: "text-emerald-300",
    dotColor: "bg-emerald-400",
    cardBorder: "border-emerald-500/25",
  },
] as const;

const NEXT_STATUS: Record<string, string> = {
  NUEVO: "EN_PREPARACION",
  EN_PREPARACION: "LISTO",
  LISTO: "ENTREGADO",
};

const NEXT_LABEL: Record<string, string> = {
  NUEVO: "Tomar orden",
  EN_PREPARACION: "Marcar listo",
  LISTO: "Marcar entregado",
};

const NEXT_BTN: Record<string, string> = {
  NUEVO: "bg-blue-600 hover:bg-blue-500 text-white",
  EN_PREPARACION: "bg-emerald-600 hover:bg-emerald-500 text-white",
  LISTO: "bg-gray-600 hover:bg-gray-500 text-white",
};

const NEXT_BTN_ALLREADY: Record<string, string> = {
  NUEVO: "bg-blue-600 hover:bg-blue-500 text-white ring-2 ring-blue-400/60 ring-offset-1 ring-offset-[#0f1f1a]",
  EN_PREPARACION: "bg-emerald-500 hover:bg-emerald-400 text-white ring-2 ring-emerald-400/60 ring-offset-1 ring-offset-[#0f1f1a] animate-pulse",
  LISTO: "bg-gray-600 hover:bg-gray-500 text-white",
};

const ORDER_TYPE_LABEL: Record<string, string> = {
  SALON: "Salón",
  DELIVERY: "Delivery",
  TAKEAWAY: "Para llevar",
};

const ORDER_TYPE_COLOR: Record<string, string> = {
  SALON: "bg-violet-500/20 text-violet-300",
  DELIVERY: "bg-orange-500/20 text-orange-300",
  TAKEAWAY: "bg-cyan-500/20 text-cyan-300",
};

const REFRESH_MS = 15_000;

// ── Audio ──────────────────────────────────────────────────────────────────────
function playBeep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
    setTimeout(() => ctx.close(), 1500);
  } catch { /* ignore */ }
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

function minsAgo(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
}

function elapsedLabel(mins: number) {
  if (mins < 1) return "ahora";
  if (mins === 1) return "1 min";
  return `${mins} min`;
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function CocinaPage() {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [soundOn, setSoundOn] = useState(true);
  const [updating, setUpdating] = useState<Set<string>>(new Set());
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Local "done" state per order: orderId → Set of done productIds
  const [doneItems, setDoneItems] = useState<Record<string, Set<string>>>({});
  const prevIds = useRef<Set<string>>(new Set());
  const soundRef = useRef(soundOn);
  const containerRef = useRef<HTMLDivElement>(null);
  soundRef.current = soundOn;

  const fetchOrders = useCallback(async (initial = false) => {
    try {
      const res = await fetch(
        "/api/sales?orderStatus=NUEVO,EN_PREPARACION,LISTO&limit=100",
        { cache: "no-store" }
      );
      if (!res.ok) return;
      const json = await res.json();
      const newOrders: KitchenOrder[] = (json.data ?? []).map((o: KitchenOrder) => ({
        ...o,
        items: (o.items ?? []).map((item) => ({ ...item, isUnavailable: item.isUnavailable ?? false })),
      }));

      if (!initial) {
        const newIds = new Set(newOrders.map((o) => o.id));
        const hasNew = newOrders.some((o) => !prevIds.current.has(o.id));
        if (hasNew && soundRef.current && prevIds.current.size > 0) {
          playBeep();
        }
        prevIds.current = newIds;
      } else {
        prevIds.current = new Set(newOrders.map((o) => o.id));
      }

      setOrders(newOrders);
      setLastRefresh(new Date());
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrders(true); }, [fetchOrders]);
  useEffect(() => {
    const id = setInterval(() => fetchOrders(false), REFRESH_MS);
    return () => clearInterval(id);
  }, [fetchOrders]);

  // ── Actions ──────────────────────────────────────────────────────────────────
  async function advanceStatus(orderId: string, nextStatus: string) {
    setUpdating((s) => new Set(s).add(orderId));
    try {
      await fetch(`/api/sales/${orderId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      // Clear local done state for this order when it advances
      setDoneItems((prev) => { const n = { ...prev }; delete n[orderId]; return n; });
      await fetchOrders(true);
    } finally {
      setUpdating((s) => { const n = new Set(s); n.delete(orderId); return n; });
    }
  }

  async function setDelay(orderId: string, mins: number) {
    const clamped = Math.max(0, mins);
    setOrders((prev) =>
      prev.map((o) => o.id === orderId ? { ...o, delayMinutes: clamped || null } : o)
    );
    try {
      await fetch(`/api/sales/${orderId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delayMinutes: clamped || null }),
      });
    } catch { /* silent */ }
  }

  async function toggle86(orderId: string, productId: string, isUnavailable: boolean) {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? { ...o, items: o.items.map((i) => i.productId === productId ? { ...i, isUnavailable } : i) }
          : o
      )
    );
    try {
      await fetch(`/api/sales/${orderId}/items`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, isUnavailable }),
      });
    } catch { /* silent */ }
  }

  function toggleDone(orderId: string, productId: string) {
    setDoneItems((prev) => {
      const set = new Set(prev[orderId] ?? []);
      if (set.has(productId)) set.delete(productId);
      else set.add(productId);
      return { ...prev, [orderId]: set };
    });
  }

  useEffect(() => {
    const onFsChange = () => {
      if (!document.fullscreenElement) setIsFullscreen(false);
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  function toggleFullscreen() {
    if (!isFullscreen) {
      setIsFullscreen(true);
      containerRef.current?.requestFullscreen().catch(() => {});
    } else {
      setIsFullscreen(false);
      if (document.fullscreenElement) document.exitFullscreen();
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  const refreshSecs = Math.round((Date.now() - lastRefresh.getTime()) / 1000);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center text-white/50">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white/70 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Cargando monitor de cocina...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`flex flex-col ${isFullscreen ? "fixed inset-0 z-[9999] bg-[#0f1f1a]" : "h-full"}`}
      style={isFullscreen ? undefined : { minHeight: "calc(100vh - 56px)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-[#0f1f1a] flex-shrink-0">
        <div className="flex items-center gap-3">
          <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <div>
            <h1 className="font-bold text-base leading-none text-white">Monitor de Cocina</h1>
            <p className="text-white/40 text-xs mt-0.5">
              Actualizado hace {refreshSecs}s · auto-refresca cada {REFRESH_MS / 1000}s
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundOn((v) => !v)}
            title={soundOn ? "Silenciar alertas" : "Activar alertas de sonido"}
            className={`p-2 rounded-lg text-sm transition-colors ${
              soundOn ? "bg-emerald-600/25 text-emerald-300 hover:bg-emerald-600/40" : "bg-white/8 text-white/35 hover:bg-white/15"
            }`}
          >
            {soundOn ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 6v12m-3.536-9.536a4 4 0 000 5.072M6.343 6.343a8 8 0 000 11.314" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            )}
          </button>

          <button
            onClick={() => fetchOrders(true)}
            title="Refrescar ahora"
            className="p-2 rounded-lg bg-white/8 hover:bg-white/15 text-white/60 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
            className="p-2 rounded-lg bg-white/8 hover:bg-white/15 text-white/60 hover:text-white transition-colors"
          >
            {isFullscreen ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4m0 5H4m0 0l5-5M9 15v5m0-5H4m0 0l5 5m6-10h5m-5 0V4m0 5l5-5m0 11h-5m5 0v5m0-5l-5 5" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Kanban */}
      <div className="flex-1 flex gap-3 p-4 overflow-hidden">
        {COLUMNS.map((col) => {
          const colOrders = orders
            .filter((o) => o.orderStatus === col.status)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

          return (
            <div key={col.status} className="flex-1 flex flex-col min-w-0">
              {/* Column header */}
              <div className={`flex items-center gap-2 mb-3 px-3 py-2 rounded-xl border ${col.borderColor} ${col.bgColor}`}>
                <span className={`w-2.5 h-2.5 rounded-full ${col.dotColor} flex-shrink-0`} />
                <span className={`font-semibold text-sm ${col.textColor}`}>{col.label}</span>
                <span className={`ml-auto text-xs font-bold ${col.textColor} bg-white/10 rounded-full px-2 py-0.5`}>
                  {colOrders.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-0.5">
                {colOrders.length === 0 && (
                  <p className="text-center text-white/25 text-sm mt-10">Sin órdenes</p>
                )}
                {colOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    colStatus={col.status as "NUEVO" | "EN_PREPARACION" | "LISTO"}
                    cardBorder={col.cardBorder}
                    isUpdating={updating.has(order.id)}
                    doneSet={doneItems[order.id] ?? new Set()}
                    onAdvance={() => advanceStatus(order.id, NEXT_STATUS[order.orderStatus])}
                    onDelayChange={(mins) => setDelay(order.id, mins)}
                    onToggle86={(pid, unavail) => toggle86(order.id, pid, unavail)}
                    onToggleDone={(pid) => toggleDone(order.id, pid)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── OrderCard ──────────────────────────────────────────────────────────────────
interface OrderCardProps {
  order: KitchenOrder;
  colStatus: "NUEVO" | "EN_PREPARACION" | "LISTO";
  cardBorder: string;
  isUpdating: boolean;
  doneSet: Set<string>;
  onAdvance: () => void;
  onDelayChange: (mins: number) => void;
  onToggle86: (productId: string, isUnavailable: boolean) => void;
  onToggleDone: (productId: string) => void;
}

function OrderCard({
  order, colStatus, cardBorder, isUpdating,
  doneSet, onAdvance, onDelayChange, onToggle86, onToggleDone,
}: OrderCardProps) {
  const elapsed = minsAgo(order.date);
  const delay = order.delayMinutes ?? 0;
  const isOverdue = delay > 0 && elapsed > delay;
  const hasUnavailable = order.items.some((i) => i.isUnavailable);

  // Available items (not 86'd) — these are the ones the cook tracks with "done"
  const availableItems = order.items.filter((i) => !i.isUnavailable);
  const allDone = availableItems.length > 0 &&
    availableItems.every((i) => doneSet.has(i.productId));
  const donePct = availableItems.length === 0 ? 0 :
    Math.round((availableItems.filter((i) => doneSet.has(i.productId)).length / availableItems.length) * 100);

  return (
    <div
      className={`rounded-xl border bg-[#0f1f1a] overflow-hidden transition-shadow ${
        isOverdue
          ? "border-red-500/50 shadow-[0_0_0_1px_rgba(239,68,68,0.2)]"
          : hasUnavailable
          ? "border-amber-500/35"
          : cardBorder
      }`}
    >
      {/* Card header */}
      <div className="flex items-start justify-between px-3 pt-3 pb-2 gap-2">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          {/* Daily number — prominent */}
          <span className="flex-shrink-0 font-mono font-black text-white text-base leading-none bg-white/10 rounded-lg px-2 py-1">
            #{order.dailyOrderNumber ?? order.id.slice(-3).toUpperCase()}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ORDER_TYPE_COLOR[order.orderType] ?? "bg-white/10 text-white/50"}`}>
            {ORDER_TYPE_LABEL[order.orderType] ?? order.orderType}
          </span>
          {order.customerName && (
            <span className="text-white/55 text-xs truncate max-w-[110px]">{order.customerName}</span>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs text-white/45 leading-none">{timeOf(order.date)}</p>
          <p className={`text-xs font-medium mt-0.5 ${
            elapsed > 20 ? "text-red-400" : elapsed > 10 ? "text-amber-400" : "text-white/35"
          }`}>
            {elapsedLabel(elapsed)}
          </p>
        </div>
      </div>

      {/* Notes */}
      {order.notes && (
        <div className="mx-3 mb-2 px-2.5 py-1.5 bg-amber-400/8 border border-amber-400/20 rounded-lg text-amber-200/80 text-xs">
          {order.notes}
        </div>
      )}

      {/* Progress bar (only in EN_PREPARACION) */}
      {colStatus === "EN_PREPARACION" && availableItems.length > 0 && (
        <div className="mx-3 mb-2">
          <div className="h-1 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300 bg-emerald-500"
              style={{ width: `${donePct}%` }}
            />
          </div>
        </div>
      )}

      {/* Items */}
      <div className="px-3 pb-2 space-y-1.5">
        {order.items.map((item) => {
          const isDone = doneSet.has(item.productId);
          return (
            <div key={item.productId} className={`flex items-center gap-2 rounded-lg px-1 py-0.5 transition-colors ${isDone ? "bg-emerald-500/8" : ""}`}>
              {/* Done toggle */}
              <button
                onClick={() => !item.isUnavailable && onToggleDone(item.productId)}
                disabled={item.isUnavailable}
                title={isDone ? "Desmarcar" : "Marcar como listo"}
                className={`flex-shrink-0 w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${
                  item.isUnavailable
                    ? "border-white/10 bg-white/5 opacity-30 cursor-not-allowed"
                    : isDone
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-white/25 bg-transparent hover:border-emerald-400"
                }`}
              >
                {isDone && (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>

              {/* Item name */}
              <span className={`text-sm flex-1 leading-snug transition-colors ${
                item.isUnavailable
                  ? "line-through text-white/25"
                  : isDone
                  ? "text-emerald-300/70"
                  : "text-white/85"
              }`}>
                <span className={`font-medium ${item.isUnavailable || isDone ? "opacity-50" : "text-white/50"}`}>
                  {Number(item.quantity)}×
                </span>{" "}
                {item.product.name}
              </span>

              {/* 86 toggle */}
              <button
                onClick={() => onToggle86(item.productId, !item.isUnavailable)}
                title={item.isUnavailable ? "Marcar disponible" : "Sin stock (86)"}
                className={`flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-md border transition-colors ${
                  item.isUnavailable
                    ? "bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30"
                    : "bg-transparent border-white/10 text-white/20 hover:border-red-500/40 hover:text-red-400/60"
                }`}
              >
                86
              </button>
            </div>
          );
        })}

        {order.combos.map((combo) => (
          <div key={combo.id} className="flex items-center gap-2 px-1">
            <span className="flex-shrink-0 w-5 h-5 rounded-md border border-violet-400/35 bg-violet-400/10 flex items-center justify-center text-[10px] text-violet-400 font-bold">
              C
            </span>
            <span className="text-sm text-white/85">
              <span className="text-white/50 font-medium">{Number(combo.quantity)}×</span>{" "}
              {combo.combo.name}
            </span>
          </div>
        ))}
      </div>

      <div className="mx-3 border-t border-white/6" />

      {/* Delay row */}
      <div className="flex items-center gap-1.5 px-3 py-2">
        <svg className="w-3.5 h-3.5 text-white/35 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-white/40 text-xs">Demora</span>
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => onDelayChange(delay - 5)}
            disabled={delay <= 0}
            className="w-6 h-6 rounded bg-white/8 hover:bg-white/15 text-white/60 text-sm flex items-center justify-center disabled:opacity-30 transition-colors"
          >
            −
          </button>
          <span className={`text-sm font-mono w-14 text-center ${isOverdue ? "text-red-400 font-semibold" : "text-white/70"}`}>
            {delay > 0 ? `~${delay}m` : "—"}
          </span>
          <button
            onClick={() => onDelayChange(delay + 5)}
            className="w-6 h-6 rounded bg-white/8 hover:bg-white/15 text-white/60 text-sm flex items-center justify-center transition-colors"
          >
            +
          </button>
          {delay > 0 && (
            <button
              onClick={() => onDelayChange(0)}
              title="Quitar demora"
              className="w-6 h-6 rounded bg-white/8 hover:bg-red-500/20 text-white/40 hover:text-red-400 text-xs flex items-center justify-center transition-colors"
            >
              ✕
            </button>
          )}
        </div>
        {isOverdue && (
          <span className="text-xs bg-red-500/15 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded-full ml-1 flex-shrink-0">
            Demorado
          </span>
        )}
      </div>

      {/* Advance button */}
      {NEXT_STATUS[colStatus] && (
        <div className="px-3 pb-3">
          <button
            onClick={onAdvance}
            disabled={isUpdating}
            className={`w-full py-2 rounded-lg text-sm font-semibold transition-all ${
              allDone ? NEXT_BTN_ALLREADY[colStatus] : NEXT_BTN[colStatus]
            } disabled:opacity-40`}
          >
            {isUpdating ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-3.5 h-3.5 border border-white/30 border-t-white rounded-full animate-spin" />
                Guardando...
              </span>
            ) : (
              NEXT_LABEL[colStatus]
            )}
          </button>
        </div>
      )}
    </div>
  );
}
