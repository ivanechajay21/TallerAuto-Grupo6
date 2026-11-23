import { useEffect, useState } from 'react';
import {
  Search,
  ShieldCheck,
  Eye,
  UserCog,
  Power,
  Save,
  X,
  Clock,
  UserPlus,
  Users as UsersIcon,
  UserCheck,
  UserX,
  ShieldAlert,
  Mail,
  Phone,
  SlidersHorizontal,
  UserRound,
  Loader2,
  EyeOff,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { getPaginatedUsers, getUserById, updateUser, setUserActive, createUser, getOnlineUsers } from '../servicios/usuariosServicio';
import type { UserInfo, UpdateUserPayload, CreateUserPayload, UserStatusFilter, UserSummary } from '../servicios/usuariosServicio';
import { getRoles } from '../servicios/rolesServicio';
import type { Role } from '../servicios/rolesServicio';
import { getCurrentUser } from '../servicios/autenticacionServicio';
import { usePermissions } from '../contexto/ContextoPermisos';
import { useToast } from '../componentes/interfaz/Avisos';
import Modal from '../componentes/interfaz/Modal';
import EncabezadoModulo from '../componentes/interfaz/EncabezadoModulo';
import { CampoFormulario, SeccionFormulario, estiloCampo } from '../componentes/interfaz/Formulario';
import TarjetaMetrica from '../componentes/interfaz/TarjetaMetrica';
import { cn } from '../lib/utilidades';
import { ROLE_LABELS, roleLabel } from '../lib/roles';
import Pagination from '../componentes/interfaz/Paginacion';

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

const EMPTY_SUMMARY: UserSummary = {
  total: 0,
  active: 0,
  inactive: 0,
};

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
  const [statusFilter, setStatusFilter] = useState<UserStatusFilter>('TODOS');
  const [roleFilter, setRoleFilter] = useState('TODOS');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [summary, setSummary] = useState<UserSummary>(EMPTY_SUMMARY);
  const [reloadKey, setReloadKey] = useState(0);
  const [onlineIds, setOnlineIds] = useState<number[]>([]);
  const [presenceReady, setPresenceReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<UserInfo | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const roleOptions = roles
    .map((role) => ({ value: role.name, label: ROLE_LABELS[role.name] ?? role.name.replace('ROLE_', '') }))
    .filter((role) => role.value !== 'ROLE_ADMIN' || me?.roleName === 'ROLE_ADMIN');

  useEffect(() => {
    getRoles().then(setRoles).catch(() => setRoles([]));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getPaginatedUsers({
          page: page - 1,
          size: 10,
          search,
          status: statusFilter,
          role: roleFilter,
        });
        if (response.totalPages > 0 && page > response.totalPages) {
          setPage(response.totalPages);
          return;
        }
        setUsers(response.content);
        setTotalPages(response.totalPages);
        setTotalElements(response.totalElements);
        setSummary(response.summary ?? EMPTY_SUMMARY);
      } catch {
        setError('No se pudieron cargar los usuarios. Revisa la conexión e inténtalo de nuevo.');
        toast.error('Error', 'No se pudieron cargar los usuarios.');
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, statusFilter, roleFilter, reloadKey]);

  const refresh = () => setReloadKey((value) => value + 1);

  // Presencia en vivo: se refresca cada 8 segundos; el backend recibe latidos
  // desde la disposición principal mientras el usuario mantiene la sesión.
  useEffect(() => {
    let active = true;
    const refreshPresence = async () => {
      try {
        const ids = await getOnlineUsers();
        if (active) {
          setOnlineIds(ids);
          setPresenceReady(true);
        }
      } catch {
        /* Si falla, se conserva la última lectura disponible. */
      }
    };
    refreshPresence();
    const interval = window.setInterval(refreshPresence, 8000);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refreshPresence();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const openDetail = async (id: number) => {
    try {
      setSelected(await getUserById(id));
    } catch (error) {
      toast.error('Error', 'No se pudo cargar el detalle del usuario.');
    }
  };

  const replaceUser = (updated: UserInfo) => {
    setSelected(updated);
    refresh();
  };

  const legacyOnline = (user: UserInfo) =>
    Boolean(user.lastLogin && Date.now() - new Date(user.lastLogin).getTime() < 5 * 60 * 1000);
  const stats = {
    total: summary.total,
    active: summary.active,
    inactive: summary.inactive,
    online: presenceReady
      ? onlineIds.length
      : users.filter((u) => u.online ?? legacyOnline(u)).length,
  };

  const statCards = [
    { label: 'Total de usuarios', value: stats.total, icon: UsersIcon, tone: 'blue', filter: 'TODOS' as UserStatusFilter },
    { label: 'Usuarios activos', value: stats.active, icon: UserCheck, tone: 'emerald', filter: 'ACTIVOS' as UserStatusFilter },
    { label: 'Usuarios inactivos', value: stats.inactive, icon: UserX, tone: 'red', filter: 'INACTIVOS' as UserStatusFilter },
    { label: 'En línea ahora', value: stats.online, icon: ShieldCheck, tone: 'violet', filter: null },
  ] as const;

  return (
    <div className="space-y-6">
      <EncabezadoModulo
        eyebrow="Administración"
        title="Usuarios del sistema"
        description="Personal, roles, permisos y estado de sesión del equipo."
        icon={UserCog}
        actions={canCreate ? (
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500"
          >
            <UserPlus size={16} />
            Agregar usuario
          </button>
        ) : undefined}
        meta={(
          <>
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
              {stats.total} usuario(s)
            </span>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
              {stats.online} en línea
            </span>
          </>
        )}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statCards.map((card) => (
          <TarjetaMetrica
            key={card.label}
            label={card.label}
            value={card.value}
            icon={card.icon}
            tone={card.tone}
            active={card.filter ? card.filter === statusFilter : false}
            onClick={card.filter ? () => {
              setStatusFilter(card.filter);
              setPage(1);
            } : undefined}
          />
        ))}
      </div>

      {error && !loading && (
        <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-500/30 dark:bg-red-500/10 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <ShieldAlert size={18} className="mt-0.5 shrink-0 text-red-600 dark:text-red-400" />
            <div>
              <p className="text-sm font-semibold text-red-800 dark:text-red-200">No se pudo cargar la lista</p>
              <p className="mt-0.5 text-xs text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={refresh}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 dark:border-red-500/30 dark:bg-slate-900 dark:text-red-300 dark:hover:bg-red-500/10"
          >
            <RefreshCw size={13} /> Reintentar
          </button>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative w-full xl:max-w-md">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-slate-400 dark:text-slate-500" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="block w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
              placeholder="Buscar por nombre, usuario, correo o rol..."
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setPage(1);
                }}
                className="absolute inset-y-0 right-2 my-auto flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                aria-label="Limpiar búsqueda"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              <SlidersHorizontal size={13} /> Filtrar
            </span>
            {(['TODOS', 'ACTIVOS', 'INACTIVOS'] as UserStatusFilter[]).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => {
                  setStatusFilter(status);
                  setPage(1);
                }}
                className={cn(
                  'rounded-full px-3 py-1.5 text-xs font-semibold transition',
                  statusFilter === status
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20 dark:bg-blue-500 dark:text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                )}
              >
                {status === 'TODOS' ? 'Todos' : status === 'ACTIVOS' ? 'Activos' : 'Inactivos'}
              </button>
            ))}
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
              aria-label="Filtrar por rol"
            >
              <option value="TODOS">Todos los roles</option>
              {roles.map((role) => (
                <option key={role.name} value={role.name}>
                  {ROLE_LABELS[role.name] || role.name.replace('ROLE_', '')}
                </option>
              ))}
            </select>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              En vivo
            </span>
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {totalElements} {totalElements === 1 ? 'usuario' : 'usuarios'}
            </span>
            {(search || statusFilter !== 'TODOS' || roleFilter !== 'TODOS') && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('TODOS');
                  setRoleFilter('TODOS');
                  setPage(1);
                }}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-52 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {users.map((user) => {
            const role = user.roleName || 'SIN ROL';
            const label = roleLabel(user.roleName);
            const legacyOnline = user.lastLogin
              ? Date.now() - new Date(user.lastLogin).getTime() < 5 * 60 * 1000
              : false;
            const isOnline = presenceReady
              ? onlineIds.includes(user.id)
              : (user.online ?? legacyOnline);
            return (
              <div
                key={user.id}
                role="button"
                tabIndex={0}
                onClick={() => openDetail(user.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openDetail(user.id);
                  }
                }}
                className={cn(
                  'group relative cursor-pointer overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:bg-slate-900',
                  user.active
                    ? 'border-slate-200 hover:border-blue-200 dark:border-slate-700 dark:hover:border-blue-500/40'
                    : 'border-red-200/70 opacity-90 hover:border-red-300 dark:border-red-500/30'
                )}
              >
                <div className={cn('h-1.5', user.active ? 'bg-gradient-to-r from-blue-500 to-indigo-500' : 'bg-red-400')} />
                <div className="p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <div className="relative shrink-0">
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt={`${user.name} ${user.lastName}`}
                          className="h-12 w-12 rounded-full object-cover ring-2 ring-slate-100 dark:ring-slate-800"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white shadow-sm">
                          {user.name.charAt(0)}
                          {user.lastName.charAt(0)}
                        </div>
                      )}
                      <span
                        className={cn(
                          'absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-slate-900',
                          isOnline ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                        )}
                        title={isOnline ? 'En línea' : 'Desconectado'}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                        {user.name} {user.lastName}
                      </p>
                      <p className="truncate text-xs text-slate-400 dark:text-slate-500">@{user.username}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset', ROLE_COLORS[role] || ROLE_COLORS.ROLE_ADMIN)}>
                          {label}
                        </span>
                        <span className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                          user.active ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300'
                        )}>
                          <span className={cn('h-1 w-1 rounded-full', user.active ? 'bg-emerald-500' : 'bg-red-500')} />
                          {user.active ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3.5 space-y-1.5 text-xs">
                    <a
                      href={`mailto:${user.email}`}
                      onClick={(event) => event.stopPropagation()}
                      className="flex items-center gap-2 truncate text-slate-500 transition hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
                    >
                      <Mail size={13} className="shrink-0" /> <span className="truncate">{user.email}</span>
                    </a>
                    {user.phone && (
                      <a
                        href={`tel:${user.phone.replace(/[^\d+]/g, '')}`}
                        onClick={(event) => event.stopPropagation()}
                        className="flex items-center gap-2 text-slate-500 transition hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
                      >
                        <Phone size={13} /> {user.phone}
                      </a>
                    )}
                  </div>

                  {!user.active && (
                    <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-red-50 px-2.5 py-1.5 text-[11px] font-medium text-red-600 dark:bg-red-500/10 dark:text-red-400">
                      <ShieldAlert size={13} /> Acceso deshabilitado
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    <span className="flex min-w-0 items-center gap-1">
                      {isOnline ? (
                        <span className="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                          <ShieldCheck size={13} /> En línea ahora
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 truncate" title={user.lastLogin ? `Última ${lastSeenLabel(user.lastLogin)}` : 'Sin conexiones registradas'}>
                          <Clock size={13} className="shrink-0" /> Última {lastSeenLabel(user.lastLogin)}
                        </span>
                      )}
                    </span>
                    <span className="flex shrink-0 items-center gap-1 font-semibold text-blue-600 dark:text-blue-400">
                      <Eye size={13} /> Ver y editar
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
          {totalElements === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-14 text-center dark:border-slate-700">
              <UserX size={28} className="mb-2 text-slate-300 dark:text-slate-600" />
              <p className="text-sm text-slate-500 dark:text-slate-400">No se encontraron usuarios con los filtros seleccionados.</p>
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('TODOS');
                  setRoleFilter('TODOS');
                  setPage(1);
                }}
                className="mt-3 text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                Limpiar filtros
              </button>
            </div>
          )}
          <div className="col-span-full">
            <Pagination
              page={page}
              pageCount={totalPages}
              onChange={setPage}
              total={totalElements}
              from={totalElements === 0 ? 0 : (page - 1) * 10 + 1}
              to={Math.min(totalElements, (page - 1) * 10 + users.length)}
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
          onCreated={refresh}
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
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  const passwordChecks = {
    length: password.length >= 12 && new TextEncoder().encode(password).length <= 72,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /\d/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  };
  const passwordScore = [
    passwordChecks.length,
    passwordChecks.upper,
    passwordChecks.number,
    passwordChecks.symbol,
  ].filter(Boolean).length;
  const passwordValid = Object.values(passwordChecks).every(Boolean);
  const canSubmit =
    Boolean(name.trim() && lastName.trim() && username.trim() && email.trim()) &&
    passwordValid &&
    password === confirmPassword;

  const handleCreate = async () => {
    if (!name.trim() || !lastName.trim() || !username.trim() || !email.trim()) {
      toast.error('Validación', 'Completa los campos obligatorios.');
      return;
    }
    if (!passwordValid) {
      toast.error('Validación', 'La contraseña debe tener entre 12 y 72 caracteres, mayúscula, minúscula, número y símbolo.');
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

  return (
    <Modal
      title="Agregar usuario"
      description="Crea la cuenta y define el rol con el que accederá al sistema."
      icon={UserPlus}
      size="lg"
      onClose={onClose}
      footer={(
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={!canSubmit || saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/25 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
            {saving ? 'Creando...' : 'Crear usuario'}
          </button>
        </>
      )}
    >
      <div className="space-y-4">
        <SeccionFormulario
          title="Datos personales"
          description="Nombre visible y datos de contacto del nuevo usuario."
          icon={UserRound}
        >
          <CampoFormulario label="Nombre" required>
            <input value={name} onChange={(e) => setName(e.target.value)} className={estiloCampo} />
          </CampoFormulario>
          <CampoFormulario label="Apellidos" required>
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} className={estiloCampo} />
          </CampoFormulario>
          <CampoFormulario label="Correo electrónico" required>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={estiloCampo} />
          </CampoFormulario>
          <CampoFormulario label="Teléfono">
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className={estiloCampo} />
          </CampoFormulario>
        </SeccionFormulario>

        <SeccionFormulario
          title="Cuenta y acceso"
          description="Credenciales, rol y contraseña inicial."
          icon={ShieldCheck}
        >
          <CampoFormulario label="Usuario" required>
            <input value={username} onChange={(e) => setUsername(e.target.value)} className={estiloCampo} autoComplete="username" />
          </CampoFormulario>
          <CampoFormulario label="Rol" required>
            <select value={roleName} onChange={(e) => setRoleName(e.target.value)} className={estiloCampo}>
              {roleOptions.map((role) => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>
          </CampoFormulario>
          <CampoFormulario label="Contraseña" required>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${estiloCampo} pr-10`}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute inset-y-0 right-2 my-auto flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </CampoFormulario>
          <CampoFormulario label="Confirmar contraseña" required>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={estiloCampo}
              autoComplete="new-password"
            />
          </CampoFormulario>
        </SeccionFormulario>

        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-700 dark:bg-slate-800/30">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Seguridad de la contraseña</p>
            <span className={cn('text-[11px] font-semibold', passwordValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400')}>
              {passwordScore}/4
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-300',
                passwordScore >= 4 ? 'bg-emerald-500' : passwordScore >= 3 ? 'bg-blue-500' : passwordScore >= 2 ? 'bg-amber-500' : 'bg-red-500'
              )}
              style={{ width: `${(passwordScore / 4) * 100}%` }}
            />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            {[
              ['length', '12 a 72 caracteres'],
              ['upper', 'Una mayúscula'],
              ['lower', 'Una minúscula'],
              ['number', 'Un número'],
              ['symbol', 'Un símbolo'],
            ].map(([key, label]) => {
              const ok = passwordChecks[key as keyof typeof passwordChecks];
              return (
                <span key={key} className={cn('flex items-center gap-1', ok ? 'text-emerald-600 dark:text-emerald-400' : '')}>
                  {ok ? <CheckCircle2 size={12} /> : <X size={12} />} {label}
                </span>
              );
            })}
          </div>
          {password && confirmPassword && password !== confirmPassword && (
            <p className="mt-2 text-[11px] font-medium text-red-600 dark:text-red-400" role="alert">
              Las contraseñas no coinciden.
            </p>
          )}
        </div>
      </div>
    </Modal>
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
  onSaved: (user: UserInfo) => void;
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
      if (newPassword.trim()) payload.newPassword = newPassword;
      const updated = await updateUser(user.id, payload);
      toast.success(
        'Usuario actualizado',
        `${updated.name} ${updated.lastName} se actualizó correctamente.`
      );
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

  return (
    <Modal
      title="Editar usuario"
      description={`@${user.username} · ID de usuario #${user.id}`}
      icon={UserCog}
      size="md"
      onClose={onClose}
      footer={(
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleToggle}
            disabled={!canChangeStatus || toggling || (!canDeactivate && user.active)}
            title={!canDeactivate && user.active ? 'No puedes desactivar tu propia cuenta' : undefined}
            className={cn(
              'inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50',
              user.active
                ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
            )}
          >
            <Power size={15} />
            {toggling ? 'Procesando...' : user.active ? 'Desactivar cuenta' : 'Activar cuenta'}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canEdit || saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/25 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save size={15} />
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </>
      )}
    >
      <div className="mb-5 flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-700 dark:bg-slate-800/30">
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt="Perfil" className="h-14 w-14 rounded-full object-cover" />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-lg font-bold text-white">
            {user.name.charAt(0)}
            {user.lastName.charAt(0)}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-900 dark:text-white">{user.name} {user.lastName}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">@{user.username}</p>
          <span
            className={cn(
              'mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold',
              user.active
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                : 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300'
            )}
          >
            <span className={cn('h-1.5 w-1.5 rounded-full', user.active ? 'bg-emerald-500' : 'bg-red-500')} />
            {user.active ? 'Cuenta activa' : 'Cuenta inactiva'}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        <SeccionFormulario
          title="Datos personales"
          description="Información de contacto y nombre visible del usuario."
          icon={UserRound}
        >
          <CampoFormulario label="Nombre" required>
            <input id="usr-name" type="text" value={name} onChange={(e) => setName(e.target.value)} className={estiloCampo} />
          </CampoFormulario>
          <CampoFormulario label="Apellidos" required>
            <input id="usr-last" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className={estiloCampo} />
          </CampoFormulario>
          <CampoFormulario label="Correo electrónico">
            <input id="usr-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={estiloCampo} />
          </CampoFormulario>
          <CampoFormulario label="Teléfono">
            <input id="usr-phone" type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className={estiloCampo} />
          </CampoFormulario>
        </SeccionFormulario>

        <SeccionFormulario
          title="Acceso y seguridad"
          description="Rol, permisos y actualización opcional de contraseña."
          icon={ShieldCheck}
        >
          <CampoFormulario label="Rol" required>
            <select
              id="usr-role"
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              disabled={!canEdit}
              className={estiloCampo}
            >
              {roleOptions.map((role) => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>
          </CampoFormulario>
          <CampoFormulario
            label="Nueva contraseña"
            hint="Déjala en blanco para mantener la actual. Debe tener mínimo 12 caracteres, mayúscula, minúscula, número y símbolo."
          >
            <input
              id="usr-pass"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Nueva contraseña (opcional)"
              className={estiloCampo}
              autoComplete="new-password"
            />
          </CampoFormulario>
        </SeccionFormulario>

        {user.lastLogin && (
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Última sesión: {new Date(user.lastLogin).toLocaleString('es-ES')}
          </p>
        )}
      </div>
    </Modal>
  );
}
