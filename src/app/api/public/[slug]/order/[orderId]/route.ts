export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: { slug: string; orderId: string } };

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status !== "OK" || !data.results?.[0]) return null;
    return data.results[0].geometry.location;
  } catch {
    return null;
  }
}

export async function GET(_req: NextRequest, { params }: Params) {
  const org = await prisma.organization.findUnique({
    where: { slug: params.slug },
    select: {
      id: true, name: true, colorPrimary: true,
      addressLat: true, addressLng: true,
      whatsapp: true, phone: true,
    },
  });
  if (!org) return NextResponse.json({ error: "Local no encontrado" }, { status: 404 });

  const sale = await prisma.sale.findFirst({
    where: { id: params.orderId, organizationId: org.id },
    select: {
      id: true,
      orderStatus: true,
      orderType: true,
      customerName: true,
      deliveryAddress: true,
      total: true,
      deliveryFee: true,
      createdAt: true,
      startedAt: true,
      readyAt: true,
      deliveredAt: true,
      customer: { select: { phone: true } },
      items: { select: { quantity: true, product: { select: { name: true } } } },
      combos: { select: { quantity: true, combo: { select: { name: true } } } },
    },
  });

  if (!sale) return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });

  // Geocode delivery address for map (only for DELIVERY orders)
  let deliveryLat: number | null = null;
  let deliveryLng: number | null = null;
  if (sale.orderType === "DELIVERY" && sale.deliveryAddress) {
    const coords = await geocodeAddress(sale.deliveryAddress);
    if (coords) { deliveryLat = coords.lat; deliveryLng = coords.lng; }
  }

  return NextResponse.json({
    org: {
      name: org.name,
      colorPrimary: org.colorPrimary,
      addressLat: org.addressLat,
      addressLng: org.addressLng,
      whatsapp: org.whatsapp,
      phone: org.phone,
    },
    order: {
      id: sale.id,
      orderStatus: sale.orderStatus,
      orderType: sale.orderType,
      customerName: sale.customerName,
      customerPhone: sale.customer?.phone ?? null,
      deliveryAddress: sale.deliveryAddress,
      deliveryLat,
      deliveryLng,
      total: Number(sale.total),
      deliveryFee: sale.deliveryFee ? Number(sale.deliveryFee) : null,
      createdAt: sale.createdAt,
      startedAt: sale.startedAt,
      readyAt: sale.readyAt,
      deliveredAt: sale.deliveredAt,
      items: sale.items.map((i) => ({ name: i.product.name, quantity: i.quantity })),
      combos: sale.combos.map((c) => ({ name: c.combo.name, quantity: c.quantity })),
    },
  });
}
