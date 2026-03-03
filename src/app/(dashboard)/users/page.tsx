"use client";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Table, Column } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useForm } from "react-hook-form";

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
}

interface UserRecord {
  id: string;
  username: string;
  role: string;
  isActive: boolean;
  employeeId: string | null;
  employee: { id: string; firstName: string; lastName: string } | null;
}

interface UserForm {
  username: string;
  password: string;
  role: string;
  employeeId: string;
}

const ROLES = ["ADMIN", "ENCARGADO", "CAJERA", "EMPLEADO"];

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  ENCARGADO: "Encargado",
  CAJERA: "Cajera",
  EMPLEADO: "Empleado",
};

const ROLE_VARIANTS: Record<string, "info" | "success" | "warning" | "neutral"> = {
  ADMIN: "warning",
  ENCARGADO: "success",
  CAJERA: "info",
  EMPLEADO: "neutral",
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<UserRecord | null>(null);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<UserForm>({
    defaultValues: { role: "EMPLEADO", employeeId: "" },
  });

  const watchedRole = watch("role");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [usersRes, empRes] = await Promise.all([
      fetch("/api/users"),
      fetch("/api/employees?isActive=true"),
    ]);
    const { data: usersData } = await usersRes.json();
    const empData = await empRes.json();
    setUsers(usersData ?? []);
    setEmployees(Array.isArray(empData) ? empData : []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Employees that are already linked to a user (excluding the one being edited)
  const linkedEmployeeIds = users
    .filter((u) => u.id !== editing?.id && u.employeeId)
    .map((u) => u.employeeId as string);

  const availableEmployees = employees.filter(
    (e) => !linkedEmployeeIds.includes(e.id)
  );

  const openCreate = () => {
    setEditing(null);
    setSaveError(null);
    reset({ username: "", password: "", role: "EMPLEADO", employeeId: "" });
    setIsModalOpen(true);
  };

  const openEdit = (u: UserRecord) => {
    setEditing(u);
    setSaveError(null);
    reset({
      username: u.username,
      password: "",
      role: u.role,
      employeeId: u.employeeId ?? "",
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (data: UserForm) => {
    setSaving(true);
    setSaveError(null);
    try {
      const body: Record<string, unknown> = {
        username: data.username,
        role: data.role,
        employeeId: data.role === "ADMIN" || !data.employeeId ? null : data.employeeId,
      };
      if (data.password) body.password = data.password;
      if (!editing) body.password = data.password; // required on create

      const res = await fetch(editing ? `/api/users/${editing.id}` : "/api/users", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const json = await res.json();
        setSaveError(json.error ?? "Error al guardar");
        return;
      }

      setIsModalOpen(false);
      fetchData();
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!deactivatingId) return;
    setIsDeactivating(true);
    await fetch(`/api/users/${deactivatingId}`, { method: "DELETE" });
    setDeactivatingId(null);
    setIsDeactivating(false);
    fetchData();
  };

  const columns: Column<UserRecord>[] = [
    {
      key: "username",
      header: "Usuario",
      render: (u) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs shrink-0">
            {u.username.charAt(0).toUpperCase()}
          </div>
          <span className="font-medium text-gray-900">{u.username}</span>
          {!u.isActive && <Badge variant="neutral">Inactivo</Badge>}
        </div>
      ),
    },
    {
      key: "role",
      header: "Rol",
      render: (u) => (
        <Badge variant={ROLE_VARIANTS[u.role] ?? "neutral"}>
          {ROLE_LABELS[u.role] ?? u.role}
        </Badge>
      ),
    },
    {
      key: "employee",
      header: "Empleado vinculado",
      className: "hidden sm:table-cell",
      render: (u) =>
        u.employee
          ? <span className="text-sm text-gray-700">{u.employee.lastName}, {u.employee.firstName}</span>
          : <span className="text-gray-400">—</span>,
    },
    {
      key: "actions",
      header: "",
      render: (u) => (
        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="ghost" onClick={() => openEdit(u)}>Editar</Button>
          {u.isActive && (
            <Button size="sm" variant="danger" onClick={() => setDeactivatingId(u.id)}>Desactivar</Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
          <p className="text-sm text-gray-500 mt-1">Gestión de acceso al sistema</p>
        </div>
        <Button onClick={openCreate}>+ Nuevo Usuario</Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <Table
          columns={columns}
          data={users}
          isLoading={loading}
          rowKey={(u) => u.id}
          emptyMessage="No hay usuarios registrados."
        />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editing ? "Editar Usuario" : "Nuevo Usuario"}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Nombre de usuario *"
            {...register("username", { required: "Usuario requerido", minLength: { value: 3, message: "Mínimo 3 caracteres" } })}
            error={errors.username?.message}
          />

          <Input
            label={editing ? "Nueva contraseña (dejar vacío para no cambiar)" : "Contraseña *"}
            type="password"
            {...register("password", {
              required: editing ? false : "Contraseña requerida",
              minLength: { value: 6, message: "Mínimo 6 caracteres" },
              validate: (v) => !v || v.length >= 6 || "Mínimo 6 caracteres",
            })}
            error={errors.password?.message}
            placeholder={editing ? "Dejar vacío para no cambiar" : "Mínimo 6 caracteres"}
          />

          <Select
            label="Rol *"
            {...register("role", { required: true })}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </Select>

          <Select
            label="Empleado vinculado"
            disabled={watchedRole === "ADMIN"}
            {...register("employeeId")}
          >
            <option value="">Sin empleado</option>
            {/* Show current employee even if not in available list */}
            {editing?.employee && !availableEmployees.find(e => e.id === editing.employee?.id) && (
              <option value={editing.employee.id}>
                {editing.employee.lastName}, {editing.employee.firstName}
              </option>
            )}
            {availableEmployees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.lastName}, {e.firstName}
              </option>
            ))}
          </Select>
          {watchedRole === "ADMIN" && (
            <p className="text-xs text-gray-400 -mt-2">Los usuarios ADMIN no se vinculan a empleados.</p>
          )}

          {saveError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <p className="text-sm text-red-600">{saveError}</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button type="submit" isLoading={saving}>{editing ? "Guardar cambios" : "Crear usuario"}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deactivatingId}
        onClose={() => setDeactivatingId(null)}
        onConfirm={handleDeactivate}
        title="Desactivar usuario"
        message="El usuario no podrá ingresar al sistema. Esta acción se puede revertir editando el usuario."
        confirmLabel="Desactivar"
        isLoading={isDeactivating}
      />
    </div>
  );
}
