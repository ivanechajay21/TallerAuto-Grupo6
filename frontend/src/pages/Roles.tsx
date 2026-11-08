import { useEffect, useMemo, useState } from 'react';
import {
  ShieldCheck,
  UserCog,
  Plus,
  Trash2,
  Pencil,
  Save,
  Loader2,
  Users,
  CheckSquare,
  Square,
  ChevronDown,
  Lock,
  X,
} from 'lucide-react';
import { getRoles, createRole, updateRole, deleteRole, setRolePermissions } from '../services/roleService';
import type { Role } from '../services/roleService';
import { getAllPermissions } from '../services/permissionService';
import type { Permission } from '../services/permissionService';
import { cn } from '../lib/utils';
import { useToast } from '../components/ui/Toast';
import { usePermissions } from '../context/PermissionContext';
import { getCurrentUser } from '../services/authService';

const ACTION_LABELS: Record<string, string> = {
  VER: 'Ver',
  CREAR: 'Crear',
  EDITAR: 'Editar',
  ELIMINAR: 'Eliminar',
  EXPORTAR: 'Exportar',
  APROBAR: 'Aprobar',
  ASIGNAR: 'Asignar',
  CAMBIAR_ESTADO: 'Cambiar estado',
  RECEPCIONAR: 'Recepcionar',
  ANULAR: 'Anular',
  DEVOLVER: 'Devolver',
};

const ACTION_ORDER = [
  'VER', 'CREAR', 'EDITAR', 'ELIMINAR', 'EXPORTAR', 'APROBAR', 'ASIGNAR',
  'CAMBIAR_ESTADO', 'RECEPCIONAR', 'ANULAR', 'DEVOLVER',
];

const MODULE_LABELS: Record<string, string> = {
  DASHBOARD: 'Dashboard',
  NOTIFICATIONS: 'Notificaciones',
  CUSTOMERS: 'Clientes',
  VEHICLES: 'Vehículos',
  APPOINTMENTS: 'Citas',
  WORK_ORDERS: 'Órdenes de trabajo',
  WORK_ORDERS_ITEMS: 'Ítems de órdenes',
  RECEPTION: 'Recepción',
  MY_WORK: 'Mi trabajo',
  INVENTORY: 'Inventario',
  INVENTORY_MOVS: 'Movimientos de inventario',
  BILLING: 'Facturación',
  BILLING_QUOTES: 'Cotizaciones',
  SUPPLIERS: 'Proveedores',
  PURCHASES: 'Compras',
  REPORTS: 'Reportes',
  CONFIG: 'Configuración',
  AUDIT: 'Auditoría',
  USERS: 'Usuarios',
  ROLES: 'Roles y permisos',
};

const ROLE_LABELS: Record<string, string> = {
  ROLE_ADMIN: 'Administrador',
  ROLE_MANAGER: 'Gerente',
  ROLE_RECEPTIONIST: 'Recepcionista',
  ROLE_MECHANIC: 'Mecánico',
  ROLE_STOREKEEPER: 'Almacenero',
};

const roleLabel = (name: string) => ROLE_LABELS[name] ?? name.replace('ROLE_', '');

const isLockedRole = (name: string) => name === 'ROLE_ADMIN';

// Permisos que el rol Administrador no puede perder (si los quita, deja de poder
// administrar el sistema). El backend los re-inserta en todo guardado del rol ADMIN.
const ADMIN_PROTECTED = new Set(['ROLES:VER', 'ROLES:ASIGNAR', 'USUARIOS:VER']);

const isProtectedCode = (roleName: string, code: string) =>
  isLockedRole(roleName) && ADMIN_PROTECTED.has(code);

interface MatrixRow {
  submodule: string;
  actions: { action: string; code: string }[];
}

interface MatrixModule {
  module: string;
  groups: MatrixRow[];
}

