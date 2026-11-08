import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Plus, Car, Wrench, AlertCircle, X, Gauge, Fuel, Camera, Wallet, UserRound, Boxes, Trash2 } from 'lucide-react';
import { getAllVehicles, createVehicle, updateVehicle, getVehicleHistory, deleteVehicle } from '../services/vehicleService';
import type { Vehicle, VehicleHistory, VehicleHistoryItem } from '../services/vehicleService';
import { getAllCustomers } from '../services/customerService';
import type { Customer } from '../services/customerService';
import { cn } from '../lib/utils';
import { useToast } from '../components/ui/Toast';
import { usePermissions } from '../context/PermissionContext';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import usePagination from '../hooks/usePagination';
import Pagination from '../components/ui/Pagination';

const PHOTO_LABELS: Record<string, string> = {
  FRONT: 'Frente',
  REAR: 'Parte trasera',
  LEFT: 'Lado izquierdo',
  RIGHT: 'Lado derecho',
  INTERIOR: 'Interior',
  ENGINE: 'Motor',
  OTHER: 'Otra',
};

const formatHistoryDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

const formatHistoryTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(value);

const STATUS_LABELS: Record<string, string> = {
  RECIBIDO: 'Recibido',
  CON_ORDEN: 'Con orden',
  EN_DIAGNOSTICO: 'En diagnóstico',
  DIAGNOSTICO: 'En diagnóstico',
  DIAGNOSTICO_REALIZADO: 'Diagnóstico realizado',
  PENDIENTE_APROBACION: 'Pendiente aprobación',
  EN_PROCESO: 'En proceso',
  EN_REPARACION: 'En reparación',
  ESPERANDO_REPUESTOS: 'Esperando repuestos',
  PAUSADO: 'Pausado',
  LISTO_PARA_ENTREGA: 'Listo para entrega',
  FINALIZADO: 'Finalizado',
  ENTREGADO: 'Entregado',
};

function HistoryItemRow({ item }: { item: VehicleHistoryItem }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/70 dark:bg-slate-800/60 px-2.5 py-1.5 text-sm text-slate-700 dark:text-slate-200 ring-1 ring-slate-100 dark:ring-slate-800">
      <span>
        {item.description}
        {item.mechanicName && <span className="ml-2 text-xs text-slate-400 dark:text-slate-500">· {item.mechanicName}</span>}
      </span>
      <span className="text-xs text-slate-500 dark:text-slate-400">
        <span className="font-medium text-slate-700 dark:text-slate-200">{formatCurrency(item.subtotal)}</span>
        {item.quantity > 1 && (
          <span className="ml-1">
            · {item.quantity} × {formatCurrency(item.price)}
          </span>
        )}
      </span>
    </li>
  );
}

const VEHICLE_TYPES = ['Sedán', 'SUV / 4x4', 'Camioneta', 'Pickup', 'Hatchback', 'Coupé', 'Motocicleta', 'Otro'];
const FUEL_TYPES = ['Gasolina', 'Diésel', 'GLP / GNC', 'Híbrido', 'Eléctrico'];
const TRANSMISSIONS = ['Automática', 'Manual'];

interface VehicleForm {
  plate: string;
  vin: string;
  brand: string;
  model: string;
  year: string;
  color: string;
  vehicleType: string;
  fuelType: string;
  transmission: string;
  currentMileage: string;
  observations: string;
}

const EMPTY_FORM: VehicleForm = {
  plate: '',
  vin: '',
  brand: '',
  model: '',
  year: '',
  color: '',
  vehicleType: 'Sedán',
  fuelType: 'Gasolina',
  transmission: 'Automática',
  currentMileage: '',
  observations: '',
};

