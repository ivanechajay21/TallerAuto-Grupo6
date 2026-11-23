import { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Activity,
  UserRound,
  Clock,
  FileText,
  ShieldCheck,
  LogIn,
  PenLine,
  Trash2,
  Download,
  History,
  CalendarRange,
  X,
} from 'lucide-react';
import ResponsiveTable from '../componentes/interfaz/TablaAdaptable';
import type { ResponsiveColumn } from '../componentes/interfaz/TablaAdaptable';
import EncabezadoModulo from '../componentes/interfaz/EncabezadoModulo';
import TarjetaMetrica from '../componentes/interfaz/TarjetaMetrica';
import { cn } from '../lib/utilidades';
import { getAuditLogs, getAuditActions } from '../servicios/auditoriaServicio';
import type { AuditLog, AuditActionOption } from '../servicios/auditoriaServicio';

const ACTION_STYLES: Record<string, string> = {
  CREATE: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30',
  UPDATE: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30',
  DELETE: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30',
  STATUS: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30',
  PAYMENT: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30',
  PERMISSIONS: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  LOGIN: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30',
  LOGOUT: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
};

type AuditPeriod = 'TODO' | 'HOY' | '7D' | '30D';

const ACTION_ICON_BG: Record<string, string> = {
  CREATE: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400',
  UPDATE: 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400',
  DELETE: 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400',
  STATUS: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400',
  PAYMENT: 'bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400',
  PERMISSIONS: 'bg-fuchsia-50 text-fuchsia-600 dark:bg-fuchsia-500/15 dark:text-fuchsia-400',
  LOGIN: 'bg-teal-50 text-teal-600 dark:bg-teal-500/15 dark:text-teal-400',
  LOGOUT: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-400',
};

const ENTITY_LABELS: Record<string, string> = {
  USUARIO: 'Usuario',
  ROL: 'Rol',
  CLIENTE: 'Cliente',
  VEHICULO: 'Vehículo',
  CITA: 'Cita',
  RECEPCION: 'Recepción',
  ORDEN_TRABAJO: 'Orden de trabajo',
  ITEM_ORDEN: 'Ítem de orden',
  PRODUCTO: 'Producto',
  FACTURA: 'Factura',
  CONFIGURACION: 'Configuración',
};

const entityLabel = (entity?: string) => {
  if (!entity) return '—';
  if (ENTITY_LABELS[entity]) return ENTITY_LABELS[entity];
  if (entity.startsWith('CATALOGO_')) return `Catálogo (${entity.replace('CATALOGO_', '')})`;
  return entity;
};

function formatTimestamp(iso?: string): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (isNaN(date.getTime())) return iso;
  return `${date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })} · ${date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`;
}

const DEFAULT_ACTIONS: AuditActionOption[] = [
  { action: 'LOGIN', label: 'Inicio de sesión' },
  { action: 'LOGOUT', label: 'Cierre de sesión' },
  { action: 'CREATE', label: 'Creación' },
  { action: 'UPDATE', label: 'Actualización' },
  { action: 'DELETE', label: 'Eliminación' },
  { action: 'STATUS', label: 'Cambio de estado' },
  { action: 'MOVEMENT', label: 'Movimiento de existencias' },
  { action: 'PAYMENT', label: 'Pago' },
  { action: 'PERMISSIONS', label: 'Permisos' },
];

