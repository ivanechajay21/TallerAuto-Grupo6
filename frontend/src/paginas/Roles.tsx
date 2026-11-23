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
  ChevronUp,
  Lock,
  Search,
  Layers3,
  X,
} from 'lucide-react';
import { getRoles, createRole, updateRole, deleteRole, setRolePermissions } from '../servicios/rolesServicio';
import type { Role } from '../servicios/rolesServicio';
import { getAllPermissions } from '../servicios/permisosServicio';
import type { Permission } from '../servicios/permisosServicio';
import { cn } from '../lib/utilidades';
import { useToast } from '../componentes/interfaz/Avisos';
import { usePermissions } from '../contexto/ContextoPermisos';
import ConfirmDialog from '../componentes/interfaz/DialogoConfirmacion';
import EncabezadoModulo from '../componentes/interfaz/EncabezadoModulo';
import { CampoFormulario, estiloCampo } from '../componentes/interfaz/Formulario';
import Modal from '../componentes/interfaz/Modal';
import { getCurrentUser } from '../servicios/autenticacionServicio';

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
  DASHBOARD: 'Panel',
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
    <Modal
      title={initial ? 'Editar rol' : 'Nuevo rol'}
      description="Define el nombre y las funciones del rol dentro del sistema."
      icon={UserCog}
      size="sm"
      onClose={onClose}
      footer={(
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="role-form"
            disabled={saving || !name.trim()}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            Guardar rol
          </button>
        </>
      )}
    >
      <form
        id="role-form"
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
        <CampoFormulario label="Nombre" required hint="Ejemplo: ROLE_SUPERVISOR">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="ROLE_SUPERVISOR"
            className={estiloCampo}
          />
        </CampoFormulario>
        <CampoFormulario label="Descripción">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Funciones del rol..."
            className={`${estiloCampo} resize-none`}
          />
        </CampoFormulario>
      </form>
    </Modal>
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
  const [moduleQuery, setModuleQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<{ id: number; name: string; description: string } | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [deletingRole, setDeletingRole] = useState(false);

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

  const visibleMatrix = useMemo(() => {
    const q = moduleQuery.toLowerCase().trim();
    if (!q) return matrix;
    return matrix.filter((mod) => {
      const label = MODULE_LABELS[mod.module] ?? mod.module;
      return label.toLowerCase().includes(q)
        || mod.module.toLowerCase().includes(q)
        || mod.groups.some((group) => group.submodule.toLowerCase().includes(q) || group.actions.some((action) => action.code.toLowerCase().includes(q)));
    });
  }, [matrix, moduleQuery]);

  const moduleCount = matrix.length;
  const totalPermissions = permissions.length;

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

  const handleDelete = async () => {
    if (!roleToDelete) return;
    setDeletingRole(true);
    try {
      await deleteRole(roleToDelete.id);
      setRoles((rs) => rs.filter((r) => r.id !== roleToDelete.id));
      if (selectedRoleId === roleToDelete.id) setSelectedRoleId(null);
      toast.success('Rol eliminado', `El rol ${roleLabel(roleToDelete.name)} se eliminó.`);
      setRoleToDelete(null);
    } catch (err: any) {
      toast.error('Error', err?.response?.data?.message || 'No se pudo eliminar el rol.');
    } finally {
      setDeletingRole(false);
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
      <EncabezadoModulo
        eyebrow="Seguridad y acceso"
        title="Roles y permisos"
        description="Administra el acceso por módulo y mantén los permisos sincronizados con el sistema."
        icon={ShieldCheck}
        actions={(
          <>
            <button
              onClick={handleSave}
              disabled={!selectedRole || saving || !isAdmin}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
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
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 sm:w-auto"
              >
                <Plus size={15} /> Nuevo rol
              </button>
            )}
          </>
        )}
        meta={(
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
            {roles.length} rol(es)
          </span>
        )}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Roles configurados', value: roles.length, icon: ShieldCheck, tone: 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300' },
          { label: 'Módulos del sistema', value: moduleCount, icon: Layers3, tone: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300' },
          { label: 'Permisos disponibles', value: totalPermissions, icon: CheckSquare, tone: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300' },
          { label: 'Seleccionados ahora', value: selected.size, icon: Users, tone: 'bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300' },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-4">
            <div className={cn('flex h-8 w-8 items-center justify-center rounded-xl sm:h-9 sm:w-9', card.tone)}>
              <card.icon size={17} />
            </div>
            <p className="mt-2 text-lg font-bold text-slate-900 dark:text-white sm:mt-3 sm:text-xl">{card.value}</p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{card.label}</p>
          </div>
        ))}
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
              <div
                key={role.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedRoleId(role.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setSelectedRoleId(role.id);
                  }
                }}
                className={cn(
                  'group flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900',
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
                          'rounded-full px-1.5 py-px text-[11px] font-bold uppercase tracking-wide',
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
                  <span className="flex flex-col gap-0.5 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
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
                        setRoleToDelete(role);
                      }}
                      className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                      aria-label="Eliminar rol"
                    >
                      <Trash2 size={13} />
                    </button>
                  </span>
                )}
              </div>
            ))}
            {roles.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-200 px-3 py-10 text-center dark:border-slate-700">
                <UserCog size={24} className="mx-auto text-slate-300 dark:text-slate-600" />
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">No hay roles registrados.</p>
              </div>
            )}
          </div>
        </div>

        {/* Matriz de permisos */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="space-y-3 border-b border-slate-100 p-4 dark:border-slate-800">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  Permisos de {selectedRole ? roleLabel(selectedRole.name) : '—'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {selected ? `${selected.size} acciones seleccionadas de ${permissions.length} · ${visibleMatrix.length} módulos visibles` : ''}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-full sm:w-56">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    value={moduleQuery}
                    onChange={(event) => {
                      setModuleQuery(event.target.value);
                      if (event.target.value.trim()) setExpanded(new Set(matrix.map((mod) => mod.module)));
                    }}
                    placeholder="Buscar módulo o permiso..."
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-8 pr-8 text-xs text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  />
                  {moduleQuery && (
                    <button
                      type="button"
                      onClick={() => setModuleQuery('')}
                      className="absolute inset-y-0 right-1.5 my-auto flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                      aria-label="Limpiar búsqueda de módulos"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setExpanded(new Set(matrix.map((mod) => mod.module)))}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  <ChevronDown size={13} /> Expandir
                </button>
                <button
                  type="button"
                  onClick={() => setExpanded(new Set())}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  <ChevronUp size={13} /> Contraer
                </button>
              </div>
            </div>
            {selected && (
              <div>
                <div className="flex items-center justify-between text-[10px] font-medium text-slate-400 dark:text-slate-500">
                  <span>Progreso de permisos del rol</span>
                  <span>{Math.round((selected.size / Math.max(permissions.length, 1)) * 100)}%</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all"
                    style={{ width: `${Math.round((selected.size / Math.max(permissions.length, 1)) * 100)}%` }}
                  />
                </div>
              </div>
            )}
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
              {visibleMatrix.map((mod) => {
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
              {visibleMatrix.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center dark:border-slate-700">
                  <Search size={24} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    No hay módulos que coincidan con “{moduleQuery}â€.
                  </p>
                  <button
                    type="button"
                    onClick={() => setModuleQuery('')}
                    className="mt-3 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  >
                    Limpiar búsqueda
                  </button>
                </div>
              )}
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

      <ConfirmDialog
        open={Boolean(roleToDelete)}
        title="Eliminar rol"
        message={roleToDelete ? `¿Eliminar el rol ${roleLabel(roleToDelete.name)}? Esta acción no se puede deshacer.` : undefined}
        confirmLabel="Eliminar rol"
        busy={deletingRole}
        busyLabel="Eliminando..."
        onCancel={() => setRoleToDelete(null)}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