export default function Vehicles() {
  const toast = useToast();
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission('VEHICULOS:CREAR');
  const canEdit = hasPermission('VEHICULOS:EDITAR');
  const [params] = useSearchParams();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [search, setSearch] = useState(params.get('q') || '');
  const [loading, setLoading] = useState(true);

  // El buscador global puede navegar a /vehiculos?q=... desde la misma página.
  useEffect(() => {
    setSearch(params.get('q') || '');
  }, [params]);

  const [history, setHistory] = useState<VehicleHistory | null>(null);
  const [historyVehicle, setHistoryVehicle] = useState<Vehicle | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [custSearch, setCustSearch] = useState('');
  const [custOpen, setCustOpen] = useState(false);
  const [form, setForm] = useState<VehicleForm>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Vehicle | null>(null);

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      setVehicles(await getAllVehicles());
    } catch {
      toast.error('Error', 'No se pudieron cargar los vehículos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
    getAllCustomers()
      .then((data) => setCustomers(data))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return vehicles;
    return vehicles.filter(
      (v) =>
        v.plate.toLowerCase().includes(q) ||
        `${v.brand} ${v.model}`.toLowerCase().includes(q) ||
        (v.customer ? `${v.customer.firstName} ${v.customer.lastName}`.toLowerCase().includes(q) : false) ||
        (v.code || '').toLowerCase().includes(q)
    );
  }, [vehicles, search]);

  const pag = usePagination(filtered, 10);

  const filteredCustomers = useMemo(() => {
    const q = custSearch.toLowerCase().trim();
    if (!q) return customers.slice(0, 8);
    return customers.filter(
      (c) => `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) || c.documentNumber.includes(q)
    );
  }, [customers, custSearch]);

  const openHistory = async (v: Vehicle) => {
    setHistoryVehicle(v);
    setHistory(null);
    try {
      setHistory(await getVehicleHistory(v.id!));
    } catch {
      toast.error('Error', 'No se pudo cargar el historial del vehículo.');
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setCustomer(null);
    setCustSearch('');
    setForm({ ...EMPTY_FORM });
  };

  const openCreate = () => {
    setEditing(null);
    setCustomer(null);
    setCustSearch('');
    setForm({ ...EMPTY_FORM });
    setModalOpen(true);
  };

  const openEdit = (v: Vehicle) => {
    setEditing(v);
    setCustomer(v.customer ?? null);
    setCustSearch(v.customer ? `${v.customer.firstName} ${v.customer.lastName}` : '');
    setForm({
      plate: v.plate,
      vin: v.vin || '',
      brand: v.brand,
      model: v.model,
      year: v.year ? String(v.year) : '',
      color: v.color || '',
      vehicleType: v.vehicleType || 'Sedán',
      fuelType: v.fuelType || 'Gasolina',
      transmission: v.transmission || 'Automática',
      currentMileage: v.currentMileage != null ? String(v.currentMileage) : '',
      observations: v.observations || '',
    });
    setModalOpen(true);
  };

  const removeVehicle = async () => {
    if (!confirmDelete?.id) return;
    const plate = confirmDelete.plate;
    setDeletingId(confirmDelete.id);
    try {
      await deleteVehicle(confirmDelete.id);
      toast.success('Vehículo desactivado', `${plate} ya no está activo en el registro.`);
      setConfirmDelete(null);
      await fetchVehicles();
    } catch (err: any) {
      toast.error(
        'No se pudo eliminar',
        err?.response?.data?.message || err?.message || 'Inténtalo de nuevo.'
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;
    setSaving(true);
    const payload = {
      plate: form.plate.trim().toUpperCase(),
      vin: form.vin.trim().toUpperCase() || undefined,
      brand: form.brand.trim(),
      model: form.model.trim(),
      year: Number(form.year) || new Date().getFullYear(),
      color: form.color.trim(),
      vehicleType: form.vehicleType,
      fuelType: form.fuelType,
      transmission: form.transmission,
      currentMileage: Number(form.currentMileage) || undefined,
      observations: form.observations.trim() || undefined,
      active: true,
    };
    try {
      if (editing?.id) {
        const updated = await updateVehicle(editing.id, payload);
        setVehicles((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
        toast.success('Vehículo actualizado', `${updated.plate} · ${updated.brand} ${updated.model}`);
      } else {
        const created = await createVehicle(customer.id!, payload);
        setVehicles((prev) => [created, ...prev]);
        toast.success('Vehículo registrado', `${created.plate} · ${created.brand} ${created.model}`);
      }
      closeModal();
    } catch (err: any) {
      toast.error(
        editing ? 'No se pudo actualizar' : 'No se pudo registrar',
        err?.response?.data?.message || 'Verifica los datos e inténtalo de nuevo.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Vehículos</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Gestión e historial clínico de los vehículos ingresados.</p>
        </div>
        {canCreate && (
          <button
            onClick={openCreate}
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500"
          >
            <Plus className="mr-2 h-4 w-4" /> Registrar Vehículo
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 dark:border-slate-700 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-slate-400 dark:text-slate-500" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full rounded-lg border border-slate-300 dark:border-slate-600 py-2 pl-10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 sm:text-sm"
              placeholder="Buscar por placa, marca o cliente..."
            />
          </div>
          <span className="text-sm text-slate-500 dark:text-slate-400">{filtered.length} vehículos</span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-48 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 bg-slate-50/50 dark:bg-slate-800/50 p-6 md:grid-cols-2 lg:grid-cols-3">
            {pag.pageItems.map((v) => (
              <div key={v.id} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 transition-shadow hover:shadow-md">
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400">
                      <Car size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">{v.plate}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {v.brand} {v.model} ({v.year})
                      </p>
                      {v.code && (
                        <span className="mt-0.5 inline-block rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-px text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                          {v.code}
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    className={cn(
                      'rounded-md border px-2.5 py-1 text-xs font-medium',
                      v.active ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' : 'border-red-200 bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-400'
                    )}
                  >
                    {v.active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                <div className="mb-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  <p>
                    <span className="mr-2 font-medium">Propietario:</span>
                    {v.customer ? `${v.customer.firstName} ${v.customer.lastName}` : 'Sin asignar'}
                  </p>
                  {v.currentMileage !== null && v.currentMileage !== undefined && (
                    <p className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                      <Gauge size={14} /> {v.currentMileage.toLocaleString('es-ES')} km
                      {v.fuelType && <span className="ml-2 flex items-center gap-1"><Fuel size={13} /> {v.fuelType}</span>}
                    </p>
                  )}
                </div>

                <div
                  className={cn(
                    'grid gap-2 border-t border-slate-100 dark:border-slate-800 pt-4',
                    hasPermission('VEHICULOS:ELIMINAR') ? 'grid-cols-3' : 'grid-cols-2'
                  )}
                >
                  <button
                    onClick={() => openHistory(v)}
                    className="flex flex-col items-center justify-center rounded-lg p-2 text-slate-500 dark:text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
                  >
                    <Wrench size={18} className="mb-1" />
                    <span className="text-[10px] font-medium uppercase tracking-wider">Historial</span>
                  </button>
                  {canEdit && (
                    <button
                      onClick={() => openEdit(v)}
                      className="flex flex-col items-center justify-center rounded-lg p-2 text-slate-500 dark:text-slate-400 transition hover:bg-slate-50 dark:hover:bg-slate-800/40 hover:text-blue-600"
                    >
                      <AlertCircle size={18} className="mb-1" />
                      <span className="text-[10px] font-medium uppercase tracking-wider">Editar</span>
                    </button>
                  )}
                  {hasPermission('VEHICULOS:ELIMINAR') && (
                    <button
                      onClick={() => setConfirmDelete(v)}
                      disabled={deletingId === v.id}
                      className="flex flex-col items-center justify-center rounded-lg p-2 text-slate-500 dark:text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                    >
                      <Trash2 size={18} className="mb-1" />
                      <span className="text-[10px] font-medium uppercase tracking-wider">Eliminar</span>
                    </button>
                  )}
                </div>
              </div>
            ))}

            {filtered.length === 0 && (
              <div className="col-span-full rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-14 text-center text-slate-400 dark:text-slate-500">
                No se encontraron vehículos.
              </div>
            )}
          </div>
        )}

        <Pagination
          page={pag.page}
          pageCount={pag.pageCount}
          onChange={pag.setPage}
          total={pag.total}
          from={pag.from}
          to={pag.to}
          itemLabel="vehículos"
        />
      </div>

      {/* Historial */}
      {historyVehicle && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 sm:items-center" onClick={() => setHistoryVehicle(null)}>
          <div
            className="max-h-[85vh] w-full max-w-2xl animate-slide-up overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Historial del vehículo</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {historyVehicle.plate} · {historyVehicle.brand} {historyVehicle.model}
                </p>
              </div>
              <button
                onClick={() => setHistoryVehicle(null)}
                className="rounded-lg p-1.5 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            {!history ? (
              <div className="flex items-center justify-center py-12 text-slate-400 dark:text-slate-500">
                <svg className="h-6 w-6 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="ml-2 text-sm">Cargando historial...</span>
              </div>
            ) : history.visits.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 py-14 text-center text-sm text-slate-400 dark:text-slate-500">
                Aún no hay visitas registradas.
                <br />
                Cada recepción u orden de trabajo aparecerá aquí automáticamente.
              </div>
            ) : (
              <div className="relative ml-3 border-l-2 border-indigo-200 pl-6" data-testid="vehicle-timeline">
                {history.visits.map((visit) => (
                  <div key={`${visit.type}-${visit.id}`} className="relative pb-8 last:pb-0">
                    <span
                      className={cn(
                        'absolute -left-[31px] top-1 flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-white dark:ring-slate-900',
                        visit.type === 'RECEPCION' ? 'bg-blue-500' : 'bg-violet-500'
                      )}
                    />
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/50 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{formatHistoryDate(visit.date)}</span>
                        <span
                          className={cn(
                            'rounded-md px-2.5 py-0.5 text-[11px] font-semibold',
                            visit.type === 'RECEPCION' ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400' : 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400'
                          )}
                        >
                          {visit.type === 'RECEPCION' ? 'Recepción' : 'Orden de trabajo'}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-medium">{visit.code}</span>
                        {visit.date ? ` · ${formatHistoryTime(visit.date)}` : ''}
                        {visit.status ? ` · ${STATUS_LABELS[visit.status] || visit.status}` : ''}
                      </p>

                      {(visit.mileage != null || visit.fuelLevel || visit.receivedByName) && (
                        <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600 dark:text-slate-300">
                          {visit.mileage != null && (
                            <span className="flex items-center gap-1">
                              <Gauge size={14} className="text-slate-400 dark:text-slate-500" />
                              {visit.mileage.toLocaleString('es-ES')} km
                            </span>
                          )}
                          {visit.fuelLevel && (
                            <span className="flex items-center gap-1">
                              <Fuel size={14} className="text-slate-400 dark:text-slate-500" /> Combustible: {visit.fuelLevel}
                            </span>
                          )}
                          {visit.receivedByName && (
                            <span className="flex items-center gap-1">
                              <UserRound size={14} className="text-slate-400 dark:text-slate-500" /> Recibió: {visit.receivedByName}
                            </span>
                          )}
                        </p>
                      )}

                      {visit.symptoms && <p className="mt-2 text-sm italic text-slate-500 dark:text-slate-400">“{visit.symptoms}”</p>}

                      {visit.diagnosis && (
                        <div className="mt-2">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Diagnóstico</p>
                          <p className="text-sm text-slate-600 dark:text-slate-300">{visit.diagnosis}</p>
                        </div>
                      )}

                      {visit.observations && (
                        <div className="mt-2">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Observaciones</p>
                          <p className="text-sm text-slate-600 dark:text-slate-300">{visit.observations}</p>
                        </div>
                      )}

                      {visit.services.length > 0 && (
                        <div className="mt-3">
                          <p className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                            <Wrench size={12} /> Servicios realizados
                          </p>
                          <ul className="space-y-1">
                            {visit.services.map((s) => (
                              <HistoryItemRow key={s.id} item={s} />
                            ))}
                          </ul>
                        </div>
                      )}

                      {visit.parts.length > 0 && (
                        <div className="mt-3">
                          <p className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                            <Boxes size={12} /> Repuestos utilizados
                          </p>
                          <ul className="space-y-1">
                            {visit.parts.map((p) => (
                              <HistoryItemRow key={p.id} item={p} />
                            ))}
                          </ul>
                        </div>
                      )}

                      {visit.mechanics.length > 0 && (
                        <p className="mt-3 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                          <UserRound size={13} className="text-slate-400 dark:text-slate-500" />
                          {visit.mechanics.length === 1 ? 'Mecánico' : 'Mecánicos'}: {visit.mechanics.join(', ')}
                        </p>
                      )}

                      {visit.total > 0 && (
                        <div className="mt-3 flex items-center justify-between rounded-lg bg-blue-50 px-3 py-2 dark:bg-blue-500/15 text-sm">
                          <span className="flex items-center gap-1 font-medium text-blue-700 dark:text-blue-400">
                            <Wallet size={14} /> Costo total
                          </span>
                          <span className="font-bold text-blue-800 dark:text-blue-300">{formatCurrency(visit.total)}</span>
                        </div>
                      )}

                      {visit.photos.length > 0 && (
                        <div className="mt-3">
                          <p className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                            <Camera size={12} /> Fotografías de la inspección ({visit.photos.length})
                          </p>
                          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                            {visit.photos.map((p) => (
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
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Registro / Edición */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-lg animate-slide-up overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {editing ? 'Editar vehículo' : 'Registrar vehículo'}
              </h2>
              <button
                onClick={closeModal}
                className="rounded-lg p-1.5 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Propietario <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Car size={17} className="pointer-events-none absolute inset-y-0 left-3 my-auto text-slate-400 dark:text-slate-500" />
                  <input
                    value={customer ? `${customer.firstName} ${customer.lastName}` : custSearch}
                    onChange={(e) => {
                      setCustomer(null);
                      setCustSearch(e.target.value);
                      setCustOpen(true);
                    }}
                    onFocus={() => setCustOpen(true)}
                    onBlur={() => setTimeout(() => setCustOpen(false), 150)}
                    placeholder="Buscar y seleccionar cliente..."
                    className="block w-full rounded-xl border border-slate-300 dark:border-slate-600 py-2.5 pl-10 pr-9 text-slate-900 dark:text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                  />
                  {customer && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomer(null);
                        setCustSearch('');
                      }}
                      className="absolute inset-y-0 right-2 my-auto flex h-6 w-6 items-center justify-center rounded-full text-slate-400 dark:text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300"
                      aria-label="Quitar propietario"
                      title="Quitar propietario"
                    >
                      <X size={14} />
                    </button>
                  )}
                  {custOpen && (
                    <div className="absolute z-20 mt-2 max-h-52 w-full overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl">
                      {filteredCustomers.length === 0 && (
                        <p className="px-4 py-3 text-sm text-slate-400 dark:text-slate-500">Sin clientes que coincidan.</p>
                      )}
                      {filteredCustomers.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setCustomer(c);
                            setCustSearch('');
                            setCustOpen(false);
                          }}
                          className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition hover:bg-blue-50"
                        >
                          <span className="font-medium text-slate-800 dark:text-slate-100">
                            {c.firstName} {c.lastName}
                          </span>
                          <span className="text-xs text-slate-400 dark:text-slate-500"> · {c.documentNumber}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {customer ? (
                  <p className="mt-2 text-sm font-medium text-blue-700 dark:text-blue-400">
                    ✓ {customer.firstName} {customer.lastName} · {customer.documentNumber}
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-red-500">Selecciona el propietario para poder guardar.</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                    Placa <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.plate}
                    onChange={(e) => setForm((f) => ({ ...f, plate: e.target.value.toUpperCase() }))}
                    placeholder="ABC-123"
                    className="block w-full rounded-xl border border-slate-300 dark:border-slate-600 px-3 py-2.5 font-mono uppercase text-slate-900 dark:text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">VIN</label>
                  <input
                    type="text"
                    value={form.vin}
                    onChange={(e) => setForm((f) => ({ ...f, vin: e.target.value.toUpperCase() }))}
                    className="block w-full rounded-xl border border-slate-300 dark:border-slate-600 px-3 py-2.5 font-mono text-slate-900 dark:text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                    Marca <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.brand}
                    onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
                    className="block w-full rounded-xl border border-slate-300 dark:border-slate-600 px-3 py-2.5 text-slate-900 dark:text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                    Modelo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.model}
                    onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
                    className="block w-full rounded-xl border border-slate-300 dark:border-slate-600 px-3 py-2.5 text-slate-900 dark:text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                    Año <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={1980}
                    max={2100}
                    value={form.year}
                    onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))}
                    className="block w-full rounded-xl border border-slate-300 dark:border-slate-600 px-3 py-2.5 text-slate-900 dark:text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Color</label>
                  <input
                    type="text"
                    value={form.color}
                    onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                    placeholder="Plateado"
                    className="block w-full rounded-xl border border-slate-300 dark:border-slate-600 px-3 py-2.5 text-slate-900 dark:text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Tipo de vehículo</label>
                  <select
                    value={form.vehicleType}
                    onChange={(e) => setForm((f) => ({ ...f, vehicleType: e.target.value }))}
                    className="block w-full rounded-xl border border-slate-300 dark:border-slate-600 px-3 py-2.5 text-slate-900 dark:text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                  >
                    {VEHICLE_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Combustible</label>
                  <select
                    value={form.fuelType}
                    onChange={(e) => setForm((f) => ({ ...f, fuelType: e.target.value }))}
                    className="block w-full rounded-xl border border-slate-300 dark:border-slate-600 px-3 py-2.5 text-slate-900 dark:text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                  >
                    {FUEL_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Transmisión</label>
                  <select
                    value={form.transmission}
                    onChange={(e) => setForm((f) => ({ ...f, transmission: e.target.value }))}
                    className="block w-full rounded-xl border border-slate-300 dark:border-slate-600 px-3 py-2.5 text-slate-900 dark:text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                  >
                    {TRANSMISSIONS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Kilometraje actual (km)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.currentMileage}
                    onChange={(e) => setForm((f) => ({ ...f, currentMileage: e.target.value }))}
                    placeholder="0"
                    className="block w-full rounded-xl border border-slate-300 dark:border-slate-600 px-3 py-2.5 text-slate-900 dark:text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Observaciones</label>
                <textarea
                  rows={2}
                  value={form.observations}
                  onChange={(e) => setForm((f) => ({ ...f, observations: e.target.value }))}
                  className="block w-full resize-none rounded-xl border border-slate-300 dark:border-slate-600 px-3 py-2.5 text-slate-900 dark:text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                  placeholder="Notas voluntarias sobre el vehículo..."
                />
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || !customer}
                  className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-500 disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title="Eliminar vehículo"
        message={
          confirmDelete && (
            <>
              ¿Desactivar el vehículo{' '}
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {confirmDelete.plate} · {confirmDelete.brand} {confirmDelete.model}
              </span>
              ? El registro se conserva en el sistema como inactivo y podrás reactivarlo editándolo.
            </>
          )
        }
        confirmLabel="Eliminar"
        busy={deletingId !== null}
        onConfirm={removeVehicle}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}