function RoleModal({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  initial: { id: number; name: string; description: string } | null;
  onClose: () => void;
  onSave: (name: string, description: string) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? '');
      setDescription(initial?.description ?? '');
    }
  }, [open, initial]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md animate-slide-up rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {initial ? 'Editar rol' : 'Nuevo rol'}
          </h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800">
            <X size={18} />
          </button>
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setSaving(true);
            try {
              await onSave(name.trim(), description.trim());
            } finally {
              setSaving(false);
            }
          }}
          className="space-y-4"
        >
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Nombre</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="ROLE_SUPERVISOR"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Descripción</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Funciones del rol..."
              className="w-full resize-none rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:from-blue-500 hover:to-indigo-500 disabled:opacity-60"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Roles() {
  const toast = useToast();
  const isAdmin = getCurrentUser()?.roleName === 'ROLE_ADMIN';
  const { refresh: refreshPermissions } = usePermissions();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<{ id: number; name: string; description: string } | null>(null);

  const refreshData = async () => {
    const [r, p] = await Promise.all([getRoles(), getAllPermissions()]);
    setRoles(r);
    setPermissions(p);
    if (r.length > 0) {
      setSelectedRoleId((id) => id ?? r[0].id);
    }
  };

  useEffect(() => {
    setLoading(true);
    refreshData()
      .catch(() => toast.error('Error', 'No se pudieron cargar los roles y permisos.'))
      .finally(() => setLoading(false));
  }, []);

  const selectedRole = roles.find((r) => r.id === selectedRoleId) ?? null;

  useEffect(() => {
    if (selectedRole) {
      setSelected(new Set(selectedRole.permissions));
      setExpanded(new Set(permissions.map((p) => p.module)));
    } else {
      setSelected(new Set());
    }
  }, [selectedRoleId, permissions]);

  const matrix = useMemo(() => {
    const byModule = new Map<string, Map<string, Map<string, string>>>();
    permissions.forEach((p) => {
      if (!byModule.has(p.module)) byModule.set(p.module, new Map());
      const bySub = byModule.get(p.module)!;
      if (!bySub.has(p.submodule)) bySub.set(p.submodule, new Map());
      bySub.get(p.submodule)!.set(p.action, p.code);
    });
    const rows: MatrixModule[] = [];
    byModule.forEach((bySub, module) => {
      const groups: { submodule: string; actions: { action: string; code: string }[] }[] = [];
      bySub.forEach((byAction, submodule) => {
        const actions = ACTION_ORDER.filter((a) => byAction.has(a)).map((a) => ({ action: a, code: byAction.get(a)! }));
        groups.push({ submodule, actions });
      });
      rows.push({ module, groups });
    });
    return rows;
  }, [permissions]);

  const toggle = (code: string) => {
    if (!selectedRole || !isAdmin) return;
    // Permisos críticos del rol Administrador: no se pueden quitar desde la UI.
    if (isProtectedCode(selectedRole.name, code)) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const toggleModule = (_module: string, codes: string[]) => {
    if (!selectedRole || !isAdmin) return;
    // El toggle de módulo solo actúa sobre permisos no protegidos (rol ADMIN).
    const togglable = codes.filter((c) => !isProtectedCode(selectedRole.name, c));
    if (togglable.length === 0) return;
    setSelected((prev) => {
      const next = new Set(prev);
      const allSelected = togglable.every((c) => next.has(c));
      togglable.forEach((c) => (allSelected ? next.delete(c) : next.add(c)));
      return next;
    });
  };

  const handleSave = async () => {
    if (!selectedRole) return;
    setSaving(true);
    try {
      const updated = await setRolePermissions(selectedRole.id, Array.from(selected));
      setRoles((rs) => rs.map((r) => (r.id === updated.id ? updated : r)));
      toast.success('Permisos guardados', `Permisos del rol actualizados.`);
      // Refleja el cambio en los módulos del usuario actual al instante
      // (los demás usuarios lo ven en ≤60 s o al volver a la pestaña).
      refreshPermissions();
    } catch (err: any) {
      toast.error('Error', err?.response?.data?.message || 'No se pudieron guardar los permisos.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRole = async (name: string, description: string) => {
    try {
      if (editingRole) {
        const updated = await updateRole(editingRole.id, name, description);
        setRoles((rs) => rs.map((r) => (r.id === updated.id ? updated : r)));
        toast.success('Rol actualizado', `El rol ${name} se actualizó correctamente.`);
      } else {
        const created = await createRole(name, description);
        setRoles((rs) => [...rs, created]);
        setSelectedRoleId(created.id);
        toast.success('Rol creado', `El rol ${name} se creó correctamente.`);
      }
      setModalOpen(false);
    } catch (err: any) {
      toast.error('Error', err?.response?.data?.message || 'No se pudo guardar el rol.');
    }
  };

  const handleDelete = async (role: Role) => {
    if (!window.confirm(`¿Eliminar el rol ${role.name}?`)) return;
    try {
      await deleteRole(role.id);
      setRoles((rs) => rs.filter((r) => r.id !== role.id));
      if (selectedRoleId === role.id) setSelectedRoleId(null);
      toast.success('Rol eliminado', `El rol ${role.name} se eliminó.`);
    } catch (err: any) {
      toast.error('Error', err?.response?.data?.message || 'No se pudo eliminar el rol.');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="text-sm text-slate-500 dark:text-slate-400">Cargando roles y permisos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Roles y Permisos</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Administra los roles y qué acciones puede realizar cada uno por módulo.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={!selectedRole || saving || !isAdmin}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:from-blue-500 hover:to-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            Guardar permisos
          </button>
          {isAdmin && (
            <button
              onClick={() => {
                setEditingRole(null);
                setModalOpen(true);
              }}
              className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <Plus size={15} /> Nuevo rol
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        {/* Lista de roles */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <ShieldCheck size={16} className="text-blue-500" />
            <p className="text-sm font-bold text-slate-900 dark:text-white">Roles</p>
            <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              {roles.length}
            </span>
          </div>
          <div className="max-h-[70vh] overflow-y-auto p-2">
            {roles.map((role) => (
              <button
                key={role.id}
                onClick={() => setSelectedRoleId(role.id)}
                className={cn(
                  'group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition',
                  selectedRoleId === role.id
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-900/20'
                    : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
                )}
              >
                <span
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                    selectedRoleId === role.id ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                  )}
                >
                  {role.system ? <ShieldCheck size={16} /> : <UserCog size={16} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-semibold">{roleLabel(role.name)}</span>
                    {role.system && (
                      <span
                        className={cn(
                          'rounded-full px-1.5 py-px text-[9px] font-bold uppercase tracking-wide',
                          selectedRoleId === role.id ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400'
                        )}
                      >
                        Sistema
                      </span>
                    )}
                  </span>
                  <span
                    className={cn(
                      'mt-0.5 flex items-center gap-1 text-[11px]',
                      selectedRoleId === role.id ? 'text-blue-100/80' : 'text-slate-400'
                    )}
                  >
                    <Users size={11} /> {role.usersCount} usuario(s)
                  </span>
                </span>
                {!role.system && isAdmin && (
                  <span className="flex flex-col gap-0.5 opacity-0 transition group-hover:opacity-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingRole({ id: role.id, name: role.name, description: role.description ?? '' });
                        setModalOpen(true);
                      }}
                      className="rounded p-1 text-slate-400 hover:bg-slate-200/60 hover:text-blue-600 dark:hover:bg-slate-700"
                      aria-label="Editar rol"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(role);
                      }}
                      className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                      aria-label="Eliminar rol"
                    >
                      <Trash2 size={13} />
                    </button>
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Matriz de permisos */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                Permisos de {selectedRole ? roleLabel(selectedRole.name) : '—'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {selected ? `${selected.size} acciones seleccionadas de ${permissions.length}` : ''}
              </p>
            </div>
            {selectedRole && isLockedRole(selectedRole.name) && (
              <span className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                <Lock size={12} /> Puedes ajustar sus módulos, pero no quitar los permisos críticos de administración
              </span>
            )}
          </div>

          {!selectedRole ? (
            <p className="px-5 py-16 text-center text-sm text-slate-400">Selecciona un rol para ver sus permisos.</p>
          ) : (
            <div className="max-h-[62vh] space-y-3 overflow-y-auto p-4">
              {matrix.map((mod) => {
                const allCodes = mod.groups.flatMap((g) => g.actions.map((a) => a.code));
                const allSelected = allCodes.length > 0 && allCodes.every((c) => selected.has(c));
                const someSelected = allCodes.some((c) => selected.has(c));
                const isOpen = expanded.has(mod.module);
                return (
                  <div
                    key={mod.module}
                    className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700"
                  >
                    <button
                      onClick={() =>
                        setExpanded((prev) => {
                          const next = new Set(prev);
                          if (next.has(mod.module)) next.delete(mod.module);
                          else next.add(mod.module);
                          return next;
                        })
                      }
                      className="flex w-full items-center gap-2 bg-slate-50 px-3.5 py-2.5 text-left transition hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800"
                    >
                      <span
                        className="cursor-pointer rounded p-0.5"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleModule(mod.module, allCodes);
                        }}
                        role="checkbox"
                        aria-checked={allSelected}
                        tabIndex={-1}
                      >
                        {allSelected ? (
                          <CheckSquare size={17} className="text-blue-600 dark:text-blue-400" />
                        ) : someSelected ? (
                          <CheckSquare size={17} className="text-blue-400/70" />
                        ) : (
                          <Square size={17} className="text-slate-400" />
                        )}
                      </span>
                      <span className="flex-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {MODULE_LABELS[mod.module] ?? mod.module}
                      </span>
                      <span className="text-[11px] font-medium text-slate-400">
                        {allCodes.filter((c) => selected.has(c)).length}/{allCodes.length}
                      </span>
                      <ChevronDown
                        size={15}
                        className={cn('text-slate-400 transition-transform', isOpen && 'rotate-180')}
                      />
                    </button>

                    {isOpen && (
                      <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {mod.groups.map((group) => (
                          <div key={group.submodule} className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
                            <span className="w-40 shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                              {group.submodule}
                            </span>
                            <div className="flex flex-wrap gap-x-5 gap-y-2">
                              {group.actions.map((a) => {
                                const checked = selected.has(a.code);
                                const protectedCode = isProtectedCode(selectedRole.name, a.code);
                                return (
                                  <button
                                    key={a.code}
                                    onClick={() => toggle(a.code)}
                                    disabled={protectedCode || !isAdmin}
                                    title={
                                      protectedCode
                                        ? 'Permiso protegido: necesario para administrar el sistema'
                                        : undefined
                                    }
                                    className={cn(
                                      'flex items-center gap-1.5 rounded-lg px-1.5 py-1 transition',
                                      protectedCode
                                        ? 'cursor-not-allowed opacity-60'
                                        : 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800'
                                    )}
                                  >
                                    {checked ? (
                                      <CheckSquare size={15} className="text-blue-600 dark:text-blue-400" />
                                    ) : (
                                      <Square size={15} className="text-slate-300 dark:text-slate-600" />
                                    )}
                                    <span
                                      className={cn(
                                        'text-xs',
                                        checked
                                          ? 'font-semibold text-blue-600 dark:text-blue-400'
                                          : 'font-medium text-slate-500 dark:text-slate-400'
                                      )}
                                    >
                                      {ACTION_LABELS[a.action] ?? a.action}
                                    </span>
                                    {protectedCode && <Lock size={10} className="text-slate-400" />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <RoleModal
        open={modalOpen}
        initial={editingRole}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveRole}
      />
    </div>
  );
}