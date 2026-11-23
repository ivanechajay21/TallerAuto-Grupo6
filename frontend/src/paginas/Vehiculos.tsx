import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  Plus,
  Car,
  Wrench,
  X,
  Gauge,
  Fuel,
  Camera,
  Wallet,
  UserRound,
  Boxes,
  Trash2,
  Pencil,
  Users,
  CircleCheck,
  CircleOff,
  SlidersHorizontal,
  History,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  CircleDollarSign,
  UserCheck,
  Save,
  IdCard,
  Settings2,
} from 'lucide-react';
import { getPaginatedVehicles, createVehicle, updateVehicle, getVehicleHistory, deleteVehicle } from '../servicios/vehiculosServicio';
import type { Vehicle, VehicleHistory, VehicleHistoryItem, VehicleStatusFilter, VehicleSummary } from '../servicios/vehiculosServicio';
import { getAllCustomers } from '../servicios/clientesServicio';
import type { Customer } from '../servicios/clientesServicio';
import { cn } from '../lib/utilidades';
import { useToast } from '../componentes/interfaz/Avisos';
import { usePermissions } from '../contexto/ContextoPermisos';
import ConfirmDialog from '../componentes/interfaz/DialogoConfirmacion';
import EncabezadoModulo from '../componentes/interfaz/EncabezadoModulo';
import { CampoFormulario, SeccionFormulario, estiloCampo } from '../componentes/interfaz/Formulario';
import Modal from '../componentes/interfaz/Modal';
import Pagination from '../componentes/interfaz/Paginacion';
import TarjetaMetrica from '../componentes/interfaz/TarjetaMetrica';

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

const VEHICLE_TYPES = [
  { value: 'Sedán', label: 'Sedán' },
  { value: 'SUV / 4x4', label: 'SUV / 4x4' },
  { value: 'Camioneta', label: 'Camioneta' },
  { value: 'Pickup', label: 'Camioneta pickup' },
  { value: 'Hatchback', label: 'Compacto (hatchback)' },
  { value: 'Coupé', label: 'Coupé' },
  { value: 'Motocicleta', label: 'Motocicleta' },
  { value: 'Otro', label: 'Otro' },
];
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
  active: boolean;
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
  active: true,
};

const EMPTY_SUMMARY: VehicleSummary = {
  total: 0,
  active: 0,
  inactive: 0,
  withMileage: 0,
};

