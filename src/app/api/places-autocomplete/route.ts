export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { requireOrg } from "@/lib/requireOrg";

export async function GET(req: NextRequest) {
  try { requireOrg(req); } catch (e) { return e as Response; }

  const input = req.nextUrl.searchParams.get("input");
  if (!input || input.trim().length < 2) {
    return NextResponse.json({ predictions: [] });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return NextResponse.json({ predictions: [] });

  const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
  url.searchParams.set("input", input.trim());
  url.searchParams.set("types", "address");
  url.searchParams.set("language", "es");
  url.searchParams.set("key", apiKey);

  try {
    const res = await fetch(url.toString());
    const data = await res.json();
    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      return NextResponse.json({ predictions: [] });
    }
    const predictions = (data.predictions ?? []).map((p: { description: string; place_id: string }) => ({
      description: p.description,
      placeId: p.place_id,
    }));
    return NextResponse.json({ predictions });
  } catch {
    return NextResponse.json({ predictions: [] });
  }
}
