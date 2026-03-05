"use client";
import { useState, useEffect, useCallback } from "react";
import { PLAN_LABELS, PLAN_COLORS, type Plan } from "@/lib/plans";

interface Organization {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  plan: Plan;
  planExpiresAt: string | null;
  createdAt: string;
  _count: { users: number };
}

const PLAN_OPTIONS: Plan[] = ["FREE", "STARTER", "PRO"];

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Create form state
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [createPlan, setCreatePlan] = useState<Plan>("FREE");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit drawer state
  const [editOrg, setEditOrg] = useState<Organization | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editPlan, setEditPlan] = useState<Plan>("FREE");
  const [editExpires, setEditExpires] = useState("");
  const [editNoExpiry, setEditNoExpiry] = useState(true);
  const [editActive, setEditActive] = useState(true);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const fetchOrgs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/organizations");
      const data = await res.json();
      setOrgs(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrgs(); }, [fetchOrgs]);

  const autoSlug = (n: string) =>
    n.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").slice(0, 60);

  const handleNameChange = (v: string) => {
    setName(v);
    setSlug(autoSlug(v));
    if (!adminUsername) setAdminUsername("admin-" + autoSlug(v));
  };

  const resetForm = () => {
    setName(""); setSlug(""); setAdminUsername(""); setAdminPassword("");
    setCreatePlan("FREE"); setShowForm(false); setError(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug, adminUsername, adminPassword, plan: createPlan }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Error"); return; }
      resetForm();
      fetchOrgs();
    } finally {
      setSaving(false);
    }
  };

  const updatePlanInline = async (org: Organization, plan: Plan) => {
    await fetch(`/api/organizations/${org.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    fetchOrgs();
  };

  const openEdit = (org: Organization) => {
    setEditOrg(org);
    setEditName(org.name);
    setEditSlug(org.slug);
    setEditPlan(org.plan);
    setEditActive(org.isActive);
    setEditError(null);
    if (org.planExpiresAt) {
      setEditNoExpiry(false);
      setEditExpires(org.planExpiresAt.slice(0, 10));
    } else {
      setEditNoExpiry(true);
      setEditExpires("");
    }
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editOrg) return;
    setEditSaving(true);
    setEditError(null);
    try {
      const body: Record<string, unknown> = {
        name: editName,
        slug: editSlug,
        plan: editPlan,
        isActive: editActive,
        planExpiresAt: editNoExpiry ? null : new Date(editExpires).toISOString(),
      };
      const res = await fetch(`/api/organizations/${editOrg.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setEditError(data.error ?? "Error"); return; }
      setEditOrg(null);
      fetchOrgs();
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Organizaciones</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestión de clientes y locales en el sistema</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
        >
          + Nueva organización
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Nueva organización</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del local</label>
                <input
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  required
                  placeholder="Ej: Restaurante El Gaucho"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug (URL)</label>
                <input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  required
                  pattern="[a-z0-9-]+"
                  placeholder="el-gaucho"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-bold tracking-widest text-gray-400 uppercase mb-3">Cuenta administrador</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Usuario admin</label>
                  <input
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    required
                    minLength={3}
                    placeholder="admin-mi-local"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                  <input
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    type="password"
                    required
                    minLength={6}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plan inicial</label>
              <select
                value={createPlan}
                onChange={(e) => setCreatePlan(e.target.value as Plan)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {PLAN_OPTIONS.map((p) => (
                  <option key={p} value={p}>{PLAN_LABELS[p]}</option>
                ))}
              </select>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={resetForm} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
                Cancelar
              </button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-60">
                {saving ? "Creando..." : "Crear organización"}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando...</div>
      ) : orgs.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No hay organizaciones</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Nombre</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Slug</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Plan</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Vencimiento</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Usuarios</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {orgs.map((org) => (
                <tr key={org.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{org.name}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{org.slug}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PLAN_COLORS[org.plan]}`}>
                        {PLAN_LABELS[org.plan]}
                      </span>
                      <select
                        value={org.plan}
                        onChange={(e) => updatePlanInline(org, e.target.value as Plan)}
                        className="text-xs border border-gray-200 rounded px-1.5 py-0.5 bg-white text-gray-600 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                      >
                        {PLAN_OPTIONS.map((p) => (
                          <option key={p} value={p}>{PLAN_LABELS[p]}</option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {org.planExpiresAt
                      ? new Date(org.planExpiresAt).toLocaleDateString("es-AR")
                      : <span className="text-gray-400">Sin vencimiento</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{org._count.users}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${org.isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                      {org.isActive ? "Activa" : "Inactiva"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openEdit(org)}
                      className="text-xs px-3 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Drawer */}
      {editOrg && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setEditOrg(null)} />
          <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Editar organización</h2>
              <button
                onClick={() => setEditOrg(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleEditSave} className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                <input
                  value={editSlug}
                  onChange={(e) => setEditSlug(e.target.value)}
                  required
                  pattern="[a-z0-9-]+"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-xs text-gray-400 mt-1">Solo letras minúsculas, números y guiones</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
                <select
                  value={editPlan}
                  onChange={(e) => setEditPlan(e.target.value as Plan)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {PLAN_OPTIONS.map((p) => (
                    <option key={p} value={p}>{PLAN_LABELS[p]}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Vencimiento del plan</label>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    id="noExpiry"
                    checked={editNoExpiry}
                    onChange={(e) => { setEditNoExpiry(e.target.checked); if (e.target.checked) setEditExpires(""); }}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="noExpiry" className="text-sm text-gray-600">Sin vencimiento</label>
                </div>
                {!editNoExpiry && (
                  <input
                    type="date"
                    value={editExpires}
                    onChange={(e) => setEditExpires(e.target.value)}
                    required={!editNoExpiry}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setEditActive(true)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${editActive ? "bg-emerald-600 text-white border-emerald-600" : "text-gray-600 border-gray-300 hover:bg-gray-50"}`}
                  >
                    Activa
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditActive(false)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${!editActive ? "bg-red-500 text-white border-red-500" : "text-gray-600 border-gray-300 hover:bg-gray-50"}`}
                  >
                    Inactiva
                  </button>
                </div>
              </div>

              {editError && <p className="text-sm text-red-600">{editError}</p>}

              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                Los cambios de plan se reflejan en el menú del usuario tras su próximo login.
              </p>
            </form>

            <div className="px-5 py-4 border-t border-gray-100 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setEditOrg(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleEditSave}
                disabled={editSaving}
                className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-60"
              >
                {editSaving ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