export default function Vehicles() {
  const toast = useToast();
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission('VEHICULOS:CREAR');
  const canEdit = hasPermission('VEHICULOS:EDITAR');
  const [params] = useSearchParams();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [search, setSearch] = useState(params.get('q') || '');
  const [statusFilter, setStatusFilter] = useState<VehicleStatusFilter>('TODOS');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [summary, setSummary] = useState<VehicleSummary>(EMPTY_SUMMARY);
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);

  // El buscador global puede navegar a /vehiculos?q=... desde la misma página.
  useEffect(() => {
    setSearch(params.get('q') || '');
    setPage(1);
  }, [params]);

  const [history, setHistory] = useState<VehicleHistory | null>(null);
  const [historyVehicle, setHistoryVehicle] = useState<Vehicle | null>(null);
  const [historyFilter, setHistoryFilter] = useState<'TODAS' | 'RECEPCION' | 'ORDEN_TRABAJO'>('TODAS');
  const [expandedVisits, setExpandedVisits] = useState<Record<string, boolean>>({});

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersError, setCustomersError] = useState<string | null>(null);
  const [customersReloadKey, setCustomersReloadKey] = useState(0);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [custSearch, setCustSearch] = useState('');
  const [custOpen, setCustOpen] = useState(false);
  const [form, setForm] = useState<VehicleForm>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Vehicle | null>(null);

  useEffect(() => {
    setCustomersError(null);
    getAllCustomers()
      .then((data) => setCustomers(data))
      .catch(() => {
        setCustomersError('No se pudieron cargar los clientes. Revisa la conexión e inténtalo de nuevo.');
      });
  }, [customersReloadKey]);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await getPaginatedVehicles({
          page: page - 1,
          size: 10,
          search,
          status: statusFilter,
          sort: 'reciente',
        });
        if (response.totalPages > 0 && page > response.totalPages) {
          setPage(response.totalPages);
          return;
        }
        setVehicles(response.content);
        setTotalPages(response.totalPages);
        setTotalElements(response.totalElements);
        setSummary(response.summary ?? EMPTY_SUMMARY);
      } catch {
        toast.error('Error', 'No se pudieron cargar los vehículos.');
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => window.clearTimeout(timer);
    // El error se notifica con el toast; no se incluye para evitar recargas por identidad.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, statusFilter, reloadKey]);

  const refresh = () => setReloadKey((value) => value + 1);
  const stats = summary;

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
    setHistoryFilter('TODAS');
    setExpandedVisits({});
    try {
      const data = await getVehicleHistory(v.id!);
      setHistory(data);
      const first = data.visits[0];
      if (first) {
        setExpandedVisits({ [`${first.type}-${first.id}`]: true });
      }
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
      active: v.active ?? true,
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
      refresh();
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
      active: form.active,
    };
    try {
      if (editing?.id) {
        const updated = await updateVehicle(editing.id, payload);
        toast.success('Vehículo actualizado', `${updated.plate} · ${updated.brand} ${updated.model}`);
        refresh();
      } else {
        const created = await createVehicle(customer.id!, payload);
        toast.success('Vehículo registrado', `${created.plate} · ${created.brand} ${created.model}`);
        setPage(1);
        refresh();
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

  const statCards = [
    {
      label: 'Total de vehículos',
      value: stats.total,
      icon: Car,
      tone: 'blue',
      filter: 'TODOS' as VehicleStatusFilter,
    },
    {
      label: 'Vehículos activos',
      value: stats.active,
      icon: CircleCheck,
      tone: 'emerald',
      filter: 'ACTIVOS' as VehicleStatusFilter,
    },
    {
      label: 'Vehículos inactivos',
      value: stats.inactive,
      icon: CircleOff,
      tone: 'red',
      filter: 'INACTIVOS' as VehicleStatusFilter,
    },
    {
      label: 'Con kilometraje',
      value: stats.withMileage,
      icon: Gauge,
      tone: 'violet',
      filter: null,
    },
  ] as const;

  const historyStats = useMemo(() => {
    const visits = history?.visits ?? [];
    return {
      visits: visits.length,
      services: visits.reduce((total, visit) => total + visit.services.length, 0),
      parts: visits.reduce((total, visit) => total + visit.parts.length, 0),
      total: visits.reduce((total, visit) => total + (visit.total || 0), 0),
    };
  }, [history]);

  const visibleHistory = useMemo(() => {
    const visits = history?.visits ?? [];
    return historyFilter === 'TODAS' ? visits : visits.filter((visit) => visit.type === historyFilter);
  }, [history, historyFilter]);

  const pasosFormulario = [
    { id: 'vehicle-step-propietario', label: 'Propietario', complete: Boolean(customer) },
    { id: 'vehicle-step-identificacion', label: 'Identificación', complete: Boolean(form.plate.trim()) },
    {
      id: 'vehicle-step-marca',
      label: 'Vehículo',
      complete: Boolean(form.brand.trim() && form.model.trim() && form.year.trim()),
    },
    { id: 'vehicle-step-caracteristicas', label: 'Características', complete: Boolean(form.currentMileage.trim()) },
    { id: 'vehicle-step-observaciones', label: 'Notas', complete: Boolean(form.observations.trim()) },
  ];
  const camposObligatorios = [customer, form.plate.trim(), form.brand.trim(), form.model.trim(), form.year.trim()];
  const progreso = Math.round((camposObligatorios.filter(Boolean).length / camposObligatorios.length) * 100);
  const irAPaso = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="space-y-6">
      <EncabezadoModulo
        eyebrow="Operación del taller"
        title="Vehículos"
        description="Ficha, propietario e historial de servicios de cada unidad."
        icon={Car}
        actions={canCreate ? (
          <button
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500"
          >
            <Plus className="h-4 w-4" /> Registrar vehículo
          </button>
        ) : undefined}
        meta={(
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
            {stats.total} vehículo(s)
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
            tone={card.tone}
            active={card.filter ? card.filter === statusFilter : false}
            onClick={card.filter ? () => {
              setStatusFilter(card.filter);
              setPage(1);
            } : undefined}
          />
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
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="block w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
                placeholder="Buscar por placa, marca o cliente..."
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
              {(['TODOS', 'ACTIVOS', 'INACTIVOS'] as VehicleStatusFilter[]).map((status) => (
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
              <span className="ml-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                {totalElements} vehículos
              </span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-56 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 bg-slate-50/60 p-4 dark:bg-slate-800/30 md:grid-cols-2 lg:grid-cols-3 sm:p-5">
            {vehicles.map((v) => {
              const ownerName = v.customer
                ? `${v.customer.firstName} ${v.customer.lastName}`
                : 'Sin propietario asignado';
              const ownerInitials = v.customer
                ? `${v.customer.firstName.charAt(0)}${v.customer.lastName.charAt(0)}`.toUpperCase()
                : '—';
              return (
                <article
                  key={v.id}
                  className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-indigo-500/40"
                >
                  <div className={cn('h-1.5', v.active ? 'bg-gradient-to-r from-indigo-500 to-blue-500' : 'bg-slate-300 dark:bg-slate-700')} />
                  <div className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className={cn(
                          'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
                          v.active
                            ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300'
                            : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                        )}>
                          <Car size={22} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-mono text-base font-bold tracking-wide text-slate-900 dark:text-white">
                              {v.plate}
                            </h3>
                            {v.code && (
                              <span className="rounded bg-slate-100 px-1.5 py-px font-mono text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                {v.code}
                              </span>
                            )}
                          </div>
                          <p className="truncate text-sm font-medium text-slate-500 dark:text-slate-400">
                            {v.brand} {v.model} · {v.year}
                          </p>
                          {v.color && (
                            <p className="truncate text-[11px] text-slate-400 dark:text-slate-500">{v.color} · {v.vehicleType || 'Vehículo'}</p>
                          )}
                        </div>
                      </div>
                      <span className={cn(
                        'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset',
                        v.active
                          ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/15 dark:text-emerald-300'
                          : 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/15 dark:text-red-300'
                      )}>
                        <span className={cn('h-1.5 w-1.5 rounded-full', v.active ? 'bg-emerald-500' : 'bg-red-500')} />
                        {v.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/60">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[10px] font-bold text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
                        {ownerInitials}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Propietario</p>
                        <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{ownerName}</p>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-3 divide-x divide-slate-100 rounded-xl border border-slate-100 text-center dark:divide-slate-800 dark:border-slate-800">
                      <div className="px-1 py-2">
                        <Gauge size={14} className="mx-auto mb-1 text-slate-400" />
                        <p className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200">
                          {v.currentMileage != null ? `${v.currentMileage.toLocaleString('es-ES')} km` : 'Sin dato'}
                        </p>
                        <p className="text-[11px] uppercase tracking-wide text-slate-400">Kilometraje</p>
                      </div>
                      <div className="px-1 py-2">
                        <Fuel size={14} className="mx-auto mb-1 text-slate-400" />
                        <p className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200">{v.fuelType || 'No indica'}</p>
                        <p className="text-[11px] uppercase tracking-wide text-slate-400">Combustible</p>
                      </div>
                      <div className="px-1 py-2">
                        <Wrench size={14} className="mx-auto mb-1 text-slate-400" />
                        <p className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200">{v.transmission || 'No indica'}</p>
                        <p className="text-[11px] uppercase tracking-wide text-slate-400">Transmisión</p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      <button
                        onClick={() => openHistory(v)}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 dark:bg-blue-500/15 dark:text-blue-300 dark:hover:bg-blue-500/25"
                      >
                        <Wrench size={14} /> Ver historial
                      </button>
                      {canEdit && (
                        <button
                          onClick={() => openEdit(v)}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 dark:border-slate-700 dark:hover:bg-blue-500/10 dark:hover:text-blue-400"
                          title="Editar vehículo"
                          aria-label={`Editar ${v.plate}`}
                        >
                          <Pencil size={15} />
                        </button>
                      )}
                      {hasPermission('VEHICULOS:ELIMINAR') && (
                        <button
                          onClick={() => setConfirmDelete(v)}
                          disabled={deletingId === v.id}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                          title="Desactivar vehículo"
                          aria-label={`Desactivar ${v.plate}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}

            {totalElements === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center dark:border-slate-700 dark:bg-slate-900">
                <Users size={30} className="mb-2 text-slate-300 dark:text-slate-600" />
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  No se encontraron vehículos con los filtros seleccionados.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setStatusFilter('TODOS');
                    setPage(1);
                  }}
                  className="mt-3 text-sm font-semibold text-blue-600 hover:text-blue-700"
                >
                  Limpiar filtros
                </button>
              </div>
            )}
          </div>
        )}

        <Pagination
          page={page}
          pageCount={totalPages}
          onChange={setPage}
          total={totalElements}
          from={totalElements === 0 ? 0 : (page - 1) * 10 + 1}
          to={Math.min(totalElements, (page - 1) * 10 + vehicles.length)}
          itemLabel="vehículos"
        />
      </div>

      {/* Historial */}
      {historyVehicle && (
        <Modal
          title="Historial del vehículo"
          description={`${historyVehicle.plate} · ${historyVehicle.brand} ${historyVehicle.model}${historyVehicle.year ? ` (${historyVehicle.year})` : ''}`}
          icon={History}
          size="lg"
          onClose={() => setHistoryVehicle(null)}
          footer={
            <button
              type="button"
              onClick={() => setHistoryVehicle(null)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Cerrar historial
            </button>
          }
        >
          {!history ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500">
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600 dark:border-slate-700" />
              <span className="mt-3 text-sm">Cargando historial del vehículo...</span>
            </div>
          ) : history.visits.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 py-16 text-center dark:border-slate-700">
              <ClipboardList size={30} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              <p className="font-medium text-slate-600 dark:text-slate-300">Aún no hay visitas registradas</p>
              <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
                Cada recepción u orden de trabajo aparecerá aquí automáticamente.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {[
                  { label: 'Visitas', value: historyStats.visits, icon: ClipboardList },
                  { label: 'Servicios', value: historyStats.services, icon: Wrench },
                  { label: 'Repuestos', value: historyStats.parts, icon: Boxes },
                  { label: 'Inversión', value: formatCurrency(historyStats.total), icon: CircleDollarSign },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-800/40">
                    <item.icon size={15} className="text-blue-500" />
                    <p className="mt-2 truncate text-sm font-bold text-slate-900 dark:text-white">{item.value}</p>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">{item.label}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {(
                  [
                    ['TODAS', 'Todas'],
                    ['RECEPCION', 'Recepciones'],
                    ['ORDEN_TRABAJO', 'Órdenes de trabajo'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setHistoryFilter(key)}
                    className={cn(
                      'rounded-full px-3 py-1.5 text-xs font-semibold transition',
                      historyFilter === key
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20 dark:bg-blue-500 dark:text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                    )}
                  >
                    {label}
                  </button>
                ))}
                <span className="ml-auto text-xs font-medium text-slate-400 dark:text-slate-500">
                  {visibleHistory.length} {visibleHistory.length === 1 ? 'visita' : 'visitas'}
                </span>
              </div>

              {visibleHistory.length === 0 ? (
                <p className="mt-5 rounded-xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400 dark:border-slate-700 dark:text-slate-500">
                  No hay visitas de este tipo.
                </p>
              ) : (
                <div className="relative ml-2 mt-4 border-l-2 border-indigo-200 pl-5 dark:border-indigo-500/30" data-testid="vehicle-timeline">
                  {visibleHistory.map((visit) => {
                    const key = `${visit.type}-${visit.id}`;
                    const open = expandedVisits[key] ?? false;
                    const isReception = visit.type === 'RECEPCION';
                    return (
                      <div key={key} className="relative pb-5 last:pb-0">
                        <span
                          className={cn(
                            'absolute -left-[27px] top-4 flex h-3.5 w-3.5 items-center justify-center rounded-full ring-4 ring-white dark:ring-slate-900',
                            isReception ? 'bg-blue-500' : 'bg-violet-500'
                          )}
                        />
                        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                          <button
                            type="button"
                            onClick={() => setExpandedVisits((prev) => ({ ...prev, [key]: !open }))}
                            aria-expanded={open}
                            className="flex w-full items-start justify-between gap-3 p-4 text-left transition hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                          >
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-bold text-slate-900 dark:text-white">{formatHistoryDate(visit.date)}</span>
                                <span className={cn(
                                  'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                                  isReception
                                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300'
                                    : 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300'
                                )}>
                                  {isReception ? 'Recepción' : 'Orden de trabajo'}
                                </span>
                                {visit.priority && (
                                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                                    {visit.priority}
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                <span className="font-mono font-semibold">{visit.code}</span>
                                {visit.date ? ` · ${formatHistoryTime(visit.date)}` : ''}
                                {visit.status ? ` · ${STATUS_LABELS[visit.status] || visit.status}` : ''}
                              </p>
                              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                                {visit.mileage != null && <span className="flex items-center gap-1"><Gauge size={11} /> {visit.mileage.toLocaleString('es-ES')} km</span>}
                                {visit.fuelLevel && <span className="flex items-center gap-1"><Fuel size={11} /> {visit.fuelLevel}</span>}
                                {visit.services.length > 0 && <span className="flex items-center gap-1"><Wrench size={11} /> {visit.services.length} servicios</span>}
                                {visit.total > 0 && <span className="font-semibold text-slate-700 dark:text-slate-200">{formatCurrency(visit.total)}</span>}
                              </div>
                            </div>
                            <span className="mt-1 shrink-0 rounded-lg bg-slate-100 p-1.5 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                              {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </span>
                          </button>

                          {open && (
                            <div className="border-t border-slate-100 px-4 pb-4 pt-3 dark:border-slate-800">
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                                {visit.receivedByName && <span className="flex items-center gap-1"><UserRound size={12} /> Recibió: {visit.receivedByName}</span>}
                                {visit.mechanics.length > 0 && <span className="flex items-center gap-1"><Wrench size={12} /> {visit.mechanics.join(', ')}</span>}
                                {visit.orderNumber && <span className="font-mono">{visit.orderNumber}</span>}
                              </div>

                              {visit.symptoms && (
                                <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm italic text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                                  “{visit.symptoms}â€
                                </p>
                              )}

                              {visit.diagnosis && (
                                <div className="mt-3">
                                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Diagnóstico</p>
                                  <p className="text-sm text-slate-600 dark:text-slate-300">{visit.diagnosis}</p>
                                </div>
                              )}

                              {visit.observations && (
                                <div className="mt-3">
                                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Observaciones</p>
                                  <p className="text-sm text-slate-600 dark:text-slate-300">{visit.observations}</p>
                                </div>
                              )}

                              {visit.services.length > 0 && (
                                <div className="mt-3">
                                  <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                                    <Wrench size={11} /> Servicios realizados
                                  </p>
                                  <ul className="space-y-1">
                                    {visit.services.map((s) => <HistoryItemRow key={s.id} item={s} />)}
                                  </ul>
                                </div>
                              )}

                              {visit.parts.length > 0 && (
                                <div className="mt-3">
                                  <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                                    <Boxes size={11} /> Repuestos utilizados
                                  </p>
                                  <ul className="space-y-1">
                                    {visit.parts.map((p) => <HistoryItemRow key={p.id} item={p} />)}
                                  </ul>
                                </div>
                              )}

                              {visit.total > 0 && (
                                <div className="mt-3 flex items-center justify-between rounded-xl bg-blue-50 px-3 py-2.5 text-sm dark:bg-blue-500/15">
                                  <span className="flex items-center gap-1.5 font-semibold text-blue-700 dark:text-blue-300">
                                    <Wallet size={14} /> Costo total
                                  </span>
                                  <span className="font-bold text-blue-800 dark:text-blue-200">{formatCurrency(visit.total)}</span>
                                </div>
                              )}

                              {visit.photos.length > 0 && (
                                <div className="mt-3">
                                  <p className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                                    <Camera size={11} /> Fotografías ({visit.photos.length})
                                  </p>
                                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                                    {visit.photos.map((p) => (
                                      <a
                                        key={p.id}
                                        href={p.photoUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        title={PHOTO_LABELS[p.category] || p.category}
                                        className="group relative block aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
                                      >
                                        <img
                                          src={p.photoUrl}
                                          alt={PHOTO_LABELS[p.category] || p.category}
                                          loading="lazy"
                                          className="h-full w-full object-cover transition group-hover:scale-105"
                                        />
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </Modal>
      )}

      {/* Registro / Edición */}
      {modalOpen && (
        <Modal
          title={editing ? 'Editar vehículo' : 'Registrar vehículo'}
          description={editing ? 'Actualiza la ficha y los datos del propietario.' : 'Completa la ficha del vehículo y su propietario.'}
          icon={Car}
          size="lg"
          onClose={closeModal}
          footer={
            <>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="vehicle-form"
                disabled={saving || !customer}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save size={16} />
                {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Registrar vehículo'}
              </button>
            </>
          }
        >
          <form id="vehicle-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                    Progreso del registro
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-slate-800 dark:text-slate-100">{progreso}% completado</p>
                </div>
                <span
                  className={cn(
                    'rounded-full px-2.5 py-1 text-[10px] font-bold',
                    progreso === 100
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                      : 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300'
                  )}
                >
                  {progreso === 100
                    ? 'Listo para registrar'
                    : `Faltan ${camposObligatorios.filter((valor) => !valor).length} campos`}
                </span>
              </div>
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 transition-all duration-500"
                  style={{ width: `${progreso}%` }}
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {pasosFormulario.map((paso, index) => (
                  <button
                    key={paso.id}
                    type="button"
                    onClick={() => irAPaso(paso.id)}
                    className={cn(
                      'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition',
                      paso.complete
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300'
                        : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400 dark:hover:border-blue-500/30 dark:hover:bg-blue-500/10 dark:hover:text-blue-300'
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-4 w-4 items-center justify-center rounded-full text-[11px] font-bold',
                        paso.complete
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                      )}
                    >
                      {paso.complete ? <CircleCheck size={10} /> : index + 1}
                    </span>
                    {paso.label}
                  </button>
                ))}
              </div>
            </div>

            <section
              id="vehicle-step-propietario"
              className="scroll-mt-4 rounded-2xl border border-blue-100 bg-blue-50/40 p-4 dark:border-blue-500/20 dark:bg-blue-500/5"
            >
              <div className="mb-3 flex items-start gap-2.5">
                <span
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white',
                    customer ? 'bg-emerald-500' : 'bg-blue-600'
                  )}
                >
                  {customer ? <CircleCheck size={14} /> : '1'}
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Propietario</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Cliente responsable del vehículo
                  </p>
                </div>
                <span className="ml-auto shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-blue-600 ring-1 ring-blue-100 dark:bg-slate-900 dark:text-blue-300 dark:ring-blue-500/20">
                  Obligatorio
                </span>
              </div>

              {customer ? (
                <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-white/90 p-3.5 shadow-sm dark:border-emerald-500/30 dark:bg-slate-900/80">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-sm font-bold text-white ring-2 ring-emerald-100 dark:ring-emerald-500/20">
                    {customer.firstName.charAt(0)}{customer.lastName.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                      {customer.firstName} {customer.lastName}
                    </p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {customer.documentNumber}
                      {customer.phone ? ` · ${customer.phone}` : ''}
                      {customer.email ? ` · ${customer.email}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomer(null);
                      setCustSearch('');
                      setCustOpen(true);
                    }}
                    className="shrink-0 rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 dark:border-emerald-500/30 dark:bg-slate-900 dark:text-emerald-300"
                  >
                    Cambiar
                  </button>
                </div>
              ) : (
                <div>
                  <div className="relative">
                    <UserRound size={17} className="pointer-events-none absolute inset-y-0 left-3 my-auto text-slate-400 dark:text-slate-500" />
                    <input
                      value={custSearch}
                      onChange={(e) => {
                        setCustSearch(e.target.value);
                        setCustOpen(true);
                      }}
                      onFocus={() => setCustOpen(true)}
                      placeholder="Busca por nombre, DNI o teléfono..."
                      className="block w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
                    />
                    {custSearch && (
                      <button
                        type="button"
                        onClick={() => {
                          setCustSearch('');
                          setCustOpen(true);
                        }}
                        className="absolute inset-y-0 right-2 my-auto flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                        aria-label="Limpiar búsqueda de propietario"
                      >
                        <X size={15} />
                      </button>
                    )}
                  </div>

                  {(custOpen || custSearch.trim().length > 0) && (
                    <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-3.5 py-2 dark:border-slate-700/60 dark:bg-slate-800/40">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                          Resultados
                        </span>
                        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:ring-slate-700">
                          {filteredCustomers.length}
                        </span>
                      </div>
                      <div className="max-h-52 overflow-y-auto">
                        {customersError ? (
                          <div className="flex flex-col items-center justify-center px-4 py-6 text-center">
                            <p className="text-xs font-medium text-red-700 dark:text-red-300">{customersError}</p>
                            <button
                              type="button"
                              onClick={() => setCustomersReloadKey((value) => value + 1)}
                              className="mt-2 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 dark:border-red-500/30 dark:bg-slate-900 dark:text-red-300"
                            >
                              Reintentar
                            </button>
                          </div>
                        ) : filteredCustomers.length === 0 ? (
                          <div className="flex flex-col items-center justify-center px-4 py-6 text-center">
                            <Users size={20} className="text-slate-300 dark:text-slate-600" />
                            <p className="mt-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                              Sin clientes que coincidan
                            </p>
                            <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                              Prueba con otro nombre o documento.
                            </p>
                          </div>
                        ) : (
                          filteredCustomers.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => {
                                setCustomer(c);
                                setCustSearch('');
                                setCustOpen(false);
                              }}
                              className="group flex w-full items-center gap-3 border-b border-slate-100 px-4 py-2.5 text-left last:border-b-0 transition hover:bg-blue-50 dark:border-slate-700/60 dark:hover:bg-blue-500/10"
                            >
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-700 ring-2 ring-white dark:bg-blue-500/15 dark:text-blue-300 dark:ring-slate-900">
                                {c.firstName.charAt(0)}{c.lastName.charAt(0)}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                                  {c.firstName} {c.lastName}
                                </span>
                                <span className="block truncate text-[11px] text-slate-400 dark:text-slate-500">
                                  {c.documentNumber}{c.phone ? ` · ${c.phone}` : ''}
                                  {c.email ? ` · ${c.email}` : ''}
                                </span>
                              </span>
                              <UserCheck size={15} className="shrink-0 text-slate-300 transition group-hover:text-blue-500 dark:text-slate-600" />
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300">
                    <UserCheck size={14} />
                    Selecciona el propietario para habilitar el registro.
                  </p>
                </div>
              )}
            </section>

            <div id="vehicle-step-identificacion" className="scroll-mt-4">
              <SeccionFormulario
                title="Identificación"
                description="Placa y número de chasis del vehículo."
                icon={IdCard}
              >
                <CampoFormulario label="Placa" required>
                  <input
                    type="text"
                    required
                    maxLength={12}
                    value={form.plate}
                    onChange={(e) => setForm((f) => ({ ...f, plate: e.target.value.toUpperCase() }))}
                    placeholder="ABC-123"
                    className={cn(estiloCampo, 'font-mono uppercase tracking-wide')}
                  />
                </CampoFormulario>
                <CampoFormulario label="VIN" hint="Número de chasis (opcional).">
                  <input
                    type="text"
                    maxLength={17}
                    value={form.vin}
                    onChange={(e) => setForm((f) => ({ ...f, vin: e.target.value.toUpperCase() }))}
                    placeholder="Número de chasis"
                    className={cn(estiloCampo, 'font-mono uppercase')}
                  />
                </CampoFormulario>
              </SeccionFormulario>
            </div>

            <div id="vehicle-step-marca" className="scroll-mt-4">
              <SeccionFormulario
                title="Marca y modelo"
                description="Identifica la unidad y su año de fabricación."
                icon={Car}
              >
                <CampoFormulario label="Marca" required>
                  <input
                    type="text"
                    required
                    value={form.brand}
                    onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
                    placeholder="Ej. Toyota"
                    className={estiloCampo}
                  />
                </CampoFormulario>
                <CampoFormulario label="Modelo" required>
                  <input
                    type="text"
                    required
                    value={form.model}
                    onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
                    placeholder="Ej. Corolla"
                    className={estiloCampo}
                  />
                </CampoFormulario>
                <CampoFormulario label="Año" required>
                  <input
                    type="number"
                    required
                    min={1980}
                    max={2100}
                    value={form.year}
                    onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))}
                    placeholder="2024"
                    className={estiloCampo}
                  />
                </CampoFormulario>
                <CampoFormulario label="Color">
                  <input
                    type="text"
                    value={form.color}
                    onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                    placeholder="Ej. Plateado"
                    className={estiloCampo}
                  />
                </CampoFormulario>
              </SeccionFormulario>
            </div>

            <div id="vehicle-step-caracteristicas" className="scroll-mt-4">
              <SeccionFormulario
                title="Características"
                description="Tipo, combustible, transmisión y kilometraje."
                icon={Settings2}
              >
                <CampoFormulario label="Tipo de vehículo">
                  <select
                    value={form.vehicleType}
                    onChange={(e) => setForm((f) => ({ ...f, vehicleType: e.target.value }))}
                    className={estiloCampo}
                  >
                    {VEHICLE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </CampoFormulario>
                <CampoFormulario label="Combustible">
                  <select
                    value={form.fuelType}
                    onChange={(e) => setForm((f) => ({ ...f, fuelType: e.target.value }))}
                    className={estiloCampo}
                  >
                    {FUEL_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </CampoFormulario>
                <CampoFormulario label="Transmisión">
                  <select
                    value={form.transmission}
                    onChange={(e) => setForm((f) => ({ ...f, transmission: e.target.value }))}
                    className={estiloCampo}
                  >
                    {TRANSMISSIONS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </CampoFormulario>
                <CampoFormulario label="Kilometraje actual (km)">
                  <input
                    type="number"
                    min={0}
                    value={form.currentMileage}
                    onChange={(e) => setForm((f) => ({ ...f, currentMileage: e.target.value }))}
                    placeholder="0"
                    className={estiloCampo}
                  />
                </CampoFormulario>
              </SeccionFormulario>
            </div>

            <div id="vehicle-step-observaciones" className="scroll-mt-4">
              <SeccionFormulario
                title="Observaciones"
                description="Detalles que debe conocer el taller."
                icon={ClipboardList}
                contentClassName="sm:grid-cols-1"
              >
                <CampoFormulario label="Notas" hint={`${form.observations.length}/500 caracteres`}>
                  <textarea
                    rows={3}
                    maxLength={500}
                    value={form.observations}
                    onChange={(e) => setForm((f) => ({ ...f, observations: e.target.value }))}
                    className={`${estiloCampo} resize-none`}
                    placeholder="Detalles adicionales del vehículo, accesorios, condiciones especiales..."
                  />
                </CampoFormulario>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white/70 px-3 py-3 transition hover:border-blue-200 dark:border-slate-700 dark:bg-slate-900/40 dark:hover:border-blue-500/40">
                  <input
                    id="vehicle-active"
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-600"
                  />
                  <span className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                    form.active
                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                  )}>
                    {form.active ? <CircleCheck size={16} /> : <CircleOff size={16} />}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {form.active ? 'Vehículo activo' : 'Vehículo inactivo'}
                    </span>
                    <span className="block text-[11px] text-slate-400 dark:text-slate-500">
                      {form.active
                        ? 'Disponible para citas, recepciones y órdenes de trabajo.'
                        : 'No aparecerá en la operación activa del taller.'}
                    </span>
                  </span>
                </label>
              </SeccionFormulario>
            </div>

          </form>
        </Modal>
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