export default function Audit() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [actions, setActions] = useState<AuditActionOption[]>(DEFAULT_ACTIONS);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [entityFilter, setEntityFilter] = useState('TODAS');
  const [period, setPeriod] = useState<AuditPeriod>('TODO');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAuditActions()
      .then((opts) => {
        const loaded = opts.map((o) => ({ action: o.action, label: o.label || o.action }));
        if (loaded.length > 0) setActions(loaded);
      })
      .catch(() => {
        setActions(DEFAULT_ACTIONS);
      });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      setError(null);
      getAuditLogs(actionFilter === 'ALL' ? undefined : actionFilter, search.trim() || undefined)
        .then((data) => {
          if (!cancelled) setLogs(data);
        })
        .catch(() => {
          if (!cancelled) setError('No se pudieron cargar los registros de auditoría.');
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search, actionFilter]);

  const entities = useMemo(
    () => Array.from(new Set(logs.map((log) => log.entity).filter(Boolean))).sort(),
    [logs]
  );

  const filtered = useMemo(() => {
    const now = Date.now();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const threshold =
      period === 'HOY'
        ? startOfToday.getTime()
        : period === '7D'
          ? now - 7 * 24 * 60 * 60 * 1000
          : period === '30D'
            ? now - 30 * 24 * 60 * 60 * 1000
            : null;

    return logs.filter((log) => {
      if (entityFilter !== 'TODAS' && log.entity !== entityFilter) return false;
      if (threshold !== null) {
        const time = log.timestamp ? new Date(log.timestamp).getTime() : NaN;
        if (Number.isNaN(time) || time < threshold) return false;
      }
      return true;
    });
  }, [logs, entityFilter, period]);

  const stats = useMemo(
    () => ({
      total: filtered.length,
      access: filtered.filter((log) => log.action === 'LOGIN' || log.action === 'LOGOUT').length,
      changes: filtered.filter((log) =>
        ['CREATE', 'UPDATE', 'STATUS', 'PAYMENT', 'PERMISSIONS'].includes(log.action)
      ).length,
      deletes: filtered.filter((log) => log.action === 'DELETE').length,
    }),
    [filtered]
  );

  const exportCsv = () => {
    const escape = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const rows = [
      ['Fecha y hora', 'Acción', 'Entidad', 'ID', 'Usuario', 'Detalles'],
      ...filtered.map((log) => [
        formatTimestamp(log.timestamp),
        log.actionLabel || log.action,
        entityLabel(log.entity),
        log.entityId ?? '',
        log.username,
        log.details || '',
      ]),
    ];
    const csv = rows.map((row) => row.map(escape).join(',')).join('\r\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `auditoria-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setSearch('');
    setActionFilter('ALL');
    setEntityFilter('TODAS');
    setPeriod('TODO');
  };

  const hasFilters = search || actionFilter !== 'ALL' || entityFilter !== 'TODAS' || period !== 'TODO';

  const columns: ResponsiveColumn<AuditLog>[] = [
    {
      key: 'timestamp',
      header: 'Fecha / Hora',
      render: (log) => (
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <Clock size={14} className="text-slate-400 dark:text-slate-500" />
          {formatTimestamp(log.timestamp)}
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Acción',
      render: (log) => (
        <span className={cn('rounded-md border px-2.5 py-1 text-[10px] font-bold', ACTION_STYLES[log.action] || 'border-slate-200 bg-slate-100 text-slate-700')}>
          {log.actionLabel || log.action}
        </span>
      ),
    },
    {
      key: 'entity',
      header: 'Entidad / Registro',
      render: (log) => (
        <div className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-white">
          <Activity size={16} className="text-blue-500" />
          {entityLabel(log.entity)} <span className="font-normal text-slate-400 dark:text-slate-500">(#{log.entityId ?? '—'})</span>
        </div>
      ),
    },
    {
      key: 'username',
      header: 'Usuario',
      render: (log) => (
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <span className={cn('flex h-6 w-6 items-center justify-center rounded-full', ACTION_ICON_BG[log.action] || 'bg-slate-200 text-slate-600')}>
            <UserRound size={12} />
          </span>
          @{log.username}
        </div>
      ),
    },
    {
      key: 'details',
      header: 'Detalles',
      render: (log) => (
        <div className="flex max-w-[360px] items-start gap-2 text-sm text-slate-500 dark:text-slate-400">
          <FileText size={14} className="mt-0.5 shrink-0 text-slate-400 dark:text-slate-500" />
          <span className="block max-w-[360px] truncate" title={log.details || 'Sin detalles'}>
            {log.details || '—'}
          </span>
        </div>
      ),
    },
  ];

  const statCards = [
    { label: 'Eventos en la vista', value: stats.total, icon: Activity, tone: 'blue' },
    { label: 'Accesos al sistema', value: stats.access, icon: LogIn, tone: 'teal' },
    { label: 'Cambios y pagos', value: stats.changes, icon: PenLine, tone: 'amber' },
    { label: 'Eliminaciones', value: stats.deletes, icon: Trash2, tone: 'red' },
  ] as const;

  return (
    <div className="space-y-6">
      <EncabezadoModulo
        eyebrow="Seguridad y trazabilidad"
        title="Registro de auditoría"
        description="Trazabilidad de accesos, cambios y eliminaciones realizadas por el personal."
        icon={History}
        actions={(
          <button
            type="button"
            onClick={exportCsv}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Download size={15} /> Exportar CSV
          </button>
        )}
        meta={(
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-500/15 dark:text-emerald-300">
            <ShieldCheck size={13} /> Trazabilidad activa
          </span>
        )}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statCards.map((card) => (
          <TarjetaMetrica
            key={card.label}
            label={card.label}
            value={card.value}
            icon={card.icon}
            tone={card.tone === 'teal' ? 'indigo' : card.tone}
          />
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="space-y-3 border-b border-slate-200 bg-slate-50/60 p-4 dark:border-slate-700 dark:bg-slate-800/50">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full xl:max-w-md">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="block w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
                placeholder="Buscar por usuario, entidad o detalle..."
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute inset-y-0 right-2 my-auto flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                  aria-label="Limpiar búsqueda"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                aria-label="Filtrar por acción"
              >
                <option value="ALL">Todas las acciones</option>
                {actions.map((option) => (
                  <option key={option.action} value={option.action}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                aria-label="Filtrar por entidad"
              >
                <option value="TODAS">Todas las entidades</option>
                {entities.map((entity) => (
                  <option key={entity} value={entity}>
                    {entityLabel(entity)}
                  </option>
                ))}
              </select>
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              <CalendarRange size={13} /> Período
            </span>
            {(
              [
                ['TODO', 'Todo'],
                ['HOY', 'Hoy'],
                ['7D', '7 días'],
                ['30D', '30 días'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setPeriod(key)}
                className={cn(
                  'rounded-full px-3 py-1.5 text-xs font-semibold transition',
                  period === key
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20 dark:bg-blue-500 dark:text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                )}
              >
                {label}
              </button>
            ))}
            <span className="ml-auto flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
              {loading && (
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600 dark:border-slate-600" />
              )}
              {filtered.length} {filtered.length === 1 ? 'registro' : 'registros'}
            </span>
          </div>
        </div>

        {error ? (
          <div className="p-8 text-center text-sm text-red-600">{error}</div>
        ) : loading ? (
          <div className="space-y-2 p-4">
            {[1, 2, 3, 4, 5].map((item) => (
              <div key={item} className="h-11 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
            ))}
          </div>
        ) : (
          <ResponsiveTable
            columns={columns}
            rows={filtered}
            keyField={(log) => log.id}
            emptyMessage="No se encontraron registros de auditoría."
            pageSize={10}
            itemLabel="registros"
          />
        )}
      </div>
    </div>
  );
}