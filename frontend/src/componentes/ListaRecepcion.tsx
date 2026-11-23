import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  RefreshCw,
  Eye,
  FileText,
  Car,
  Gauge,
  Camera,
  X,
  PackageCheck,
  Wrench,
  ClipboardList,
  CircleCheck,
  CircleDashed,
  SlidersHorizontal,
  UserRound,
  Fuel,
  Images,
  ShieldCheck,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { cn } from '../lib/utilidades';
import { getAllReceptions, emitOrderFromReception } from '../servicios/recepcionServicio';
import type { Reception } from '../servicios/recepcionServicio';
import { useToast } from './interfaz/Avisos';
import Modal from './interfaz/Modal';
import { usePermissions } from '../contexto/ContextoPermisos';
import usePagination from '../hooks/usePaginacion';
import Pagination from './interfaz/Paginacion';

const RECEP_STATUS: Record<string, { label: string; cls: string }> = {
  RECIBIDO: { label: 'Recibido', cls: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400' },
  CON_ORDEN: { label: 'Con orden', cls: 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400' },
  ENTREGADO: { label: 'Entregado', cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' },
};

const PHOTO_LABELS: Record<string, string> = {
  FRONT: 'Frente',
  REAR: 'Parte trasera',
  LEFT: 'Lado izquierdo',
  RIGHT: 'Lado derecho',
  INTERIOR: 'Interior',
  ENGINE: 'Motor',
  OTHER: 'Otra',
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });

type RecepStatusFilter = 'TODAS' | 'RECIBIDO' | 'CON_ORDEN' | 'ENTREGADO';

export default function ReceptionList() {
  const toast = useToast();
  const { hasPermission } = usePermissions();
  const canCreateOrder = hasPermission('RECEPCION:CREAR');
  const [receptions, setReceptions] = useState<Reception[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<RecepStatusFilter>('TODAS');
  const [emittingId, setEmittingId] = useState<number | null>(null);
  const [detail, setDetail] = useState<Reception | null>(null);

  const fetchReceptions = useCallback(async () => {
    setLoading(true);
    try {
      setReceptions(await getAllReceptions());
    } catch {
      toast.error('Error', 'No se pudieron cargar las recepciones.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchReceptions();
  }, [fetchReceptions]);

  const stats = useMemo(
    () => ({
      total: receptions.length,
      received: receptions.filter((r) => r.status === 'RECIBIDO').length,
      withOrder: receptions.filter((r) => r.status === 'CON_ORDEN').length,
      delivered: receptions.filter((r) => r.status === 'ENTREGADO').length,
    }),
    [receptions]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return receptions.filter((r) => {
      if (statusFilter !== 'TODAS' && r.status !== statusFilter) return false;
      if (!q) return true;
      return (
        r.code.toLowerCase().includes(q) ||
        r.vehicle.plate.toLowerCase().includes(q) ||
        `${r.vehicle.brand} ${r.vehicle.model}`.toLowerCase().includes(q) ||
        (r.vehicle.customer
          ? `${r.vehicle.customer.firstName} ${r.vehicle.customer.lastName}`.toLowerCase().includes(q)
          : false) ||
        (r.workOrderNumber || '').toLowerCase().includes(q)
      );
    });
  }, [receptions, search, statusFilter]);

  const pag = usePagination(filtered, 10);

  const statCards = [
    { key: 'TODAS' as RecepStatusFilter, label: 'Recepciones', value: stats.total, icon: ClipboardList, tone: 'blue' },
    { key: 'RECIBIDO' as RecepStatusFilter, label: 'Recibidas', value: stats.received, icon: CircleDashed, tone: 'amber' },
    { key: 'CON_ORDEN' as RecepStatusFilter, label: 'Con orden', value: stats.withOrder, icon: FileText, tone: 'violet' },
    { key: 'ENTREGADO' as RecepStatusFilter, label: 'Entregadas', value: stats.delivered, icon: CircleCheck, tone: 'emerald' },
  ] as const;

  const toneClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
    violet: 'bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
  };

  const handleEmit = async (r: Reception) => {
    setEmittingId(r.id);
    try {
      const result = await emitOrderFromReception(r.id);
      toast.success('Orden emitida', `Orden ${result.orderNumber} creada correctamente.`);
      await fetchReceptions();
    } catch (err: any) {
      toast.error('Error', err?.response?.data?.message || 'No se pudo emitir la orden de trabajo.');
    } finally {
      setEmittingId(null);
    }
  };

  const renderActions = (r: Reception) => {
    const canEmit = !r.workOrderNumber && canCreateOrder;
    return (
      <div className="flex items-center justify-end gap-1.5">
        <button
          onClick={() => setDetail(r)}
          className="rounded-lg p-2 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600 dark:text-slate-500 dark:hover:bg-blue-500/10 dark:hover:text-blue-400"
          title="Ver detalle de la recepción"
          aria-label={`Ver detalle de ${r.code}`}
        >
          <Eye size={16} />
        </button>
        {canEmit ? (
          <button
            onClick={() => handleEmit(r)}
            disabled={emittingId === r.id}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:from-blue-500 hover:to-indigo-500 disabled:opacity-60"
            title="Emitir orden de trabajo"
          >
            {emittingId === r.id ? (
              <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <FileText size={13} />
            )}
            Emitir orden
          </button>
        ) : (
          <span className="rounded-lg bg-slate-100 px-2.5 py-2 text-[11px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            Orden emitida
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statCards.map((card) => (
          <button
            key={card.key}
            type="button"
            onClick={() => setStatusFilter(card.key)}
            className={cn(
              'rounded-2xl border bg-white p-3.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-900 sm:p-4',
              statusFilter === card.key
                ? 'border-blue-300 ring-2 ring-blue-500/15 dark:border-blue-500/50'
                : 'border-slate-200 dark:border-slate-700'
            )}
          >
            <div className={cn('flex h-8 w-8 items-center justify-center rounded-xl sm:h-9 sm:w-9', toneClasses[card.tone])}>
              <card.icon size={17} />
            </div>
            <p className="mt-2 text-lg font-bold text-slate-900 dark:text-white sm:mt-3 sm:text-xl">{card.value}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{card.label}</p>
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="space-y-3 border-b border-slate-200 p-4 dark:border-slate-700">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-md">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="block w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
                placeholder="Buscar por código, placa o cliente..."
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
              <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                <SlidersHorizontal size={13} /> Filtrar
              </span>
              {(
                [
                  ['TODAS', 'Todas'],
                  ['RECIBIDO', 'Recibidas'],
                  ['CON_ORDEN', 'Con orden'],
                  ['ENTREGADO', 'Entregadas'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStatusFilter(key)}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-xs font-semibold transition',
                    statusFilter === key
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20 dark:bg-blue-500 dark:text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                  )}
                >
                  {label}
                </button>
              ))}
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {filtered.length} {filtered.length === 1 ? 'recepción' : 'recepciones'}
              </span>
              <button
                onClick={fetchReceptions}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/40"
              >
                <RefreshCw size={14} className={cn(loading && 'animate-spin')} /> Actualizar
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="m-5 rounded-xl border border-dashed border-slate-200 py-14 text-center text-sm text-slate-400 dark:border-slate-700 dark:text-slate-500">
            {search || statusFilter !== 'TODAS'
              ? 'No se encontraron recepciones con los filtros seleccionados.'
              : 'Aún no hay recepciones registradas.'}
          </div>
        ) : (
          <>
            {/* Tarjetas móvil / tablet */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800 lg:hidden">
              {pag.pageItems.map((r) => {
                const st = RECEP_STATUS[r.status] || {
                  label: r.status,
                  cls: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
                };
                return (
                  <article key={r.id} className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-mono text-sm font-bold text-slate-900 dark:text-white">{r.code}</p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">
                          {formatDate(r.receptionDate)} · {formatTime(r.receptionDate)}
                        </p>
                      </div>
                      <span className={cn('rounded-full px-2.5 py-1 text-[10px] font-semibold', st.cls)}>{st.label}</span>
                    </div>

                    <div className="mt-3 flex items-center gap-2.5 rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/60">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
                        <Car size={19} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                          {r.vehicle.plate} · {r.vehicle.brand} {r.vehicle.model}
                        </p>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                          {r.vehicle.customer
                            ? `${r.vehicle.customer.firstName} ${r.vehicle.customer.lastName}`
                            : 'Sin cliente asignado'}
                        </p>
                      </div>
                      {r.mileage != null && (
                        <span className="flex shrink-0 items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                          <Gauge size={12} /> {r.mileage.toLocaleString('es-ES')} km
                        </span>
                      )}
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800">
                        <Camera size={10} /> {r.photos.length} fotos
                      </span>
                      <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800">
                        <PackageCheck size={10} /> {r.accessories.length} accesorios
                      </span>
                      {r.damages.length > 0 && (
                        <span className="rounded-full bg-red-50 px-2 py-0.5 font-semibold text-red-600 dark:bg-red-500/10 dark:text-red-400">
                          {r.damages.length} daños
                        </span>
                      )}
                      {r.workOrderNumber && (
                        <Link to="/ordenes-trabajo" className="rounded-full bg-violet-50 px-2 py-0.5 font-semibold text-violet-600 dark:bg-violet-500/10 dark:text-violet-300">
                          {r.workOrderNumber}
                        </Link>
                      )}
                    </div>

                    <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                      {renderActions(r)}
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Tabla escritorio */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-400 dark:border-slate-700 dark:text-slate-500">
                    <th className="px-4 py-3 font-semibold">Recepción</th>
                    <th className="px-4 py-3 font-semibold">Vehículo</th>
                    <th className="px-4 py-3 font-semibold">Cliente</th>
                    <th className="px-4 py-3 font-semibold">Kilometraje</th>
                    <th className="px-4 py-3 font-semibold">Estado</th>
                    <th className="px-4 py-3 text-right font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {pag.pageItems.map((r) => {
                    const st = RECEP_STATUS[r.status] || {
                      label: r.status,
                      cls: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
                    };
                    return (
                      <tr key={r.id} className="group transition hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                              <ClipboardList size={15} />
                            </span>
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-white">{r.code}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {formatDate(r.receptionDate)} · {formatTime(r.receptionDate)}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="flex items-center gap-1.5 font-medium text-slate-900 dark:text-white">
                            <Car size={14} className="text-slate-400 dark:text-slate-500" /> {r.vehicle.plate}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {r.vehicle.brand} {r.vehicle.model}
                            {r.vehicle.year ? ` (${r.vehicle.year})` : ''}
                          </p>
                          <p className="mt-1 flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500">
                            <span className="flex items-center gap-1"><Camera size={10} /> {r.photos.length}</span>
                            <span className="flex items-center gap-1"><PackageCheck size={10} /> {r.accessories.length}</span>
                            {r.damages.length > 0 && <span className="font-semibold text-red-500">{r.damages.length} daños</span>}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          {r.vehicle.customer
                            ? `${r.vehicle.customer.firstName} ${r.vehicle.customer.lastName}`
                            : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {r.mileage != null ? (
                            <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                              <Gauge size={13} className="text-slate-400 dark:text-slate-500" />
                              {r.mileage.toLocaleString('es-ES')} km
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-semibold', st.cls)}>{st.label}</span>
                          {r.workOrderNumber && (
                            <Link
                              to="/ordenes-trabajo"
                              title={`Ver la orden ${r.workOrderNumber} en órdenes de trabajo`}
                              className="mt-1 block text-[11px] font-semibold text-violet-600 hover:underline"
                            >
                              {r.workOrderNumber}
                            </Link>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {renderActions(r)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        <Pagination
          page={pag.page}
          pageCount={pag.pageCount}
          onChange={pag.setPage}
          total={pag.total}
          from={pag.from}
          to={pag.to}
          itemLabel="recepciones"
        />
      </div>

      {detail && <ReceptionDetailModal reception={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

function ReceptionDetailModal({ reception: r, onClose }: { reception: Reception; onClose: () => void }) {
  const st = RECEP_STATUS[r.status] || { label: r.status, cls: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300' };
  const [tab, setTab] = useState<'resumen' | 'inspeccion' | 'fotos'>('resumen');
  const [activePhoto, setActivePhoto] = useState<string | null>(r.photos[0]?.photoUrl ?? null);
  const owner = r.vehicle.customer
    ? `${r.vehicle.customer.firstName} ${r.vehicle.customer.lastName}`
    : 'Sin cliente asignado';
  const severities: Record<string, string> = {
    LEVE: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    MODERADO: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    GRAVE: 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  };

  return (
    <Modal
      title={`Recepción ${r.code}`}
      description={`${r.vehicle.plate} · ${r.vehicle.brand} ${r.vehicle.model}${r.vehicle.year ? ` (${r.vehicle.year})` : ''} · ${owner}`}
      icon={Car}
      size="lg"
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cerrar
          </button>
          {r.workOrderNumber && (
            <Link
              to="/ordenes-trabajo"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500"
            >
              <Wrench size={15} /> Ir a la orden
            </Link>
          )}
        </>
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-semibold', st.cls)}>{st.label}</span>
        <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
          <Clock size={12} /> {formatDate(r.receptionDate)} · {formatTime(r.receptionDate)}
        </span>
        {r.workOrderNumber && (
          <Link to="/ordenes-trabajo" className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700 hover:underline dark:bg-violet-500/15 dark:text-violet-300">
            {r.workOrderNumber}
          </Link>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[
          { label: 'Kilometraje', value: r.mileage != null ? `${r.mileage.toLocaleString('es-ES')} km` : '—', icon: Gauge },
          { label: 'Combustible', value: r.fuelLevel || '—', icon: Fuel },
          { label: 'Accesorios', value: r.accessories.length, icon: PackageCheck },
          { label: 'Daños', value: r.damages.length, icon: ShieldCheck },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-700 dark:bg-slate-800/40">
            <item.icon size={15} className="text-blue-500" />
            <p className="mt-2 truncate text-sm font-bold text-slate-900 dark:text-white">{item.value}</p>
            <p className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-1.5 rounded-xl border border-slate-200 bg-slate-50/60 p-1 dark:border-slate-700 dark:bg-slate-800/40">
        {[
          { key: 'resumen' as const, label: 'Resumen', icon: ClipboardList, count: null },
          { key: 'inspeccion' as const, label: 'Inspección', icon: ShieldCheck, count: r.damages.length },
          { key: 'fotos' as const, label: 'Fotografías', icon: Images, count: r.photos.length },
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition',
              tab === item.key
                ? 'bg-white text-blue-700 shadow-sm dark:bg-slate-900 dark:text-blue-300'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            )}
          >
            <item.icon size={13} /> {item.label}
            {item.count != null && (
              <span className={cn('rounded-full px-1.5 py-0.5 text-[9px]', tab === item.key ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300' : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-300')}>
                {item.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'resumen' && (
        <div className="mt-4 space-y-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <p className="mb-3 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              <ClipboardList size={12} /> Datos de recepción
            </p>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2.5 text-sm sm:grid-cols-2">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500 dark:text-slate-400">Recibido por</dt>
                <dd className="flex items-center gap-1.5 text-right font-medium text-slate-900 dark:text-white"><UserRound size={13} className="text-slate-400" /> {r.receivedByName || '—'}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500 dark:text-slate-400">Estado exterior</dt>
                <dd className="text-right font-medium text-slate-900 dark:text-white">{r.exteriorState || '—'}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500 dark:text-slate-400">Estado general</dt>
                <dd className="text-right font-medium text-slate-900 dark:text-white">{r.generalState || '—'}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500 dark:text-slate-400">Accesorios</dt>
                <dd className="text-right font-medium text-slate-900 dark:text-white">{r.accessories.length} entregado(s)</dd>
              </div>
            </dl>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                <PackageCheck size={12} /> Accesorios entregados
              </p>
              {r.accessories.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-500">Sin accesorios registrados.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {r.accessories.map((a, i) => (
                    <span key={i} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">{a}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                <AlertCircle size={12} /> Observaciones del cliente
              </p>
              <p className="text-sm italic text-slate-600 dark:text-slate-300">
                {r.customerSymptoms ? `“${r.customerSymptoms}”` : 'Sin síntomas reportados.'}
              </p>
              {r.observations && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{r.observations}</p>}
            </div>
          </div>
        </div>
      )}

      {tab === 'inspeccion' && (
        <div className="mt-4">
          {r.damages.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center dark:border-slate-700">
              <ShieldCheck size={28} className="mx-auto mb-2 text-emerald-500" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Sin daños registrados</p>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">La inspección visual no reportó daños.</p>
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {r.damages.map((d) => (
                <div key={d.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{d.zoneLabel}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{d.damageType}</p>
                    </div>
                    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', severities[d.severity || 'MODERADO'] || severities.MODERADO)}>
                      {d.severity || 'MODERADO'}
                    </span>
                  </div>
                  {d.description && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{d.description}</p>}
                  {d.observation && <p className="mt-1 text-[11px] italic text-slate-400 dark:text-slate-500">{d.observation}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'fotos' && (
        <div className="mt-4">
          {r.photos.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center dark:border-slate-700">
              <Images size={28} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Sin fotografías registradas</p>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Esta recepción no tiene imágenes de inspección.</p>
            </div>
          ) : (
            <>
              {activePhoto && (
                <a href={activePhoto} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
                  <img src={activePhoto} alt="Fotografía de inspección" className="max-h-80 w-full object-contain" />
                </a>
              )}
              <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
                {r.photos.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setActivePhoto(p.photoUrl)}
                    className={cn(
                      'group relative aspect-square overflow-hidden rounded-xl border-2 bg-slate-100 transition dark:bg-slate-800',
                      activePhoto === p.photoUrl ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-transparent hover:border-blue-300'
                    )}
                    title={PHOTO_LABELS[p.category] || p.category}
                  >
                    <img src={p.photoUrl} alt={PHOTO_LABELS[p.category] || p.category} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
