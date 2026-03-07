"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { PLAN_LABELS, PLAN_COLORS, type Plan } from "@/lib/plans";

// ── Types ──────────────────────────────────────────────────────────────────────

const CATEGORY_OPTIONS = [
  "Restaurante", "Bar", "Cafetería", "Pizzería",
  "Panadería / Pastelería", "Hamburguesería", "Delivery / Sushi", "Otro",
];

const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mon–Sat, then Sun

interface PaymentMethodConfig {
  enabled: boolean;
  adjustmentType: "none" | "discount" | "surcharge";
  adjustmentPct: number;
}
interface TransferConfig extends PaymentMethodConfig {
  alias: string; bank: string; holder: string;
}
interface MpConfig extends PaymentMethodConfig {
  link: string; // TODO: integrar API de Mercado Pago
}
interface PaymentMethods {
  cash: PaymentMethodConfig;
  transfer: TransferConfig;
  mercadopago: MpConfig;
  debit: PaymentMethodConfig;   // TODO: plataforma de pago
  credit: PaymentMethodConfig;  // TODO: plataforma de pago
}
interface DayHours {
  isClosed: boolean; open: string; close: string;
  hasSecondShift?: boolean; open2?: string; close2?: string;
}
interface Modalities { salon: boolean; delivery: boolean; takeaway: boolean; }

interface OrgProfile {
  id: string; name: string; slug: string;
  logoUrl: string | null; website: string | null; instagram: string | null;
  phone: string | null; address: string | null; category: string | null;
  description: string | null; whatsapp: string | null;
  plan: Plan; planExpiresAt: string | null;
  paymentMethods: PaymentMethods | null;
  businessHours: DayHours[] | null;
  modalities: Modalities | null;
  colorPrimary: string | null; colorSecondary: string | null; colorAccent: string | null;
  coverImageUrl: string | null;
  deliveryFee: number | null;
  addressLat: number | null;
  addressLng: number | null;
}

interface DeliveryZone {
  id: string;
  name: string;
  price: number | string;
  zoneType: string;
  radiusKm: number | null;
  polygon: { lat: number; lng: number }[] | null;
  color: string;
  sortOrder: number;
}

const ZONE_COLORS = ["#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899"];

// ── Defaults ───────────────────────────────────────────────────────────────────

const DEFAULT_PM: PaymentMethods = {
  cash:        { enabled: true,  adjustmentType: "none", adjustmentPct: 0 },
  transfer:    { enabled: false, adjustmentType: "none", adjustmentPct: 0, alias: "", bank: "", holder: "" },
  mercadopago: { enabled: false, adjustmentType: "none", adjustmentPct: 0, link: "" },
  debit:       { enabled: false, adjustmentType: "none", adjustmentPct: 0 },
  credit:      { enabled: false, adjustmentType: "none", adjustmentPct: 0 },
};

const DEFAULT_BH: DayHours[] = Array.from({ length: 7 }, (_, i) => ({
  isClosed: i === 0,
  open: "09:00", close: "22:00",
  hasSecondShift: false, open2: "20:00", close2: "23:00",
}));

const DEFAULT_MOD: Modalities = { salon: true, delivery: false, takeaway: false };

// ── Helpers ────────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0"
      style={{ backgroundColor: checked ? "#0f2f26" : "#d1d5db" }}
    >
      <span
        className="inline-block h-4 w-4 rounded-full bg-white shadow transition-transform"
        style={{ transform: checked ? "translateX(1.375rem)" : "translateX(0.125rem)" }}
      />
    </button>
  );
}

