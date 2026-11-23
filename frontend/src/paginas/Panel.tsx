import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  CarFront,
  CalendarCheck,
  Clock4,
  Wrench,
  PackageCheck,
  CheckCircle2,
  Banknote,
  Boxes,
  AlertTriangle,
  PackageX,
  TrendingUp,
  Loader2,
  RefreshCw,
  ArrowUpRight,
  Sunrise,
  Sun,
  Moon,
  CalendarDays,
  Clock3,
  Sparkles,
  BarChart3,
  ClipboardList,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { getDashboardSummary, getDashboardLine, getDashboardDonut, getDashboardBars } from '../servicios/reportesServicio';
import type {
  DashboardPeriod,
  DashboardSummary,
  DashboardLineRow,
  DashboardBars,
} from '../servicios/reportesServicio';
import { cn } from '../lib/utilidades';
import { roleLabel } from '../lib/roles';
import { useTheme } from '../contexto/ContextoTema';
import { usePermissions } from '../contexto/ContextoPermisos';
import { getCurrentUser } from '../servicios/autenticacionServicio';

const DEFAULT_SUMMARY: DashboardSummary = {
  clientesRegistrados: 0,
  vehiculosRegistrados: 0,
  citasDelDia: 0,
  ordenesPendientes: 0,
  ordenesEnProceso: 0,
  vehiculosListos: 0,
  reparacionesFinalizadas: 0,
  ingresos: 0,
  valorInventario: 0,
  stockBajo: 0,
  productosAgotados: 0,
};

const DEFAULT_BARS: DashboardBars = {
  servicios: [],
  repuestos: [],
  reparacionesPorPeriodo: [],
  trabajosPorMecanico: [],
};

const PERIODS: { key: DashboardPeriod; label: string }[] = [
  { key: 'HOY', label: 'Hoy' },
  { key: '7', label: '7 días' },
  { key: '30', label: '30 días' },
  { key: 'YEAR', label: 'Este año' },
];

const DONUT_COLORS = ['#f59e0b', '#3b82f6', '#f97316', '#06b6d4', '#10b981'];

const currency = (value: number) =>
  `S/ ${Math.round(value || 0).toLocaleString('es-PE')}`;

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{
    name?: string | number;
    value?: number | string;
    color?: string;
    fill?: string;
    dataKey?: string | number;
  }>;
  label?: string | number;
  format?: 'currency' | 'number';
}

function ChartTooltip({ active, payload, label, format }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-xl dark:border-slate-700 dark:bg-slate-900">
      <p className="mb-1 font-semibold text-slate-700 dark:text-slate-200">{label}</p>
      {payload.map((entry) => (
        <p key={String(entry.dataKey)} className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
          <span className="h-2 w-2 rounded-full" style={{ background: entry.color || entry.fill || '#3b82f6' }} />
          <span className="capitalize">{entry.name}:</span>
          <span className="font-semibold text-slate-900 dark:text-white">
            {format === 'currency' ? currency(Number(entry.value)) : String(entry.value)}
          </span>
        </p>
      ))}
    </div>
  );
}

const axisTick = { fill: '#94a3b8', fontSize: 11 };

function ChartEmpty({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Wrench;
  title: string;
  description: string;
}) {
  return (
    <div className="flex h-72 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/40 px-6 text-center dark:border-slate-700 dark:bg-slate-800/20">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm dark:bg-slate-800 dark:text-slate-500">
        <Icon size={22} />
      </div>
      <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</p>
      <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-500 dark:text-slate-400">{description}</p>
    </div>
  );
}

type KpiFormat = 'number' | 'currency';
type KpiTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

interface TarjetaKpiConfig {
  key: string;
  label: string;
  categoria: string;
  value: number;
  format: KpiFormat;
  icon: typeof Users;
  tone: KpiTone;
  badge: string;
  pulse?: boolean;
  ruta: string;
  permiso: string;
}

const KPI_TONES: Record<KpiTone, { dot: string; badge: string; icon: string }> = {
  neutral: {
    dot: 'bg-slate-400',
    badge: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300',
    icon: 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300',
  },
  success: {
    dot: 'bg-emerald-500',
    badge: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300',
    icon: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
  },
  warning: {
    dot: 'bg-amber-500',
    badge: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300',
    icon: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
  },
  danger: {
    dot: 'bg-red-500',
    badge: 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300',
    icon: 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300',
  },
  info: {
    dot: 'bg-blue-500',
    badge: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300',
    icon: 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300',
  },
};

