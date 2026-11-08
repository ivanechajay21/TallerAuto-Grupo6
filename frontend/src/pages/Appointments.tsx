import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Calendar as CalendarIcon, Clock, UserRound, Car, X, ChevronDown, FileText, CheckCircle2 } from 'lucide-react';
import { createAppointment, getAllAppointments, updateAppointmentStatus } from '../services/appointmentService';
import type { Appointment } from '../services/appointmentService';
import { getAllCustomers } from '../services/customerService';
import { getVehiclesByCustomer } from '../services/vehicleService';
import type { Customer } from '../services/customerService';
import type { Vehicle } from '../services/vehicleService';
import { createWorkOrder } from '../services/workOrderService';
import { cn } from '../lib/utils';
import { useToast } from '../components/ui/Toast';
import { usePermissions } from '../context/PermissionContext';
import usePagination from '../hooks/usePagination';
import Pagination from '../components/ui/Pagination';

const STATUS_META: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'Pendiente', cls: 'bg-slate-50 text-slate-700 ring-slate-600/20' },
  CONFIRMED: { label: 'Confirmada', cls: 'bg-blue-50 text-blue-700 ring-blue-600/20' },
  IN_PROCESS: { label: 'En proceso', cls: 'bg-amber-50 text-amber-700 ring-amber-600/20' },
  COMPLETED: { label: 'Completada', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
  CANCELLED: { label: 'Cancelada', cls: 'bg-red-50 text-red-700 ring-red-600/20' },
};

