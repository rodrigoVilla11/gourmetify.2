export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg } from "@/lib/requireOrg";
import { z, ZodError } from "zod";

const UpdateOrgProfileSchema = z.object({
  name: z.string().min(1).optional(),
  logoUrl: z.string().url("URL inválida").optional().or(z.literal("")),
  website: z.string().url("URL inválida").optional().or(z.literal("")),
  instagram: z.string().max(60).optional().or(z.literal("")),
  phone: z.string().max(30).optional().or(z.literal("")),
  address: z.string().max(200).optional().or(z.literal("")),
  category: z.string().max(80).optional().or(z.literal("")),
  description: z.string().max(500).optional().or(z.literal("")),
  whatsapp: z.string().max(30).optional().or(z.literal("")),
  // Extended config
  paymentMethods: z.any().optional(),
  businessHours: z.any().optional(),
  modalities: z.any().optional(),
  colorPrimary: z.string().optional().nullable(),
  colorSecondary: z.string().optional().nullable(),
  colorAccent: z.string().optional().nullable(),
  coverImageUrl: z.string().optional().nullable().or(z.literal("")),
  deliveryFee: z.coerce.number().min(0).optional().nullable(),
  addressLat: z.number().optional().nullable(),
  addressLng: z.number().optional().nullable(),
});

const SELECT = {
  id: true, name: true, slug: true, logoUrl: true,
  website: true, instagram: true, phone: true, address: true,
  category: true, description: true, whatsapp: true,
  plan: true, planExpiresAt: true,
  paymentMethods: true, businessHours: true, modalities: true,
  colorPrimary: true, colorSecondary: true, colorAccent: true, coverImageUrl: true,
  deliveryFee: true,
  addressLat: true, addressLng: true,
} as const;

export async function GET(req: NextRequest) {
  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }

  const org = await prisma.organization.findUnique({ where: { id: orgId }, select: SELECT });

  if (!org) {
    return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
  }

  return NextResponse.json(org);
}

export async function PUT(req: NextRequest) {
  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }

  try {
    const body = await req.json();
    const data = UpdateOrgProfileSchema.parse(body);

    // Convert empty strings to null for optional string fields
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) {
      cleaned[k] = v === "" ? null : v;
    }

    const org = await prisma.organization.update({
      where: { id: orgId },
      data: cleaned,
      select: SELECT,
    });

    return NextResponse.json(org);
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: e.issues[0].message, code: "VALIDATION_ERROR" }, { status: 400 });
    }
    return NextResponse.json({ error: "Error interno", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
