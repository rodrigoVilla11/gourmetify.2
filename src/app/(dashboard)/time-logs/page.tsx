"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table, Column } from "@/components/ui/Table";
import { downloadExcel } from "@/utils/excel";

interface Employee { id: string; firstName: string; lastName: string; role: string | null }

interface TimeLog {
  id: string;
  checkIn: string;
  checkOut: string | null;
  duration: number | null;
  notes: string | null;
  employee: Employee;
}

export default function TimeLogsPage() {
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [logs, setLogs] = useState<TimeLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [from, setFrom] = useState(firstOfMonth.toISOString().slice(0, 10));
  const [to, setTo] = useState(today.toISOString().slice(0, 10));
  const [empFilter, setEmpFilter] = useState("");
  const [onlyOpen, setOnlyOpen] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ from, to, limit: "500" });
    if (onlyOpen) params.set("open", "true");
    const res = await fetch(`/api/time-logs?${params}`);
    const data = await res.json();
    setLogs(data.logs ?? []);
    setLoading(false);
  }, [from, to, onlyOpen]);

  useEffect(() => {
    fetch("/api/employees?isActive=true")
      .then((r) => r.json())
      .then((d) => setEmployees(Array.isArray(d) ? d : []));
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // Client-side employee filter with useMemo
  const filtered = useMemo(() => {
    if (!empFilter) return logs;
    return logs.filter((l) => l.employee.id === empFilter);
  }, [logs, empFilter]);

  // Totals
  const totalHours = useMemo(
    () =>
      Math.round(
        filtered
          .filter((l) => l.checkOut)
          .reduce((s, l) => s + (l.duration ? Number(l.duration) : 0), 0) * 100
      ) / 100,
    [filtered]
  );

  const columns: Column<TimeLog>[] = [
    {
      key: "employee",
      header: "Empleado",
      render: (l) => (
        <Link
          href={`/employees/${l.employee.id}`}
          className="font-medium text-emerald-700 hover:underline"
        >
          {l.employee.lastName}, {l.employee.firstName}
        </Link>
      ),
    },
    {
      key: "role",
      header: "Rol",
      className: "hidden sm:table-cell",
      render: (l) => l.employee.role ?? <span className="text-gray-400">—</span>,
    },
    {
      key: "date",
      header: "Fecha",
      render: (l) => format(new Date(l.checkIn), "dd/MM/yyyy", { locale: es }),
    },
    {
      key: "checkIn",
      header: "Entrada",
      render: (l) => format(new Date(l.checkIn), "HH:mm"),
    },
    {
      key: "checkOut",
      header: "Salida",
      render: (l) =>
        l.checkOut ? (
          format(new Date(l.checkOut), "HH:mm")
        ) : (
          <Badge variant="warning">Abierto</Badge>
        ),
    },
    {
      key: "duration",
      header: "Horas",
      render: (l) =>
        l.duration ? (
          <span className="font-mono">{Number(l.duration).toFixed(2)} hs</span>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
    {
      key: "notes",
      header: "Notas",
      className: "hidden sm:table-cell",
      render: (l) => l.notes ?? <span className="text-gray-400">—</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fichajes</h1>
          <p className="text-sm text-gray-500 mt-1">Historial de entradas y salidas</p>
        </div>
        <Button
          variant="secondary"
          onClick={() =>
            downloadExcel(
              `/api/time-logs/report?from=${from}&to=${to}&format=xlsx`,
              `fichajes_${from}_${to}.xlsx`
            )
          }
        >
          Exportar Excel
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-4 items-end">
        <div className="w-full sm:w-auto">
          <label className="block text-xs font-medium text-gray-600 mb-1">Desde</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div className="w-full sm:w-auto">
          <label className="block text-xs font-medium text-gray-600 mb-1">Hasta</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div className="w-full sm:w-auto">
          <label className="block text-xs font-medium text-gray-600 mb-1">Empleado</label>
          <select
            value={empFilter}
            onChange={(e) => setEmpFilter(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Todos</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.lastName}, {e.firstName}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={onlyOpen}
            onChange={(e) => setOnlyOpen(e.target.checked)}
            className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
          />
          Solo turnos abiertos
        </label>
        <Button onClick={fetchLogs} variant="secondary">Buscar</Button>
      </div>

      {/* Summary */}
      {!loading && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500">Registros</p>
            <p className="text-2xl font-bold text-gray-900">{filtered.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500">Total horas</p>
            <p className="text-2xl font-bold text-gray-900">{totalHours} hs</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500">Turnos abiertos</p>
            <p className="text-2xl font-bold text-amber-600">
              {filtered.filter((l) => !l.checkOut).length}
            </p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <Table
          columns={columns}
          data={filtered}
          isLoading={loading}
          rowKey={(l) => l.id}
          emptyMessage="No hay fichajes en el período seleccionado"
        />
      </div>
    </div>
  );
}
