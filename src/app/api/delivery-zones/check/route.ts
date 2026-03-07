export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg } from "@/lib/requireOrg";

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function pointInPolygon(point: { lat: number; lng: number }, polygon: { lat: number; lng: number }[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng, yi = polygon[i].lat;
    const xj = polygon[j].lng, yj = polygon[j].lat;
    const intersect =
      yi > point.lat !== yj > point.lat &&
      point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export async function POST(req: NextRequest) {
  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }

  const { address } = await req.json();
  if (!address || typeof address !== "string") {
    return NextResponse.json({ error: "Dirección requerida" }, { status: 400 });
  }

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { addressLat: true, addressLng: true },
  });

  if (!org?.addressLat || !org?.addressLng) {
    return NextResponse.json({ error: "Configurá la dirección del local en /config" }, { status: 422 });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Google Maps API key no configurada" }, { status: 500 });
  }

  // Geocode the delivery address
  const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
  const geoRes = await fetch(geoUrl);
  const geoData = await geoRes.json();

  if (geoData.status !== "OK" || !geoData.results?.[0]) {
    return NextResponse.json({ covered: false, zone: null, distanceKm: null, error: "No se pudo geocodificar la dirección" });
  }

  const { lat, lng } = geoData.results[0].geometry.location;
  const distanceKm = haversineKm(org.addressLat, org.addressLng, lat, lng);

  const zones = await prisma.deliveryZone.findMany({
    where: { organizationId: orgId, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  const matches: (typeof zones[number] & { _dist?: number })[] = [];

  for (const zone of zones) {
    if (zone.zoneType === "radius" && zone.radiusKm != null) {
      if (distanceKm <= zone.radiusKm) {
        matches.push({ ...zone, _dist: zone.radiusKm });
      }
    } else if (zone.zoneType === "polygon" && Array.isArray(zone.polygon)) {
      const poly = zone.polygon as { lat: number; lng: number }[];
      if (pointInPolygon({ lat, lng }, poly)) {
        matches.push(zone);
      }
    }
  }

  if (matches.length === 0) {
    return NextResponse.json({ covered: false, zone: null, distanceKm });
  }

  // Sort radius zones by radiusKm asc, polygon zones by sortOrder asc, pick cheapest overall
  const sorted = matches.sort((a, b) => {
    const priceA = Number(a.price);
    const priceB = Number(b.price);
    return priceA - priceB;
  });

  const best = sorted[0];

  return NextResponse.json({ covered: true, zone: best, distanceKm });
}
