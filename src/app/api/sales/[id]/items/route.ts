export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg } from "@/lib/requireOrg";
import { z, ZodError } from "zod";

const UpdateItemSchema = z.object({
  productId: z.string().min(1),
  isUnavailable: z.boolean(),
});

type Params = { params: { id: string } };

export async function PATCH(req: NextRequest, { params }: Params) {
  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }

  try {
    const body = await req.json();
    const { productId, isUnavailable } = UpdateItemSchema.parse(body);

    // Verify sale belongs to org
    const sale = await prisma.sale.findUnique({
      where: { id: params.id, organizationId: orgId },
      select: { id: true },
    });
    if (!sale) {
      return NextResponse.json({ error: "Venta no encontrada", code: "NOT_FOUND" }, { status: 404 });
    }

    await prisma.saleItem.update({
      where: { saleId_productId: { saleId: params.id, productId } },
      data: { isUnavailable },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: e.issues[0].message, code: "VALIDATION_ERROR" }, { status: 400 });
    }
    return NextResponse.json({ error: "Error interno", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
