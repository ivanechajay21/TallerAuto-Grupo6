import { useEffect, useMemo, useState } from 'react';
import {
  ClipboardCheck,
  Clock,
  CheckCircle2,
  Package,
  Play,
  Pause,
  ChevronRight,
  Search,
  RefreshCw,
  ListChecks,
  CircleDashed,
  CalendarDays,
  X,
} from 'lucide-react';
import { getMyWorkItems, updateItemStatus } from '../servicios/ordenesTrabajoServicio';
import type { WorkOrderItem } from '../servicios/ordenesTrabajoServicio';
import { getCurrentUser } from '../servicios/autenticacionServicio';
import { cn } from '../lib/utilidades';
import { useToast } from '../componentes/interfaz/Avisos';
import { usePermissions } from '../contexto/ContextoPermisos';
import usePagination from '../hooks/usePaginacion';
import EncabezadoModulo from '../componentes/interfaz/EncabezadoModulo';
import Pagination from '../componentes/interfaz/Paginacion';
import TarjetaMetrica from '../componentes/interfaz/TarjetaMetrica';

const STATUS_META: Record<string, { label: string; color: string; dot: string }> = {
  PENDING: { label: 'Pendiente', color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300', dot: 'bg-slate-400' },
  IN_PROGRESS: { label: 'En progreso', color: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300', dot: 'bg-blue-500' },
  COMPLETED: { label: 'Completado', color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300', dot: 'bg-emerald-500' },
};

export default function MyWork() {
  const toast = useToast();
  const { hasPermission } = usePermissions();
  const canChangeStatus = hasPermission('MI_TRABAJO:CAMBIAR_ESTADO') || hasPermission('ITEMS:CAMBIAR_ESTADO');
  const user = getCurrentUser();
  const [items, setItems] = useState<WorkOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'>('ALL');

  const mechanicId = user?.id || 0;

  const fetchItems = async () => {
    if (!mechanicId) return;
    setLoading(true);
    setError(null);
    try {
      setItems(await getMyWorkItems(mechanicId));
    } catch {
      setError('No se pudieron cargar tus trabajos asignados. Revisa la conexión e inténtalo de nuevo.');
      toast.error('Error', 'No se pudieron cargar tus trabajos asignados.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mechanicId]);

  const counts = useMemo(
    () => ({
      ALL: items.length,
      PENDING: items.filter((i) => i.status === 'PENDING').length,
      IN_PROGRESS: items.filter((i) => i.status === 'IN_PROGRESS').length,
      COMPLETED: items.filter((i) => i.status === 'COMPLETED').length,
    }),
    [items]
  );

  const progress = counts.ALL > 0 ? Math.round((counts.COMPLETED / counts.ALL) * 100) : 0;

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return items.filter((item) => {
      if (filter !== 'ALL' && item.status !== filter) return false;
      if (!q) return true;
      return (
        item.description.toLowerCase().includes(q) ||
        (item.workOrder?.orderNumber || '').toLowerCase().includes(q)
      );
    });
  }, [items, filter, search]);

  const pag = usePagination(filtered, 10);

  const emptyTitle =
    filter === 'ALL'
      ? 'Sin trabajos asignados'
      : filter === 'PENDING'
        ? 'Sin trabajos pendientes'
        : filter === 'IN_PROGRESS'
          ? 'Sin trabajos en progreso'
          : 'Sin trabajos completados';

  const changeStatus = async (item: WorkOrderItem, next: string) => {
    try {
      const updated = await updateItemStatus(item.id, next);
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, ...updated } : i)));
      const meta = STATUS_META[next];
      toast.success('Estado actualizado', `El trabajo quedó "${meta.label}".`);
    } catch {
      toast.error('Error', 'No se pudo cambiar el estado del trabajo.');
    }
  };

  const canStart = (i: WorkOrderItem) => i.status === 'PENDING';
  const canFinish = (i: WorkOrderItem) => i.status === 'IN_PROGRESS';
  const canCancelProgress = (i: WorkOrderItem) => i.status === 'IN_PROGRESS';

  const statCards: {
    key: 'ALL' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
    label: string;
    value: number;
    icon: typeof ClipboardCheck;
    tone: 'slate' | 'amber' | 'blue' | 'emerald';
  }[] = [
    { key: 'ALL', label: 'Trabajos asignados', value: counts.ALL, icon: ListChecks, tone: 'slate' },
    { key: 'PENDING', label: 'Pendientes', value: counts.PENDING, icon: CircleDashed, tone: 'amber' },
    { key: 'IN_PROGRESS', label: 'En progreso', value: counts.IN_PROGRESS, icon: Clock, tone: 'blue' },
    { key: 'COMPLETED', label: 'Completados', value: counts.COMPLETED, icon: CheckCircle2, tone: 'emerald' },
  ];

  return (
    <div className="space-y-6">
      <EncabezadoModulo
        eyebrow="Operación técnica"
        title="Mis trabajos"
        description={`Trabajos asignados a ${user?.name || ''} ${user?.lastName || ''} en todas las órdenes de trabajo.`}
        icon={ClipboardCheck}
        actions={(
          <button
            type="button"
            onClick={() => void fetchItems()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <RefreshCw size={15} className={cn(loading && 'animate-spin')} /> Actualizar
          </button>
        )}
        meta={(
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
            {counts.PENDING} pendiente(s) · {counts.IN_PROGRESS} en proceso
          </span>
        )}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statCards.map((card) => (
          <TarjetaMetrica
            key={card.key}
            label={card.label}
            value={card.value}
            icon={card.icon}
            tone={card.tone}
            active={filter === card.key}
            onClick={() => setFilter(card.key)}
          />
        ))}
      </div>

      {error && !loading && (
        <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-500/30 dark:bg-red-500/10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-red-800 dark:text-red-200">No se pudieron cargar los trabajos</p>
            <p className="mt-0.5 text-xs text-red-700 dark:text-red-300">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => void fetchItems()}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 dark:border-red-500/30 dark:bg-slate-900 dark:text-red-300 dark:hover:bg-red-500/10"
          >
            <RefreshCw size={13} /> Reintentar
          </button>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Avance general</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {counts.COMPLETED} de {counts.ALL} trabajos completados
            </p>
          </div>
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
            {progress}%
          </span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por trabajo u orden..."
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
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
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
          {filtered.length} {filtered.length === 1 ? 'trabajo' : 'trabajos'}
        </span>
      </div>

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-16 text-center dark:border-slate-700 dark:bg-slate-900">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
            {filter === 'COMPLETED' ? <CheckCircle2 size={26} /> : <ClipboardCheck size={26} />}
          </div>
          <p className="font-medium text-slate-500 dark:text-slate-400">
            {search ? 'Sin coincidencias para la búsqueda' : emptyTitle}
          </p>
          <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
            {search
              ? 'Prueba con otra descripción o número de orden.'
              : 'Los ítems asignados aparecerán aquí automáticamente.'}
          </p>
          {(search || filter !== 'ALL') && (
            <button
              type="button"
              onClick={() => { setSearch(''); setFilter('ALL'); }}
              className="mt-4 text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            {pag.pageItems.map((item) => {
              const meta = STATUS_META[item.status];
              const price = item.price || 0;
              const total = price * (item.quantity || 1);
              const accent =
                item.status === 'COMPLETED'
                  ? 'bg-emerald-500'
                  : item.status === 'IN_PROGRESS'
                    ? 'bg-blue-500'
                    : 'bg-amber-400';
              return (
                <article
                  key={item.id}
                  className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
                >
                  <span className={cn('absolute inset-y-0 left-0 w-1', accent)} />
                  <div className="p-4 pl-5 sm:p-5 sm:pl-6">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', meta.color)}>
                          {item.status === 'COMPLETED' ? (
                            <CheckCircle2 size={19} />
                          ) : item.status === 'IN_PROGRESS' ? (
                            <Clock size={19} />
                          ) : (
                            <Package size={19} />
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900 dark:text-white">{item.description}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                              {item.workOrder?.orderNumber || 'Sin orden'}
                            </span>
                            <span className="text-[11px] text-slate-400 dark:text-slate-500">
                              Cant. {item.quantity || 1}
                            </span>
                            <span className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
                              <CalendarDays size={11} />
                              {item.startDate
                                ? new Date(item.startDate).toLocaleDateString('es-ES')
                                : 'Sin fecha de inicio'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold', meta.color)}>
                        <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
                        {meta.label}
                      </span>
                    </div>

                    <div className="mt-4 inline-flex items-baseline gap-1 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
                      <span className="text-lg font-bold text-slate-900 dark:text-white">
                        {(total || 0).toLocaleString('es-PE', { style: 'currency', currency: 'PEN' })}
                      </span>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500">mano de obra / repuesto</span>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                      <span className="text-[11px] text-slate-400 dark:text-slate-500">
                        {item.status === 'COMPLETED' && item.endDate
                          ? `Completado el ${new Date(item.endDate).toLocaleDateString('es-ES')}`
                          : item.status === 'IN_PROGRESS'
                            ? 'Trabajo en curso'
                            : 'Listo para iniciar'}
                      </span>
                      <div className="flex items-center gap-2">
                        {canChangeStatus && canCancelProgress(item) && (
                          <button
                            onClick={() => changeStatus(item, 'PENDING')}
                            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/40"
                          >
                            <Pause size={13} /> Pausar
                          </button>
                        )}
                        {canChangeStatus && canStart(item) && (
                          <button
                            onClick={() => changeStatus(item, 'IN_PROGRESS')}
                            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-500"
                          >
                            <Play size={13} /> Iniciar
                          </button>
                        )}
                        {canChangeStatus && canFinish(item) && (
                          <button
                            onClick={() => changeStatus(item, 'COMPLETED')}
                            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-500"
                          >
                            <CheckCircle2 size={13} /> Completar
                          </button>
                        )}
                        {item.status === 'COMPLETED' && (
                          <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                            <ChevronRight size={13} /> Finalizado
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <Pagination
            className="mt-4"
            page={pag.page}
            pageCount={pag.pageCount}
            onChange={pag.setPage}
            total={pag.total}
            from={pag.from}
            to={pag.to}
            itemLabel="trabajos"
          />
        </>
      )}
    </div>
  );
}
