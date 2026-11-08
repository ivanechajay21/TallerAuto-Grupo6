import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  LayoutDashboard,
  CarFront,
  Wrench,
  ClipboardList,
  Users,
  CalendarDays,
  PackageSearch,
  ShoppingCart,
  Building2,
  Truck,
  Boxes,
  BarChart3,
  UserCog,
  Activity,
  ShieldCheck,
  X,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
Settings,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { getCurrentUser, logout } from '../services/authService';
import { usePermissions } from '../context/PermissionContext';
import { useShopSettings } from '../context/SettingsContext';

interface NavChild {
  name: string;
  href: string;
  permission?: string;
}

interface NavItem {
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
  permission?: string;
  children?: NavChild[];
}

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Principal',
    items: [
      { name: 'Dashboard', href: '/panel', icon: LayoutDashboard, permission: 'DASHBOARD:VER' },
      {
        name: 'Recepción',
        href: '/recepcion',
        icon: CarFront,
        permission: 'RECEPCION:VER',
        children: [
          { name: 'Listado de recepciones', href: '/recepcion', permission: 'RECEPCION:VER' },
          { name: 'Nueva recepción', href: '/recepcion/nueva', permission: 'RECEPCION:CREAR' },
        ],
      },
    ],
  },
  {
    label: 'Operación',
    items: [
      { name: 'Órdenes de Trabajo', href: '/ordenes-trabajo', icon: Wrench, permission: 'ORDENES:VER' },
      { name: 'Mis Trabajos', href: '/mi-trabajo', icon: ClipboardList, permission: 'MI_TRABAJO:VER' },
      { name: 'Clientes', href: '/clientes', icon: Users, permission: 'CLIENTES:VER' },
      { name: 'Vehículos', href: '/vehiculos', icon: CarFront, permission: 'VEHICULOS:VER' },
      { name: 'Agenda y Citas', href: '/citas', icon: CalendarDays, permission: 'CITAS:VER' },
      { name: 'Inventario', href: '/inventario', icon: PackageSearch, permission: 'PRODUCTOS:VER' },
    ],
  },
  {
    label: 'Compras',
    items: [
      { name: 'Proveedores', href: '/proveedores', icon: Building2, permission: 'PROVEEDORES:VER' },
      { name: 'Compras', href: '/compras', icon: Truck, permission: 'COMPRAS:VER' },
      { name: 'Abastecimiento', href: '/abastecimiento', icon: Boxes, permission: 'COMPRAS:VER' },
    ],
  },
  {
    label: 'Administración',
    items: [
      { name: 'Facturación', href: '/facturacion', icon: ShoppingCart, permission: 'FACTURAS:VER' },
      { name: 'Reportes', href: '/reportes', icon: BarChart3, permission: 'REPORTES:VER' },
      { name: 'Usuarios', href: '/usuarios', icon: UserCog, permission: 'USUARIOS:VER' },
      { name: 'Roles y Permisos', href: '/roles', icon: ShieldCheck, permission: 'ROLES:VER' },
      { name: 'Auditoría', href: '/auditoria', icon: Activity, permission: 'AUDITORIA:VER' },
      { name: 'Configuración', href: '/configuracion', icon: Settings, permission: 'CONFIGURACION:VER' },
    ],
  },
];

