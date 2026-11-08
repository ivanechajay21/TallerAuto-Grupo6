import { useCallback, useEffect, useState } from 'react';
import { Search, ShieldCheck, Eye, UserCog, Power, Save, X, Clock, UserPlus } from 'lucide-react';
import { getAllUsers, getUserById, updateUser, setUserActive, createUser } from '../services/userService';
import type { UserInfo, UpdateUserPayload, CreateUserPayload } from '../services/userService';
import { getRoles } from '../services/roleService';
import type { Role } from '../services/roleService';
import { getCurrentUser } from '../services/authService';
import { usePermissions } from '../context/PermissionContext';
import { useToast } from '../components/ui/Toast';
import { cn } from '../lib/utils';
import usePagination from '../hooks/usePagination';
import Pagination from '../components/ui/Pagination';

const ROLE_LABELS: Record<string, string> = {
  ROLE_ADMIN: 'Administrador',
  ROLE_MANAGER: 'Gerente',
  ROLE_RECEPTIONIST: 'Recepcionista',
  ROLE_MECHANIC: 'Mecánico',
  ROLE_STOREKEEPER: 'Almacenero',
};

const ROLE_OPTIONS = Object.keys(ROLE_LABELS);

const ROLE_COLORS: Record<string, string> = {
  ROLE_ADMIN: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  ROLE_MANAGER: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
  ROLE_RECEPTIONIST: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  ROLE_MECHANIC: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  ROLE_STOREKEEPER: 'bg-violet-50 text-violet-700 ring-violet-600/20',
};

function lastSeenLabel(dateStr?: string): string {
  if (!dateStr) return 'Sin conexiones registradas';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'conexión hace un momento';
  if (mins < 60) return `conexión hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `conexión hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `conexión hace ${days} d`;
  return `conexión el ${new Date(dateStr).toLocaleDateString('es-ES')}`;
}