export default function Appointments() {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission('CITAS:CREAR');
  const canChangeStatus = hasPermission('CITAS:CAMBIAR_ESTADO');
  const canCreateOrder = hasPermission('ORDENES:CREAR');
  const toast = useToast();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [custSearch, setCustSearch] = useState('');
  const [custOpen, setCustOpen] = useState(false);

  const [form, setForm] = useState({ date: '', time: '', service: '', observations: '' });
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState<number | null>(null);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      setAppointments(await getAllAppointments());
    } catch {
      toast.error('Error', 'No se pudieron cargar las citas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
    getAllCustomers()
      .then((data) => setCustomers(data))
      .catch(() => toast.error('Error', 'No se pudieron cargar los clientes.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredCustomers = useMemo(() => {
    const q = custSearch.toLowerCase().trim();
    if (!q) return customers.slice(0, 8);
    return customers.filter(
      (c) =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) || c.documentNumber.includes(q)
    );
  }, [customers, custSearch]);

  const pickCustomer = async (c: Customer) => {
    setCustomer(c);
    setVehicle(null);
    setCustOpen(false);
    try {
      setVehicles(await getVehiclesByCustomer(c.id!));
    } catch {
      toast.error('Error', 'No se pudieron cargar los vehículos.');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer || !vehicle || !form.date || !form.time) return;
    setSaving(true);
    try {
      const created = await createAppointment(customer.id!, vehicle.id!, {
        appointmentDate: form.date,
        appointmentTime: form.time,
        requestedService: form.service,
        observations: form.observations || undefined,
        status: 'PENDING',
      });
      setAppointments((prev) => [created, ...prev]);
      setModalOpen(false);
      setCustomer(null);
      setVehicle(null);
      setVehicles([]);
      setForm({ date: '', time: '', service: '', observations: '' });
      toast.success('Cita registrada', 'La cita quedó programada correctamente.');
    } catch (err: any) {
      toast.error('No se pudo registrar', err?.response?.data?.message || 'Verifica los datos.');
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (apt: Appointment, status: string) => {
    try {
      const updated = await updateAppointmentStatus(apt.id!, status);
      setAppointments((prev) => prev.map((a) => (a.id === apt.id ? updated : a)));
      toast.success('Cita actualizada', `Estado: ${STATUS_META[status]?.label || status}.`);
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

  const isUpcoming = (apt: Appointment) => ['PENDING', 'CONFIRMED'].includes(apt.status);

  const grouped = useMemo(() => {
    const sorted = [...appointments].sort(
      (a, b) =>
        new Date(`${a.appointmentDate}T${a.appointmentTime}`).getTime() -
        new Date(`${b.appointmentDate}T${b.appointmentTime}`).getTime()
    );
    return {
      upcoming: sorted.filter(isUpcoming),
      history: sorted.filter((a) => !isUpcoming(a)),
    };
  }, [appointments]);

  const pag = usePagination(grouped.upcoming, 10);

  const renderAppointment = (apt: Appointment) => {
    const meta = STATUS_META[apt.status] || { label: apt.status, cls: 'bg-slate-50 text-slate-700 ring-slate-600/20' };
    return (
      <div
        key={apt.id}
        className="flex flex-col gap-5 p-5 transition hover:bg-slate-50 dark:hover:bg-slate-800/40 sm:flex-row sm:items-center"
      >
        <div className="flex min-w-[110px] flex-col items-center justify-center rounded-xl border border-blue-100 bg-blue-50/50 p-3 dark:border-blue-500/20 dark:bg-blue-500/15">
          <span className="mb-1 flex items-center gap-1 text-sm font-bold text-blue-600 dark:text-blue-400">
            <CalendarIcon size={14} />
            {new Date(apt.appointmentDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
          </span>
          <span className="flex items-center gap-1 text-xl font-bold text-slate-800 dark:text-slate-100">
            <Clock size={16} className="text-slate-400 dark:text-slate-500" />
            {apt.appointmentTime}
          </span>
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{apt.requestedService}</h3>
            <span className={cn('inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset', meta.cls)}>
              {meta.label}
            </span>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-300">
            {apt.customer && (
              <span className="flex items-center gap-1.5">
                <UserRound size={16} className="text-slate-400 dark:text-slate-500" />
                {apt.customer.firstName} {apt.customer.lastName}
              </span>
            )}
            {apt.vehicle && (
              <span className="flex items-center gap-1.5">
                <Car size={16} className="text-slate-400 dark:text-slate-500" />
                {apt.vehicle.plate} · {apt.vehicle.brand} {apt.vehicle.model}
              </span>
            )}
          </div>
        </div>

        <div className="flex w-full flex-row gap-2 sm:w-auto sm:flex-col">
          {apt.status === 'PENDING' && canChangeStatus && (
            <button
              onClick={() => changeStatus(apt, 'CONFIRMED')}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 sm:flex-none"
            >
              Confirmar
            </button>
          )}
          {['PENDING', 'CONFIRMED'].includes(apt.status) && canCreateOrder && (
            <button
              onClick={() => generateOrder(apt)}
              disabled={generating === apt.id}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50 sm:flex-none"
            >
              {generating === apt.id ? (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <FileText size={15} />
              )}
              Generar orden
            </button>
          )}
          {apt.status === 'CONFIRMED' && canChangeStatus && (
            <button
              onClick={() => changeStatus(apt, 'CANCELLED')}
              className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/40 sm:flex-none"
            >
              Cancelar
            </button>
          )}
          {apt.status === 'CANCELLED' && canChangeStatus && (
            <button
              onClick={() => changeStatus(apt, 'PENDING')}
              className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/40 sm:flex-none"
            >
              Reactivar
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Agenda y Citas</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Programa y administra las visitas al taller.</p>
        </div>
        {canCreate && (
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nueva Cita
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/50">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Próximas citas</h2>
          <span className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-400">{grouped.upcoming.length}</span>
        </div>

        {loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
            ))}
          </div>
        ) : grouped.upcoming.length === 0 ? (
          <div className="py-14 text-center">
            <CalendarIcon size={28} className="mx-auto mb-2 text-slate-300" />
            <p className="text-sm text-slate-400 dark:text-slate-500">Sin citas pendientes. ¡Programa una nueva!</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">{pag.pageItems.map(renderAppointment)}</div>
        )}

        <Pagination
          page={pag.page}
          pageCount={pag.pageCount}
          onChange={pag.setPage}
          total={pag.total}
          from={pag.from}
          to={pag.to}
          itemLabel="registros"
        />
      </div>

      {grouped.history.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/50">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Historial de citas</h2>
          </div>
          <div className="divide-y divide-slate-100 opacity-80 dark:divide-slate-800">{grouped.history.map(renderAppointment)}</div>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 sm:items-center">
          <div className="w-full max-w-lg animate-slide-up rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Programar nueva cita</h2>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Cliente</label>
                <div className="relative">
                  <UserRound size={17} className="pointer-events-none absolute inset-y-0 left-3 my-auto text-slate-400 dark:text-slate-500" />
                  <input
                    value={custSearch}
                    onChange={(e) => {
                      setCustSearch(e.target.value);
                      setCustOpen(true);
                    }}
                    onFocus={() => setCustOpen(true)}
                    onBlur={() => setTimeout(() => setCustOpen(false), 150)}
                    placeholder="Buscar cliente..."
                    className="block w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-slate-600 dark:text-white"
                  />
                  {custOpen && (
                    <div className="absolute z-20 mt-2 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
                      {filteredCustomers.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => pickCustomer(c)}
                          className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition hover:bg-blue-50"
                        >
                          <UserRound size={15} className="shrink-0 text-slate-400 dark:text-slate-500" />
                          <span>
                            {c.firstName} {c.lastName}
                            <span className="text-xs text-slate-400 dark:text-slate-500"> · {c.documentNumber}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {customer && (
                  <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-blue-700">
                    <CheckCircle2 size={15} /> {customer.firstName} {customer.lastName}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Vehículo</label>
                <div className="relative">
                  <Car size={17} className="pointer-events-none absolute inset-y-0 left-3 my-auto text-slate-400 dark:text-slate-500" />
                  <select
                    value={vehicle?.id || ''}
                    onChange={(e) => setVehicle(vehicles.find((v) => v.id === Number(e.target.value)) || null)}
                    disabled={!customer}
                    className={cn(
                      'block w-full appearance-none rounded-xl border border-slate-300 py-2.5 pl-10 pr-8 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 disabled:bg-slate-50 disabled:text-slate-400 dark:border-slate-600 dark:text-white dark:disabled:bg-slate-800 dark:disabled:text-slate-500',
                      vehicle && 'font-medium'
                    )}
                  >
                    <option value="">{customer ? 'Seleccionar vehículo...' : 'Primero selecciona un cliente'}</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.plate} · {v.brand} {v.model}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="pointer-events-none absolute inset-y-0 right-3 my-auto text-slate-400 dark:text-slate-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Fecha</label>
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                    className="block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-slate-600 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Hora</label>
                  <input
                    type="time"
                    required
                    value={form.time}
                    onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                    className="block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-slate-600 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Servicio solicitado</label>
                <input
                  type="text"
                  required
                  value={form.service}
                  onChange={(e) => setForm((f) => ({ ...f, service: e.target.value }))}
                  placeholder="Ej. Mantenimiento de 10,000 km"
                  className="block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-slate-600 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Observaciones</label>
                <textarea
                  rows={2}
                  value={form.observations}
                  onChange={(e) => setForm((f) => ({ ...f, observations: e.target.value }))}
                  className="block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-slate-600 dark:text-white"
                  placeholder="Notas adicionales (opcional)"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || !customer || !vehicle}
                  className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-500 disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Programar cita'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
