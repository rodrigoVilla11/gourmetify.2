export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/requireOrg";

export async function POST(req: NextRequest) {
  try { requireOrg(req); } catch (e) { return e as Response; }

  const { address } = await req.json();
  if (!address || typeof address !== "string") {
    return NextResponse.json({ error: "Dirección requerida" }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "API key no configurada" }, { status: 500 });

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.status !== "OK" || !data.results?.[0]) {
    return NextResponse.json({ error: "No se pudo geocodificar" }, { status: 422 });
  }

  const { lat, lng } = data.results[0].geometry.location;
  return NextResponse.json({ lat, lng });
}
