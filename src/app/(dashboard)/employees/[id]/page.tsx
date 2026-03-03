"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table, Column } from "@/components/ui/Table";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useForm } from "react-hook-form";
import { downloadExcel } from "@/utils/excel";

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  role: string | null;
  hourlyRate: number;
  phone: string | null;
  email: string | null;
  isActive: boolean;
}

interface TimeLog {
  id: string;
  checkIn: string;
  checkOut: string | null;
  duration: number | null;
  notes: string | null;
}

interface EditLogForm {
  checkIn: string;
  checkOut: string;
  notes: string;
}

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [logs, setLogs] = useState<TimeLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Report params
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const [from, setFrom] = useState(firstOfMonth.toISOString().slice(0, 10));
  const [to, setTo] = useState(today.toISOString().slice(0, 10));

  // Edit log modal
  const [editingLog, setEditingLog] = useState<TimeLog | null>(null);
  const [deletingLogId, setDeletingLogId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<EditLogForm>();

  const fetchEmployee = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/employees/${id}`);
    if (!res.ok) { router.push("/employees"); return; }
    const data = await res.json();
    setEmployee(data);
    setLogs(data.timeLogs ?? []);
    setLoading(false);
  }, [id, router]);

  useEffect(() => { fetchEmployee(); }, [fetchEmployee]);

  const openEditLog = (log: TimeLog) => {
    setEditingLog(log);
    reset({
      checkIn: log.checkIn.slice(0, 16),
      checkOut: log.checkOut ? log.checkOut.slice(0, 16) : "",
      notes: log.notes ?? "",
    });
  };

  const onSubmitLog = async (data: EditLogForm) => {
    if (!editingLog) return;
    setSaving(true);
    await fetch(`/api/time-logs/${editingLog.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        checkIn: data.checkIn ? new Date(data.checkIn).toISOString() : undefined,
        checkOut: data.checkOut ? new Date(data.checkOut).toISOString() : null,
        notes: data.notes || null,
      }),
    });
    setSaving(false);
    setEditingLog(null);
    fetchEmployee();
  };

  const handleDeleteLog = async () => {
    if (!deletingLogId) return;
    setIsDeleting(true);
    await fetch(`/api/time-logs/${deletingLogId}`, { method: "DELETE" });
    setIsDeleting(false);
    setDeletingLogId(null);
    fetchEmployee();
  };

  if (loading || !employee) {
    return <div className="text-center py-20 text-gray-400">Cargando...</div>;
  }

  const completedLogs = logs.filter((l) => l.checkOut);
  const totalHours = Math.round(
    completedLogs.reduce((s, l) => s + (l.duration ? Number(l.duration) : 0), 0) * 100
  ) / 100;
  const totalCost = Math.round(totalHours * Number(employee.hourlyRate) * 100) / 100;

  const logColumns: Column<TimeLog>[] = [
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
      render: (l) => l.notes ?? <span className="text-gray-400">—</span>,
    },
    {
      key: "actions",
      header: "",
      render: (l) => (
        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="ghost" onClick={() => openEditLog(l)}>Editar</Button>
          <Button size="sm" variant="danger" onClick={() => setDeletingLogId(l.id)}>Eliminar</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/employees" className="text-gray-400 hover:text-gray-600">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            {employee.lastName}, {employee.firstName}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            {employee.role && <span className="text-sm text-gray-500">{employee.role}</span>}
            <Badge variant={employee.isActive ? "success" : "neutral"}>
              {employee.isActive ? "Activo" : "Inactivo"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Tarifa/hora", value: `$${Number(employee.hourlyRate).toLocaleString("es-AR")}` },
          { label: "Fichajes totales", value: logs.length },
          { label: "Teléfono", value: employee.phone ?? "—" },
          { label: "Email", value: employee.email ?? "—" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className="text-lg font-semibold text-gray-900 mt-1 truncate">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Report section */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="font-semibold text-gray-900">Reporte de horas</h2>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Desde</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Hasta</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <Button
            variant="secondary"
            onClick={() =>
              downloadExcel(
                `/api/employees/${id}/report?from=${from}&to=${to}&format=xlsx`,
                `reporte_${employee.lastName}_${from}_${to}.xlsx`
              )
            }
          >
            Exportar Excel
          </Button>
        </div>

        {/* Summary for visible logs period */}
        <div className="flex gap-6 pt-2">
          <div>
            <p className="text-xs text-gray-500">Total horas (en tabla)</p>
            <p className="text-xl font-bold text-gray-900">{totalHours} hs</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Costo estimado</p>
            <p className="text-xl font-bold text-emerald-700">
              ${totalCost.toLocaleString("es-AR")}
            </p>
          </div>
        </div>
      </div>

      {/* Time logs table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Fichajes recientes</h2>
          <span className="text-sm text-gray-400">{logs.length} registros</span>
        </div>
        <Table
          columns={logColumns}
          data={logs}
          isLoading={loading}
          rowKey={(l) => l.id}
          emptyMessage="No hay fichajes registrados"
        />
      </div>

      {/* Edit log modal */}
      <Modal
        isOpen={!!editingLog}
        onClose={() => setEditingLog(null)}
        title="Corregir fichaje"
      >
        <form onSubmit={handleSubmit(onSubmitLog)} className="space-y-4">
          <Input
            label="Entrada"
            type="datetime-local"
            {...register("checkIn", { required: "Fecha de entrada requerida" })}
            error={errors.checkIn?.message}
          />
          <Input
            label="Salida (dejar vacío si está abierto)"
            type="datetime-local"
            {...register("checkOut")}
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Notas</label>
            <textarea
              {...register("notes")}
              rows={2}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setEditingLog(null)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={saving}>
              Guardar
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deletingLogId}
        onClose={() => setDeletingLogId(null)}
        onConfirm={handleDeleteLog}
        title="Eliminar fichaje"
        message="¿Eliminar este registro de entrada/salida? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        isLoading={isDeleting}
      />
    </div>
  );
}
