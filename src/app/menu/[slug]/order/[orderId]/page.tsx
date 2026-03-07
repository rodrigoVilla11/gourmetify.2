"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { formatCurrency } from "@/utils/currency";

type OrderStatus = "NUEVO" | "EN_PREPARACION" | "LISTO" | "ENTREGADO" | "CANCELADO";

interface TrackingData {
  org: {
    name: string;
    colorPrimary: string | null;
    addressLat: number | null;
    addressLng: number | null;
    whatsapp: string | null;
    phone: string | null;
  };
  order: {
    id: string;
    orderStatus: OrderStatus;
    orderType: string;
    customerName: string | null;
    customerPhone: string | null;
    deliveryAddress: string | null;
    deliveryLat: number | null;
    deliveryLng: number | null;
    total: number;
    deliveryFee: number | null;
    createdAt: string;
    startedAt: string | null;
    readyAt: string | null;
    deliveredAt: string | null;
    items: { name: string; quantity: number }[];
    combos: { name: string; quantity: number }[];
  };
}

const STEPS: { key: OrderStatus; label: string; sublabel: string; deliveryLabel?: string; deliverySublabel?: string; icon: string }[] = [
  { key: "NUEVO",          label: "Pedido recibido",  sublabel: "El local recibió tu pedido",   icon: "📋" },
  { key: "EN_PREPARACION", label: "En preparación",   sublabel: "Estamos preparando tu pedido", icon: "👨‍🍳" },
  { key: "LISTO",          label: "Listo",            sublabel: "Tu pedido está listo",         deliveryLabel: "En camino", deliverySublabel: "Tu pedido está en camino", icon: "✅", },
  { key: "ENTREGADO",      label: "Entregado",        sublabel: "¡Buen provecho!",              icon: "🎉" },
];

function fmt(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

function statusIndex(s: OrderStatus) {
  return (["NUEVO", "EN_PREPARACION", "LISTO", "ENTREGADO"] as OrderStatus[]).indexOf(s);
}

// ── Leaflet map ────────────────────────────────────────────────────────────────

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    L: any;
  }
}

