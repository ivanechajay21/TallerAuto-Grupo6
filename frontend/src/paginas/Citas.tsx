import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Calendar as CalendarIcon,
  UserRound,
  Car,
  ChevronRight,
  FileText,
  CheckCircle2,
  Search,
  Filter,
  Clock3,
  Wrench,
  RotateCcw,
  Ban,
  Sparkles,
  X,
  Mail,
  Phone,
  UserCheck,
  CalendarDays,
  ArrowRight,
  Pencil,
  Trash2,
  History,
} from 'lucide-react';
import {
  createAppointment,
  deleteAppointment,
  getPaginatedAppointments,
  updateAppointment,
  updateAppointmentStatus,
} from '../servicios/citasServicio';
import type { Appointment, AppointmentSummary } from '../servicios/citasServicio';
import { getAllCustomers } from '../servicios/clientesServicio';
import { getVehiclesByCustomer } from '../servicios/vehiculosServicio';
import type { Customer } from '../servicios/clientesServicio';
import type { Vehicle } from '../servicios/vehiculosServicio';
import { createWorkOrder } from '../servicios/ordenesTrabajoServicio';
import { cn } from '../lib/utilidades';
import { useToast } from '../componentes/interfaz/Avisos';
import { usePermissions } from '../contexto/ContextoPermisos';
import Modal from '../componentes/interfaz/Modal';
import ConfirmDialog from '../componentes/interfaz/DialogoConfirmacion';
import EncabezadoModulo from '../componentes/interfaz/EncabezadoModulo';
import { CampoFormulario, SeccionFormulario, estiloCampo } from '../componentes/interfaz/Formulario';
import SelectorFecha from '../componentes/interfaz/SelectorFecha';
import Pagination from '../componentes/interfaz/Paginacion';
import TarjetaMetrica from '../componentes/interfaz/TarjetaMetrica';