function ColorPicker({
  label, value, onChange,
}: { label: string; value: string; onChange: (v: string) => void }) {
  const [hex, setHex] = useState(value || "#000000");

  useEffect(() => { setHex(value || "#000000"); }, [value]);

  const handleHex = (v: string) => {
    setHex(v);
    if (/^#[0-9a-fA-F]{6}$/.test(v)) onChange(v);
  };

  return (
    <div className="flex items-center gap-3">
      <label className="text-sm font-medium text-gray-700 w-36 shrink-0">{label}</label>
      <input
        type="color"
        value={hex}
        onChange={(e) => { setHex(e.target.value); onChange(e.target.value); }}
        className="h-9 w-12 rounded-lg border border-gray-200 cursor-pointer p-0.5"
      />
      <input
        type="text"
        value={hex}
        onChange={(e) => handleHex(e.target.value)}
        maxLength={7}
        className="w-28 border border-gray-300 rounded-lg px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
        placeholder="#000000"
      />
      <span
        className="h-9 w-9 rounded-lg border border-gray-200 shrink-0"
        style={{ backgroundColor: hex }}
      />
    </div>
  );
}

// ── Cloudinary crop helper ─────────────────────────────────────────────────────

function buildCloudinaryUrl(url: string, transform: string): string {
  return url.replace("/image/upload/", `/image/upload/${transform}/`);
}

function ImageUploadCrop({
  value, onChange, folder, aspect, label, previewClass,
}: {
  value: string; onChange: (url: string) => void;
  folder: string; aspect: number; label: string; previewClass?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; startOx: number; startOy: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [cropUrl, setCropUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [imgNatural, setImgNatural] = useState({ w: 0, h: 0 });

  const PREVIEW_W = 400;
  const PREVIEW_H = Math.round(PREVIEW_W / aspect);

  const baseScale = imgNatural.w > 0
    ? Math.max(PREVIEW_W / imgNatural.w, PREVIEW_H / imgNatural.h)
    : 1;

  function clampOff(ox: number, oy: number, z: number) {
    const dw = imgNatural.w * baseScale * z;
    const dh = imgNatural.h * baseScale * z;
    return {
      x: Math.max(Math.min(PREVIEW_W - dw, 0), Math.min(0, ox)),
      y: Math.max(Math.min(PREVIEW_H - dh, 0), Math.min(0, oy)),
    };
  }

  const displayW = imgNatural.w * baseScale * zoom;
  const displayH = imgNatural.h * baseScale * zoom;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/upload?folder=${folder}`, { method: "POST", body: fd });
      if (!res.ok) return;
      const { url } = await res.json();
      setCropUrl(url);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setImgNatural({ w: 0, h: 0 });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function applyCrop() {
    if (!cropUrl) return;
    const scale = baseScale * zoom;
    const cropX = Math.max(0, Math.round(-offset.x / scale));
    const cropY = Math.max(0, Math.round(-offset.y / scale));
    const cropW = Math.round(PREVIEW_W / scale);
    const cropH = Math.round(PREVIEW_H / scale);
    const transform = `c_crop,x_${cropX},y_${cropY},w_${cropW},h_${cropH}`;
    onChange(buildCloudinaryUrl(cropUrl, transform));
    setCropUrl(null);
  }

  return (
    <div>
      <div className="flex items-center gap-3 flex-wrap">
        {value && (
          <img src={value} alt={label} className={previewClass}
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
        )}
        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 disabled:opacity-50">
          {uploading ? "Subiendo..." : value ? "Cambiar imagen" : "Subir imagen"}
        </button>
        {value && (
          <button type="button" onClick={() => onChange("")}
            className="text-xs text-gray-400 hover:text-rose-500 transition-colors">
            Quitar
          </button>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      </div>

      {cropUrl && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 shadow-xl" style={{ width: Math.min(PREVIEW_W + 48, window.innerWidth - 32) }}>
            <h3 className="text-base font-semibold text-gray-900 mb-1">Ajustar imagen</h3>
            <p className="text-xs text-gray-500 mb-4">Arrastrá para mover · Usá el zoom para acercar</p>

            <div
              className="relative overflow-hidden rounded-xl border border-gray-200 cursor-grab active:cursor-grabbing select-none"
              style={{ width: PREVIEW_W, height: PREVIEW_H }}
              onMouseDown={(e) => {
                e.preventDefault();
                dragRef.current = { startX: e.clientX, startY: e.clientY, startOx: offset.x, startOy: offset.y };
              }}
              onMouseMove={(e) => {
                if (!dragRef.current) return;
                const dx = e.clientX - dragRef.current.startX;
                const dy = e.clientY - dragRef.current.startY;
                setOffset(clampOff(dragRef.current.startOx + dx, dragRef.current.startOy + dy, zoom));
              }}
              onMouseUp={() => { dragRef.current = null; }}
              onMouseLeave={() => { dragRef.current = null; }}
            >
              {imgNatural.w === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
                  Cargando...
                </div>
              )}
              <img
                src={cropUrl} alt=""
                onLoad={(e) => {
                  const img = e.target as HTMLImageElement;
                  const nat = { w: img.naturalWidth, h: img.naturalHeight };
                  setImgNatural(nat);
                  setOffset({ x: 0, y: 0 });
                }}
                style={{
                  position: "absolute",
                  left: offset.x,
                  top: offset.y,
                  width: displayW || "auto",
                  height: displayH || "auto",
                  pointerEvents: "none",
                  userSelect: "none",
                }}
                draggable={false}
              />
            </div>

            <div className="flex items-center gap-3 mt-4">
              <span className="text-xs text-gray-500 shrink-0">Zoom</span>
              <input
                type="range" min={1} max={3} step={0.05} value={zoom}
                onChange={(e) => {
                  const z = parseFloat(e.target.value);
                  setZoom(z);
                  setOffset((prev) => clampOff(prev.x, prev.y, z));
                }}
                className="flex-1"
              />
              <span className="text-xs text-gray-500 w-10 text-right shrink-0">{zoom.toFixed(1)}×</span>
            </div>

            <div className="flex gap-3 mt-5 justify-end">
              <button type="button" onClick={() => setCropUrl(null)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                Cancelar
              </button>
              <button type="button" onClick={applyCrop}
                className="px-4 py-2 text-sm rounded-lg text-white font-medium"
                style={{ backgroundColor: "#0f2f26" }}>
                Usar esta área
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Payment card ───────────────────────────────────────────────────────────────

interface PaymentCardProps {
  title: string;
  icon: string;
  cfg: PaymentMethodConfig;
  onChange: (patch: Partial<PaymentMethodConfig>) => void;
  badge?: string;
  extra?: React.ReactNode;
}

function PaymentCard({ title, icon, cfg, onChange, badge, extra }: PaymentCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="text-xl">{icon}</span>
        <span className="flex-1 text-sm font-semibold text-gray-800">{title}</span>
        {badge && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
            {badge}
          </span>
        )}
        <Toggle checked={cfg.enabled} onChange={(v) => onChange({ enabled: v })} />
      </div>

      {cfg.enabled && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-xs font-medium text-gray-600 w-24 shrink-0">Ajuste precio</label>
            <select
              value={cfg.adjustmentType}
              onChange={(e) => onChange({ adjustmentType: e.target.value as "none" | "discount" | "surcharge" })}
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="none">Sin ajuste</option>
              <option value="discount">Descuento</option>
              <option value="surcharge">Recargo</option>
            </select>
            {cfg.adjustmentType !== "none" && (
              <div className="flex items-center gap-2">
                <input
                  type="number" min={0} max={100} step={0.5}
                  value={cfg.adjustmentPct}
                  onChange={(e) => onChange({ adjustmentPct: parseFloat(e.target.value) || 0 })}
                  className="w-16 border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-xs text-gray-500">%</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.adjustmentType === "discount" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                  {cfg.adjustmentType === "discount" ? `−${cfg.adjustmentPct}%` : `+${cfg.adjustmentPct}%`}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {extra}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

type Tab = "info" | "payments" | "schedule" | "appearance" | "zonas";

export default function ConfigPage() {
  const [profile, setProfile] = useState<OrgProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("info");

  // Tab: Info
  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [website, setWebsite] = useState("");
  const [instagram, setInstagram] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  // Tab: Payments
  const [pm, setPm] = useState<PaymentMethods>(DEFAULT_PM);

  // Tab: Schedule
  const [bh, setBh] = useState<DayHours[]>(DEFAULT_BH);
  const [mod, setMod] = useState<Modalities>(DEFAULT_MOD);

  // Delivery fee
  const [deliveryFee, setDeliveryFee] = useState<string>("0");

  // Tab: Appearance
  const [colorPrimary, setColorPrimary] = useState("#0f2f26");
  const [colorSecondary, setColorSecondary] = useState("#1a4d3f");
  const [colorAccent, setColorAccent] = useState("#34d399");
  const [coverImageUrl, setCoverImageUrl] = useState("");

  // Tab: Zonas
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [zonesLoading, setZonesLoading] = useState(false);
  const [showAddZone, setShowAddZone] = useState(false);
  const [newZone, setNewZone] = useState({ name: "", price: "", zoneType: "radius" as "radius" | "polygon", radiusKm: "", color: "#3B82F6" });
  const [savingZone, setSavingZone] = useState(false);
  const [addressLat, setAddressLat] = useState<number | null>(null);
  const [addressLng, setAddressLng] = useState<number | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null);
  const [drawingPolygon, setDrawingPolygon] = useState<{ lat: number; lng: number }[] | null>(null);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const mapRenderersRef = useRef<(google.maps.Circle | google.maps.Polygon)[]>([]);
  // Google Maps loading (only for Zonas map widget)
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  // Address autocomplete (server-side proxy)
  const addressInputRef = useRef<HTMLInputElement>(null);
  const [addrSuggestions, setAddrSuggestions] = useState<{ description: string; placeId: string }[]>([]);
  const [showAddrSuggestions, setShowAddrSuggestions] = useState(false);
  const addrSuggestTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Zone editing
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [editZoneData, setEditZoneData] = useState({ name: "", price: "", radiusKm: "", color: "#3B82F6" });

  useEffect(() => {
    fetch("/api/organizations/me")
      .then((r) => r.json())
      .then((data: OrgProfile) => {
        setProfile(data);
        setName(data.name ?? "");
        setLogoUrl(data.logoUrl ?? "");
        setWebsite(data.website ?? "");
        setInstagram(data.instagram ?? "");
        setPhone(data.phone ?? "");
        setAddress(data.address ?? "");
        setCategory(data.category ?? "");
        setDescription(data.description ?? "");
        setWhatsapp(data.whatsapp ?? "");
        setPm(data.paymentMethods ?? DEFAULT_PM);
        setBh(data.businessHours ?? DEFAULT_BH);
        setMod(data.modalities ?? DEFAULT_MOD);
        setColorPrimary(data.colorPrimary ?? "#0f2f26");
        setColorSecondary(data.colorSecondary ?? "#1a4d3f");
        setColorAccent(data.colorAccent ?? "#34d399");
        setCoverImageUrl(data.coverImageUrl ?? "");
        setDeliveryFee(data.deliveryFee != null ? String(data.deliveryFee) : "0");
        setAddressLat(data.addressLat ?? null);
        setAddressLng(data.addressLng ?? null);
      })
      .finally(() => setLoading(false));
  }, []);

  // Load Google Maps script once on mount
  useEffect(() => {
    const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!MAPS_KEY) return;
    if (typeof window !== "undefined" && window.google?.maps) { setGoogleMapsLoaded(true); return; }
    const existing = document.querySelector('script[data-gm-maps]');
    if (existing) {
      existing.addEventListener("load", () => setGoogleMapsLoaded(true));
      return;
    }
    const s = document.createElement("script");
    s.setAttribute("data-gm-maps", "1");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&libraries=places,drawing`;
    s.onload = () => setGoogleMapsLoaded(true);
    document.head.appendChild(s);
  }, []);

  // Load zones
  const loadZones = useCallback(() => {
    setZonesLoading(true);
    fetch("/api/delivery-zones")
      .then((r) => r.json())
      .then((d) => setZones(Array.isArray(d) ? d : []))
      .finally(() => setZonesLoading(false));
  }, []);

  // Re-render zone overlays on map when zones or map changes
  const renderZonesOnMap = useCallback((map: google.maps.Map, orgLat: number, orgLng: number, zoneList: DeliveryZone[]) => {
    mapRenderersRef.current.forEach((r) => r.setMap(null));
    mapRenderersRef.current = [];
    for (const zone of zoneList) {
      if (zone.zoneType === "radius" && zone.radiusKm) {
        const circle = new google.maps.Circle({
          map,
          center: { lat: orgLat, lng: orgLng },
          radius: zone.radiusKm * 1000,
          strokeColor: zone.color,
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: zone.color,
          fillOpacity: 0.15,
        });
        mapRenderersRef.current.push(circle);
      } else if (zone.zoneType === "polygon" && Array.isArray(zone.polygon)) {
        const poly = new google.maps.Polygon({
          map,
          paths: zone.polygon,
          strokeColor: zone.color,
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: zone.color,
          fillOpacity: 0.15,
        });
        mapRenderersRef.current.push(poly);
      }
    }
  }, []);

  // Init map when entering "zonas" tab and Maps is ready
  useEffect(() => {
    if (tab !== "zonas") return;
    loadZones();
    if (!googleMapsLoaded || !mapRef.current || googleMapRef.current) return;

    const center = { lat: addressLat ?? -34.6037, lng: addressLng ?? -58.3816 };
    const map = new google.maps.Map(mapRef.current, { zoom: 12, center, mapTypeControl: false });
    googleMapRef.current = map;
    new google.maps.Marker({ position: center, map, title: "Tu local" });
    renderZonesOnMap(map, center.lat, center.lng, zones);

    const dm = new google.maps.drawing.DrawingManager({
      drawingControl: false,
      polygonOptions: { strokeColor: newZone.color, fillColor: newZone.color, fillOpacity: 0.2, strokeWeight: 2 },
    });
    dm.setMap(map);
    drawingManagerRef.current = dm;
    dm.addListener("polygoncomplete", (poly: google.maps.Polygon) => {
      const coords = poly.getPath().getArray().map((p: google.maps.LatLng) => ({ lat: p.lat(), lng: p.lng() }));
      setDrawingPolygon(coords);
      poly.setMap(null);
      dm.setDrawingMode(null);
      setIsDrawingMode(false);
    });
    setMapReady(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, googleMapsLoaded]);

  // Server-side address autocomplete
  const fetchAddrSuggestions = useCallback(async (input: string) => {
    if (input.trim().length < 3) { setAddrSuggestions([]); setShowAddrSuggestions(false); return; }
    try {
      const res = await fetch(`/api/places-autocomplete?input=${encodeURIComponent(input)}`);
      const data = await res.json();
      setAddrSuggestions(data.predictions ?? []);
      setShowAddrSuggestions((data.predictions ?? []).length > 0);
    } catch {
      setAddrSuggestions([]);
    }
  }, []);

  const selectAddress = useCallback(async (description: string) => {
    setAddress(description);
    setAddrSuggestions([]);
    setShowAddrSuggestions(false);
    // Geocode to get lat/lng and save silently
    try {
      const res = await fetch("/api/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: description }),
      });
      if (!res.ok) return;
      const { lat, lng } = await res.json();
      setAddressLat(lat);
      setAddressLng(lng);
      fetch("/api/organizations/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addressLat: lat, addressLng: lng }),
      });
      if (googleMapRef.current) {
        googleMapRef.current.setCenter({ lat, lng });
        renderZonesOnMap(googleMapRef.current, lat, lng, zones);
      }
    } catch { /* silent */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zones, renderZonesOnMap]);

  // Re-render zones when zone list changes and map exists
  useEffect(() => {
    if (!googleMapRef.current || !addressLat || !addressLng) return;
    renderZonesOnMap(googleMapRef.current, addressLat, addressLng, zones);
  }, [zones, addressLat, addressLng, renderZonesOnMap]);

  const handleSave = async () => {
    setError(null); setSaved(false); setSaving(true);
    try {
      const res = await fetch("/api/organizations/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, logoUrl, website, instagram, phone, address, category, description, whatsapp,
          paymentMethods: pm,
          businessHours: bh,
          modalities: mod,
          deliveryFee: parseFloat(deliveryFee) || 0,
          colorPrimary, colorSecondary, colorAccent,
          coverImageUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Error al guardar"); return; }
      setProfile(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const updatePm = <K extends keyof PaymentMethods>(key: K, patch: Partial<PaymentMethods[K]>) => {
    setPm((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  };

  const updateBh = (idx: number, patch: Partial<DayHours>) => {
    setBh((prev) => prev.map((d, i) => (i === idx ? { ...d, ...patch } : d)));
  };

  if (loading) {
    return <div className="text-center py-16 text-gray-400">Cargando...</div>;
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: "info",       label: "Información" },
    { id: "payments",   label: "Pagos" },
    { id: "schedule",   label: "Horarios" },
    { id: "appearance", label: "Apariencia" },
    { id: "zonas",      label: "Zonas delivery" },
  ];

  async function saveEditZone() {
    if (!editingZoneId) return;
    setSavingZone(true);
    const zone = zones.find((z) => z.id === editingZoneId);
    const body: Record<string, unknown> = {
      name: editZoneData.name,
      price: parseFloat(editZoneData.price) || 0,
      color: editZoneData.color,
    };
    if (zone?.zoneType === "radius") {
      body.radiusKm = parseFloat(editZoneData.radiusKm) || null;
    }
    const res = await fetch(`/api/delivery-zones/${editingZoneId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSavingZone(false);
    if (res.ok) { setEditingZoneId(null); loadZones(); }
  }

  async function createZone() {
    setSavingZone(true);
    try {
      const body: Record<string, unknown> = {
        name: newZone.name,
        price: parseFloat(newZone.price) || 0,
        zoneType: newZone.zoneType,
        color: newZone.color,
        sortOrder: zones.length,
      };
      if (newZone.zoneType === "radius") {
        body.radiusKm = parseFloat(newZone.radiusKm) || null;
      } else {
        body.polygon = drawingPolygon;
      }
      const res = await fetch("/api/delivery-zones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setNewZone({ name: "", price: "", zoneType: "radius", radiusKm: "", color: "#3B82F6" });
        setDrawingPolygon(null);
        setShowAddZone(false);
        loadZones();
      } else {
        const err = await res.json();
        alert(err.error ?? "Error al crear zona");
      }
    } finally {
      setSavingZone(false);
    }
  }

  async function deleteZone(id: string) {
    if (!confirm("¿Eliminar esta zona?")) return;
    await fetch(`/api/delivery-zones/${id}`, { method: "DELETE" });
    loadZones();
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuración del local</h1>
          <p className="text-sm text-gray-500 mt-0.5">Editá los datos de tu negocio</p>
        </div>
        {profile && (
          <div className="flex flex-col items-end gap-1">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${PLAN_COLORS[profile.plan]}`}>
              Plan {PLAN_LABELS[profile.plan]}
            </span>
            {profile.planExpiresAt && (
              <p className="text-xs text-gray-400">
                Vence: {new Date(profile.planExpiresAt).toLocaleDateString("es-AR")}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className="px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px"
            style={
              tab === t.id
                ? { color: "#0f2f26", borderColor: "#0f2f26" }
                : { color: "#9ca3af", borderColor: "transparent" }
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Feedback */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
      {saved && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
          <p className="text-sm text-emerald-700">Cambios guardados correctamente</p>
        </div>
      )}

      {/* ── TAB: Información ── */}
      {tab === "info" && (
        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-5">
          {logoUrl && (
            <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
              <img
                src={logoUrl} alt="Logo"
                className="w-16 h-16 rounded-xl object-contain border border-gray-200 bg-gray-50 p-1"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              <div>
                <p className="text-xs text-gray-500">Logo actual</p>
                <p className="text-sm font-medium text-gray-800">{name}</p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del local</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Restaurante El Gaucho" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de negocio</label>
            <select
              value={CATEGORY_OPTIONS.includes(category) ? category : category ? "Otro" : ""}
              onChange={(e) => setCategory(e.target.value === "Otro" ? "" : e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Seleccionar tipo...</option>
              {CATEGORY_OPTIONS.map((o) => (<option key={o} value={o}>{o}</option>))}
            </select>
            {(!CATEGORY_OPTIONS.includes(category) || category === "") && (
              <input value={category} onChange={(e) => setCategory(e.target.value)}
                placeholder="Descripción del tipo de negocio"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-2 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              maxLength={500} rows={3} placeholder="Una breve descripción de tu negocio..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
            <p className="text-xs text-gray-400 mt-1 text-right">{description.length}/500</p>
          </div>


          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="+54 11 1234-5678" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
              <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="+5491112345678" />
              <p className="text-xs text-gray-400 mt-1">Con código de país</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Instagram</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">@</span>
              <input value={instagram} onChange={(e) => setInstagram(e.target.value.replace(/^@/, ""))}
                className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="mi_local" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Página web</label>
            <input value={website} onChange={(e) => setWebsite(e.target.value)} type="url"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="https://milocal.com" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
            <div className="relative">
              <input
                ref={addressInputRef}
                value={address}
                onChange={(e) => {
                  const val = e.target.value;
                  setAddress(val);
                  if (addrSuggestTimerRef.current) clearTimeout(addrSuggestTimerRef.current);
                  addrSuggestTimerRef.current = setTimeout(() => fetchAddrSuggestions(val), 300);
                }}
                onBlur={() => {
                  setTimeout(() => setShowAddrSuggestions(false), 150);
                  // Geocode on blur if no suggestions were selected (lat/lng not yet set)
                  if (address.trim() && !addressLat) {
                    fetch("/api/geocode", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ address: address.trim() }),
                    }).then((r) => r.json()).then((data) => {
                      if (data.lat && data.lng) {
                        setAddressLat(data.lat);
                        setAddressLng(data.lng);
                        fetch("/api/organizations/me", {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ addressLat: data.lat, addressLng: data.lng }),
                        });
                      }
                    }).catch(() => {});
                  }
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Av. Corrientes 1234, CABA"
                autoComplete="off"
              />
              {showAddrSuggestions && addrSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden">
                  {addrSuggestions.map((s) => (
                    <button
                      key={s.placeId}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectAddress(s.description)}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-800 hover:bg-gray-50 border-b border-gray-100 last:border-0 flex items-start gap-2"
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
            {addressLat && (
              <p className="text-xs text-emerald-600 mt-1">Ubicacion guardada</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Identificador</label>
            <input value={profile?.slug ?? ""} readOnly
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-400 font-mono cursor-not-allowed" />
            <p className="text-xs text-gray-400 mt-1">El identificador no se puede cambiar</p>
          </div>

          <div className="flex justify-end pt-2">
            <SaveButton saving={saving} />
          </div>
        </form>
      )}

      {/* ── TAB: Pagos ── */}
      {tab === "payments" && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            Activá los métodos de pago que acepta tu local. Podés aplicar un descuento o recargo a cada uno.
          </p>

          <PaymentCard title="Efectivo" icon="💵" cfg={pm.cash}
            onChange={(patch) => updatePm("cash", patch)} />

          <PaymentCard title="Transferencia bancaria" icon="🏦" cfg={pm.transfer}
            onChange={(patch) => updatePm("transfer", patch)}
            extra={pm.transfer.enabled && (
              <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-gray-100">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Alias CBU</label>
                  <input value={pm.transfer.alias}
                    onChange={(e) => updatePm("transfer", { alias: e.target.value })}
                    placeholder="mi.alias.mp"
                    className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Banco</label>
                  <input value={pm.transfer.bank}
                    onChange={(e) => updatePm("transfer", { bank: e.target.value })}
                    placeholder="Banco Galicia"
                    className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Titular</label>
                  <input value={pm.transfer.holder}
                    onChange={(e) => updatePm("transfer", { holder: e.target.value })}
                    placeholder="Juan Pérez"
                    className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
            )} />

          <PaymentCard title="Mercado Pago" icon="🔵" cfg={pm.mercadopago}
            onChange={(patch) => updatePm("mercadopago", patch)}
            badge="API próximamente"
            extra={pm.mercadopago.enabled && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <label className="block text-xs font-medium text-gray-600 mb-1">Link de cobro (opcional)</label>
                <input value={pm.mercadopago.link}
                  onChange={(e) => updatePm("mercadopago", { link: e.target.value })}
                  placeholder="https://mpago.la/..."
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                {/* TODO: integrar API de Mercado Pago — OAuth + cobros automáticos */}
              </div>
            )} />

          <PaymentCard title="Tarjeta de débito" icon="💳" cfg={pm.debit}
            onChange={(patch) => updatePm("debit", patch)}
            badge="Plataforma próximamente"
            /* TODO: integrar plataforma de cobro con tarjeta de débito */ />

          <PaymentCard title="Tarjeta de crédito" icon="💰" cfg={pm.credit}
            onChange={(patch) => updatePm("credit", patch)}
            badge="Plataforma próximamente"
            /* TODO: integrar plataforma de cobro con tarjeta de crédito */ />

          <div className="flex justify-end pt-2">
            <SaveButton saving={saving} onClick={handleSave} />
          </div>
        </div>
      )}

      {/* ── TAB: Horarios ── */}
      {tab === "schedule" && (
        <div className="space-y-5">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-800">Horarios de atención al público</h2>
              <p className="text-xs text-gray-500 mt-0.5">Configurá los horarios de apertura de tu local</p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 w-24">Día</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">Cerrado</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">Apertura</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">Cierre</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">2° turno</th>
                </tr>
              </thead>
              <tbody>
                {DAY_ORDER.map((dayIdx) => {
                  const day = bh[dayIdx] ?? DEFAULT_BH[dayIdx];
                  const hasShift2 = !day.isClosed && !!day.hasSecondShift;
                  return (
                    <>
                      <tr key={dayIdx} className={`border-t border-gray-100 ${day.isClosed ? "bg-gray-50/60" : ""}`}>
                        <td className="px-4 py-2 font-medium text-gray-700 text-sm">{DAY_NAMES[dayIdx]}</td>
                        <td className="px-3 py-2 text-center">
                          <Toggle checked={day.isClosed} onChange={(v) => updateBh(dayIdx, { isClosed: v, hasSecondShift: v ? false : day.hasSecondShift })} />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <input type="time" value={day.open} disabled={day.isClosed}
                            onChange={(e) => updateBh(dayIdx, { open: e.target.value })}
                            className="border border-gray-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed" />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <input type="time" value={day.close} disabled={day.isClosed}
                            onChange={(e) => updateBh(dayIdx, { close: e.target.value })}
                            className="border border-gray-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed" />
                        </td>
                        <td className="px-3 py-2 text-center">
                          {!day.isClosed && (
                            <button type="button"
                              onClick={() => updateBh(dayIdx, { hasSecondShift: !day.hasSecondShift })}
                              className={`text-xs font-semibold px-2 py-1 rounded-lg transition-colors ${hasShift2 ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
                            >
                              {hasShift2 ? "✓ 2°" : "+ 2°"}
                            </button>
                          )}
                        </td>
                      </tr>
                      {hasShift2 && (
                        <tr key={`${dayIdx}-s2`} className="bg-emerald-50/40">
                          <td className="px-4 py-1.5 text-xs text-emerald-600 font-medium pl-8">Turno 2</td>
                          <td />
                          <td className="px-3 py-1.5 text-center">
                            <input type="time" value={day.open2 ?? "20:00"}
                              onChange={(e) => updateBh(dayIdx, { open2: e.target.value })}
                              className="border border-emerald-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                          </td>
                          <td className="px-3 py-1.5 text-center">
                            <input type="time" value={day.close2 ?? "23:00"}
                              onChange={(e) => updateBh(dayIdx, { close2: e.target.value })}
                              className="border border-emerald-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                          </td>
                          <td className="px-3 py-1.5 text-center">
                            <button type="button" onClick={() => updateBh(dayIdx, { hasSecondShift: false })}
                              className="text-gray-300 hover:text-rose-500 transition-colors">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-800 mb-1">Modalidades de servicio</h2>
            <p className="text-xs text-gray-500 mb-4">¿Cómo trabaja tu local?</p>
            <div className="flex gap-3 flex-wrap">
              {([
                { key: "salon" as const,    label: "Salón",     icon: "🍽️" },
                { key: "delivery" as const, label: "Delivery",  icon: "🛵" },
                { key: "takeaway" as const, label: "Take-away", icon: "🥡" },
              ]).map(({ key, label, icon }) => (
                <button key={key} type="button"
                  onClick={() => setMod((prev) => ({ ...prev, [key]: !prev[key] }))}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all"
                  style={mod[key]
                    ? { borderColor: "#0f2f26", backgroundColor: "#f0faf5", color: "#0f2f26" }
                    : { borderColor: "#e5e7eb", color: "#6b7280" }}
                >
                  <span>{icon}</span>
                  <span>{label}</span>
                  {mod[key] && (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-800 mb-1">Costo de envío</h2>
            <p className="text-xs text-gray-500 mb-4">Se suma automáticamente al total en pedidos de tipo Delivery</p>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">$</span>
              <input
                type="number" min={0} step={0.5}
                value={deliveryFee}
                onChange={(e) => setDeliveryFee(e.target.value)}
                className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="0"
              />
              <span className="text-xs text-gray-400">Por pedido</span>
            </div>
          </div>

          <div className="flex justify-end">
            <SaveButton saving={saving} onClick={handleSave} />
          </div>
        </div>
      )}

      {/* ── TAB: Zonas delivery ── always in DOM to prevent Google Maps removeChild crash */}
      <div className="space-y-4" style={{ display: tab === "zonas" ? undefined : "none" }}>
          {/* Status bar */}
          {!addressLat ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700">
              Configurá la dirección del local en la pestaña <strong>Información</strong> seleccionándola del autocompletado para que el mapa se centre correctamente.
            </div>
          ) : null}

          {/* Map + zones list side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Map */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-800">Mapa</h3>
              </div>
              {!mapReady && (
                <div className="flex items-center justify-center bg-gray-100 text-gray-400 text-sm" style={{ height: 380 }}>
                  {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? "Cargando mapa..." : "API key no configurada"}
                </div>
              )}
              {/* mapRef must have no React children — Google Maps owns this node's DOM */}
              <div ref={mapRef} style={{ height: mapReady ? 380 : 0 }} className="w-full" />
            </div>

            {/* Zones list */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-800">Zonas de cobertura</h3>
                <button
                  type="button"
                  onClick={() => setShowAddZone(!showAddZone)}
                  className="px-3 py-1 text-xs rounded-lg text-white font-medium"
                  style={{ backgroundColor: "#0f2f26" }}
                >
                  + Agregar zona
                </button>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
                {zonesLoading ? (
                  <p className="text-center text-gray-400 text-sm py-8">Cargando...</p>
                ) : zones.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-8">Sin zonas configuradas</p>
                ) : (
                  zones.map((zone) => (
                    <div key={zone.id}>
                      {editingZoneId === zone.id ? (
                        /* ── Inline edit form ── */
                        <div className="px-4 py-3 space-y-2 bg-gray-50">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Nombre</label>
                              <input
                                value={editZoneData.name}
                                onChange={(e) => setEditZoneData((d) => ({ ...d, name: e.target.value }))}
                                className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Precio ($)</label>
                              <input
                                type="number" min={0}
                                value={editZoneData.price}
                                onChange={(e) => setEditZoneData((d) => ({ ...d, price: e.target.value }))}
                                className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              />
                            </div>
                          </div>
                          {zone.zoneType === "radius" && (
                            <div>
                              <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Radio (km)</label>
                              <input
                                type="number" min={0.1} step={0.1}
                                value={editZoneData.radiusKm}
                                onChange={(e) => setEditZoneData((d) => ({ ...d, radiusKm: e.target.value }))}
                                className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              />
                            </div>
                          )}
                          <div className="flex gap-1.5">
                            {ZONE_COLORS.map((c) => (
                              <button key={c} type="button" onClick={() => setEditZoneData((d) => ({ ...d, color: c }))}
                                className="w-5 h-5 rounded-full border-2 transition-all"
                                style={{ backgroundColor: c, borderColor: editZoneData.color === c ? "#0f2f26" : "transparent", transform: editZoneData.color === c ? "scale(1.2)" : "scale(1)" }}
                              />
                            ))}
                          </div>
                          <div className="flex gap-2 pt-1">
                            <button type="button" onClick={() => setEditingZoneId(null)}
                              className="flex-1 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100">
                              Cancelar
                            </button>
                            <button type="button" onClick={saveEditZone} disabled={savingZone || !editZoneData.name}
                              className="flex-1 py-1.5 text-xs rounded-lg text-white font-medium disabled:opacity-50"
                              style={{ backgroundColor: "#0f2f26" }}>
                              {savingZone ? "..." : "Guardar"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* ── Zone row ── */
                        <div className="px-4 py-3 flex items-center gap-3">
                          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: zone.color }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{zone.name}</p>
                            <p className="text-xs text-gray-500">
                              {zone.zoneType === "radius" ? `Radio ${zone.radiusKm} km` : "Polígono"}
                              {" · $"}{Number(zone.price).toLocaleString("es-AR")}
                            </p>
                          </div>
                          <button type="button" title="Editar"
                            onClick={() => {
                              setEditingZoneId(zone.id);
                              setEditZoneData({
                                name: zone.name,
                                price: String(Number(zone.price)),
                                radiusKm: zone.radiusKm != null ? String(zone.radiusKm) : "",
                                color: zone.color,
                              });
                            }}
                            className="text-gray-300 hover:text-emerald-600 transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button type="button" title="Eliminar"
                            onClick={() => deleteZone(zone.id)}
                            className="text-gray-300 hover:text-rose-500 transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Add zone form */}
          {showAddZone && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-gray-800">Nueva zona</h3>

              {/* Type toggle */}
              <div className="flex gap-1 p-0.5 bg-gray-100 rounded-lg w-fit">
                {(["radius", "polygon"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { setNewZone((z) => ({ ...z, zoneType: t })); setDrawingPolygon(null); }}
                    className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${newZone.zoneType === t ? "bg-white shadow-sm text-emerald-700 font-semibold" : "text-gray-500"}`}
                  >
                    {t === "radius" ? "Por radio" : "Por polígono"}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
                  <input
                    value={newZone.name}
                    onChange={(e) => setNewZone((z) => ({ ...z, name: e.target.value }))}
                    placeholder="Zona Centro"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Precio de envío ($)</label>
                  <input
                    type="number" min={0}
                    value={newZone.price}
                    onChange={(e) => setNewZone((z) => ({ ...z, price: e.target.value }))}
                    placeholder="500"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {newZone.zoneType === "radius" && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Radio (km)</label>
                  <input
                    type="number" min={0.1} step={0.1}
                    value={newZone.radiusKm}
                    onChange={(e) => setNewZone((z) => ({ ...z, radiusKm: e.target.value }))}
                    placeholder="3"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              )}

              {newZone.zoneType === "polygon" && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Polígono</label>
                  {drawingPolygon ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-emerald-600 font-medium">Polígono dibujado ({drawingPolygon.length} puntos)</span>
                      <button type="button" onClick={() => setDrawingPolygon(null)} className="text-xs text-rose-500 hover:underline">Borrar</button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={!mapReady}
                      onClick={() => {
                        if (!drawingManagerRef.current) return;
                        drawingManagerRef.current.setDrawingMode(google.maps.drawing.OverlayType.POLYGON);
                        setIsDrawingMode(true);
                      }}
                      className="px-4 py-2 text-sm border border-dashed border-blue-400 text-blue-600 rounded-lg hover:bg-blue-50 disabled:opacity-40"
                    >
                      {isDrawingMode ? "Dibujando en el mapa..." : "Dibujar en el mapa"}
                    </button>
                  )}
                </div>
              )}

              {/* Color */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Color</label>
                <div className="flex gap-2">
                  {ZONE_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewZone((z) => ({ ...z, color: c }))}
                      className="w-7 h-7 rounded-full border-2 transition-all"
                      style={{ backgroundColor: c, borderColor: newZone.color === c ? "#0f2f26" : "transparent", transform: newZone.color === c ? "scale(1.2)" : "scale(1)" }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowAddZone(false); setDrawingPolygon(null); setIsDrawingMode(false); }}
                  className="flex-1 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={createZone}
                  disabled={savingZone || !newZone.name || (newZone.zoneType === "radius" && !newZone.radiusKm) || (newZone.zoneType === "polygon" && !drawingPolygon)}
                  className="flex-1 py-2 text-sm rounded-lg text-white font-medium disabled:opacity-50"
                  style={{ backgroundColor: "#0f2f26" }}
                >
                  {savingZone ? "Guardando..." : "Guardar zona"}
                </button>
              </div>
            </div>
          )}
        </div>

      {/* ── TAB: Apariencia ── */}
      {tab === "appearance" && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-sm font-semibold text-gray-800 mb-1">Paleta de colores</h2>
            <p className="text-xs text-gray-500 mb-4">Estos colores representan la identidad visual de tu local</p>
            <div className="space-y-3">
              <ColorPicker label="Color principal" value={colorPrimary} onChange={setColorPrimary} />
              <ColorPicker label="Color secundario" value={colorSecondary} onChange={setColorSecondary} />
              <ColorPicker label="Color de acento" value={colorAccent} onChange={setColorAccent} />
            </div>
            <div className="mt-4 flex items-center gap-3">
              <span className="text-xs text-gray-400">Vista previa:</span>
              <div className="flex gap-2">
                {[colorPrimary, colorSecondary, colorAccent].map((c, i) => (
                  <span key={i} className="w-9 h-9 rounded-lg border border-gray-200 shadow-sm" style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-5">
            <h2 className="text-sm font-semibold text-gray-800 mb-1">Logo</h2>
            <p className="text-xs text-gray-500 mb-3">Imagen de logo del local (cuadrada recomendada)</p>
            <ImageUploadCrop
              value={logoUrl}
              onChange={setLogoUrl}
              folder="logos"
              aspect={1}
              label="Logo"
              previewClass="w-16 h-16 rounded-xl object-contain border border-gray-200 bg-gray-50 p-1"
            />
          </div>

          <div className="border-t border-gray-100 pt-5">
            <h2 className="text-sm font-semibold text-gray-800 mb-1">Imagen de portada</h2>
            <p className="text-xs text-gray-500 mb-3">Se muestra como banner principal de tu local</p>
            <ImageUploadCrop
              value={coverImageUrl}
              onChange={setCoverImageUrl}
              folder="portadas"
              aspect={16 / 9}
              label="Portada"
              previewClass="w-full h-44 rounded-xl object-cover border border-gray-200"
            />
          </div>

          <div className="flex justify-end pt-2">
            <SaveButton saving={saving} onClick={handleSave} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Save button ────────────────────────────────────────────────────────────────

function SaveButton({ saving, onClick }: { saving: boolean; onClick?: () => void }) {
  return (
    <button
      type={onClick ? "button" : "submit"}
      onClick={onClick}
      disabled={saving}
      className="text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-60 transition-colors"
      style={{ backgroundColor: "#0f2f26" }}
      onMouseEnter={(e) => { if (!saving) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#1a4d3f"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#0f2f26"; }}
    >
      {saving ? "Guardando..." : "Guardar cambios"}
    </button>
  );
}
