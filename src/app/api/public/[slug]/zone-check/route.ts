export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: { slug: string } };

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

export async function POST(req: NextRequest, { params }: Params) {
  const { address } = await req.json();
  if (!address || typeof address !== "string") {
    return NextResponse.json({ error: "Dirección requerida" }, { status: 400 });
  }

  const org = await prisma.organization.findUnique({
    where: { slug: params.slug },
    select: { id: true, addressLat: true, addressLng: true },
  });

  if (!org) return NextResponse.json({ error: "Local no encontrado" }, { status: 404 });

  // No zones configured — allow all deliveries (fall back to flat fee)
  const zones = await prisma.deliveryZone.findMany({
    where: { organizationId: org.id, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  if (zones.length === 0) {
    return NextResponse.json({ covered: true, zone: null, distanceKm: null });
  }

  // Need org coordinates to check zones
  if (!org.addressLat || !org.addressLng) {
    return NextResponse.json({ covered: true, zone: null, distanceKm: null });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ covered: true, zone: null, distanceKm: null });
  }

  // Geocode delivery address
  const geoRes = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
  );
  const geoData = await geoRes.json();

  if (geoData.status !== "OK" || !geoData.results?.[0]) {
    return NextResponse.json({ covered: false, zone: null, distanceKm: null, geocodeError: true });
  }

  const { lat, lng } = geoData.results[0].geometry.location;
  const distanceKm = haversineKm(org.addressLat, org.addressLng, lat, lng);

  const matches: (typeof zones[number])[] = [];
  for (const zone of zones) {
    if (zone.zoneType === "radius" && zone.radiusKm != null) {
      if (distanceKm <= zone.radiusKm) matches.push(zone);
    } else if (zone.zoneType === "polygon" && Array.isArray(zone.polygon)) {
      if (pointInPolygon({ lat, lng }, zone.polygon as { lat: number; lng: number }[])) {
        matches.push(zone);
      }
    }
  }

  if (matches.length === 0) {
    return NextResponse.json({ covered: false, zone: null, distanceKm });
  }

  // Return cheapest matching zone
  const best = matches.sort((a, b) => Number(a.price) - Number(b.price))[0];
  return NextResponse.json({ covered: true, zone: best, distanceKm });
}