const ROLE_LABELS: Record<string, string> = {
  ROLE_ADMIN: 'Administrador',
  ROLE_MANAGER: 'Gerente',
  ROLE_RECEPTIONIST: 'Recepcionista',
  ROLE_MECHANIC: 'Mecánico',
  ROLE_STOREKEEPER: 'Almacenero',
};

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export default function Sidebar({ open, onClose, collapsed, onToggleCollapse }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getCurrentUser();
  const { permissions, loading } = usePermissions();
  const { settings: shop } = useShopSettings();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ '/recepcion': true });
  const [tip, setTip] = useState<{ label: string; top: number; left: number } | null>(null);
  const tipTimer = useRef<number | null>(null);

  // Retardo (ms) antes de mostrar el tooltip al pasar el puntero.
  const TIP_DELAY_MS = 250;

  const userTipLabel =
    [user?.name, user?.lastName].filter(Boolean).join(' ') || user?.username || 'Usuario';

  const cancelTipTimer = () => {
    if (tipTimer.current) {
      window.clearTimeout(tipTimer.current);
      tipTimer.current = null;
    }
  };

  // Tooltip del menú: solo cuando el sidebar está colapsado (iconos) en escritorio.
  useEffect(() => {
    if (!collapsed) {
      cancelTipTimer();
      setTip(null);
    }
  }, [collapsed]);

  useEffect(() => () => cancelTipTimer(), []);

  const showTip = (el: HTMLElement, label: string) => {
    if (!collapsed || typeof window === 'undefined' || window.innerWidth < 1024) return;
    cancelTipTimer();
    const rect = el.getBoundingClientRect();
    const top = rect.top + rect.height / 2;
    const left = rect.right + 12;
    tipTimer.current = window.setTimeout(() => setTip({ label, top, left }), TIP_DELAY_MS);
  };
  const hideTip = () => {
    cancelTipTimer();
    setTip(null);
  };

  // Regla única para todos los roles (incluido Administrador, cuyo módulo se puede
  // ajustar desde Roles y Permisos): un módulo se muestra solo si el usuario tiene
  // su permiso VER. Mientras cargan los permisos se mantiene el menú y al llegar la
  // respuesta se filtra (el backend es la autoridad en ambas direcciones).
  const canShow = (item: NavItem | NavChild) => {
    if (!item.permission) return true;
    if (loading) return true;
    return permissions.includes(item.permission);
  };

  const handleLogout = () => {
    logout();
    navigate('/acceso');
  };

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-slate-900/60 transition-opacity duration-300 ease-out lg:hidden',
          open ? 'opacity-100 backdrop-blur-sm' : 'pointer-events-none opacity-0'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={cn(
          'relative fixed inset-y-0 left-0 z-50 flex w-72 transform flex-col border-r border-slate-200 bg-white shadow-2xl transition-[width,transform] duration-[350ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform lg:static lg:translate-x-0 lg:shadow-none dark:border-slate-800 dark:bg-slate-900',
          collapsed ? 'lg:w-[4.75rem]' : 'lg:w-72',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Botón flotante estilizado en el borde para alternar colapso / expansión */}
        <button
          onClick={onToggleCollapse}
          className="group absolute -right-3.5 top-5 z-50 hidden h-7.5 w-7.5 items-center justify-center rounded-full border border-slate-300 bg-gradient-to-b from-white to-slate-100 text-slate-500 shadow-md ring-2 ring-slate-200 transition-all duration-300 hover:scale-110 hover:from-blue-600 hover:to-indigo-600 hover:text-white hover:ring-blue-300 hover:shadow-lg hover:shadow-blue-600/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 active:scale-95 dark:border-slate-700/90 dark:from-slate-800 dark:via-slate-850 dark:to-slate-900 dark:text-slate-300 dark:shadow-black/40 dark:ring-slate-950 dark:hover:from-blue-600 dark:hover:to-indigo-600 dark:hover:ring-blue-400 lg:flex cursor-pointer"
          aria-label={collapsed ? 'Expandir menú lateral' : 'Contraer menú lateral'}
          title={collapsed ? 'Expandir menú lateral' : 'Contraer menú lateral'}
        >
          {collapsed ? (
            <ChevronRight
              size={15}
              className="stroke-[2.5] transition-transform duration-300 group-hover:translate-x-0.5"
            />
          ) : (
            <ChevronLeft
              size={15}
              className="stroke-[2.5] transition-transform duration-300 group-hover:-translate-x-0.5"
            />
          )}
        </button>

        {/* Marca / Cabecera Sidebar */}
        <div
          className={cn(
            'relative flex h-16 shrink-0 items-center border-b border-white/10 bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-300',
            collapsed ? 'justify-center px-0' : 'gap-3 px-4'
          )}
        >
          <span className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

          {/* Logo / Brand */}
          <div
            onClick={collapsed ? onToggleCollapse : undefined}
            className={cn(
              'flex items-center gap-3 min-w-0',
              collapsed ? 'cursor-pointer p-1' : 'flex-1'
            )}
            title={collapsed ? 'Haga clic para expandir menú' : undefined}
          >
            <div className="flex h-9 w-9 min-w-9 items-center justify-center overflow-hidden rounded-xl bg-white/15 text-white shadow-sm ring-1 ring-white/25 backdrop-blur-md transition-transform duration-300 hover:scale-105">
              {shop?.tallerLogo ? (
                <img src={shop.tallerLogo} alt="Logo" className="h-full w-full object-cover" />
              ) : (
                <Wrench size={19} className="text-white" />
              )}
            </div>
            <div className={cn('min-w-0 flex-1 transition-opacity duration-200', collapsed && 'hidden')}>
              <p className="truncate text-base font-bold leading-tight tracking-tight text-white">
                {shop?.tallerNombre?.trim() || 'SIGTM'}
              </p>
              <p className="truncate text-[10px] font-medium uppercase tracking-widest text-blue-100/80">
                Taller Mecánico
              </p>
            </div>
          </div>

          {/* Botón cerrar para móvil */}
          <button
            onClick={onClose}
            className="ml-auto rounded-xl border border-white/20 bg-white/10 p-2 text-white shadow-sm backdrop-blur-md hover:bg-white/20 active:scale-95 transition-all lg:hidden"
            aria-label="Cerrar menú"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navegación con Scrollbar personalizado */}
        <nav
          className={cn(
            'sidebar-scrollbar flex-1 overflow-y-auto py-5 select-none scroll-smooth transition-all duration-300 ease-out',
            open ? 'translate-x-0 opacity-100' : '-translate-x-3 opacity-0 lg:translate-x-0 lg:opacity-100'
          )}
          onScroll={hideTip}
        >
          {NAV_GROUPS.map((group, gi) => (
            <div key={group.label} className={cn(gi > 0 && 'mt-5')}>
              <p
                className={cn(
                  'px-5 pb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500',
                  collapsed && 'lg:hidden'
                )}
              >
                {group.label}
              </p>
              <div
                className={cn(
                  'space-y-1 px-3',
                  collapsed && 'lg:mx-3 lg:border-t lg:border-slate-200 lg:px-0 lg:py-3 dark:lg:border-slate-800'
                )}
              >
                {group.items.filter(canShow).map((item) => {
                  if (!item.children || item.children.length === 0) {
                    return (
                      <NavLink
                        key={item.href}
                        to={item.href}
                        onClick={onClose}
                        title={collapsed ? undefined : item.name}
                        aria-label={collapsed ? item.name : undefined}
                        onMouseEnter={(e) => showTip(e.currentTarget, item.name)}
                        onMouseLeave={hideTip}
                        className={({ isActive }) =>
                          cn(
                            'group relative flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                            collapsed && 'lg:justify-center lg:px-0',
                            isActive
                              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-900/40'
                              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-white'
                          )
                        }
                      >
                        {({ isActive }) => (
                          <>
                            {isActive && (
                              <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-white" />
                            )}
                            <item.icon
                              className={cn(
                                'h-5 w-5 shrink-0 transition-transform group-hover:scale-110',
                                collapsed ? 'lg:mr-0' : 'mr-3',
                                isActive ? 'text-white' : ''
                              )}
                              aria-hidden="true"
                            />
                            <span className={cn(collapsed && 'lg:hidden')}>{item.name}</span>
                          </>
                        )}
                      </NavLink>
                    );
                  }

                  const parentActive = item.children.some((c) => location.pathname.startsWith(c.href));
                  const isOpen = expanded[item.href] ?? false;
                  return (
                    <div key={item.href} className="space-y-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setExpanded((e) => ({ ...e, [item.href]: !(e[item.href] ?? false) }));
                          navigate(item.href);
                          onClose();
                        }}
                        title={collapsed ? undefined : item.name}
                        aria-label={collapsed ? item.name : undefined}
                        onMouseEnter={(e) => showTip(e.currentTarget, item.name)}
                        onMouseLeave={hideTip}
                        className={cn(
                          'group relative flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                          collapsed && 'lg:justify-center lg:px-0',
                          parentActive
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-900/40'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-white'
                        )}
                      >
                        {parentActive && (
                          <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-white" />
                        )}
                        <item.icon
                          className={cn(
                            'h-5 w-5 shrink-0 transition-transform group-hover:scale-110',
                            collapsed ? 'lg:mr-0' : 'mr-3',
                            parentActive ? 'text-white' : ''
                          )}
                          aria-hidden="true"
                        />
                        <span className={cn('flex-1 text-left', collapsed && 'lg:hidden')}>{item.name}</span>
                        <ChevronDown
                          size={14}
                          className={cn(
                            'shrink-0 transition-transform duration-200',
                            isOpen && 'rotate-180',
                            collapsed && 'lg:hidden'
                          )}
                          aria-hidden="true"
                        />
                      </button>

                      {isOpen && (
                        <div
                          className={cn(
                            'ml-4 space-y-0.5 border-l border-slate-200 pl-2 dark:border-slate-700/70',
                            collapsed && 'lg:hidden'
                          )}
                        >
                          {item.children.filter(canShow).map((child) => (
                            <NavLink
                              key={child.href}
                              to={child.href}
                              onClick={onClose}
                              title={child.name}
                              className={({ isActive }) =>
                                cn(
                                  'flex items-center rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-200',
                                  isActive
                                    ? 'bg-blue-50 text-blue-700 dark:bg-white/10 dark:text-white'
                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-white'
                                )
                              }
                            >
                              {({ isActive }) => (
                                <>
                                  <span
                                    className={cn(
                                      'mr-2.5 h-1.5 w-1.5 shrink-0 rounded-full',
                                      isActive ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'
                                    )}
                                  />
                                  <span className="truncate">{child.name}</span>
                                </>
                              )}
                            </NavLink>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

        </nav>

        {/* Usuario */}
        <div className="shrink-0 border-t border-slate-200 p-4 dark:border-slate-800">
          <div
            className={cn(
              'flex items-center gap-3 rounded-xl bg-slate-100/80 p-3 ring-1 ring-slate-200/60 dark:bg-slate-800/60 dark:ring-slate-700/50',
              collapsed && 'lg:flex-col lg:gap-2 lg:p-2'
            )}
          >
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt="Perfil"
                className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-blue-500/40"
                title={collapsed ? undefined : userTipLabel}
                onMouseEnter={(e) => showTip(e.currentTarget, userTipLabel)}
                onMouseLeave={hideTip}
              />
            ) : (
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white"
                title={collapsed ? undefined : userTipLabel}
                onMouseEnter={(e) => showTip(e.currentTarget, userTipLabel)}
                onMouseLeave={hideTip}
              >
                {user?.name?.charAt(0) || '?'}
                {user?.lastName?.charAt(0) || ''}
              </div>
            )}
            <div className={cn('min-w-0 flex-1', collapsed && 'lg:hidden')}>
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                {user?.name} {user?.lastName}
              </p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                {ROLE_LABELS[user?.roleName || ''] || user?.roleName?.replace('ROLE_', '') || user?.username}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className={cn(
                'rounded-lg p-2 text-slate-400 transition hover:bg-slate-200 hover:text-red-500 dark:hover:bg-slate-700 dark:hover:text-red-400',
                collapsed && 'lg:w-full lg:rounded-lg'
              )}
              title={collapsed ? undefined : 'Cerrar sesión'}
              aria-label="Cerrar sesión"
              onMouseEnter={(e) => showTip(e.currentTarget, 'Cerrar sesión')}
              onMouseLeave={hideTip}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Tooltip del menú colapsado */}
      {collapsed &&
        tip &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[80] flex -translate-y-1/2 items-center animate-fade-in"
            style={{ top: tip.top, left: tip.left }}
          >
            <span className="h-2 w-2 rotate-45 rounded-[1px] bg-slate-900 ring-1 ring-white/10 dark:bg-slate-700" />
            <span className="-ml-1 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white shadow-xl ring-1 ring-white/10 dark:bg-slate-700">
              {tip.label}
            </span>
          </div>,
          document.body
        )}
    </>
  );
}