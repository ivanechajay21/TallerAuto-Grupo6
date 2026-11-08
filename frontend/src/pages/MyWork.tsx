import { useEffect, useMemo, useState } from 'react';
import { ClipboardCheck, Clock, CheckCircle2, Package, Play, Pause, ChevronRight } from 'lucide-react';
import { getMyWorkItems, updateItemStatus } from '../services/workOrderService';
import type { WorkOrderItem } from '../services/workOrderService';
import { getCurrentUser } from '../services/authService';
import { cn } from '../lib/utils';
import { useToast } from '../components/ui/Toast';
import { usePermissions } from '../context/PermissionContext';
import usePagination from '../hooks/usePagination';
import Pagination from '../components/ui/Pagination';

const STATUS_META: Record<string, { label: string; color: string; dot: string }> = {
  PENDING: { label: 'Pendiente', color: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
  IN_PROGRESS: { label: 'En progreso', color: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
  COMPLETED: { label: 'Completado', color: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
};

export default function MyWork() {
  const toast = useToast();
  const { hasPermission } = usePermissions();
  const canChangeStatus = hasPermission('MI_TRABAJO:CAMBIAR_ESTADO') || hasPermission('ITEMS:CAMBIAR_ESTADO');
  const user = getCurrentUser();
  const [items, setItems] = useState<WorkOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'>('ALL');

  const mechanicId = user?.id || 0;

  const fetchItems = async () => {
    if (!mechanicId) return;
    setLoading(true);
    try {
      setItems(await getMyWorkItems(mechanicId));
    } catch {
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
      PENDING: items.filter((i) => i.status === 'PENDING').length,
      IN_PROGRESS: items.filter((i) => i.status === 'IN_PROGRESS').length,
      COMPLETED: items.filter((i) => i.status === 'COMPLETED').length,
    }),
    [items]
  );

  const filtered = filter === 'ALL' ? items : items.filter((i) => i.status === filter);

  const pag = usePagination(filtered, 10);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Mis trabajos</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Trabajos asignados a <span className="font-semibold text-slate-700 dark:text-slate-200">{user?.name} {user?.lastName}</span> en todas las órdenes de trabajo.
          </p>
        </div>

        <div className="grid w-full grid-cols-3 gap-3 sm:w-auto">
          {(
            [
              ['ALL', 'Todos', items.length, 'bg-slate-900 text-white'],
              ['IN_PROGRESS', 'En progreso', counts.IN_PROGRESS, 'bg-blue-600 text-white'],
              ['COMPLETED', 'Completados', counts.COMPLETED, 'bg-emerald-600 text-white'],
            ] as const
          ).map(([key, label, count, activeCls]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={cn(
                'rounded-xl px-3 py-2 text-center text-sm font-semibold transition',
                filter === key ? activeCls : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800/40'
              )}
            >
              <span className="block text-lg leading-tight">{count}</span>
              <span className="text-[11px] font-medium opacity-80">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-2xl bg-slate-200" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-16 text-center dark:border-slate-700 dark:bg-slate-900">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
            {filter === 'COMPLETED' ? <CheckCircle2 size={26} /> : <ClipboardCheck size={26} />}
          </div>
          <p className="font-medium text-slate-500 dark:text-slate-400">Sin trabajos {filter === 'ALL' ? '' : STATUS_META[filter].label.toLowerCase()}s</p>
          <p className="text-sm text-slate-400 dark:text-slate-500">Los ítems asignados aparecerán aquí automáticamente.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            {pag.pageItems.map((item) => {
              const meta = STATUS_META[item.status];
              const price = item.price || 0;
              const total = price * (item.quantity || 1);
              return (
                <div
                  key={item.id}
                  className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl', meta.color)}>
                        {item.status === 'COMPLETED' ? (
                          <CheckCircle2 size={20} />
                        ) : item.status === 'IN_PROGRESS' ? (
                          <Clock size={20} />
                        ) : (
                          <Package size={20} />
                        )}
                      </span>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">{item.description}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {item.workOrder?.orderNumber}
                          {' · '}
                          Cant. {item.quantity || 1}
                        </p>
                      </div>
                    </div>
                    <span className={cn('shrink-0 rounded-md px-2 py-1 text-xs font-medium', meta.color)}>
                      {meta.label}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      <span className="font-medium text-slate-900 dark:text-white">
                        {(total || 0).toLocaleString('es-ES', { style: 'currency', currency: 'PEN' })}
                      </span>
                      {item.mechanic && <span> · {item.mechanic.name} {item.mechanic.lastName}</span>}
                    </div>

                    <div className="flex items-center gap-2">
                      {canChangeStatus && canCancelProgress(item) && (
                        <button
                          onClick={() => changeStatus(item, 'PENDING')}
                          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/40"
                        >
                          <Pause size={14} /> Pausar
                        </button>
                      )}
                      {canChangeStatus && canStart(item) && (
                        <button
                          onClick={() => changeStatus(item, 'IN_PROGRESS')}
                          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-blue-500"
                        >
                          <Play size={14} /> Iniciar
                        </button>
                      )}
                      {canChangeStatus && canFinish(item) && (
                        <button
                          onClick={() => changeStatus(item, 'COMPLETED')}
                          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
                        >
                          <CheckCircle2 size={14} /> Marcar completado
                        </button>
                      )}
                      {item.status === 'COMPLETED' && item.endDate && (
                        <span className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                          <ChevronRight size={14} />
                          {new Date(item.endDate).toLocaleDateString('es-ES')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
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
            itemLabel="registros"
          />
        </>
      )}
    </div>
  );
}
