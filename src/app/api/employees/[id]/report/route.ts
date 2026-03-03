import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildExcel, excelResponse } from "@/utils/excel";
import { format } from "date-fns";

type Params = { params: { id: string } };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const fmt = searchParams.get("format") ?? "json";

    if (!from || !to) {
      return NextResponse.json({ error: "Los parámetros from y to son requeridos", code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const employee = await prisma.employee.findUnique({ where: { id: params.id } });
    if (!employee) {
      return NextResponse.json({ error: "Empleado no encontrado", code: "NOT_FOUND" }, { status: 404 });
    }

    const fromDate = new Date(from);
    const toDate = new Date(to + "T23:59:59.999Z");

    const logs = await prisma.timeLog.findMany({
      where: { employeeId: params.id, checkIn: { gte: fromDate, lte: toDate } },
      orderBy: { checkIn: "asc" },
    });

    const completedLogs = logs.filter((l) => l.checkOut !== null);
    const openLogs = logs.filter((l) => l.checkOut === null);
    const totalHours =
      Math.round(completedLogs.reduce((sum, l) => sum + (l.duration ? l.duration.toNumber() : 0), 0) * 100) / 100;
    const totalCost = Math.round(totalHours * employee.hourlyRate.toNumber() * 100) / 100;

    if (fmt === "xlsx") {
      const buf = buildExcel(
        ["Fecha", "Entrada", "Salida", "Horas", "Notas"],
        logs.map((log) => [
          format(log.checkIn, "dd/MM/yyyy"),
          format(log.checkIn, "HH:mm"),
          log.checkOut ? format(log.checkOut, "HH:mm") : "",
          log.duration ? log.duration.toNumber() : "",
          log.notes ?? "",
        ]),
        "Fichajes"
      );
      return excelResponse(buf, `reporte_${employee.lastName}_${from}_${to}.xlsx`);
    }

    // Group by day
    const dayMap = new Map<string, typeof logs>();
    for (const log of logs) {
      const day = log.checkIn.toISOString().slice(0, 10);
      if (!dayMap.has(day)) dayMap.set(day, []);
      dayMap.get(day)!.push(log);
    }
    const dailyDetail = Array.from(dayMap.entries()).map(([date, dayLogs]) => ({
      date,
      logs: dayLogs,
      dayTotalHours:
        Math.round(
          dayLogs.filter((l) => l.checkOut).reduce((s, l) => s + (l.duration ? l.duration.toNumber() : 0), 0) * 100
        ) / 100,
    }));

    return NextResponse.json({
      employee: { id: employee.id, firstName: employee.firstName, lastName: employee.lastName, role: employee.role, hourlyRate: employee.hourlyRate },
      period: { from, to },
      summary: { totalHours, openLogs: openLogs.length, totalCost, currency: "ARS" },
      dailyDetail,
    });
  } catch {
    return NextResponse.json({ error: "Error al generar reporte", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
