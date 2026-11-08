import { useEffect, useMemo, useRef, useState } from 'react';
import type { FC, FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  Search,
  LogOut,
  Menu,
  CheckCheck,
  X,
  Wrench,
  CalendarDays,
  FileText,
  Package,
  ChevronRight,
  Inbox,
  Settings,
} from 'lucide-react';
import { getCurrentUser, logout } from '../services/authService';
import {
  getNotifications,
  getUnreadCount,
  markAllAsRead,
  markAsRead,
} from '../services/notificationService';
import type { Notification } from '../services/notificationService';
import { cn } from '../lib/utils';
import ThemeToggle from './ThemeToggle';
import { usePermissions } from '../context/PermissionContext';

const MODULE_ICONS: Record<string, FC<{ size?: number; className?: string }>> = {
  ORDENES: Wrench,
  RECEPCION: CarFront,
  CITAS: CalendarDays,
  FINANZAS: FileText,
  INVENTARIO: Package,
};

function CarFront({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M10 2h4" />
      <path d="m21 8-2 2-1.5-3.7A2 2 0 0 0 15.6 5H8.4a2 2 0 0 0-1.9 1.3L5 10 3 8" />
      <path d="M7 14h.01" />
      <path d="M17 14h.01" />
      <rect width="18" height="7" x="3" y="10" rx="2" />
    </svg>
  );
}

const MODULE_LABELS: Record<string, string> = {
  ORDENES: 'Órdenes de trabajo',
  RECEPCION: 'Recepción',
  CITAS: 'Agenda y citas',
  FINANZAS: 'Facturación',
  INVENTARIO: 'Inventario',
};

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  '/panel': { title: 'Dashboard', subtitle: 'Resumen general del taller' },
  '/recepcion': { title: 'Recepción', subtitle: 'Recepción digital de vehículos' },
  '/ordenes-trabajo': { title: 'Órdenes de Trabajo', subtitle: 'Gestión y seguimiento de órdenes' },
  '/mi-trabajo': { title: 'Mis Trabajos', subtitle: 'Órdenes asignadas a tu nombre' },
  '/clientes': { title: 'Clientes', subtitle: 'Directorio de clientes' },
  '/vehiculos': { title: 'Vehículos', subtitle: 'Historial clínico por unidad' },
  '/citas': { title: 'Agenda y Citas', subtitle: 'Planificación de servicios' },
  '/inventario': { title: 'Inventario', subtitle: 'Productos, repuestos y stock' },
  '/facturacion': { title: 'Facturación', subtitle: 'Facturas y cobranzas' },
  '/proveedores': { title: 'Proveedores', subtitle: 'Proveedores y contratos' },
  '/compras': { title: 'Compras', subtitle: 'Órdenes, recepciones y aprobaciones' },
  '/abastecimiento': { title: 'Abastecimiento', subtitle: 'Reposición, planificación y pagos' },
  '/reportes': { title: 'Reportes', subtitle: 'Indicadores y exportaciones' },
  '/usuarios': { title: 'Usuarios', subtitle: 'Cuentas del personal' },
  '/roles': { title: 'Roles y Permisos', subtitle: 'Control de accesos por rol' },
  '/auditoria': { title: 'Auditoría', subtitle: 'Registro de actividades' },
  '/configuracion': { title: 'Configuración', subtitle: 'Parámetros del taller' },
  '/recepcion/nueva': { title: 'Nueva Recepción', subtitle: 'Recepción digital de vehículos' },
};

interface HeaderProps {
  onToggleSidebar: () => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora mismo';
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `hace ${days} d`;
}

function SearchForm({ className }: { className?: string }) {
  const navigate = useNavigate();
  return (
    <form
      className={cn(
        'flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 transition focus-within:border-blue-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/20',
        'dark:border-slate-700 dark:bg-slate-800/60 dark:focus-within:bg-slate-800',
        className
      )}
      onSubmit={(e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const q = (e.currentTarget.elements.namedItem('q') as HTMLInputElement)?.value?.trim();
        if (!q) return;
        navigate(`/vehiculos?q=${encodeURIComponent(q)}`);
      }}
      role="search"
    >
      <Search className="h-4 w-4 shrink-0 text-slate-400" />
      <input
        name="q"
        type="search"
        className="w-full bg-transparent py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100"
        placeholder="Buscar placa o cliente..."
        autoComplete="off"
      />
    </form>
  );
}