export default function Users() {
  const toast = useToast();
  const me = getCurrentUser();
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission('USUARIOS:CREAR');
  const canEdit = hasPermission('USUARIOS:EDITAR');
  const canChangeStatus = hasPermission('USUARIOS:CAMBIAR_ESTADO');
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<UserInfo | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const roleOptions = roles
    .map((role) => ({ value: role.name, label: ROLE_LABELS[role.name] ?? role.name.replace('ROLE_', '') }))
    .filter((role) => role.value !== 'ROLE_ADMIN' || me?.roleName === 'ROLE_ADMIN');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      setUsers(await getAllUsers());
    } catch (error) {
      toast.error('Error', 'No se pudieron cargar los usuarios.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUsers();
    getRoles().then(setRoles).catch(() => setRoles([]));
  }, [fetchUsers]);

  const openDetail = async (id: number) => {
    try {
      setSelected(await getUserById(id));
    } catch (error) {
      toast.error('Error', 'No se pudo cargar el detalle del usuario.');
    }
  };

  const replaceUser = (updated: UserInfo) => {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    setSelected(updated);
  };

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      `${u.name} ${u.lastName}`.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      (u.roleName || '').toLowerCase().includes(q)
    );
  });

  const pag = usePagination(filtered, 10);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Usuarios del sistema</h1>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">
            Personal, roles y estado de sesión. Haz clic en un usuario para verlo y editarlo.
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full max-w-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-slate-400 dark:text-slate-500" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full rounded-xl border-slate-200 py-2.5 pl-10 text-slate-900 shadow-sm focus:ring-2 focus:ring-blue-600 sm:text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
              placeholder="Buscar por nombre, usuario o rol..."
            />
          </div>
          {canCreate && (
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:from-blue-500 hover:to-indigo-500"
            >
              <UserPlus size={16} />
              Agregar usuario
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-200" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pag.pageItems.map((user) => {
            const role = user.roleName || 'SIN ROL';
            const label = ROLE_LABELS[role] || role.replace('ROLE_', '');
            const isOnline = user.lastLogin
              ? Date.now() - new Date(user.lastLogin).getTime() < 5 * 60 * 1000
              : false;
            return (
              <button
                key={user.id}
                onClick={() => openDetail(user.id)}
                className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="flex items-start gap-4">
                  <div className="relative">
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.name}
                        className="h-14 w-14 rounded-full object-cover ring-2 ring-slate-100"
                      />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-lg font-bold text-white">
                        {user.name.charAt(0)}
                        {user.lastName.charAt(0)}
                      </div>
                    )}
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-white ${
                        isOnline ? 'bg-emerald-500' : 'bg-slate-300'
                      }`}
                      title={isOnline ? 'En línea' : 'Desconectado'}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900 dark:text-white">
                      {user.name} {user.lastName}
                    </p>
                    <p className="truncate text-sm text-slate-500 dark:text-slate-400">@{user.username}</p>
                    <span className={cn('mt-2 inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset', ROLE_COLORS[role] || ROLE_COLORS.ROLE_ADMIN)}>
                      {label}
                    </span>
                  </div>
                  {!user.active && (
                    <span className="rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600 ring-1 ring-inset ring-red-600/20">
                      Inactivo
                    </span>
                  )}
                </div>
                <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <span className="flex min-w-0 items-center gap-1">
                    {isOnline ? (
                      <span className="flex items-center gap-1 text-emerald-600">
                        <ShieldCheck size={14} /> En línea
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 truncate" title={user.lastLogin ? `Última ${lastSeenLabel(user.lastLogin)}` : 'Sin conexiones registradas'}>
                        <Clock size={14} className="shrink-0" /> Última {lastSeenLabel(user.lastLogin)}
                      </span>
                    )}
                  </span>
                  <span className="flex shrink-0 items-center gap-1">
                    <Eye size={14} /> Ver / Editar
                  </span>
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-slate-200 py-12 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400">
              No se encontraron usuarios.
            </div>
          )}
          <div className="col-span-full">
            <Pagination
              page={pag.page}
              pageCount={pag.pageCount}
              onChange={pag.setPage}
              total={pag.total}
              from={pag.from}
              to={pag.to}
              itemLabel="usuarios"
            />
          </div>
        </div>
      )}

      {selected && (
        <UserEditModal
          key={selected.id}
          user={selected}
          roleOptions={roleOptions.length ? roleOptions : ROLE_OPTIONS.map((value) => ({ value, label: ROLE_LABELS[value] ?? value }))}
          canEdit={canEdit}
          canChangeStatus={canChangeStatus}
          canDeactivate={selected.id !== me?.id}
          onClose={() => setSelected(null)}
          onSaved={replaceUser}
        />
      )}

      {showCreate && (
        <UserCreateModal
          roleOptions={roleOptions.length ? roleOptions : ROLE_OPTIONS.map((value) => ({ value, label: ROLE_LABELS[value] ?? value }))}
          onClose={() => setShowCreate(false)}
          onCreated={fetchUsers}
        />
      )}
    </div>
  );
}

function UserCreateModal({
  roleOptions,
  onClose,
  onCreated,
}: {
  roleOptions: { value: string; label: string }[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [roleName, setRoleName] = useState(roleOptions[0]?.value || ROLE_OPTIONS[0]);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!name.trim() || !lastName.trim() || !username.trim() || !email.trim()) {
      toast.error('Validación', 'Completa los campos obligatorios.');
      return;
    }
    if (!password) {
      toast.error('Validación', 'La contraseña es obligatoria.');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Validación', 'Las contraseñas no coinciden.');
      return;
    }
    setSaving(true);
    try {
      const payload: CreateUserPayload = {
        name: name.trim(),
        lastName: lastName.trim(),
        username: username.trim(),
        email: email.trim(),
        phone: phone.trim(),
        roleName,
        password,
      };
      const created = await createUser(payload);
      toast.success('Usuario creado', `${created.name} ${created.lastName} ya puede iniciar sesión.`);
      onCreated();
      onClose();
    } catch (err: any) {
      toast.error('Error', err?.response?.data?.message || 'No se pudo crear el usuario.');
    } finally {
      setSaving(false);
    }
  };

  const fieldClass =
    'w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 sm:items-center" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-md animate-slide-up overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <UserPlus size={18} className="text-blue-600" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Agregar nuevo usuario</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="nu-name" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                Nombre <span className="text-red-500">*</span>
              </label>
              <input id="nu-name" type="text" value={name} onChange={(e) => setName(e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label htmlFor="nu-last" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                Apellidos <span className="text-red-500">*</span>
              </label>
              <input id="nu-last" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className={fieldClass} />
            </div>
          </div>

          <div className="mt-4">
            <label htmlFor="nu-username" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Nombre de usuario <span className="text-red-500">*</span>
            </label>
            <input
              id="nu-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ej. jperez"
              className={fieldClass}
            />
          </div>

          <div className="mt-4">
            <label htmlFor="nu-email" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Correo electrónico <span className="text-red-500">*</span>
            </label>
            <input id="nu-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={fieldClass} />
          </div>

          <div className="mt-4">
            <label htmlFor="nu-phone" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Teléfono
            </label>
            <input id="nu-phone" type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className={fieldClass} />
          </div>

          <div className="mt-4">
            <label htmlFor="nu-role" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Rol <span className="text-red-500">*</span>
            </label>
            <select id="nu-role" value={roleName} onChange={(e) => setRoleName(e.target.value)} className={fieldClass}>
              {roleOptions.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="nu-pass" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                Contraseña <span className="text-red-500">*</span>
              </label>
              <input
                id="nu-pass"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className={fieldClass}
                autoComplete="new-password"
              />
            </div>
            <div>
              <label htmlFor="nu-pass2" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                Confirmar <span className="text-red-500">*</span>
              </label>
              <input
                id="nu-pass2"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite la contraseña"
                className={fieldClass}
                autoComplete="new-password"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 px-6 py-4 sm:flex-row-reverse sm:items-center sm:justify-between dark:border-slate-800">
          <button
            onClick={handleCreate}
            disabled={saving}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            <UserPlus size={15} />
            {saving ? 'Creando...' : 'Crear usuario'}
          </button>
          <button onClick={onClose} className="text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

function UserEditModal({
  user,
  roleOptions,
  canEdit,
  canChangeStatus,
  canDeactivate,
  onClose,
  onSaved,
}: {
  user: UserInfo;
  roleOptions: { value: string; label: string }[];
  canEdit: boolean;
  canChangeStatus: boolean;
  canDeactivate: boolean;
  onClose: () => void;
  onSaved: (u: UserInfo) => void;
}) {
  const toast = useToast();
  const [name, setName] = useState(user.name);
  const [lastName, setLastName] = useState(user.lastName);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone || '');
  const [roleName, setRoleName] = useState(user.roleName || roleOptions[0]?.value || ROLE_OPTIONS[0]);
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);

  const handleSave = async () => {
    if (!canEdit) return;
    setSaving(true);
    try {
      const payload: UpdateUserPayload = {
        name: name.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        roleName,
      };
      if (newPassword.trim()) payload.newPassword = newPassword.trim();
      const updated = await updateUser(user.id, payload);
      toast.success('Usuario actualizado', 'Los cambios se guardaron correctamente.');
      onSaved(updated);
      setNewPassword('');
    } catch (err: any) {
      toast.error('Error', err?.response?.data?.message || 'No se pudo actualizar el usuario.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async () => {
    if (!canChangeStatus) return;
    setToggling(true);
    try {
      const updated = await setUserActive(user.id, !user.active);
      toast.success(
        updated.active ? 'Cuenta activada' : 'Cuenta desactivada',
        `${updated.name} ${updated.lastName} ${updated.active ? 'ya puede iniciar sesión.' : 'ya no puede acceder al sistema.'}`
      );
      onSaved(updated);
    } catch (err: any) {
      toast.error('Error', err?.response?.data?.message || 'No se pudo cambiar el estado de la cuenta.');
    } finally {
      setToggling(false);
    }
  };

  const fieldClass =
    'w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 sm:items-center" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-md animate-slide-up overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <UserCog size={18} className="text-blue-600" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Editar usuario</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5">
          <div className="mb-5 flex items-center gap-4">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="Perfil" className="h-14 w-14 rounded-full object-cover" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-lg font-bold text-white">
                {user.name.charAt(0)}
                {user.lastName.charAt(0)}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-900 dark:text-white">@{user.username}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">ID de usuario: #{user.id}</p>
              <span
                className={cn(
                  'mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold',
                  user.active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                )}
              >
                <span className={cn('h-1.5 w-1.5 rounded-full', user.active ? 'bg-emerald-500' : 'bg-red-500')} />
                {user.active ? 'Cuenta activa' : 'Cuenta inactiva'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="usr-name" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                Nombre
              </label>
              <input id="usr-name" type="text" value={name} onChange={(e) => setName(e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label htmlFor="usr-last" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                Apellidos
              </label>
              <input id="usr-last" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className={fieldClass} />
            </div>
          </div>

          <div className="mt-4">
            <label htmlFor="usr-email" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Correo electrónico
            </label>
            <input id="usr-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={fieldClass} />
          </div>

          <div className="mt-4">
            <label htmlFor="usr-phone" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Teléfono
            </label>
            <input id="usr-phone" type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className={fieldClass} />
          </div>

          <div className="mt-4">
            <label htmlFor="usr-role" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Rol
            </label>
            <select id="usr-role" value={roleName} onChange={(e) => setRoleName(e.target.value)} disabled={!canEdit} className={fieldClass}>
              {roleOptions.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4">
            <label htmlFor="usr-pass" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Nueva contraseña{' '}
              <span className="font-normal text-slate-400 dark:text-slate-500">(opcional)</span>
            </label>
            <input
              id="usr-pass"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Dejar en blanco para mantener la actual"
              className={fieldClass}
              autoComplete="new-password"
            />
          </div>

          {user.lastLogin && (
            <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
              Última sesión: {new Date(user.lastLogin).toLocaleString('es-ES')}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 px-6 py-4 sm:flex-row-reverse sm:items-center sm:justify-between dark:border-slate-800">
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              onClick={handleToggle}
              disabled={!canChangeStatus || toggling || (!canDeactivate && user.active)}
              title={!canDeactivate && user.active ? 'No puedes desactivar tu propia cuenta' : undefined}
              className={cn(
                'inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50',
                user.active
                  ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              )}
            >
              <Power size={15} />
              {toggling ? 'Procesando...' : user.active ? 'Desactivar cuenta' : 'Activar cuenta'}
            </button>
            <button
              onClick={handleSave}
              disabled={!canEdit || saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save size={15} />
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
          <button onClick={onClose} className="text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}