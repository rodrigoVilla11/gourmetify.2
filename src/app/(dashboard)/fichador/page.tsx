"use client";
import { useEffect, useState, useCallback } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";

type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  role: string | null;
  hourlyRate: string | number;
};

type TimeLog = {
  id: string;
  checkIn: string;
  checkOut: string | null;
  duration: string | null;
};

type Session = {
  sub: string;
  username: string;
  role: string;
  employeeId?: string;
};

type Status = "idle" | "loading" | "success" | "error";

function getMonthRange() {
  const today = new Date();
  const from = format(startOfMonth(today), "yyyy-MM-dd");
  const to = format(endOfMonth(today), "yyyy-MM-dd");
  return { from, to };
}

export default function FichadorPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [openLog, setOpenLog] = useState<TimeLog | null | undefined>(undefined);
  const [monthlyLogs, setMonthlyLogs] = useState<TimeLog[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [now, setNow] = useState(new Date());

  // Clock tick
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Load session + employees
  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/employees?isActive=true").then((r) => r.json()),
    ]).then(([sessionData, empData]) => {
      const s: Session | null = sessionData?.sub ? sessionData : null;
      setSession(s);
      const emps: Employee[] = Array.isArray(empData) ? empData : [];
      setEmployees(emps);

      // Auto-select if user has a linked employee
      if (s?.employeeId) {
        setSelectedId(s.employeeId);
      }
    });
  }, []);

  // Load open log when employee changes
  useEffect(() => {
    if (!selectedId) {
      setOpenLog(undefined);
      return;
    }
    setOpenLog(undefined);
    fetch(`/api/time-logs?employeeId=${selectedId}&open=true&limit=1`)
      .then((r) => r.json())
      .then((data) => {
        const logs: TimeLog[] = data.logs ?? [];
        setOpenLog(logs.length > 0 ? logs[0] : null);
      });
  }, [selectedId]);

  // Load monthly logs when employee changes
  const fetchMonthlyLogs = useCallback(() => {
    if (!selectedId) return;
    const { from, to } = getMonthRange();
    fetch(`/api/time-logs?employeeId=${selectedId}&from=${from}&to=${to}&limit=200`)
      .then((r) => r.json())
      .then((data) => setMonthlyLogs(data.logs ?? []));
  }, [selectedId]);

  useEffect(() => {
    fetchMonthlyLogs();
  }, [fetchMonthlyLogs]);

  async function handleCheckIn() {
    setStatus("loading");
    const res = await fetch("/api/time-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId: selectedId }),
    });
    const data = await res.json();
    if (res.ok) {
      setOpenLog(data.timeLog);
      setStatus("success");
      setMessage("¡Entrada registrada!");
      fetchMonthlyLogs();
    } else {
      setStatus("error");
      setMessage(data.error ?? "Error al registrar entrada");
    }
    setTimeout(() => setStatus("idle"), 3000);
  }

  async function handleCheckOut() {
    setStatus("loading");
    const res = await fetch("/api/time-logs/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId: selectedId }),
    });
    const data = await res.json();
    if (res.ok) {
      const hours = data.durationHours != null ? Number(data.durationHours).toFixed(2) : "?";
      setOpenLog(null);
      setStatus("success");
      setMessage(`¡Salida registrada! Trabajaste ${hours} hs.`);
      fetchMonthlyLogs();
    } else {
      setStatus("error");
      setMessage(data.error ?? "Error al registrar salida");
    }
    setTimeout(() => setStatus("idle"), 3000);
  }

  const selected = employees.find((e) => e.id === selectedId);
  const hasOpenLog = openLog !== null && openLog !== undefined;
  const isAutoSelected = !!session?.employeeId;

  // ── Monthly stats ────────────────────────────────────────────────────────────
  const completedLogs = monthlyLogs.filter((l) => l.checkOut !== null && l.duration !== null);
  const completedHours = completedLogs.reduce((sum, l) => sum + Number(l.duration ?? 0), 0);

  // Add in-progress time from open log (live)
  const openHours = hasOpenLog
    ? (now.getTime() - new Date(openLog!.checkIn).getTime()) / 3600000
    : 0;

  const totalHours = completedHours + openHours;
  const hourlyRate = selected ? Number(selected.hourlyRate) : 0;
  const estimatedPay = totalHours * hourlyRate;

  const monthLabel = format(now, "MMMM yyyy", { locale: es });

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 py-12">
      {/* Clock */}
      <div className="text-center mb-8">
        <p className="text-5xl font-bold text-gray-900 tabular-nums">
          {format(now, "HH:mm:ss")}
        </p>
        <p className="text-gray-500 mt-1 capitalize">
          {format(now, "EEEE, d 'de' MMMM yyyy", { locale: es })}
        </p>
      </div>

      <div className="w-full max-w-sm space-y-4">
        {/* Main card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
          <h1 className="text-2xl font-bold text-gray-900 text-center">Fichador</h1>

          {/* Employee: auto-selected or dropdown */}
          {isAutoSelected ? (
            <div className="text-center py-2">
              <p className="text-lg font-semibold text-gray-800">
                {selected ? `${selected.firstName} ${selected.lastName}` : "Cargando..."}
              </p>
              {selected?.role && (
                <p className="text-sm text-gray-500">{selected.role}</p>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Seleccionar empleado</label>
              <select
                value={selectedId}
                onChange={(e) => {
                  setSelectedId(e.target.value);
                  setStatus("idle");
                  setMessage("");
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">— Elegir empleado —</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.lastName}, {emp.firstName}
                    {emp.role ? ` (${emp.role})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Status badge */}
          {selectedId && openLog !== undefined && (
            <div
              className={`rounded-lg px-4 py-3 text-sm font-medium text-center ${
                hasOpenLog
                  ? "bg-amber-50 text-amber-800 border border-amber-200"
                  : "bg-gray-50 text-gray-600 border border-gray-200"
              }`}
            >
              {hasOpenLog ? (
                <>
                  Turno <span className="font-bold">ABIERTO</span> desde{" "}
                  {format(new Date(openLog!.checkIn), "HH:mm")}
                </>
              ) : (
                "Sin turno activo"
              )}
            </div>
          )}

          {/* Action buttons */}
          {selectedId && openLog !== undefined && (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleCheckIn}
                disabled={hasOpenLog || status === "loading"}
                className="py-4 rounded-xl text-white text-lg font-bold transition-colors bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ENTRADA
              </button>
              <button
                onClick={handleCheckOut}
                disabled={!hasOpenLog || status === "loading"}
                className="py-4 rounded-xl text-white text-lg font-bold transition-colors bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                SALIDA
              </button>
            </div>
          )}

          {/* Feedback */}
          {status !== "idle" && message && (
            <div
              className={`rounded-lg px-4 py-3 text-sm font-medium text-center ${
                status === "success"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : status === "error"
                  ? "bg-red-50 text-red-800 border border-red-200"
                  : "bg-gray-50 text-gray-600"
              }`}
            >
              {status === "loading" ? "Procesando..." : message}
            </div>
          )}
        </div>

        {/* Monthly stats card — only when employee is selected */}
        {selectedId && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700 capitalize">
                {monthLabel}
              </h2>
              <span className="text-xs text-gray-400">{completedLogs.length} turno{completedLogs.length !== 1 ? "s" : ""} completado{completedLogs.length !== 1 ? "s" : ""}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Total hours */}
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-0.5">Horas trabajadas</p>
                <p className="text-xl font-bold text-gray-900 tabular-nums">
                  {totalHours.toFixed(1)}
                  <span className="text-sm font-normal text-gray-500 ml-1">hs</span>
                </p>
                {hasOpenLog && (
                  <p className="text-[11px] text-amber-600 mt-0.5">+{openHours.toFixed(1)} hs en curso</p>
                )}
              </div>

              {/* Estimated pay */}
              <div className="bg-emerald-50 rounded-xl p-3">
                <p className="text-xs text-emerald-700 mb-0.5">Estimado a cobrar</p>
                {hourlyRate > 0 ? (
                  <p className="text-xl font-bold text-emerald-700 tabular-nums">
                    ${estimatedPay.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                  </p>
                ) : (
                  <p className="text-sm text-gray-400 mt-1">Sin tarifa configurada</p>
                )}
                {hourlyRate > 0 && (
                  <p className="text-[11px] text-emerald-600 mt-0.5">
                    ${Number(hourlyRate).toLocaleString("es-AR")}/hs
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