export default function Header({ onToggleSidebar }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getCurrentUser();
  const { hasPermission } = usePermissions();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifTab, setNotifTab] = useState<'all' | 'unread'>('all');

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const pageMeta = PAGE_META[location.pathname] ?? { title: 'SIGTM', subtitle: 'Sistema Integral de Gestión de Taller' };

  const fetchNotifications = async () => {
    try {
      const [notifs, count] = await Promise.all([getNotifications(), getUnreadCount()]);
      setNotifications(notifs);
      setUnread(count);
    } catch {
      /* sin conexión o sesión caducada */
    }
  };

  const poll = async () => {
    try {
      setUnread(await getUnreadCount());
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(poll, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClickNotification = async (n: Notification) => {
    setNotifOpen(false);
    if (!n.read) {
      try {
        await markAsRead(n.id);
        setUnread((u) => Math.max(0, u - 1));
      } catch {
        /* ignore */
      }
    }
    if (n.link) navigate(n.link);
  };

  const handleMarkAll = async () => {
    try {
      await markAllAsRead();
      setNotifications((ns) => ns.map((n) => ({ ...n, read: true })));
      setUnread(0);
    } catch {
      /* ignore */
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/acceso');
  };

  const visibleNotifications = useMemo(() => {
    const filtered = notifTab === 'unread' ? notifications.filter((n) => !n.read) : notifications;
    const grouped = new Map<string, Notification[]>();
    filtered.forEach((n) => {
      const key = n.module || 'OTROS';
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(n);
    });
    const order = ['ORDENES', 'RECEPCION', 'CITAS', 'FINANZAS', 'INVENTARIO', 'OTROS'];
    return Array.from(grouped.entries())
      .sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
  }, [notifications, notifTab]);

  const today = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <header className="shrink-0 border-b border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* Barra superior */}
      <div className="flex h-16 items-center gap-x-3 px-4 sm:gap-x-4 sm:px-6 lg:px-8">
        <button
          onClick={onToggleSidebar}
          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 lg:hidden dark:text-slate-400 dark:hover:bg-slate-800"
          aria-label="Abrir menú"
        >
          <Menu size={22} />
        </button>

        {/* Breadcrumb + título de página */}
        <div className="hidden min-w-0 flex-1 md:block">
          <nav className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
            <span>Inicio</span>
            <ChevronRight size={12} />
            <span className="font-medium text-blue-600 dark:text-blue-400">{pageMeta.title}</span>
          </nav>
          <div className="flex items-baseline gap-3">
            <h1 className="truncate text-base font-bold tracking-tight text-slate-900 dark:text-white">
              {pageMeta.title}
            </h1>
            <p className="truncate text-xs capitalize text-slate-400 dark:text-slate-500">{today}</p>
          </div>
        </div>
        <div className="min-w-0 flex-1 md:hidden" />

        <div className="flex min-w-0 items-center gap-x-1.5 sm:gap-x-2.5">
          <SearchForm className="hidden w-72 xl:w-80 md:flex lg:w-80" />

          <ThemeToggle />

          {/* Notificaciones */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => {
                setNotifOpen((v) => !v);
                setProfileOpen(false);
                if (!notifOpen) fetchNotifications();
              }}
              className="relative rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              aria-label="Notificaciones"
            >
              <Bell size={20} />
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-12 z-40 flex w-[22rem] max-w-[calc(100vw-2rem)] animate-slide-in-right flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">Notificaciones</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                      {unread > 0 ? `${unread} sin leer` : 'Estás al día'}
                    </p>
                  </div>
                  <button
                    onClick={handleMarkAll}
                    disabled={unread === 0}
                    className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-500 disabled:cursor-not-allowed disabled:text-slate-300 dark:text-blue-400 dark:disabled:text-slate-600"
                  >
                    <CheckCheck size={14} /> Marcar todas
                  </button>
                </div>

                {/* Pestañas Todos / No leídas */}
                <div className="flex border-b border-slate-100 px-2 pt-2 dark:border-slate-800">
                  {(
                    [
                      { key: 'all', label: 'Todas' },
                      { key: 'unread', label: 'No leídas', badge: unread },
                    ] as { key: 'all' | 'unread'; label: string; badge?: number }[]
                  ).map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setNotifTab(tab.key)}
                      className={cn(
                        'relative flex items-center gap-1.5 rounded-t-lg px-3 py-2 text-xs font-medium transition',
                        notifTab === tab.key
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                      )}
                    >
                      {tab.label}
                      {typeof tab.badge === 'number' && tab.badge > 0 && (
                        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                          {tab.badge > 9 ? '9+' : tab.badge}
                        </span>
                      )}
                      {notifTab === tab.key && (
                        <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-blue-600" />
                      )}
                    </button>
                  ))}
                </div>

                <div className="max-h-96 overflow-y-auto">
                  {visibleNotifications.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
                      <Inbox size={28} className="text-slate-300 dark:text-slate-600" />
                      <p className="text-sm text-slate-400 dark:text-slate-500">
                        {notifTab === 'unread' ? 'No tienes notificaciones sin leer.' : 'Sin notificaciones.'}
                      </p>
                    </div>
                  ) : (
                    visibleNotifications.map(([module, items]) => (
                      <div key={module}>
                        <p className="bg-slate-50 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:bg-slate-800/60 dark:text-slate-500">
                          {MODULE_LABELS[module] ?? module}
                        </p>
                        {items.map((n) => {
                          const ModuleIcon = MODULE_ICONS[n.module] || Bell;
                          return (
                            <button
                              key={n.id}
                              onClick={() => handleClickNotification(n)}
                              className={cn(
                                'flex w-full gap-3 border-b border-slate-50 px-4 py-3 text-left transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60',
                                !n.read && 'bg-blue-50/50 dark:bg-blue-500/10'
                              )}
                            >
                              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                                <ModuleIcon size={15} />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="flex items-center justify-between gap-2">
                                  <span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                                    {n.title}
                                  </span>
                                  {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />}
                                </span>
                                {n.message && (
                                  <span className="mt-0.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                                    {n.message}
                                  </span>
                                )}
                                <span className="mt-1 block text-[11px] text-slate-400 dark:text-slate-500">
                                  {timeAgo(n.createdAt)}
                                </span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ))
                  )}
                </div>

                <div className="border-t border-slate-100 p-1.5 dark:border-slate-800">
                  <button
                    onClick={() => setNotifOpen(false)}
                    className="flex w-full items-center justify-center gap-1 rounded-xl px-3 py-2 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  >
                    <X size={13} /> Cerrar
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="hidden h-6 w-px bg-slate-200 sm:block dark:bg-slate-700" aria-hidden="true" />

          {/* Perfil */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => {
                setProfileOpen((v) => !v);
                setNotifOpen(false);
              }}
              className="flex items-center gap-2 rounded-lg p-1.5 transition hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="Perfil" className="h-9 w-9 rounded-full object-cover ring-2 ring-slate-100 dark:ring-slate-700" />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white">
                  {user?.name?.charAt(0) || '?'}
                  {user?.lastName?.charAt(0) || ''}
                </div>
              )}
              <span className="hidden text-left lg:block">
                <span className="block text-sm font-semibold leading-tight text-slate-900 dark:text-slate-100">
                  {user?.name} {user?.lastName}
                </span>
                <span className="block text-[11px] text-slate-400 dark:text-slate-500">
                  {user?.email}
                </span>
              </span>
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-12 z-40 w-64 animate-slide-in-right overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
                <div className="border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-4 dark:border-slate-800 dark:from-slate-800 dark:to-slate-800/60">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {user?.name} {user?.lastName}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {user?.roleName?.replace('ROLE_', '')} · {user?.lastLogin ? `sesión ${timeAgo(user.lastLogin)}` : ''}
                  </p>
                </div>
                <div className="p-2">
                  {hasPermission('CONFIGURACION:VER') && (
                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        navigate('/configuracion');
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-blue-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-blue-400"
                    >
                      <Settings size={16} /> Configuración
                    </button>
                  )}
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-red-50 hover:text-red-600 dark:text-slate-300 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                  >
                    <LogOut size={16} /> Cerrar sesión
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Búsqueda (móvil) */}
      <div className="border-t border-slate-100 px-4 py-2 md:hidden dark:border-slate-800">
        <SearchForm />
      </div>
    </header>
  );
}