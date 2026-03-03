"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Table, Column } from "@/components/ui/Table";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Badge } from "@/components/ui/Badge";
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

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [saving, setSaving] = useState(false);

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
    reset({ firstName: "", lastName: "", role: "", hourlyRate: 0, phone: "", email: "" });
    setIsModalOpen(true);
  };

  const openEdit = (emp: Employee) => {
    setEditing(emp);
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
    try {
      if (editing) {
        await fetch(`/api/employees/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      } else {
        await fetch("/api/employees", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      }
      setIsModalOpen(false);
      fetchEmployees();
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

  const columns: Column<Employee>[] = [
    {
      key: "name",
      header: "Nombre",
      render: (e) => (
        <Link href={`/employees/${e.id}`} className="font-medium text-emerald-700 hover:underline">
          {e.lastName}, {e.firstName}
        </Link>
      ),
    },
    { key: "role", header: "Rol", className: "hidden sm:table-cell", render: (e) => e.role ?? <span className="text-gray-400">—</span> },
    {
      key: "hourlyRate",
      header: "Tarifa/hora",
      className: "hidden sm:table-cell",
      render: (e) => (
        <span className="font-mono">${Number(e.hourlyRate).toLocaleString("es-AR")}</span>
      ),
    },
    { key: "phone", header: "Teléfono", className: "hidden sm:table-cell", render: (e) => e.phone ?? <span className="text-gray-400">—</span> },
    {
      key: "timeLogs",
      header: "Fichajes",
      className: "hidden sm:table-cell",
      render: (e) => <Badge variant="neutral">{e._count?.timeLogs ?? 0}</Badge>,
    },
    {
      key: "status",
      header: "Estado",
      render: (e) => (
        <Badge variant={e.isActive ? "success" : "neutral"}>
          {e.isActive ? "Activo" : "Inactivo"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (e) => (
        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="ghost" onClick={() => openEdit(e)}>Editar</Button>
          {e.isActive && (
            <Button size="sm" variant="danger" onClick={() => { setDeleteError(null); setDeletingId(e.id); }}>
              Desactivar
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Empleados</h1>
          <p className="text-sm text-gray-500 mt-1">{employees.length} empleados registrados</p>
        </div>
        <Button onClick={openCreate}>+ Nuevo Empleado</Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <Table
          columns={columns}
          data={employees}
          isLoading={loading}
          rowKey={(e) => e.id}
          emptyMessage="No hay empleados registrados"
        />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editing ? "Editar Empleado" : "Nuevo Empleado"}
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
          <Input label="Rol / Puesto" {...register("role")} placeholder="ej. Cocinero, Mozo..." />
          <Input
            label="Tarifa por hora ($ARS) *"
            type="number"
            step="0.01"
            min="0"
            {...register("hourlyRate", { required: "Tarifa requerida", valueAsNumber: true, min: 0 })}
            error={errors.hourlyRate?.message}
          />
          <Input label="Teléfono" {...register("phone")} />
          <Input label="Email" type="email" {...register("email")} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={saving}>
              {editing ? "Guardar cambios" : "Crear empleado"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDelete}
        title="Desactivar empleado"
        message={
          deleteError
            ? deleteError
            : "El empleado quedará inactivo y no aparecerá en el fichador. Sus registros de horas se conservan."
        }
        confirmLabel="Desactivar"
        isLoading={isDeleting}
      />
    </div>
  );
}