function makeIcon(L: Window["L"], color: string, label: string) {
  return L.divIcon({
    className: "",
    html: `<div style="background:${color};color:#fff;width:36px;height:36px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3)">
             <span style="transform:rotate(45deg);font-size:14px;font-weight:700">${label}</span>
           </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -40],
  });
}

function MapWidget({ orgLat, orgLng, orgName, deliveryLat, deliveryLng, deliveryAddress, primary }: {
  orgLat: number; orgLng: number; orgName: string;
  deliveryLat: number | null; deliveryLng: number | null; deliveryAddress: string | null;
  primary: string;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    function initMap() {
      if (!mapRef.current || !window.L) return;
      const L = window.L;
      const map = L.map(mapRef.current, { zoomControl: true, scrollWheelZoom: false });
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      const orgMarker = L.marker([orgLat, orgLng], { icon: makeIcon(L, primary, "🏠") }).addTo(map);
      orgMarker.bindPopup(`<strong>${orgName}</strong>`);

      if (deliveryLat && deliveryLng) {
        const custMarker = L.marker([deliveryLat, deliveryLng], { icon: makeIcon(L, "#3B82F6", "📍") }).addTo(map);
        if (deliveryAddress) custMarker.bindPopup(deliveryAddress);
        const bounds = L.latLngBounds([[orgLat, orgLng], [deliveryLat, deliveryLng]]);
        map.fitBounds(bounds, { padding: [48, 48] });
      } else {
        map.setView([orgLat, orgLng], 14);
      }
    }

    if (!document.querySelector("link[data-leaflet]")) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      link.setAttribute("data-leaflet", "1");
      document.head.appendChild(link);
    }

    if (window.L) {
      initMap();
    } else if (!document.querySelector("script[data-leaflet]")) {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.setAttribute("data-leaflet", "1");
      script.onload = initMap;
      document.head.appendChild(script);
    } else {
      // Script tag exists but not loaded yet — wait
      document.querySelector("script[data-leaflet]")?.addEventListener("load", initMap);
    }

    return () => {
      if (mapInstanceRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (mapInstanceRef.current as any).remove();
        mapInstanceRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={mapRef}
      className="w-full rounded-2xl overflow-hidden border border-gray-100 shadow-sm"
      style={{ height: 220 }}
    />
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function OrderTrackingPage() {
  const { slug, orderId } = useParams<{ slug: string; orderId: string }>();
  const [data, setData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/public/${slug}/order/${orderId}`);
      if (!res.ok) { setError("Pedido no encontrado"); return; }
      setData(await res.json());
      setLastUpdated(new Date());
    } catch {
      setError("Error al cargar el pedido");
    } finally {
      setLoading(false);
    }
  }, [slug, orderId]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(() => {
      setData((prev) => {
        if (prev?.order.orderStatus === "ENTREGADO" || prev?.order.orderStatus === "CANCELADO") return prev;
        fetchStatus();
        return prev;
      });
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f6f7f7]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#E5E7EB", borderTopColor: "#111827" }} />
        <p className="text-sm text-gray-400">Cargando tu pedido...</p>
      </div>
    </div>
  );

  if (error || !data) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f6f7f7] px-4">
      <div className="text-center">
        <p className="text-5xl mb-4">🔍</p>
        <p className="text-xl font-bold text-gray-800 mb-2">Pedido no encontrado</p>
        <p className="text-gray-400 text-sm">{error}</p>
      </div>
    </div>
  );

  const { org, order } = data;
  const primary = org.colorPrimary ?? "#111827";
  const isCancelled = order.orderStatus === "CANCELADO";
  const currentIdx = isCancelled ? -1 : statusIndex(order.orderStatus);
  const isDelivery = order.orderType === "DELIVERY";

  const timestamps: Partial<Record<OrderStatus, string>> = {
    NUEVO: fmt(order.createdAt),
    EN_PREPARACION: fmt(order.startedAt),
    LISTO: fmt(order.readyAt),
    ENTREGADO: fmt(order.deliveredAt),
  };

  const allItems = [
    ...order.items.map((i) => ({ name: i.name, quantity: i.quantity })),
    ...order.combos.map((c) => ({ name: c.name, quantity: c.quantity })),
  ];

  const waContact = org.whatsapp || org.phone;
  const waNumber = waContact?.replace(/\D/g, "");

  const showMap = isDelivery && org.addressLat && org.addressLng;

  return (
    <div className="min-h-screen bg-[#f6f7f7] pb-10">

      {/* Header */}
      <div className="w-full px-4 pt-10 pb-6 text-center" style={{ backgroundColor: primary }}>
        <p className="text-white/70 text-sm font-medium mb-1">{org.name}</p>
        <h1 className="text-white text-2xl font-bold">Seguí tu pedido</h1>
        <p className="text-white/60 text-xs mt-1 font-mono">#{order.id.slice(-6).toUpperCase()}</p>
      </div>

      <div className="max-w-sm mx-auto px-4 py-5 space-y-4">

        {/* Cancelled */}
        {isCancelled && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-center">
            <p className="text-4xl mb-2">❌</p>
            <p className="font-bold text-red-700 text-lg">Pedido cancelado</p>
            <p className="text-red-500 text-sm mt-1">El local canceló este pedido.</p>
          </div>
        )}

        {/* Timeline */}
        {!isCancelled && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            {STEPS.map((step, idx) => {
              const done = idx <= currentIdx;
              const active = idx === currentIdx;
              const isLast = idx === STEPS.length - 1;
              const label = isDelivery && step.deliveryLabel ? step.deliveryLabel : step.label;
              const sublabel = isDelivery && step.deliverySublabel ? step.deliverySublabel : step.sublabel;
              const ts = timestamps[step.key];
              return (
                <div key={step.key} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-sm shrink-0 transition-all duration-500"
                      style={done
                        ? { backgroundColor: primary, color: "#fff" }
                        : { backgroundColor: "#F3F4F6", color: "#9CA3AF" }
                      }
                    >
                      {active ? (
                        <span className="text-base">{step.icon}</span>
                      ) : done ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-gray-300 block" />
                      )}
                    </div>
                    {!isLast && (
                      <div
                        className="w-0.5 flex-1 my-1 min-h-[24px] transition-colors duration-500"
                        style={{ backgroundColor: idx < currentIdx ? primary : "#E5E7EB" }}
                      />
                    )}
                  </div>
                  <div className={`flex-1 ${isLast ? "pb-0" : "pb-5"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className="font-semibold text-sm"
                        style={active ? { color: primary } : done ? undefined : { color: "#9CA3AF" }}
                      >
                        {label}
                      </p>
                      {ts && <p className="text-xs text-gray-400 shrink-0">{ts}</p>}
                    </div>
                    {active && <p className="text-xs text-gray-400 mt-0.5">{sublabel}</p>}
                    {active && order.orderStatus === "EN_PREPARACION" && (
                      <div className="mt-2 flex gap-1">
                        {[0,1,2].map((i) => (
                          <span key={i} className="w-2 h-2 rounded-full inline-block animate-bounce" style={{ backgroundColor: primary, animationDelay: `${i * 0.15}s` }} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Map */}
        {showMap && (
          <MapWidget
            orgLat={org.addressLat!}
            orgLng={org.addressLng!}
            orgName={org.name}
            deliveryLat={order.deliveryLat}
            deliveryLng={order.deliveryLng}
            deliveryAddress={order.deliveryAddress}
            primary={primary}
          />
        )}

        {/* Customer + restaurant info */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-3">
          {/* Customer */}
          {order.customerName && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: primary + "22" }}>
                <svg className="w-4.5 h-4.5" style={{ width: 18, height: 18, color: primary }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-400">Cliente</p>
                <p className="text-sm font-semibold text-gray-800">{order.customerName}</p>
                {order.customerPhone && (
                  <a href={`tel:${order.customerPhone}`} className="text-xs text-blue-500 hover:underline">{order.customerPhone}</a>
                )}
              </div>
            </div>
          )}

          {/* Divider */}
          {order.customerName && waNumber && <div className="border-t border-gray-100" />}

          {/* WhatsApp restaurant button */}
          {waNumber && (
            <a
              href={`https://wa.me/${waNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all active:scale-[0.98]"
              style={{ backgroundColor: "#25D36611" }}
            >
              <svg viewBox="0 0 24 24" className="w-6 h-6 shrink-0" style={{ fill: "#25D366" }}>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              <div>
                <p className="text-sm font-semibold" style={{ color: "#25D366" }}>Escribir al local</p>
                <p className="text-xs text-gray-400">{org.name}</p>
              </div>
              <svg className="w-4 h-4 ml-auto text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </a>
          )}
        </div>

        {/* Order summary */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-2">
          <p className="text-sm font-bold text-gray-700 mb-3">Tu pedido</p>
          {allItems.map((item, i) => (
            <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-50 last:border-0">
              <span className="text-gray-700">{item.name}</span>
              <span className="text-gray-400 font-medium">× {item.quantity}</span>
            </div>
          ))}
          {order.deliveryFee != null && order.deliveryFee > 0 && (
            <div className="flex justify-between text-sm text-gray-400 pt-1">
              <span>Envío</span>
              <span>{formatCurrency(order.deliveryFee, "ARS")}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-100">
            <span>Total</span>
            <span style={{ color: primary }}>{formatCurrency(order.total, "ARS")}</span>
          </div>
          {order.deliveryAddress && (
            <p className="text-xs text-gray-400 pt-1 flex items-start gap-1.5">
              <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {order.deliveryAddress}
            </p>
          )}
        </div>

        {/* Refresh footer */}
        {!isCancelled && order.orderStatus !== "ENTREGADO" && (
          <div className="flex items-center justify-between text-xs text-gray-400 px-1">
            <span>Actualización automática cada 30s</span>
            <button
              onClick={fetchStatus}
              className="flex items-center gap-1 hover:text-gray-600 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Actualizar
            </button>
          </div>
        )}

        {order.orderStatus === "ENTREGADO" && (
          <div className="text-center py-4">
            <p className="text-3xl mb-1">🎉</p>
            <p className="text-sm font-semibold text-gray-700">¡Gracias por tu pedido!</p>
          </div>
        )}
      </div>
    </div>
  );
}
