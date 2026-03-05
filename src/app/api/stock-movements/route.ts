import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrg } from "@/lib/requireOrg";

export async function GET(req: NextRequest) {  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }

  try {
    const { searchParams } = new URL(req.url);
    const ingredientId = searchParams.get("ingredientId");
    const type = searchParams.get("type");
    const limit = Math.min(200, parseInt(searchParams.get("limit") ?? "50"));

    const movements = await prisma.stockMovement.findMany({
      where: {
        organizationId: orgId,
        ...(ingredientId ? { ingredientId } : {}),
        ...(type ? { type } : {}),
      },
      include: { ingredient: true },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return NextResponse.json(movements);
  } catch {
    return NextResponse.json({ error: "Error interno", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