const STATUS_META: Record<string, { label: string; cls: string; dot: string }> = {
  PENDING: { label: 'Pendiente', cls: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/15 dark:text-amber-300', dot: 'bg-amber-500' },
  CONFIRMED: { label: 'Confirmada', cls: 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/15 dark:text-blue-300', dot: 'bg-blue-500' },
  IN_PROCESS: { label: 'En proceso', cls: 'bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-500/15 dark:text-violet-300', dot: 'bg-violet-500' },
  COMPLETED: { label: 'Completada', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/15 dark:text-emerald-300', dot: 'bg-emerald-500' },
  CANCELLED: { label: 'Cancelada', cls: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/15 dark:text-red-300', dot: 'bg-red-500' },
};

function dateParts(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return {
    day: date.toLocaleDateString('es-PE', { day: '2-digit' }),
    month: date.toLocaleDateString('es-PE', { month: 'short' }).replace('.', ''),
    weekday: date.toLocaleDateString('es-PE', { weekday: 'long' }),
    full: date.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' }),
  };
}

function dayHeading(value: string) {
  const date = new Date(`${value}T00:00:00`);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (sameDay(date, today)) return 'Hoy';
  if (sameDay(date, tomorrow)) return 'Mañana';
  return date.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });
}

const EMPTY_SUMMARY: AppointmentSummary = {
  upcoming: 0,
  confirmed: 0,
  inProcess: 0,
  completed: 0,
  history: 0,
};

export default function Appointments() {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission('CITAS:CREAR');
  const canEdit = hasPermission('CITAS:EDITAR');
  const canDelete = hasPermission('CITAS:ELIMINAR');
  const canChangeStatus = hasPermission('CITAS:CAMBIAR_ESTADO');
  const canCreateOrder = hasPermission('ORDENES:CREAR');
  const toast = useToast();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'proximas' | 'historial'>('proximas');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [summary, setSummary] = useState<AppointmentSummary>(EMPTY_SUMMARY);
  const [reloadKey, setReloadKey] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('TODAS');
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Appointment | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersError, setCustomersError] = useState<string | null>(null);
  const [customersReloadKey, setCustomersReloadKey] = useState(0);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [vehiclesError, setVehiclesError] = useState<string | null>(null);
  const [vehiclesReloadKey, setVehiclesReloadKey] = useState(0);
  const [custSearch, setCustSearch] = useState('');
  const [custOpen, setCustOpen] = useState(false);

  const [form, setForm] = useState({ date: '', time: '', service: '', observations: '' });
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState<number | null>(null);

  useEffect(() => {
    setCustomersError(null);
    getAllCustomers()
      .then((data) => setCustomers(data))
      .catch(() => {
        setCustomersError('No se pudieron cargar los clientes. Revisa la conexión e inténtalo de nuevo.');
        toast.error('Error', 'No se pudieron cargar los clientes.');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customersReloadKey]);

  useEffect(() => {
    const customerId = customer?.id;
    if (!customerId) {
      setVehicles([]);
      setVehiclesError(null);
      setVehiclesLoading(false);
      return;
    }

    let cancelled = false;
    setVehiclesLoading(true);
    setVehiclesError(null);
    setVehicles([]);

    Promise.resolve(getVehiclesByCustomer(customerId))
      .then((data) => {
        if (!cancelled) setVehicles(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (cancelled) return;
        setVehicles([]);
        setVehiclesError('No se pudieron cargar los vehículos. Revisa la conexión e inténtalo de nuevo.');
        toast.error('Error', 'No se pudieron cargar los vehículos del cliente.');
      })
      .finally(() => {
        if (!cancelled) setVehiclesLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer?.id, vehiclesReloadKey]);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await getPaginatedAppointments({
          page: page - 1,
          size: 10,
          tab: activeTab,
          search: query,
          status: statusFilter,
        });
        if (response.totalPages > 0 && page > response.totalPages) {
          setPage(response.totalPages);
          return;
        }
        setAppointments(response.content);
        setTotalPages(response.totalPages);
        setTotalElements(response.totalElements);
        setSummary(response.summary ?? EMPTY_SUMMARY);
      } catch {
        toast.error('Error', 'No se pudieron cargar las citas.');
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, activeTab, query, statusFilter, reloadKey]);

  const refresh = () => setReloadKey((value) => value + 1);
  const stats = summary;

  const filteredCustomers = useMemo(() => {
    const q = custSearch.toLowerCase().trim();
    if (!q) return customers.slice(0, 8);
    return customers.filter(
      (c) =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
        c.documentNumber.includes(q) ||
        (c.phone || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q)
    );
  }, [customers, custSearch]);

  const openCreateModal = () => {
    setEditing(null);
    setCustomer(null);
    setVehicle(null);
    setVehicles([]);
    setCustSearch('');
    setCustOpen(false);
    setForm({ date: '', time: '', service: '', observations: '' });
    setModalOpen(true);
  };

  const openEditModal = (apt: Appointment) => {
    const fullCustomer = customers.find((c) => c.id === apt.customer?.id);
    const selectedCustomer: Customer = fullCustomer ?? {
      id: apt.customer?.id ?? 0,
      firstName: apt.customer?.firstName ?? '',
      lastName: apt.customer?.lastName ?? '',
      documentNumber: apt.customer?.documentNumber ?? '',
      phone: '',
      email: '',
      active: true,
    };
    const selectedVehicle: Vehicle | null = apt.vehicle
      ? {
          id: apt.vehicle.id,
          plate: apt.vehicle.plate,
          brand: apt.vehicle.brand,
          model: apt.vehicle.model,
          year: 0,
          color: '',
          active: true,
          customer: selectedCustomer,
        }
      : null;

    setEditing(apt);
    setCustomer(selectedCustomer);
    setVehicle(selectedVehicle);
    setVehicles([]);
    setVehiclesLoading(false);
    setCustSearch('');
    setCustOpen(false);
    setForm({
      date: apt.appointmentDate,
      time: apt.appointmentTime,
      service: apt.requestedService,
      observations: apt.observations || '',
    });
    setModalOpen(true);
  };

  const closeCreateModal = () => {
    setModalOpen(false);
    setEditing(null);
    setCustomer(null);
    setVehicle(null);
    setVehicles([]);
    setCustSearch('');
    setCustOpen(false);
    setForm({ date: '', time: '', service: '', observations: '' });
  };

  const pickCustomer = (c: Customer) => {
    setCustomer(c);
    setVehicle(null);
    setCustOpen(false);
    setCustSearch('');
    setVehicles([]);
    setVehiclesError(null);
  };

  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const toInputDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const serviceSuggestions = ['Mantenimiento preventivo', 'Cambio de frenos', 'Diagnóstico general', 'Cambio de aceite'];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer || !form.date || !form.time || !form.service.trim() || (!editing && !vehicle)) return;
    setSaving(true);
    try {
      if (editing?.id) {
        await updateAppointment(editing.id, {
          appointmentDate: form.date,
          appointmentTime: form.time,
          requestedService: form.service.trim(),
          observations: form.observations || undefined,
        });
        toast.success('Cita actualizada', 'Los datos de la cita se guardaron correctamente.');
        refresh();
      } else {
        await createAppointment(customer.id!, vehicle!.id!, {
          appointmentDate: form.date,
          appointmentTime: form.time,
          requestedService: form.service,
          observations: form.observations || undefined,
          status: 'PENDING',
        });
        toast.success('Cita registrada', 'La cita quedó programada correctamente.');
        setPage(1);
        refresh();
      }
      closeCreateModal();
    } catch (err: any) {
      toast.error(
        editing ? 'No se pudo actualizar' : 'No se pudo registrar',
        err?.response?.data?.message || 'Verifica los datos.'
      );
    } finally {
      setSaving(false);
    }
  };

  const removeAppointment = async () => {
    if (!deleteTarget?.id) return;
    setDeleting(true);
    try {
      await deleteAppointment(deleteTarget.id);
      toast.success('Cita eliminada', 'La cita pendiente se eliminó de la agenda.');
      setDeleteTarget(null);
      refresh();
    } catch (err: any) {
      toast.error(
        'No se pudo eliminar',
        err?.response?.data?.message || 'La cita no se pudo eliminar.'
      );
    } finally {
      setDeleting(false);
    }
  };

  const changeStatus = async (apt: Appointment, status: string) => {
    try {
      await updateAppointmentStatus(apt.id!, status);
      toast.success('Cita actualizada', `Estado: ${STATUS_META[status]?.label || status}.`);
      refresh();
    } catch (err: any) {
      toast.error('Error', err?.response?.data?.message || 'No se pudo actualizar la cita.');
    }
  };

  const generateOrder = async (apt: Appointment) => {
    if (!apt.customer?.id || !apt.vehicle?.id) return;
    setGenerating(apt.id!);
    try {
      const wo = await createWorkOrder(
        apt.customer.id,
        apt.vehicle.id,
        { priority: 'NORMAL', customerSymptoms: apt.requestedService },
        apt.id
      );
      toast.success('Orden generada', `Orden ${wo.orderNumber} creada desde la cita.`);
      navigate('/ordenes-trabajo');
    } catch (err: any) {
      toast.error('Error', err?.response?.data?.message || 'No se pudo generar la orden.');
    } finally {
      setGenerating(null);
    }
  };

  const upcomingByDate = appointments.reduce<Record<string, Appointment[]>>((groups, appointment) => {
    (groups[appointment.appointmentDate] ||= []).push(appointment);
    return groups;
  }, {});
  const historyByDate = appointments.reduce<Record<string, Appointment[]>>((groups, appointment) => {
    (groups[appointment.appointmentDate] ||= []).push(appointment);
    return groups;
  }, {});

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    await changeStatus(cancelTarget, 'CANCELLED');
    setCancelTarget(null);
  };

  const renderAppointment = (apt: Appointment, variant: 'upcoming' | 'history' = 'upcoming') => {
    const meta = STATUS_META[apt.status] || {
      label: apt.status,
      cls: 'bg-slate-50 text-slate-700 ring-slate-600/20',
      dot: 'bg-slate-400',
    };
    const parts = dateParts(apt.appointmentDate);
    const customerName = apt.customer
      ? `${apt.customer.firstName} ${apt.customer.lastName}`.trim()
      : 'Cliente no registrado';
    return (
      <article
        key={apt.id}
        className={cn(
          'group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-500/40',
          variant === 'history' && 'opacity-85 hover:opacity-100'
        )}
      >
        <div className={cn('absolute inset-x-0 top-0 h-1', meta.dot)} />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3 sm:block sm:shrink-0">
            <div className="flex h-[68px] w-[68px] shrink-0 flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/20">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-blue-100">{parts.month}</span>
              <span className="text-2xl font-bold leading-none">{parts.day}</span>
            </div>
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-sm font-bold text-slate-800 dark:text-slate-100">
                <Clock3 size={14} className="text-blue-500" /> {apt.appointmentTime}
              </p>
              <p className="mt-1 text-xs capitalize text-slate-400">{parts.weekday}</p>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">{apt.requestedService}</h3>
              <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ring-inset', meta.cls)}>
                <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
                {meta.label}
              </span>
              {apt.status === 'PENDING' && (canEdit || canDelete) && (
                <div className="ml-auto flex items-center gap-1">
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => openEditModal(apt)}
                      title="Editar cita"
                      aria-label={`Editar cita de ${customerName}`}
                      className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-blue-500/30 dark:hover:bg-blue-500/10 dark:hover:text-blue-300"
                    >
                      <Pencil size={14} />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(apt)}
                      title="Eliminar cita"
                      aria-label={`Eliminar cita de ${customerName}`}
                      className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-red-500/30 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <UserRound size={13} className="text-slate-400" /> {customerName}
              </span>
              {apt.vehicle && (
                <span className="flex items-center gap-1.5">
                  <Car size={13} className="text-slate-400" /> {apt.vehicle.plate} · {apt.vehicle.brand} {apt.vehicle.model}
                </span>
              )}
            </div>
            {apt.observations && (
              <p className="mt-2 line-clamp-1 text-xs text-slate-400">{apt.observations}</p>
            )}
          </div>

          <div className="flex w-full flex-row gap-2 sm:w-auto sm:flex-col">
            {apt.status === 'PENDING' && canChangeStatus && (
              <button
                onClick={() => changeStatus(apt, 'CONFIRMED')}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-500 sm:flex-none"
              >
                <CheckCircle2 size={14} /> Confirmar
              </button>
            )}
            {['PENDING', 'CONFIRMED'].includes(apt.status) && canCreateOrder && (
              <button
                onClick={() => generateOrder(apt)}
                disabled={generating === apt.id}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-50 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20 sm:flex-none"
              >
                {generating === apt.id ? (
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <FileText size={14} />
                )}
                Generar orden
              </button>
            )}
            {apt.status === 'CONFIRMED' && canChangeStatus && (
              <button
                onClick={() => setCancelTarget(apt)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 transition hover:bg-red-50 hover:text-red-600 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-red-500/10 sm:flex-none"
              >
                <Ban size={14} /> Cancelar
              </button>
            )}
            {apt.status === 'CANCELLED' && canChangeStatus && (
              <button
                onClick={() => changeStatus(apt, 'PENDING')}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/40 sm:flex-none"
              >
                <RotateCcw size={14} /> Reactivar
              </button>
            )}
          </div>
        </div>
      </article>
    );
  };

  return (
    <div className="space-y-6">
      <EncabezadoModulo
        eyebrow="Agenda del taller"
        title="Agenda y citas"
        description="Organiza las visitas del taller y conviértelas en órdenes de trabajo."
        icon={CalendarIcon}
        actions={canCreate ? (
          <button
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500"
          >
            <Plus size={17} /> Nueva cita
          </button>
        ) : undefined}
        meta={(
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
            {stats.upcoming} próximas
          </span>
        )}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <TarjetaMetrica label="Próximas citas" value={stats.upcoming} icon={CalendarIcon} />
        <TarjetaMetrica label="Confirmadas" value={stats.confirmed} icon={CheckCircle2} tone="indigo" />
        <TarjetaMetrica label="En proceso" value={stats.inProcess} icon={Wrench} tone="violet" />
        <TarjetaMetrica label="Completadas" value={stats.completed} icon={Sparkles} tone="emerald" />
      </div>

      <div
        role="tablist"
        aria-label="Vistas de citas"
        className="inline-flex w-full max-w-md items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'proximas'}
          onClick={() => {
            setActiveTab('proximas');
            setStatusFilter('TODAS');
            setPage(1);
          }}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition',
            activeTab === 'proximas'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
          )}
        >
          <CalendarIcon size={15} />
          Próximas citas
          <span className={cn(
            'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
            activeTab === 'proximas' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
          )}>
            {summary.upcoming}
          </span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'historial'}
          onClick={() => {
            setActiveTab('historial');
            setStatusFilter('TODAS');
            setPage(1);
          }}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition',
            activeTab === 'historial'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20 dark:bg-blue-500'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
          )}
        >
          <History size={15} />
          Historial
          <span className={cn(
            'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
            activeTab === 'historial' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
          )}>
            {summary.history}
          </span>
        </button>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-md">
          <Search size={16} className="pointer-events-none absolute inset-y-0 left-3 my-auto text-slate-400" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar por servicio, cliente o placa..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800/60 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-slate-800"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={15} className="text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            aria-label="Filtrar citas por estado"
          >
            <option value="TODAS">Todos los estados</option>
            <option value="PENDING">Pendientes</option>
            <option value="CONFIRMED">Confirmadas</option>
            <option value="IN_PROCESS">En proceso</option>
            <option value="COMPLETED">Completadas</option>
            <option value="CANCELLED">Canceladas</option>
          </select>
          {(query || statusFilter !== 'TODAS') && (
            <button
              onClick={() => {
                setQuery('');
                setStatusFilter('TODAS');
                setPage(1);
              }}
              className="rounded-lg px-2 py-1.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-50 dark:hover:bg-blue-500/10"
            >
              Limpiar
            </button>
          )}
        </div>
        <span className="text-sm text-slate-500 sm:ml-auto dark:text-slate-400">
          {activeTab === 'proximas' ? totalElements : totalElements} cita(s)
        </span>
      </div>

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />)}
        </div>
      ) : (
        <div className="space-y-8">
          {activeTab === 'proximas' ? (
          <section>
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Próximas citas</h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Citas pendientes, confirmadas y en atención.</p>
              </div>
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                {totalElements}
              </span>
            </div>

            {totalElements === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900/40">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
                  <CalendarIcon size={23} />
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {summary.upcoming === 0 ? 'No hay citas pendientes' : 'No hay citas que coincidan con el filtro'}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {summary.upcoming === 0 ? 'Programa una nueva cita para comenzar la agenda.' : 'Prueba con otro estado o limpia los filtros.'}
                </p>
                {canCreate && summary.upcoming === 0 && (
                  <button onClick={openCreateModal} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-500">
                    <Plus size={14} /> Programar cita
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(upcomingByDate).map(([date, items]) => (
                  <div key={date}>
                    <div className="mb-2 flex items-center gap-2">
                      <h3 className="text-sm font-bold capitalize text-slate-700 dark:text-slate-200">{dayHeading(date)}</h3>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        {items.length} {items.length === 1 ? 'cita' : 'citas'}
                      </span>
                      <span className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
                    </div>
                    <div className="grid gap-3 xl:grid-cols-2">
                      {items.map((appointment) => renderAppointment(appointment))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
          ) : (
            <section>
              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Historial de citas</h2>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Citas completadas y cerradas de la agenda.</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  {totalElements}
                </span>
              </div>
              {totalElements === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900/40">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    <History size={23} />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {summary.history === 0 ? 'Aún no hay citas en el historial' : 'No hay citas que coincidan con el filtro'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {summary.history === 0 ? 'Las citas completadas y cerradas aparecerán aquí.' : 'Prueba con otro estado o limpia los filtros.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(historyByDate).map(([date, items]) => (
                    <div key={date}>
                      <div className="mb-2 flex items-center gap-2">
                        <h3 className="text-sm font-bold capitalize text-slate-700 dark:text-slate-200">{dayHeading(date)}</h3>
                        <span className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
                      </div>
                      <div className="grid gap-3 opacity-90 xl:grid-cols-2">
                        {items.map((appointment) => renderAppointment(appointment, 'history'))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
          <Pagination
            page={page}
            pageCount={totalPages}
            onChange={setPage}
            total={totalElements}
            from={totalElements === 0 ? 0 : (page - 1) * 10 + 1}
            to={Math.min(totalElements, (page - 1) * 10 + appointments.length)}
            itemLabel="citas"
          />
        </div>
      )}

      {modalOpen && (
        <Modal
          title={editing ? 'Editar cita' : 'Programar nueva cita'}
          description={editing
            ? 'Actualiza el horario, el servicio y las observaciones de la cita pendiente.'
            : 'Selecciona el cliente, el vehículo y el horario de atención.'}
          icon={CalendarIcon}
          size="lg"
          onClose={closeCreateModal}
          footer={
            <>
              <button
                type="button"
                onClick={closeCreateModal}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="appointment-form"
                disabled={saving || !customer || (!editing && !vehicle) || !form.date || !form.time || !form.service.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {editing ? <Pencil size={16} /> : <CalendarDays size={16} />}
                {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Programar cita'}
              </button>
            </>
          }
        >
          <form id="appointment-form" onSubmit={handleSave} className="space-y-5">
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-medium">
              {[
                { label: 'Cliente', done: Boolean(customer) },
                { label: 'Vehículo', done: Boolean(vehicle) },
                { label: 'Horario', done: Boolean(form.date && form.time) },
              ].map((step, index) => (
                <span key={step.label} className="flex items-center gap-1.5">
                  {index > 0 && <ArrowRight size={12} className="text-slate-300 dark:text-slate-600" />}
                  <span className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2.5 py-1',
                    step.done
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                  )}>
                    {step.done ? <CheckCircle2 size={11} /> : <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />}
                    {step.label}
                  </span>
                </span>
              ))}
            </div>

            <section className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-700 dark:bg-slate-800/30">
              <div className="mb-3 flex items-center gap-2">
                <span className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-lg text-xs font-bold',
                  customer ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300'
                )}>
                  {customer ? <CheckCircle2 size={13} /> : '1'}
                </span>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Cliente</h3>
                <span className="ml-auto text-[10px] font-medium uppercase tracking-wide text-slate-400">Paso 1</span>
              </div>

              {customer ? (
                <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-white p-3 dark:border-emerald-500/30 dark:bg-slate-900">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white">
                    {customer.firstName.charAt(0)}{customer.lastName.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                      {customer.firstName} {customer.lastName}
                    </p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {customer.documentNumber}
                      {customer.phone ? ` · ${customer.phone}` : ''}
                    </p>
                  </div>
                  {!editing && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomer(null);
                        setVehicle(null);
                        setVehicles([]);
                        setCustSearch('');
                        setCustOpen(true);
                      }}
                      className="shrink-0 rounded-lg border border-emerald-200 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 dark:border-emerald-500/30 dark:text-emerald-300"
                    >
                      Cambiar
                    </button>
                  )}
                </div>
              ) : (
                <div>
                  <div className="relative">
                    <Search size={16} className="pointer-events-none absolute inset-y-0 left-3 my-auto text-slate-400" />
                    <input
                      value={custSearch}
                      onChange={(e) => {
                        setCustSearch(e.target.value);
                        setCustOpen(true);
                      }}
                      onFocus={() => setCustOpen(true)}
                      placeholder="Buscar cliente..."
                      className="block w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-9 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                    />
                    {custSearch && (
                      <button
                        type="button"
                        onClick={() => setCustSearch('')}
                        className="absolute inset-y-0 right-2 my-auto flex h-6 w-6 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                        aria-label="Limpiar búsqueda"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  {(custOpen || custSearch.trim().length > 0) && (
                    <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                      {customersError ? (
                        <div className="px-4 py-6 text-center">
                          <p className="text-sm font-medium text-red-700 dark:text-red-300">{customersError}</p>
                          <button
                            type="button"
                            onClick={() => setCustomersReloadKey((value) => value + 1)}
                            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 dark:border-red-500/30 dark:bg-slate-900 dark:text-red-300"
                          >
                            Reintentar
                          </button>
                        </div>
                      ) : customers.length === 0 ? (
                        <p className="px-4 py-6 text-center text-sm text-slate-400">Cargando clientes...</p>
                      ) : filteredCustomers.length === 0 ? (
                        <div className="px-4 py-6 text-center">
                          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Sin clientes que coincidan</p>
                          <p className="mt-1 text-xs text-slate-400">Prueba con otro nombre o documento.</p>
                        </div>
                      ) : (
                        filteredCustomers.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => pickCustomer(c)}
                            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left transition hover:bg-blue-50 dark:hover:bg-blue-500/10"
                          >
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[10px] font-bold text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
                              {c.firstName.charAt(0)}{c.lastName.charAt(0)}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                                {c.firstName} {c.lastName}
                              </span>
                              <span className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500">
                                <span>{c.documentNumber}</span>
                                {c.phone && <span className="flex items-center gap-0.5"><Phone size={9} /> {c.phone}</span>}
                                {c.email && <span className="hidden items-center gap-0.5 sm:flex"><Mail size={9} /> {c.email}</span>}
                              </span>
                            </span>
                            <ChevronRight size={14} className="shrink-0 text-slate-300 dark:text-slate-600" />
                          </button>
                        ))
                      )}
                    </div>
                  )}
                  <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                    Busca por nombre, DNI/RUC, teléfono o correo.
                  </p>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-700 dark:bg-slate-800/30">
              <div className="mb-3 flex items-center gap-2">
                <span className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-lg text-xs font-bold',
                  vehicle ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300'
                )}>
                  {vehicle ? <CheckCircle2 size={13} /> : '2'}
                </span>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Vehículo</h3>
                <span className="ml-auto text-[10px] font-medium uppercase tracking-wide text-slate-400">Paso 2</span>
              </div>

              {editing ? (
                vehicle ? (
                  <div className="flex items-center gap-3 rounded-xl border border-blue-100 bg-white p-3 dark:border-blue-500/20 dark:bg-slate-900">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
                      <Car size={17} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-sm font-bold text-slate-900 dark:text-white">{vehicle.plate}</p>
                      <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">{vehicle.brand} {vehicle.model}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      No editable
                    </span>
                  </div>
                ) : null
              ) : !customer ? (
                <div className="flex items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-white/60 px-3 py-3 text-xs text-slate-400 dark:border-slate-700 dark:bg-slate-900/40">
                  <Car size={16} /> Primero selecciona un cliente.
                </div>
              ) : vehiclesLoading ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="h-20 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
                  <div className="h-20 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
                </div>
              ) : vehiclesError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-4 text-center dark:border-red-500/30 dark:bg-red-500/10">
                  <p className="text-xs font-medium text-red-700 dark:text-red-300">{vehiclesError}</p>
                  <button
                    type="button"
                    onClick={() => setVehiclesReloadKey((value) => value + 1)}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 dark:border-red-500/30 dark:bg-slate-900 dark:text-red-300 dark:hover:bg-red-500/10"
                  >
                    Reintentar
                  </button>
                </div>
              ) : vehicles.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-white/60 px-3 py-4 text-center dark:border-slate-700 dark:bg-slate-900/40">
                  <Car size={22} className="mx-auto mb-1 text-slate-300 dark:text-slate-600" />
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Este cliente no tiene vehículos registrados.</p>
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {vehicles.map((v) => {
                    const selected = vehicle?.id === v.id;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setVehicle(v)}
                        className={cn(
                          'flex items-center gap-2.5 rounded-xl border bg-white p-3 text-left transition hover:border-blue-300 hover:shadow-sm dark:bg-slate-900',
                          selected
                            ? 'border-blue-400 ring-2 ring-blue-500/15 dark:border-blue-500'
                            : 'border-slate-200 dark:border-slate-700'
                        )}
                      >
                        <span className={cn(
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                          selected ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300'
                        )}>
                          <Car size={17} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-mono text-sm font-bold text-slate-900 dark:text-white">{v.plate}</span>
                          <span className="block truncate text-[11px] text-slate-500 dark:text-slate-400">
                            {v.brand} {v.model} · {v.year}
                          </span>
                        </span>
                        {selected && <CheckCircle2 size={16} className="shrink-0 text-blue-600 dark:text-blue-400" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            <SeccionFormulario
              title="Fecha y servicio"
              description="Define el horario de atención y el servicio solicitado."
              icon={CalendarDays}
            >
              <CampoFormulario label="Fecha" required>
                <SelectorFecha
                  value={form.date}
                  min={editing ? undefined : toInputDate(today)}
                  onChange={(value) => setForm((f) => ({ ...f, date: value }))}
                />
                <div className="mt-2 flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, date: toInputDate(today) }))}
                    className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-700 transition hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20"
                  >
                    Hoy
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, date: toInputDate(tomorrow) }))}
                    className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                  >
                    Mañana
                  </button>
                </div>
              </CampoFormulario>
              <CampoFormulario label="Hora" required>
                <input
                  type="time"
                  lang="es-PE"
                  required
                  value={form.time}
                  onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                  className={estiloCampo}
                />
              </CampoFormulario>
              <CampoFormulario label="Servicio solicitado" required className="sm:col-span-2">
                <input
                  type="text"
                  required
                  value={form.service}
                  onChange={(e) => setForm((f) => ({ ...f, service: e.target.value }))}
                  placeholder="Ej. Mantenimiento de 10,000 km"
                  className={estiloCampo}
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {serviceSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, service: suggestion }))}
                      className={cn(
                        'rounded-full px-2.5 py-1 text-[10px] font-medium transition',
                        form.service === suggestion
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-300'
                      )}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </CampoFormulario>
              <CampoFormulario
                label="Observaciones"
                className="sm:col-span-2"
                hint={`${form.observations.length}/500 caracteres`}
              >
                <textarea
                  rows={3}
                  maxLength={500}
                  value={form.observations}
                  onChange={(e) => setForm((f) => ({ ...f, observations: e.target.value }))}
                  className={`${estiloCampo} resize-none`}
                  placeholder="Síntomas, preferencias de horario o notas adicionales..."
                />
              </CampoFormulario>
            </SeccionFormulario>

            {(!customer || (!editing && !vehicle)) && (
              <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                <UserCheck size={14} />
                {!customer ? 'Selecciona un cliente para continuar.' : 'Selecciona el vehículo para continuar.'}
              </div>
            )}
          </form>
        </Modal>
      )}

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        title="Cancelar cita"
        message={cancelTarget ? `¿Cancelar la cita de ${cancelTarget.requestedService}?` : undefined}
        confirmLabel="Cancelar cita"
        danger={false}
        onCancel={() => setCancelTarget(null)}
        onConfirm={confirmCancel}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Eliminar cita"
        message={
          deleteTarget ? (
            <>
              ¿Eliminar definitivamente la cita de{' '}
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {deleteTarget.requestedService}
              </span>
              ? Esta acción no se puede deshacer.
            </>
          ) : undefined
        }
        confirmLabel="Eliminar cita"
        busy={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={removeAppointment}
      />
    </div>
  );
}