function useValorAnimado(valor: number, duracion = 720) {
  const [mostrado, setMostrado] = useState(0);
  const anterior = useRef(0);

  useEffect(() => {
    const fin = Number.isFinite(valor) ? Math.max(0, valor) : 0;
    const inicio = anterior.current;
    if (inicio === fin) {
      setMostrado(fin);
      return;
    }

    const reducido =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reducido) {
      anterior.current = fin;
      setMostrado(fin);
      return;
    }

    let frame = 0;
    const inicioTiempo = performance.now();
    const tick = (tiempo: number) => {
      const progreso = Math.min(1, (tiempo - inicioTiempo) / duracion);
      const suavizado = 1 - Math.pow(1 - progreso, 3);
      setMostrado(inicio + (fin - inicio) * suavizado);
      if (progreso < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        anterior.current = fin;
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [valor, duracion]);

  return mostrado;
}

function formatearValor(valor: number, formato: KpiFormat) {
  return formato === 'currency' ? currency(valor) : Math.round(valor).toLocaleString('es-PE');
}

function TarjetaKpi({
  kpi,
  index,
  puedeNavegar,
  onNavigate,
}: {
  kpi: TarjetaKpiConfig;
  index: number;
  puedeNavegar: boolean;
  onNavigate: () => void;
}) {
  const animado = useValorAnimado(kpi.value);
  const Icon = kpi.icon;
  const valor = formatearValor(animado, kpi.format);
  const tone = KPI_TONES[kpi.tone];
  const estilo = { animationDelay: `${index * 45}ms` } as CSSProperties;

  return (
    <button
      type="button"
      onClick={onNavigate}
      disabled={!puedeNavegar}
      style={estilo}
      title={puedeNavegar ? `Abrir ${kpi.label}` : kpi.label}
      aria-label={`${kpi.label}: ${valor}${puedeNavegar ? '. Abrir módulo.' : ''}`}
      className="tarjeta-kpi animate-kpi-in group relative overflow-hidden rounded-xl border border-slate-200/90 bg-white p-4 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-default dark:border-slate-800 dark:bg-slate-900 dark:focus-visible:ring-offset-slate-900 motion-reduce:animate-none"
    >
      <span className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-blue-600 via-indigo-500/70 to-transparent" />
      <span className="pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full bg-blue-500/5 opacity-0 blur-2xl transition-opacity duration-500 group-hover:bg-blue-500/10 group-hover:opacity-100" />

      <span className="relative z-10 flex items-start justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2">
          <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg shadow-sm', tone.icon)}>
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="truncate text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
            {kpi.categoria}
          </span>
        </span>
        {puedeNavegar && (
          <ArrowUpRight
            size={15}
            className="mt-0.5 shrink-0 text-slate-300 opacity-0 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-blue-600 group-hover:opacity-100 dark:text-slate-600 dark:group-hover:text-blue-400"
            aria-hidden="true"
          />
        )}
      </span>

      <span className="relative z-10 mt-4 block truncate text-[1.75rem] leading-none font-semibold tracking-tight text-slate-900 dark:text-white">
        {valor}
      </span>
      <span className="relative z-10 mt-1.5 block truncate text-xs font-medium text-slate-500 dark:text-slate-400">
        {kpi.label}
      </span>

      <span className="relative z-10 mt-3 flex items-center gap-1.5 border-t border-slate-100 pt-2.5 dark:border-slate-800">
        <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', tone.dot, kpi.pulse && 'animate-pulse')} />
        <span
          className={cn(
            'whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
            tone.badge
          )}
        >
          {kpi.badge}
        </span>
      </span>
    </button>
  );
}

interface DashboardHeroProps {
  userName: string;
  roleName: string;
  summary: DashboardSummary;
  hasPermission: (permission: string) => boolean;
  permissionsLoading: boolean;
  onNavigate: (path: string) => void;
}

function DashboardHero({
  userName,
  roleName,
  summary,
  hasPermission,
  permissionsLoading,
  onNavigate,
}: DashboardHeroProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const hour = now.getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';
  const GreetingIcon = hour < 12 ? Sunrise : hour < 19 ? Sun : Moon;

  const dateLabel = now.toLocaleDateString('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const formattedDate = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);
  const timeLabel = now.toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const handlePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    event.currentTarget.style.setProperty('--dashboard-x', `${x}%`);
    event.currentTarget.style.setProperty('--dashboard-y', `${y}%`);
  };

  const handlePointerLeave = (event: ReactPointerEvent<HTMLElement>) => {
    event.currentTarget.style.setProperty('--dashboard-x', '50%');
    event.currentTarget.style.setProperty('--dashboard-y', '15%');
  };

  const actions = [
    {
      label: 'Ver órdenes',
      icon: ClipboardList,
      ruta: '/ordenes-trabajo',
      permiso: 'ORDENES:VER',
      primary: true,
    },
    {
      label: 'Agenda',
      icon: CalendarCheck,
      ruta: '/citas',
      permiso: 'CITAS:VER',
      primary: false,
    },
    {
      label: 'Reportes',
      icon: BarChart3,
      ruta: '/reportes',
      permiso: 'REPORTES:VER',
      primary: false,
    },
  ].filter((action) => permissionsLoading || hasPermission(action.permiso));

  const quickStats = [
    {
      label: 'En taller ahora',
      value: summary.ordenesPendientes + summary.ordenesEnProceso,
      icon: Wrench,
      dot: 'bg-blue-400',
      ruta: '/ordenes-trabajo',
      permiso: 'ORDENES:VER',
    },
    {
      label: 'Citas de hoy',
      value: summary.citasDelDia,
      icon: CalendarDays,
      dot: 'bg-emerald-400',
      ruta: '/citas',
      permiso: 'CITAS:VER',
    },
    {
      label: 'Stock bajo',
      value: summary.stockBajo,
      icon: AlertTriangle,
      dot: summary.stockBajo > 0 ? 'bg-amber-400' : 'bg-slate-400',
      ruta: '/inventario',
      permiso: 'PRODUCTOS:VER',
    },
  ].filter((stat) => permissionsLoading || hasPermission(stat.permiso));

  return (
    <section
      className="dashboard-hero animate-slide-up relative overflow-hidden rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:px-5 sm:py-5 motion-reduce:animate-none"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      aria-label={`${greeting}, ${userName}. Panel de control del taller.`}
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-blue-600 via-indigo-500 to-sky-400" />
      <div className="dashboard-hero-spotlight pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute -right-8 -top-16 h-40 w-40 rounded-full bg-blue-500/[0.06] blur-2xl dark:bg-blue-500/10" />

      <div className="relative z-10 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm sm:h-11 sm:w-11">
            <GreetingIcon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500 sm:text-[10px]">
              <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400">
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                Panel de control
              </span>
              <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />
              <span>{roleName}</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[11px] font-semibold normal-case tracking-normal text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                En línea
              </span>
            </div>

            <h1 className="mt-1 text-lg font-bold leading-tight tracking-tight text-slate-900 dark:text-white sm:text-xl xl:text-2xl">
              {greeting},{' '}
              <span className="text-blue-600 dark:text-blue-400">{userName}</span>
            </h1>

            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1">
                <Clock3 className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-200">{timeLabel}</span>
                <span>hora local</span>
              </span>
              <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                {formattedDate}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
          {actions.map(({ label, icon: Icon, ruta, primary }) => (
            <button
              key={label}
              type="button"
              onClick={() => onNavigate(ruta)}
              className={cn(
                'group inline-flex min-w-0 items-center justify-center gap-1.5 rounded-xl border px-2.5 py-2 text-[10px] font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 sm:px-3 sm:text-xs',
                primary
                  ? 'border-transparent bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm hover:from-blue-700 hover:to-indigo-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-blue-500/40 dark:hover:bg-slate-700'
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="relative z-10 mt-3 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3 dark:border-slate-800">
        {quickStats.map(({ label, value, icon: Icon, dot, ruta }) => (
          <button
            key={label}
            type="button"
            onClick={() => onNavigate(ruta)}
            className="group inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2 py-1.5 text-[10px] font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:bg-slate-800/60 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 dark:focus-visible:ring-offset-slate-900"
          >
            <span className={cn('h-1.5 w-1.5 rounded-full', dot)} />
            <Icon className="h-3 w-3" aria-hidden="true" />
            <span className="font-semibold text-slate-900 dark:text-white">{value}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

export default function Dashboard() {
  const [periodo, setPeriodo] = useState<DashboardPeriod>('30');
  const [summary, setSummary] = useState<DashboardSummary>(DEFAULT_SUMMARY);
  const [lineData, setLineData] = useState<DashboardLineRow[]>([]);
  const [donutData, setDonutData] = useState<{ name: string; value: number }[]>([]);
  const [bars, setBars] = useState<DashboardBars>(DEFAULT_BARS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const { theme } = useTheme();
  const navigate = useNavigate();
  const { hasPermission, loading: cargandoPermisos } = usePermissions();
  const usuario = getCurrentUser();
  const nombreUsuario =
    [usuario?.name, usuario?.lastName].filter(Boolean).join(' ').trim() || 'Administrador';
  const rolUsuario = roleLabel(usuario?.roleName);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      getDashboardSummary(periodo),
      getDashboardLine(periodo),
      getDashboardDonut(),
      getDashboardBars(periodo),
    ])
      .then(([s, line, donut, b]) => {
        if (cancelled) return;
        setSummary(s);
        setLineData(line);
        setDonutData(donut);
        setBars(b);
      })
      .catch(() => {
        /* sin permisos o sin conexión */
        if (!cancelled) {
          setDonutData([]);
          setError('No se pudieron cargar los indicadores. Revisa la conexión o tus permisos e inténtalo de nuevo.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [periodo, reloadKey]);

  const gridColor = theme === 'dark' ? '#1e293b' : '#e2e8f0';

  const kpis = useMemo<TarjetaKpiConfig[]>(() => {
    const pendientes = summary.ordenesPendientes;
    const bajos = summary.stockBajo;
    const agotados = summary.productosAgotados;
    return [
      {
        key: 'clientesRegistrados',
        label: 'Clientes registrados',
        categoria: 'Comercial',
        value: summary.clientesRegistrados,
        format: 'number',
        icon: Users,
        tone: 'success',
        badge: 'Cartera activa',
        ruta: '/clientes',
        permiso: 'CLIENTES:VER',
      },
      {
        key: 'vehiculosRegistrados',
        label: 'Vehículos registrados',
        categoria: 'Comercial',
        value: summary.vehiculosRegistrados,
        format: 'number',
        icon: CarFront,
        tone: 'info',
        badge: 'Parque activo',
        ruta: '/vehiculos',
        permiso: 'VEHICULOS:VER',
      },
      {
        key: 'citasDelDia',
        label: 'Citas del día',
        categoria: 'Agenda',
        value: summary.citasDelDia,
        format: 'number',
        icon: CalendarCheck,
        tone: summary.citasDelDia > 0 ? 'info' : 'neutral',
        badge: summary.citasDelDia > 0 ? 'Programadas' : 'Sin citas',
        ruta: '/citas',
        permiso: 'CITAS:VER',
      },
      {
        key: 'ordenesPendientes',
        label: 'Órdenes pendientes',
        categoria: 'Operación',
        value: pendientes,
        format: 'number',
        icon: Clock4,
        tone: pendientes > 0 ? 'warning' : 'success',
        badge: pendientes > 0 ? 'Requiere atención' : 'Sin pendientes',
        pulse: pendientes > 0,
        ruta: '/ordenes-trabajo',
        permiso: 'ORDENES:VER',
      },
      {
        key: 'ordenesEnProceso',
        label: 'Órdenes en proceso',
        categoria: 'Operación',
        value: summary.ordenesEnProceso,
        format: 'number',
        icon: Wrench,
        tone: 'info',
        badge: 'En taller',
        ruta: '/ordenes-trabajo',
        permiso: 'ORDENES:VER',
      },
      {
        key: 'vehiculosListos',
        label: 'Vehículos listos',
        categoria: 'Operación',
        value: summary.vehiculosListos,
        format: 'number',
        icon: PackageCheck,
        tone: 'info',
        badge: 'Para entrega',
        ruta: '/ordenes-trabajo',
        permiso: 'ORDENES:VER',
      },
      {
        key: 'reparacionesFinalizadas',
        label: 'Reparaciones finalizadas',
        categoria: 'Operación',
        value: summary.reparacionesFinalizadas,
        format: 'number',
        icon: CheckCircle2,
        tone: 'success',
        badge: 'Completadas',
        ruta: '/ordenes-trabajo',
        permiso: 'ORDENES:VER',
      },
      {
        key: 'ingresos',
        label: 'Ingresos (período)',
        categoria: 'Finanzas',
        value: summary.ingresos,
        format: 'currency',
        icon: Banknote,
        tone: 'info',
        badge: 'Soles (S/)',
        ruta: '/facturacion',
        permiso: 'FACTURAS:VER',
      },
      {
        key: 'valorInventario',
        label: 'Valor de inventario',
        categoria: 'Inventario',
        value: summary.valorInventario,
        format: 'currency',
        icon: Boxes,
        tone: 'neutral',
        badge: 'Soles (S/)',
        ruta: '/inventario',
        permiso: 'PRODUCTOS:VER',
      },
      {
        key: 'stockBajo',
        label: 'Existencias bajas',
        categoria: 'Inventario',
        value: bajos,
        format: 'number',
        icon: AlertTriangle,
        tone: bajos > 0 ? 'warning' : 'success',
        badge: bajos > 0 ? 'Reponer stock' : 'Stock saludable',
        pulse: bajos > 0,
        ruta: '/inventario',
        permiso: 'PRODUCTOS:VER',
      },
      {
        key: 'productosAgotados',
        label: 'Productos agotados',
        categoria: 'Inventario',
        value: agotados,
        format: 'number',
        icon: PackageX,
        tone: agotados > 0 ? 'danger' : 'success',
        badge: agotados > 0 ? 'Crítico' : 'Sin agotados',
        pulse: agotados > 0,
        ruta: '/inventario',
        permiso: 'PRODUCTOS:VER',
      },
    ];
  }, [summary]);

  const panel = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900';

  return (
    <div className="space-y-6">
      <DashboardHero
        userName={nombreUsuario}
        roleName={rolUsuario}
        summary={summary}
        hasPermission={hasPermission}
        permissionsLoading={cargandoPermisos}
        onNavigate={navigate}
      />

      {error && !loading && (
        <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-500/30 dark:bg-red-500/10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-red-800 dark:text-red-200">No se pudieron cargar los indicadores</p>
            <p className="mt-0.5 text-xs text-red-700 dark:text-red-300">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => setReloadKey((value) => value + 1)}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 dark:border-red-500/30 dark:bg-slate-900 dark:text-red-300 dark:hover:bg-red-500/10"
          >
            <RefreshCw size={13} /> Reintentar
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Resumen operativo</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Indicadores clave y tendencias del taller.</p>
        </div>
        <div className="flex max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriodo(p.key)}
              className={cn(
                'shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
                periodo === p.key
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {kpis.map((kpi, index) => (
          <TarjetaKpi
            key={kpi.key}
            kpi={kpi}
            index={index}
            puedeNavegar={cargandoPermisos || hasPermission(kpi.permiso)}
            onNavigate={() => navigate(kpi.ruta)}
          />
        ))}
      </div>

      {loading && lineData.length === 0 ? (
        <div className={cn(panel, 'flex flex-col items-center justify-center gap-3 py-24')}>
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Cargando indicadores...</p>
        </div>
      ) : (
        <>
          {/* Línea: tendencias del período */}
          <div className={panel}>
            <div className="mb-5 flex items-center gap-2">
              <TrendingUp size={18} className="text-blue-500" />
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">Tendencias del período</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Citas, reparaciones, vehículos atendidos e ingresos
                </p>
              </div>
            </div>
            {lineData.length === 0 ? (
              <ChartEmpty
                icon={TrendingUp}
                title="Sin actividad en el período"
                description="Las citas, reparaciones e ingresos aparecerán aquí cuando existan movimientos."
              />
            ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineData} margin={{ top: 5, right: 15, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={axisTick} />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={axisTick} width={34} />
                  <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={axisTick} width={48} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line yAxisId="left" type="monotone" dataKey="citas" name="Citas" stroke="#6366f1" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                  <Line yAxisId="left" type="monotone" dataKey="reparaciones" name="Reparaciones" stroke="#3b82f6" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                  <Line yAxisId="left" type="monotone" dataKey="vehiculos" name="Vehículos" stroke="#06b6d4" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                  <Line yAxisId="right" type="monotone" dataKey="ingresos" name="Ingresos" stroke="#10b981" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            )}
          </div>

          {/* Donut + servicios/repuestos */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className={panel}>
              <h3 className="mb-5 text-base font-semibold text-slate-900 dark:text-white">Estado de órdenes</h3>
              {donutData.length === 0 ? (
                <ChartEmpty
                  icon={ClipboardList}
                  title="Sin órdenes registradas"
                  description="El estado de las órdenes se mostrará cuando existan registros."
                />
              ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={95}
                      paddingAngle={3}
                      strokeWidth={0}
                    >
                      {donutData.map((_, i) => (
                        <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              )}
            </div>

            <div className={panel}>
              <h3 className="mb-5 flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
                <Wrench size={16} className="text-blue-500" /> Servicios más solicitados
              </h3>
              {bars.servicios.length === 0 ? (
                <ChartEmpty
                  icon={Wrench}
                  title="Sin servicios solicitados"
                  description="Agrega líneas de servicio del catálogo a una orden de trabajo para ver su demanda aquí."
                />
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={bars.servicios} layout="vertical" margin={{ top: 5, right: 25, bottom: 5, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={gridColor} />
                      <XAxis type="number" axisLine={false} tickLine={false} tick={axisTick} />
                      <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={axisTick} width={130} />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(59,130,246,0.08)' }} />
                      <Bar dataKey="value" name="Cantidad" fill="#3b82f6" radius={[0, 6, 6, 0]} barSize={16} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className={panel}>
              <h3 className="mb-5 flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
                <Boxes size={16} className="text-violet-500" /> Repuestos más utilizados
              </h3>
              {bars.repuestos.length === 0 ? (
                <ChartEmpty
                  icon={Boxes}
                  title="Sin repuestos utilizados"
                  description="Los repuestos agregados a las órdenes del período aparecerán en esta tarjeta."
                />
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={bars.repuestos} layout="vertical" margin={{ top: 5, right: 25, bottom: 5, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={gridColor} />
                      <XAxis type="number" axisLine={false} tickLine={false} tick={axisTick} />
                      <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={axisTick} width={130} />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(139,92,246,0.08)' }} />
                      <Bar dataKey="value" name="Cantidad" fill="#8b5cf6" radius={[0, 6, 6, 0]} barSize={16} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* Barras: reparaciones por período + trabajo por mecánico */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className={panel}>
              <h3 className="mb-5 flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
                <TrendingUp size={16} className="text-emerald-500" /> Reparaciones por período
              </h3>
              {bars.reparacionesPorPeriodo.length === 0 ? (
                <ChartEmpty
                  icon={TrendingUp}
                  title="Sin reparaciones en el período"
                  description="Las reparaciones finalizadas se reflejarán en este gráfico."
                />
              ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bars.reparacionesPorPeriodo} margin={{ top: 5, right: 15, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={axisTick} />
                    <YAxis axisLine={false} tickLine={false} tick={axisTick} width={30} allowDecimals={false} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(16,185,129,0.08)' }} />
                    <Bar dataKey="value" name="Reparaciones" fill="#10b981" radius={[6, 6, 0, 0]} barSize={26} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              )}
            </div>

            <div className={panel}>
              <h3 className="mb-5 flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
                <Wrench size={16} className="text-orange-500" /> Trabajos por mecánico
              </h3>
              {bars.trabajosPorMecanico.length === 0 ? (
                <ChartEmpty
                  icon={Users}
                  title="Sin trabajos asignados"
                  description="Los trabajos realizados por cada mecánico aparecerán aquí."
                />
              ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bars.trabajosPorMecanico} margin={{ top: 5, right: 15, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={axisTick} />
                    <YAxis axisLine={false} tickLine={false} tick={axisTick} width={30} allowDecimals={false} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(249,115,22,0.08)' }} />
                    <Bar dataKey="value" name="Trabajos" fill="#f97316" radius={[6, 6, 0, 0]} barSize={26} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
