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
} from 'lucide-react';
import { cn } from '../lib/utils';
import { getAllReceptions, emitOrderFromReception } from '../services/receptionService';
import type { Reception } from '../services/receptionService';
import { useToast } from './ui/Toast';
import { usePermissions } from '../context/PermissionContext';
import usePagination from '../hooks/usePagination';
import Pagination from './ui/Pagination';

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

export default function ReceptionList() {
  const toast = useToast();
  const { hasPermission } = usePermissions();
  const canCreateOrder = hasPermission('RECEPCION:CREAR');
  const [receptions, setReceptions] = useState<Reception[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
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

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return receptions;
    return receptions.filter(
      (r) =>
        r.code.toLowerCase().includes(q) ||
        r.vehicle.plate.toLowerCase().includes(q) ||
        `${r.vehicle.brand} ${r.vehicle.model}`.toLowerCase().includes(q) ||
        (r.vehicle.customer
          ? `${r.vehicle.customer.firstName} ${r.vehicle.customer.lastName}`.toLowerCase().includes(q)
          : false) ||
        (r.workOrderNumber || '').toLowerCase().includes(q)
    );
  }, [receptions, search]);

  const pag = usePagination(filtered, 10);

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

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4 w-4 text-slate-400 dark:text-slate-500" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full rounded-lg border border-slate-300 dark:border-slate-600 py-2 pl-10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 sm:text-sm"
            placeholder="Buscar por código, placa o cliente..."
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500 dark:text-slate-400">{filtered.length} recepciones</span>
          <button
            onClick={fetchReceptions}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
          >
            <RefreshCw size={14} className={cn(loading && 'animate-spin')} /> Actualizar
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
        {loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl m-5 border border-dashed border-slate-200 dark:border-slate-700 py-14 text-center text-sm text-slate-400 dark:text-slate-500">
            {search ? 'No se encontraron recepciones que coincidan.' : 'Aún no hay recepciones registradas.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  <th className="px-4 py-3 font-semibold">Recepción</th>
                  <th className="px-4 py-3 font-semibold">Vehículo</th>
                  <th className="hidden px-4 py-3 font-semibold lg:table-cell">Cliente</th>
                  <th className="hidden px-4 py-3 font-semibold md:table-cell">Kilometraje</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                  <th className="px-4 py-3 text-right font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {pag.pageItems.map((r) => {
                  const st = RECEP_STATUS[r.status] || { label: r.status, cls: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300' };
                  const canEmit = !r.workOrderNumber && canCreateOrder;
                  return (
                    <tr key={r.id} className="transition hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900 dark:text-white">{r.code}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {formatDate(r.receptionDate)} · {formatTime(r.receptionDate)}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="flex items-center gap-1.5 font-medium text-slate-900 dark:text-white">
                          <Car size={14} className="text-slate-400 dark:text-slate-500" /> {r.vehicle.plate}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {r.vehicle.brand} {r.vehicle.model}
                          {r.vehicle.year ? ` (${r.vehicle.year})` : ''}
                        </p>
                      </td>
                      <td className="hidden px-4 py-3 text-slate-600 dark:text-slate-300 lg:table-cell">
                        {r.vehicle.customer
                          ? `${r.vehicle.customer.firstName} ${r.vehicle.customer.lastName}`
                          : '—'}
                      </td>
                      <td className="hidden px-4 py-3 md:table-cell">
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
                        <span className={cn('rounded-md px-2 py-1 text-[11px] font-semibold', st.cls)}>{st.label}</span>
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
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => setDetail(r)}
                            className="rounded-lg p-2 text-slate-400 dark:text-slate-500 transition hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/10 dark:hover:text-blue-400"
                            title="Ver detalle de la recepción"
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
                            <span className="hidden rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-2 text-[11px] font-medium text-slate-500 dark:text-slate-400 sm:inline">
                              Orden emitida
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Pagination
        page={pag.page}
        pageCount={pag.pageCount}
        onChange={pag.setPage}
        total={pag.total}
        from={pag.from}
        to={pag.to}
        itemLabel="recepciones"
      />

      {detail && <ReceptionDetailModal reception={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

function ReceptionDetailModal({ reception: r, onClose }: { reception: Reception; onClose: () => void }) {
  const st = RECEP_STATUS[r.status] || { label: r.status, cls: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300' };
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 sm:items-center" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-3xl animate-slide-up overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
              <Car size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Recepción {r.code}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {r.vehicle.plate} · {r.vehicle.brand} {r.vehicle.model}
                {r.vehicle.year ? ` (${r.vehicle.year})` : ''}
                {r.vehicle.customer ? ` · ${r.vehicle.customer.firstName} ${r.vehicle.customer.lastName}` : ''}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className={cn('rounded-md px-2.5 py-1 text-xs font-semibold', st.cls)}>{st.label}</span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {formatDate(r.receptionDate)} · {formatTime(r.receptionDate)}
          </span>
          {r.workOrderNumber && (
            <Link to="/ordenes-trabajo" className="text-xs font-semibold text-violet-600 hover:underline">
              OT: {r.workOrderNumber}
            </Link>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/50 p-4 sm:col-span-2">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <dt className="text-slate-500 dark:text-slate-400">Kilometraje</dt>
              <dd className="text-right font-medium text-slate-900 dark:text-white">
                {r.mileage != null ? `${r.mileage.toLocaleString('es-ES')} km` : '—'}
              </dd>
              <dt className="text-slate-500 dark:text-slate-400">Combustible</dt>
              <dd className="text-right font-medium text-slate-900 dark:text-white">{r.fuelLevel || '—'}</dd>
              <dt className="text-slate-500 dark:text-slate-400">Recibido por</dt>
              <dd className="text-right font-medium text-slate-900 dark:text-white">{r.receivedByName || '—'}</dd>
              <dt className="text-slate-500 dark:text-slate-400">Accesorios</dt>
              <dd className="text-right font-medium text-slate-900 dark:text-white">{r.accessories.length || '—'}</dd>
              {r.exteriorState && (
                <>
                  <dt className="text-slate-500 dark:text-slate-400">Estado exterior</dt>
                  <dd className="text-right font-medium text-slate-900 dark:text-white">{r.exteriorState}</dd>
                </>
              )}
              {r.generalState && (
                <>
                  <dt className="text-slate-500 dark:text-slate-400">Estado general</dt>
                  <dd className="text-right font-medium text-slate-900 dark:text-white">{r.generalState}</dd>
                </>
              )}
            </dl>

            {r.customerSymptoms && (
              <p className="mt-4 text-sm italic text-slate-600 dark:text-slate-300">“{r.customerSymptoms}”</p>
            )}
            {r.observations && (
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                <span className="font-medium">Observaciones:</span> {r.observations}
              </p>
            )}
          </div>

          <div>
            {r.accessories.length > 0 && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                <p className="mb-2 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  <PackageCheck size={12} /> Accesorios entregados
                </p>
                <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                  {r.accessories.map((a, i) => (
                    <li key={i} className="flex items-center gap-1.5">
                      <span className="h-1 w-1 rounded-full bg-slate-400" /> {a}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {r.damages.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Daños registrados ({r.damages.length})
            </p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {r.damages.map((d) => (
                <li key={d.id} className="flex items-start gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/50 p-3 text-sm">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-500" />
                  <span className="min-w-0">
                    <span className="block font-medium text-slate-900 dark:text-white">
                      {d.zoneLabel} · {d.damageType}
                    </span>
                    <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">Severidad {d.severity}</span>
                    {d.description && <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{d.description}</span>}
                    {d.observation && (
                      <span className="mt-0.5 block truncate text-xs italic text-slate-400 dark:text-slate-500">Obs: {d.observation}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {r.photos.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              <Camera size={12} /> Fotografías de la inspección ({r.photos.length})
            </p>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
              {r.photos.map((p) => (
                <a
                  key={p.id}
                  href={p.photoUrl}
                  target="_blank"
                  rel="noreferrer"
                  title={PHOTO_LABELS[p.category] || p.category}
                  className="group relative block aspect-square overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800"
                >
                  <img
                    src={p.photoUrl}
                    alt={PHOTO_LABELS[p.category] || p.category}
                    loading="lazy"
                    className="h-full w-full object-cover transition group-hover:opacity-90"
                  />
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 transition hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Cerrar
          </button>
          {r.workOrderNumber && (
            <Link
              to="/ordenes-trabajo"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 transition hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              <Wrench size={15} /> Ir a órdenes
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
