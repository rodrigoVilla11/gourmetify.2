export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { parseMultiSheetExcel } from "@/utils/excelMultisheet";
import { buildPlan, applyPlan } from "@/lib/importacionPlan";
import { requireOrg } from "@/lib/requireOrg";

export async function POST(req: NextRequest) {
  let orgId: string;
  try {
    orgId = requireOrg(req);
  } catch (e) {
    return e as Response;
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json(
        { error: "Archivo no enviado", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const ab = await file.arrayBuffer();
    const sheets = parseMultiSheetExcel(ab);
    const plan = await buildPlan(sheets, orgId);
    const result = await applyPlan(plan, orgId);

    return NextResponse.json(result, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Error al aplicar importación", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
