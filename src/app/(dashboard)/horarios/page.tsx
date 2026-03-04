"use client";
import { useEffect, useState, useCallback } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  getDay,
} from "date-fns";
import { es } from "date-fns/locale";

type Employee = { id: string; firstName: string; lastName: string; role: string | null; hourlyRate: string | number };
type WorkSchedule = { id: string; employeeId: string; dayOfWeek: number; shiftIndex: number; startTime: string; endTime: string };
type RestDay = { id: string; employeeId: string; date: string };
type TimeLogRaw = { employeeId: string; duration: string | null; checkOut: string | null };

const DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
// Mon-Sun display order
const DOW_ORDER = [1, 2, 3, 4, 5, 6, 0];

function getMonthRange(date: Date) {
  return {
    from: format(startOfMonth(date), "yyyy-MM-dd"),
    to: format(endOfMonth(date), "yyyy-MM-dd"),
  };
}

const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };

export default function HorariosPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState("");
  const [schedules, setSchedules] = useState<WorkSchedule[]>([]);
  const [restDays, setRestDays] = useState<RestDay[]>([]);
  const [allLogs, setAllLogs] = useState<TimeLogRaw[]>([]);
  const [role, setRole] = useState<string>("");

  // editSchedule[`${dow}-${shiftIndex}`] = { startTime, endTime }
  const [editSchedule, setEditSchedule] = useState<Record<string, { startTime: string; endTime: string }>>({});
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [scheduleMsg, setScheduleMsg] = useState("");
  const [togglingDate, setTogglingDate] = useState<string | null>(null);

  // Load session + employees
  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/employees?isActive=true").then((r) => r.json()),
    ]).then(([sessionData, empData]) => {
      if (sessionData?.role) setRole(sessionData.role);
      const emps: Employee[] = Array.isArray(empData) ? empData : [];
      setEmployees(emps);
      if (emps.length > 0) setSelectedEmpId(emps[0].id);
    });
  }, []);

  const fetchSchedules = useCallback(() => {
    fetch("/api/schedules")
      .then((r) => r.json())
      .then((data) => setSchedules(Array.isArray(data) ? data : []));
  }, []);

  const fetchRestDays = useCallback(() => {
    const { from, to } = getMonthRange(currentMonth);
    fetch(`/api/rest-days?from=${from}&to=${to}`)
      .then((r) => r.json())
      .then((data) => setRestDays(Array.isArray(data) ? data : []));
  }, [currentMonth]);

  const fetchAllLogs = useCallback(() => {
    const { from, to } = getMonthRange(currentMonth);
    fetch(`/api/time-logs?from=${from}&to=${to}&limit=500`)
      .then((r) => r.json())
      .then((data) => setAllLogs(data.logs ?? []));
  }, [currentMonth]);

  useEffect(() => { fetchSchedules(); }, [fetchSchedules]);
  useEffect(() => { fetchRestDays(); }, [fetchRestDays]);
  useEffect(() => { fetchAllLogs(); }, [fetchAllLogs]);

  // Populate edit state when selected employee or schedules change
  useEffect(() => {
    if (!selectedEmpId) return;
    const empSchedules = schedules.filter((s) => s.employeeId === selectedEmpId);
    const map: Record<string, { startTime: string; endTime: string }> = {};
    for (let d = 0; d <= 6; d++) {
      map[`${d}-0`] = { startTime: "", endTime: "" };
      map[`${d}-1`] = { startTime: "", endTime: "" };
    }
    for (const s of empSchedules) {
      map[`${s.dayOfWeek}-${s.shiftIndex}`] = { startTime: s.startTime, endTime: s.endTime };
    }
    setEditSchedule(map);
    setScheduleMsg("");
  }, [selectedEmpId, schedules]);

  async function handleSaveSchedule() {
    if (!selectedEmpId) return;
    setSavingSchedule(true);
    setScheduleMsg("");

    const payload = Object.entries(editSchedule)
      .filter(([, v]) => v.startTime && v.endTime)
      .map(([key, v]) => {
        const [dow, si] = key.split("-").map(Number);
        return { dayOfWeek: dow, shiftIndex: si, startTime: v.startTime, endTime: v.endTime };
      });

    const res = await fetch(`/api/schedules/employee/${selectedEmpId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schedules: payload }),
    });

    if (res.ok) {
      setScheduleMsg("Guardado");
      fetchSchedules();
    } else {
      setScheduleMsg("Error al guardar");
    }
    setSavingSchedule(false);
    setTimeout(() => setScheduleMsg(""), 3000);
  }

  async function handleToggleRestDay(dateStr: string) {
    if (!selectedEmpId || togglingDate) return;
    setTogglingDate(dateStr);
    const existing = restDays.find((r) => r.employeeId === selectedEmpId && r.date === dateStr);
    if (existing) {
      await fetch(`/api/rest-days/${existing.id}`, { method: "DELETE" });
    } else {
      await fetch("/api/rest-days", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: selectedEmpId, date: dateStr }),
      });
    }
    fetchRestDays();
    setTogglingDate(null);
  }

  // Calendar helpers
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad = getDay(monthStart);
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const monthLabel = format(currentMonth, "MMMM yyyy", { locale: es });
  const selectedEmp = employees.find((e) => e.id === selectedEmpId);

  function getWorkingEmployees(date: Date) {
    const dow = getDay(date);
    const dateStr = format(date, "yyyy-MM-dd");
    return employees.filter((emp) => {
      const hasSchedule = schedules.some((s) => s.employeeId === emp.id && s.dayOfWeek === dow);
      const isRest = restDays.some((r) => r.employeeId === emp.id && r.date === dateStr);
      return hasSchedule && !isRest;
    });
  }

  function isRestForSelected(dateStr: string) {
    return restDays.some((r) => r.employeeId === selectedEmpId && r.date === dateStr);
  }

  // Pay tables: scheduled hours (from WorkSchedule - RestDays) vs real worked hours (from logs)
  const payData = employees.map((emp) => {
    const rate = Number(emp.hourlyRate);

    // Scheduled: iterate every day of the month, add shift durations (skip rest days)
    let scheduledHours = 0;
    for (const day of days) {
      const dow = getDay(day);
      const dateStr = format(day, "yyyy-MM-dd");
      const isRest = restDays.some((r) => r.employeeId === emp.id && r.date === dateStr);
      if (!isRest) {
        const shifts = schedules.filter((s) => s.employeeId === emp.id && s.dayOfWeek === dow);
        for (const s of shifts) {
          const duration = toMin(s.endTime) - toMin(s.startTime);
          if (duration > 0) scheduledHours += duration / 60;
        }
      }
    }

    // Real: completed time logs
    const empLogs = allLogs.filter((l) => l.employeeId === emp.id && l.checkOut !== null && l.duration !== null);
    const workedHours = empLogs.reduce((sum, l) => sum + Number(l.duration ?? 0), 0);

    return { emp, rate, scheduledHours, workedHours, scheduledPay: scheduledHours * rate, workedPay: workedHours * rate };
  });

  function setShift(key: string, field: "startTime" | "endTime", val: string) {
    setEditSchedule((prev) => ({ ...prev, [key]: { ...prev[key], [field]: val } }));
  }

  function clearShift(key: string) {
    setEditSchedule((prev) => ({ ...prev, [key]: { startTime: "", endTime: "" } }));
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Horarios y Descansos</h1>
        <p className="text-sm text-gray-500 mt-1">
          Configurá hasta dos turnos diarios y los días de descanso de cada empleado.
        </p>
      </div>

      {/* Employee selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-sm font-medium text-gray-700 shrink-0">Empleado:</label>
        <select
          value={selectedEmpId}
          onChange={(e) => setSelectedEmpId(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.lastName}, {emp.firstName}
              {emp.role ? ` (${emp.role})` : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Weekly schedule editor */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-700">Horario semanal</h2>
            {selectedEmp && (
              <p className="text-xs text-gray-400 mt-0.5">
                {selectedEmp.firstName} {selectedEmp.lastName}
              </p>
            )}
          </div>

          {/* Header row */}
          <div className="grid grid-cols-[2rem_1fr_1fr] gap-x-2 gap-y-0">
            <div />
            <div className="text-[10px] font-bold text-gray-400 uppercase text-center pb-1">Turno 1</div>
            <div className="text-[10px] font-bold text-gray-400 uppercase text-center pb-1">Turno 2</div>

            {DOW_ORDER.map((dow) => {
              const key0 = `${dow}-0`;
              const key1 = `${dow}-1`;
              const v0 = editSchedule[key0] ?? { startTime: "", endTime: "" };
              const v1 = editSchedule[key1] ?? { startTime: "", endTime: "" };

              return (
                <div key={dow} className="contents">
                  {/* Day label */}
                  <div className="flex items-start pt-1.5">
                    <span className="text-xs font-semibold text-gray-500 w-8">{DAY_NAMES[dow]}</span>
                  </div>

                  {/* Shift 0 */}
                  <div className="space-y-1 pb-2">
                    <div className="flex items-center gap-1">
                      <input
                        type="time"
                        value={v0.startTime}
                        onChange={(e) => setShift(key0, "startTime", e.target.value)}
                        className="text-xs border border-gray-200 rounded px-1.5 py-1 w-full focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="time"
                        value={v0.endTime}
                        onChange={(e) => setShift(key0, "endTime", e.target.value)}
                        className="text-xs border border-gray-200 rounded px-1.5 py-1 w-full focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    {(v0.startTime || v0.endTime) && (
                      <button
                        onClick={() => clearShift(key0)}
                        className="text-[10px] text-gray-300 hover:text-red-400 transition-colors"
                      >
                        limpiar
                      </button>
                    )}
                  </div>

                  {/* Shift 1 */}
                  <div className="space-y-1 pb-2">
                    <div className="flex items-center gap-1">
                      <input
                        type="time"
                        value={v1.startTime}
                        onChange={(e) => setShift(key1, "startTime", e.target.value)}
                        className="text-xs border border-gray-200 rounded px-1.5 py-1 w-full focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="time"
                        value={v1.endTime}
                        onChange={(e) => setShift(key1, "endTime", e.target.value)}
                        className="text-xs border border-gray-200 rounded px-1.5 py-1 w-full focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    {(v1.startTime || v1.endTime) && (
                      <button
                        onClick={() => clearShift(key1)}
                        className="text-[10px] text-gray-300 hover:text-red-400 transition-colors"
                      >
                        limpiar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-[10px] text-gray-400">
            Dejá vacío los días / turnos que no aplican.
          </p>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveSchedule}
              disabled={savingSchedule || !selectedEmpId}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {savingSchedule ? "Guardando..." : "Guardar horario"}
            </button>
            {scheduleMsg && (
              <span className={`text-xs font-medium ${scheduleMsg.includes("Error") ? "text-red-500" : "text-emerald-600"}`}>
                {scheduleMsg}
              </span>
            )}
          </div>
        </div>

        {/* Right: Monthly calendar */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
          {/* Month navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-sm font-semibold text-gray-700 capitalize">{monthLabel}</h2>
            <button
              onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {selectedEmp && (
            <p className="text-xs text-gray-500">
              Clic en un día para marcar/desmarcar descanso de{" "}
              <span className="font-semibold text-gray-700">
                {selectedEmp.firstName} {selectedEmp.lastName}
              </span>
            </p>
          )}

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1">
            {DAY_NAMES.map((d) => (
              <div key={d} className="text-center text-[10px] font-bold text-gray-400 uppercase py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: startPad }).map((_, i) => (
              <div key={`pad-${i}`} />
            ))}
            {days.map((day) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const working = getWorkingEmployees(day);
              const isRest = selectedEmpId ? isRestForSelected(dateStr) : false;
              const isToday = todayStr === dateStr;

              return (
                <button
                  key={dateStr}
                  onClick={() => handleToggleRestDay(dateStr)}
                  disabled={!selectedEmpId || !!togglingDate}
                  title={isRest ? "Clic para quitar descanso" : "Clic para marcar descanso"}
                  className={[
                    "relative min-h-[62px] rounded-xl p-1.5 text-left transition-all border",
                    isRest
                      ? "bg-rose-50 border-rose-200 hover:bg-rose-100"
                      : "bg-gray-50 border-gray-100 hover:bg-emerald-50 hover:border-emerald-200",
                    isToday ? "ring-2 ring-emerald-400 ring-offset-1" : "",
                    "disabled:cursor-not-allowed",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <span className={`text-xs font-bold ${isToday ? "text-emerald-700" : "text-gray-500"}`}>
                    {format(day, "d")}
                  </span>
                  {isRest && (
                    <span className="block text-[9px] text-rose-500 font-semibold mt-0.5 leading-tight">
                      Descanso
                    </span>
                  )}
                  {togglingDate === dateStr && (
                    <span className="block text-[9px] text-gray-400 mt-0.5">...</span>
                  )}
                  {!isRest && (
                    <div className="mt-0.5 space-y-0.5">
                      {working.slice(0, 3).map((emp) => (
                        <div key={emp.id} className="flex items-center gap-0.5">
                          <div
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              emp.id === selectedEmpId ? "bg-emerald-500" : "bg-blue-400"
                            }`}
                          />
                          <span className="text-[8px] text-gray-500 truncate leading-tight">
                            {emp.firstName}
                          </span>
                        </div>
                      ))}
                      {working.length > 3 && (
                        <span className="text-[8px] text-gray-400">+{working.length - 3}</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-5 pt-2 border-t border-gray-100 flex-wrap">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs text-gray-500">Empleado seleccionado</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-blue-400" />
              <span className="text-xs text-gray-500">Otros empleados</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-3 rounded bg-rose-50 border border-rose-200" />
              <span className="text-xs text-gray-500">Día de descanso</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pay tables — ADMIN only */}
      {role === "ADMIN" && (
        <>
          {/* Table 1: Scheduled hours → estimated pay */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-700">Estimado según horario programado</h2>
              <p className="text-xs text-gray-400 mt-0.5 capitalize">
                {monthLabel} — basado en horarios asignados y días de descanso
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-xs font-semibold text-gray-500 pb-2 pr-4">Empleado</th>
                    <th className="text-left text-xs font-semibold text-gray-500 pb-2 pr-4">Rol</th>
                    <th className="text-right text-xs font-semibold text-gray-500 pb-2 pr-4">Tarifa</th>
                    <th className="text-right text-xs font-semibold text-gray-500 pb-2 pr-4">Horas programadas</th>
                    <th className="text-right text-xs font-semibold text-gray-500 pb-2">Estimado a cobrar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {payData.map(({ emp, rate, scheduledHours, scheduledPay }) => (
                    <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-2.5 pr-4 font-medium text-gray-800">
                        {emp.firstName} {emp.lastName}
                      </td>
                      <td className="py-2.5 pr-4 text-gray-500 text-xs">{emp.role ?? "—"}</td>
                      <td className="py-2.5 pr-4 text-right text-gray-600 tabular-nums">
                        {rate > 0 ? `$${rate.toLocaleString("es-AR")}/hs` : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="py-2.5 pr-4 text-right tabular-nums text-gray-700 font-medium">
                        {scheduledHours > 0 ? `${scheduledHours.toFixed(1)} hs` : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="py-2.5 text-right tabular-nums">
                        {rate > 0 && scheduledHours > 0 ? (
                          <span className="font-bold text-blue-700">
                            ${scheduledPay.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {payData.some((d) => d.scheduledPay > 0) && (
                  <tfoot>
                    <tr className="border-t border-gray-200">
                      <td colSpan={4} className="pt-2.5 text-xs font-semibold text-gray-500 text-right pr-4">
                        Total estimado
                      </td>
                      <td className="pt-2.5 text-right">
                        <span className="text-base font-bold text-blue-700 tabular-nums">
                          ${payData
                            .reduce((sum, d) => sum + d.scheduledPay, 0)
                            .toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
              {payData.every((d) => d.scheduledHours === 0) && (
                <p className="text-center text-sm text-gray-400 py-4">Sin horarios asignados este mes</p>
              )}
            </div>
          </div>

          {/* Table 2: Real worked hours */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-700">Horas reales trabajadas</h2>
              <p className="text-xs text-gray-400 mt-0.5 capitalize">
                {monthLabel} — basado en fichajes completados
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-xs font-semibold text-gray-500 pb-2 pr-4">Empleado</th>
                    <th className="text-left text-xs font-semibold text-gray-500 pb-2 pr-4">Rol</th>
                    <th className="text-right text-xs font-semibold text-gray-500 pb-2 pr-4">Tarifa</th>
                    <th className="text-right text-xs font-semibold text-gray-500 pb-2 pr-4">Horas trabajadas</th>
                    <th className="text-right text-xs font-semibold text-gray-500 pb-2 pr-4">A cobrar</th>
                    <th className="text-right text-xs font-semibold text-gray-500 pb-2">vs. programado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {payData.map(({ emp, rate, scheduledHours, workedHours, workedPay }) => {
                    const diff = workedHours - scheduledHours;
                    return (
                      <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-2.5 pr-4 font-medium text-gray-800">
                          {emp.firstName} {emp.lastName}
                        </td>
                        <td className="py-2.5 pr-4 text-gray-500 text-xs">{emp.role ?? "—"}</td>
                        <td className="py-2.5 pr-4 text-right text-gray-600 tabular-nums">
                          {rate > 0 ? `$${rate.toLocaleString("es-AR")}/hs` : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="py-2.5 pr-4 text-right tabular-nums text-gray-700 font-medium">
                          {workedHours > 0 ? `${workedHours.toFixed(1)} hs` : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="py-2.5 pr-4 text-right tabular-nums">
                          {rate > 0 && workedHours > 0 ? (
                            <span className="font-bold text-emerald-700">
                              ${workedPay.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="py-2.5 text-right tabular-nums">
                          {scheduledHours > 0 && workedHours > 0 ? (
                            <span className={`text-xs font-semibold ${diff >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                              {diff >= 0 ? "+" : ""}{diff.toFixed(1)} hs
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {payData.some((d) => d.workedPay > 0) && (
                  <tfoot>
                    <tr className="border-t border-gray-200">
                      <td colSpan={4} className="pt-2.5 text-xs font-semibold text-gray-500 text-right pr-4">
                        Total a pagar
                      </td>
                      <td className="pt-2.5 text-right">
                        <span className="text-base font-bold text-emerald-700 tabular-nums">
                          ${payData
                            .reduce((sum, d) => sum + d.workedPay, 0)
                            .toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                        </span>
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
              {payData.every((d) => d.workedHours === 0) && (
                <p className="text-center text-sm text-gray-400 py-4">Sin fichajes completados este mes</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
