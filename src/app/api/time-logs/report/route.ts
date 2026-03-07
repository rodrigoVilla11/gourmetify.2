export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildExcel, excelResponse } from "@/utils/excel";
import { requireOrg } from "@/lib/requireOrg";

export async function GET(req: NextRequest) {  let orgId: string;
  try { orgId = requireOrg(req); } catch (e) { return e as Response; }

  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const fmt = searchParams.get("format") ?? "json";

    if (!from || !to) {
      return NextResponse.json(
        { error: "Los parámetros from y to son requeridos", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const fromDate = new Date(from);
    const toDate = new Date(to + "T23:59:59.999Z");

    const employees = await prisma.employee.findMany({
      where: { organizationId: orgId, isActive: true },
      include: {
        timeLogs: {
          where: { checkIn: { gte: fromDate, lte: toDate } },
          orderBy: { checkIn: "asc" },
        },
      },
      orderBy: { lastName: "asc" },
    });

    const summary = employees.map((emp) => {
      const completedLogs = emp.timeLogs.filter((l) => l.checkOut !== null);
      const openLogs = emp.timeLogs.filter((l) => l.checkOut === null);
      const totalHours =
        Math.round(completedLogs.reduce((sum, l) => sum + (l.duration ? l.duration.toNumber() : 0), 0) * 100) / 100;
      const totalCost = Math.round(totalHours * emp.hourlyRate.toNumber() * 100) / 100;
      return {
        id: emp.id,
        firstName: emp.firstName,
        lastName: emp.lastName,
        role: emp.role,
        hourlyRate: emp.hourlyRate,
        totalHours,
        totalCost,
        openLogs: openLogs.length,
        logsCount: emp.timeLogs.length,
      };
    });

    if (fmt === "xlsx") {
      const buf = buildExcel(
        ["Empleado", "Rol", "Horas Totales", "Tarifa/hora", "Costo Total"],
        summary.map((s) => [
          `${s.lastName}, ${s.firstName}`,
          s.role ?? "",
          s.totalHours,
          s.hourlyRate.toNumber(),
          s.totalCost,
        ]),
        "Resumen"
      );
      return excelResponse(buf, `reporte_empleados_${from}_${to}.xlsx`);
    }

    const grandTotalHours = Math.round(summary.reduce((s, e) => s + e.totalHours, 0) * 100) / 100;
    const grandTotalCost = Math.round(summary.reduce((s, e) => s + e.totalCost, 0) * 100) / 100;

    return NextResponse.json({
      period: { from, to },
      summary,
      totals: { totalHours: grandTotalHours, totalCost: grandTotalCost, currency: "ARS" },
    });
  } catch {
    return NextResponse.json({ error: "Error al generar reporte", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
