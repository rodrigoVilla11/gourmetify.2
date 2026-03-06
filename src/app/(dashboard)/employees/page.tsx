"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useForm } from "react-hook-form";

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  role: string | null;
  hourlyRate: number;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  _count?: { timeLogs: number };
}

interface EmployeeForm {
  firstName: string;
  lastName: string;
  role?: string;
  hourlyRate: number;
  phone?: string;
  email?: string;
}

const BRAND = "#0f2f26";
const BRAND_HOVER = "#1a4d3f";

function PrimaryBtn({ onClick, disabled, children, type = "button" }: {
  onClick?: () => void; disabled?: boolean; children: React.ReactNode; type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-60"
      style={{ backgroundColor: BRAND }}
      onMouseEnter={(e) => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.backgroundColor = BRAND_HOVER; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = BRAND; }}
    >
      {children}
    </button>
  );
}

function SecondaryBtn({ onClick, children, type = "button" }: {
  onClick?: () => void; children: React.ReactNode; type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
    >
      {children}
    </button>
  );
}

function Avatar({ firstName, lastName, isActive }: { firstName: string; lastName: string; isActive: boolean }) {
  const initials = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
  return (
    <div
      className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center text-xs font-bold"
      style={isActive
        ? { backgroundColor: "rgba(15,47,38,0.08)", color: BRAND }
        : { backgroundColor: "#f3f4f6", color: "#9ca3af" }
      }
    >
      {initials}
    </div>
  );
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<EmployeeForm>();

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/employees");
    const data = await res.json();
    setEmployees(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  const openCreate = () => {
    setEditing(null);
    setSaveError("");
    reset({ firstName: "", lastName: "", role: "", hourlyRate: 0, phone: "", email: "" });
    setIsModalOpen(true);
  };

  const openEdit = (emp: Employee) => {
    setEditing(emp);
    setSaveError("");
    reset({
      firstName: emp.firstName,
      lastName: emp.lastName,
      role: emp.role ?? "",
      hourlyRate: Number(emp.hourlyRate),
      phone: emp.phone ?? "",
      email: emp.email ?? "",
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (data: EmployeeForm) => {
    setSaving(true);
    setSaveError("");
    try {
      const res = editing
        ? await fetch(`/api/employees/${editing.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
        : await fetch("/api/employees", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setSaveError(err.error ?? `Error ${res.status}`);
        return;
      }
      setIsModalOpen(false);
      fetchEmployees();
    } catch {
      setSaveError("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    setDeleteError(null);
    const res = await fetch(`/api/employees/${deletingId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      setDeleteError(data.error ?? "Error al desactivar");
      setIsDeleting(false);
      return;
    }
    setDeletingId(null);
    setIsDeleting(false);
    fetchEmployees();
  };

  const stats = useMemo(() => {
    const active = employees.filter((e) => e.isActive);
    return {
      total: active.length,
      inactive: employees.filter((e) => !e.isActive).length,
      totalTimeLogs: employees.reduce((sum, e) => sum + (e._count?.timeLogs ?? 0), 0),
    };
  }, [employees]);

  const visible = useMemo(() => {
    return employees.filter((e) => {
      if (!showInactive && !e.isActive) return false;
      if (search) {
        const q = search.toLowerCase();
        const fullName = `${e.firstName} ${e.lastName}`.toLowerCase();
        if (!fullName.includes(q) && !(e.role?.toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [employees, showInactive, search]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Empleados</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestión del equipo</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/horarios"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            Horarios
          </Link>
          <Link
            href="/time-logs"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Fichajes
          </Link>
          <PrimaryBtn onClick={openCreate}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nuevo empleado
          </PrimaryBtn>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(15,47,38,0.08)" }}>
            <svg className="w-5 h-5" style={{ color: BRAND }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-xs text-gray-500 font-medium">Activos</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-blue-50">
            <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{stats.totalTimeLogs}</p>
            <p className="text-xs text-gray-500 font-medium">Fichajes totales</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-gray-50">
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-700">{stats.inactive}</p>
            <p className="text-xs text-gray-500 font-medium">Inactivos</p>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o rol..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-gray-400"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none ml-auto">
          <div
            className="w-9 h-5 rounded-full relative transition-colors cursor-pointer shrink-0"
            style={showInactive ? { backgroundColor: BRAND } : { backgroundColor: "#e5e7eb" }}
            onClick={() => setShowInactive((v) => !v)}
          >
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${showInactive ? "translate-x-4" : "translate-x-0.5"}`} />
          </div>
          Mostrar inactivos
        </label>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-3 text-gray-400">
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-sm font-medium">Cargando...</span>
            </div>
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <svg className="w-12 h-12 mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
            <p className="text-sm font-medium text-gray-500">No hay empleados</p>
            <p className="text-xs mt-1">Creá uno nuevo para empezar</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid #f3f4f6", backgroundColor: "#fafafa" }}>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">Empleado</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Rol</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Tarifa/h</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Teléfono</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Fichajes</th>
                <th className="px-4 py-3 w-24" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {visible.map((emp) => (
                <tr key={emp.id} className={`group transition-colors hover:bg-gray-50/60 ${!emp.isActive ? "opacity-50" : ""}`}>
                  {/* Name */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar firstName={emp.firstName} lastName={emp.lastName} isActive={emp.isActive} />
                      <div>
                        <Link
                          href={`/employees/${emp.id}`}
                          className="text-sm font-semibold text-gray-900 hover:text-emerald-700 transition-colors leading-tight"
                        >
                          {emp.lastName}, {emp.firstName}
                        </Link>
                        {!emp.isActive && <p className="text-xs text-gray-400">Inactivo</p>}
                        {emp.email && <p className="text-xs text-gray-400">{emp.email}</p>}
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td className="px-4 py-3.5 hidden sm:table-cell">
                    {emp.role
                      ? <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600">{emp.role}</span>
                      : <span className="text-gray-300 text-sm">—</span>
                    }
                  </td>

                  {/* Hourly rate */}
                  <td className="px-4 py-3.5 hidden md:table-cell">
                    <span className="text-sm font-mono text-gray-700">
                      ${Number(emp.hourlyRate).toLocaleString("es-AR")}
                    </span>
                  </td>

                  {/* Phone */}
                  <td className="px-4 py-3.5 hidden sm:table-cell">
                    {emp.phone
                      ? <span className="text-sm text-gray-600">{emp.phone}</span>
                      : <span className="text-gray-300 text-sm">—</span>
                    }
                  </td>

                  {/* Time logs */}
                  <td className="px-4 py-3.5 hidden md:table-cell">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-600">
                      {emp._count?.timeLogs ?? 0} fichajes
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link
                        href={`/employees/${emp.id}`}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                        title="Ver detalle"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </Link>
                      <button
                        onClick={() => openEdit(emp)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                        title="Editar"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                        </svg>
                      </button>
                      {emp.isActive && (
                        <button
                          onClick={() => { setDeleteError(null); setDeletingId(emp.id); }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Desactivar"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editing ? "Editar empleado" : "Nuevo empleado"}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Nombre *"
              {...register("firstName", { required: "Nombre requerido" })}
              error={errors.firstName?.message}
            />
            <Input
              label="Apellido *"
              {...register("lastName", { required: "Apellido requerido" })}
              error={errors.lastName?.message}
            />
          </div>
          <Input label="Rol / Puesto" {...register("role")} placeholder="ej: Cocinero, Mozo..." />
          <Input
            label="Tarifa por hora ($ARS) *"
            type="number"
            step="0.01"
            min="0"
            {...register("hourlyRate", { required: "Tarifa requerida", valueAsNumber: true, min: 0 })}
            error={errors.hourlyRate?.message}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Teléfono" {...register("phone")} />
            <Input label="Email" type="email" {...register("email")} />
          </div>
          {saveError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{saveError}</p>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <SecondaryBtn type="button" onClick={() => setIsModalOpen(false)}>Cancelar</SecondaryBtn>
            <PrimaryBtn type="submit" disabled={saving}>
              {saving ? "Guardando..." : editing ? "Guardar cambios" : "Crear empleado"}
            </PrimaryBtn>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDelete}
        title="Desactivar empleado"
        message={deleteError ?? "El empleado quedará inactivo y no aparecerá en el fichador. Sus registros de horas se conservan."}
        confirmLabel="Desactivar"
        isLoading={isDeleting}
      />
    </div>
  );
}
