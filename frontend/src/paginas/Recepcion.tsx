import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Car,
  ChevronLeft,
  ChevronRight,
  Check,
  Upload,
  Trash2,
  X,
  Camera,
  Fuel,
  FileText,
  Search,
  UserRound,
  ClipboardCheck,
  ClipboardList,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { cn } from '../lib/utilidades';
import ReceptionList from '../componentes/ListaRecepcion';
import EncabezadoModulo from '../componentes/interfaz/EncabezadoModulo';
import ConfirmDialog from '../componentes/interfaz/DialogoConfirmacion';
import PestanasModulo from '../componentes/interfaz/PestanasModulo';
import {
  AvisoFormulario,
  CampoFormulario,
  SeccionFormulario,
  estiloCampo,
} from '../componentes/interfaz/Formulario';
import { getAllCustomers } from '../servicios/clientesServicio';
import { getVehiclesByCustomer } from '../servicios/vehiculosServicio';
import type { Customer } from '../servicios/clientesServicio';
import type { Vehicle } from '../servicios/vehiculosServicio';
import { createReception, emitOrderFromReception } from '../servicios/recepcionServicio';
import type { DamageRequest, Reception } from '../servicios/recepcionServicio';
import VehicleInspector, { DAMAGE_TYPES, SEVERITIES, ZONE_MAP } from '../componentes/InspectorVehiculo';
import type { Side } from '../componentes/InspectorVehiculo';
import { getCurrentUser } from '../servicios/autenticacionServicio';
import { useToast } from '../componentes/interfaz/Avisos';

const FUEL_LEVELS = ['Tanque lleno', '3/4', '1/2', '1/4', 'Reserva', 'Vacío'];

const ACCESSORIES = [
  'Gato',
  'Llanta de repuesto',
  'Tapa aros',
  'Cable de corriente',
  'Control remoto',
  'Documentos',
  'Triángulo',
  'Tapetes',
  'Herramientas',
  'Placa removida',
];

const PHOTO_CATEGORIES = [
  'Delantera',
  'Trasera',
  'Lateral izquierdo',
  'Lateral derecho',
  'Interior',
  'Motor',
  'Otros',
];

const STEPS = [
  { label: 'Cliente y vehículo', icon: UserRound },
  { label: 'Datos de recepción', icon: FileText },
  { label: 'Inspección visual', icon: ClipboardCheck },
  { label: 'Confirmar', icon: Check },
];

type DamageDraft = DamageRequest & { photo?: File };

const SEV_STYLE: Record<string, { dot: string; text: string }> = {
  LEVE: { dot: 'bg-emerald-500', text: 'text-emerald-600' },
  MODERADO: { dot: 'bg-amber-500', text: 'text-amber-600' },
  GRAVE: { dot: 'bg-red-500', text: 'text-red-600' },
};

export default function Reception() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const user = getCurrentUser();

  const view: 'listado' | 'nueva' = location.pathname.endsWith('/nueva') ? 'nueva' : 'listado';

  const [step, setStep] = useState(0);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loadingCustomer, setLoadingCustomer] = useState(true);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [vehiclesError, setVehiclesError] = useState<string | null>(null);
  const [vehiclesReloadKey, setVehiclesReloadKey] = useState(0);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);

  const [form, setForm] = useState({
    mileage: '' as string,
    fuelLevel: '' as string,
    exteriorState: '',
    generalState: '',
    symptoms: '',
    observations: '',
  });
  const [accessories, setAccessories] = useState<string[]>([]);

  const [damages, setDamages] = useState<DamageDraft[]>([]);
  const [side, setSide] = useState<Side>('L');
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [dampType, setDampType] = useState<string>(DAMAGE_TYPES[0]);
  const [dampSeverity, setDampSeverity] = useState('MODERADO');
  const [dampDesc, setDampDesc] = useState('');
  const [dampObs, setDampObs] = useState('');
  const [dampPhoto, setDampPhoto] = useState<File | null>(null);
  const [dampPhotoPreview, setDampPhotoPreview] = useState<string | null>(null);
  const damagePhotoRef = useRef<HTMLInputElement | null>(null);

  const [photos, setPhotos] = useState<(File | null)[]>(Array(PHOTO_CATEGORIES.length).fill(null));
  const [photoPreviews, setPhotoPreviews] = useState<(string | null)[]>(Array(PHOTO_CATEGORIES.length).fill(null));
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<Reception | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [emitting, setEmitting] = useState(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const fileRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    getAllCustomers()
      .then((data) => setCustomers(data))
      .catch(() => toast.error('Error', 'No se pudieron cargar los clientes.'))
      .finally(() => setLoadingCustomer(false));
  }, [toast]);

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.toLowerCase().trim();
    if (!q) return customers.slice(0, 8);
    return customers.filter(
      (c) =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
        c.documentNumber.includes(q) ||
        (c.code || '').toLowerCase().includes(q)
    );
  }, [customers, customerSearch]);

  const selectCustomer = (c: Customer) => {
    setCustomer(c);
    setVehicle(null);
    setCustomerSearch('');
    setCustomerSearchOpen(false);
    setVehicles([]);
    setVehiclesError(null);
  };

  useEffect(() => {
    const customerId = customer?.id;
    if (!customerId) {
      setVehicles([]);
      setVehiclesError(null);
      setLoadingVehicles(false);
      return;
    }

    let cancelled = false;
    setLoadingVehicles(true);
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
        if (!cancelled) setLoadingVehicles(false);
      });

    return () => {
      cancelled = true;
    };
    // El toast se mantiene fuera para no repetir la carga por su identidad.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer?.id, vehiclesReloadKey]);

  const removeDamage = (index: number) => setDamages((ds) => ds.filter((_, i) => i !== index));

  const resetDamageDraft = () => {
    setDampType(DAMAGE_TYPES[0]);
    setDampSeverity('MODERADO');
    setDampDesc('');
    setDampObs('');
    setDampPhoto(null);
    setDampPhotoPreview(null);
  };

  const handleSelectZone = (code: string) => {
    setSelectedZone((prev) => {
      if (prev !== code) resetDamageDraft();
      return code;
    });
  };

  const handleSideChange = (s: Side) => {
    setSide(s);
    setSelectedZone((prev) => {
      if (!prev) return prev;
      const z = ZONE_MAP.get(prev);
      if (z && z.side !== 'B' && z.side !== s) {
        resetDamageDraft();
        return null;
      }
      return prev;
    });
  };

  const handleDamagePhotoChange = (file: File | null) => {
    setDampPhoto(file);
    if (file) {
      if (dampPhotoPreview) URL.revokeObjectURL(dampPhotoPreview);
      setDampPhotoPreview(URL.createObjectURL(file));
    } else {
      setDampPhotoPreview(null);
    }
  };

  const zoneInfo = selectedZone ? ZONE_MAP.get(selectedZone) : null;

  const addDamage = () => {
    if (!zoneInfo) return;
    const d: DamageDraft = {
      zone: zoneInfo.code,
      zoneLabel: zoneInfo.label,
      damageType: dampType,
      severity: dampSeverity,
      description: dampDesc.trim() || undefined,
      observation: dampObs.trim() || undefined,
      ...(dampPhoto ? { photo: dampPhoto } : {}),
    };
    setDamages((ds) => [...ds, d]);
    resetDamageDraft();
  };

  const damageCounts = useMemo(() => {
    const m: Record<string, number> = {};
    damages.forEach((d) => {
      m[d.zone] = (m[d.zone] || 0) + 1;
    });
    return m;
  }, [damages]);

  const handlePhotoChange = (index: number, file: File | null) => {
    setPhotos((p) => p.map((f, i) => (i === index ? file : f)));
    if (file) {
      setPhotoPreviews((p) => p.map((pv, i) => (i === index ? URL.createObjectURL(file) : pv)));
    } else {
      setPhotoPreviews((p) => p.map((pv, i) => (i === index ? null : pv)));
    }
  };

  const canSubmit =
    !!customer && !!vehicle && form.mileage !== '' && damages.length >= 0;

  const handleSubmit = async () => {
    setSaving(true);
    const generalFiles = photos.filter((f): f is File => f !== null);
    let offset = generalFiles.length;
    const payloadDamages: DamageRequest[] = damages.map((d) => {
      let photoIndex: number | undefined;
      if (d.photo) {
        photoIndex = offset;
        offset += 1;
      }
      return {
        zone: d.zone,
        zoneLabel: d.zoneLabel,
        damageType: d.damageType,
        severity: d.severity,
        description: d.description,
        observation: d.observation,
        photoIndex,
      };
    });
    const damageFiles = damages.filter((d) => d.photo).map((d) => d.photo as File);
    const files = [...generalFiles, ...damageFiles];
    try {
      const reception = await createReception(
        {
          vehicleId: vehicle!.id!,
          mileage: Number(form.mileage) || 0,
          fuelLevel: form.fuelLevel || undefined,
          exteriorState: form.exteriorState || undefined,
          generalState: form.generalState || undefined,
          accessories,
          customerSymptoms: form.symptoms || undefined,
          observations: form.observations || undefined,
          damages: payloadDamages,
        },
        files
      );
      setCreated(reception);
      toast.success('Recepción guardada', `Recepcion guardada con código ${reception.code}.`);
    } catch (err: any) {
      toast.error('Error', err?.response?.data?.message || 'No se pudo guardar la recepción.');
    } finally {
      setSaving(false);
    }
  };

  const handleEmitOrder = async () => {
    if (!created) return;
    setEmitting(true);
    try {
      const result = await emitOrderFromReception(created.id);
      setOrderNumber(result.orderNumber);
      toast.success('Orden emitida', `Orden ${result.orderNumber} creada correctamente.`);
    } catch (err: any) {
      toast.error('Error', err?.response?.data?.message || 'No se pudo emitir la orden de trabajo.');
    } finally {
      setEmitting(false);
    }
  };

  const resetAll = () => {
    setStep(0);
    setCustomer(null);
    setVehicle(null);
    setVehicles([]);
    setForm({ mileage: '', fuelLevel: '', exteriorState: '', generalState: '', symptoms: '', observations: '' });
    setAccessories([]);
    setDamages([]);
    setSide('L');
    setSelectedZone(null);
    resetDamageDraft();
    setPhotos(Array(PHOTO_CATEGORIES.length).fill(null));
    setPhotoPreviews(Array(PHOTO_CATEGORIES.length).fill(null));
    setCreated(null);
    setOrderNumber(null);
  };

  const goToOrder = () => navigate('/ordenes-trabajo');

  const hasUnsavedChanges =
    !created &&
    Boolean(
      customer ||
      vehicle ||
      customerSearch ||
      form.mileage ||
      form.fuelLevel ||
      form.exteriorState ||
      form.generalState ||
      form.symptoms ||
      form.observations ||
      accessories.length > 0 ||
      damages.length > 0 ||
      photos.some(Boolean) ||
      photoPreviews.some(Boolean)
    );

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [hasUnsavedChanges]);

  const requestLeave = (path: string) => {
    if (hasUnsavedChanges) {
      setPendingPath(path);
      return;
    }
    navigate(path);
  };

  const continueDisabled =
    (step === 0 && (!customer || !vehicle)) ||
    (step === 1 && form.mileage === '');

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <EncabezadoModulo
        eyebrow="Recepción y admisión"
        title="Recepción de vehículo"
        description="Registra la entrada, la inspección visual y la ficha digital del vehículo en un flujo guiado."
        icon={Car}
        actions={(
          <PestanasModulo
            items={[
              { value: 'listado', label: 'Listado', icon: ClipboardList },
              { value: 'nueva', label: 'Nueva recepción', icon: Plus },
            ]}
            value={view}
            onChange={(value) => requestLeave(value === 'nueva' ? '/recepcion/nueva' : '/recepcion')}
          />
        )}
        meta={view === 'nueva' ? (
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
            Flujo de 4 pasos
          </span>
        ) : undefined}
      />

      {view === 'listado' ? (
        <ReceptionList />
      ) : (
      <div className="mx-auto max-w-5xl space-y-5">
      {/* Stepper */}
      <nav className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900" aria-label="Pasos de recepción">
        <ol className="grid grid-cols-2 gap-2 lg:flex lg:items-center">
          {STEPS.map((s, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <li key={s.label} className="flex min-w-0 items-center gap-2 lg:flex-1">
                <button
                  type="button"
                  onClick={() => i < step && setStep(i)}
                  disabled={!done && !active}
                  className={cn(
                    'flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2.5 text-left transition',
                    active
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                      : done
                        ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-500/15 dark:text-blue-300 dark:hover:bg-blue-500/20'
                        : 'cursor-default bg-slate-50 text-slate-400 dark:bg-slate-800/60 dark:text-slate-500',
                  )}
                >
                  <span className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                    active ? 'bg-white/20 text-white'
                      : done ? 'bg-blue-600 text-white'
                        : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
                  )}>
                    {done ? <Check size={14} /> : i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className={cn('block text-[10px] font-semibold uppercase tracking-wider', active ? 'text-blue-100' : 'text-slate-400')}>
                      Paso {i + 1}
                    </span>
                    <span className="block truncate text-xs font-semibold sm:text-sm">{s.label}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        {!created && (
          <div className="rounded-t-3xl border-b border-slate-100 bg-gradient-to-r from-blue-50/80 to-indigo-50/50 px-5 py-4 dark:border-slate-800 dark:from-blue-500/10 dark:to-indigo-500/5 sm:px-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-400">
                  Paso {step + 1} de {STEPS.length}
                </p>
                <p className="mt-0.5 text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {STEPS[step].label}
                </p>
              </div>
              <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-slate-500 shadow-sm dark:bg-slate-900 dark:text-slate-300">
                {Math.round(((step + 1) / STEPS.length) * 100)}% completado
              </span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/80 dark:bg-slate-800">
              <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-500" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
            </div>
          </div>
        )}
        <div className="p-5 sm:p-8">
        {/* PASO 0: Cliente y vehículo */}
        {created && (
          <div className="animate-slide-up text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
              {orderNumber ? <Check size={32} /> : <Car size={30} />}
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {orderNumber ? '¡Orden de trabajo emitida!' : 'Recepción guardada'}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
              {orderNumber ? (
                <>
                  La recepción <span className="font-semibold text-slate-700 dark:text-slate-200">{created.code}</span> generó la orden{' '}
                  <span className="font-semibold text-blue-600 dark:text-blue-400">{orderNumber}</span>. Ya puede iniciar el diagnóstico.
                </>
              ) : (
                <>
                  La recepción <span className="font-semibold text-slate-700 dark:text-slate-200">{created.code}</span> para el vehículo{' '}
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{created.vehicle.plate}</span> se registró con{' '}
                  {created.damages.length} daños y {created.photos.length} fotografías.
                </>
              )}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              {!orderNumber && (
                <button
                  onClick={handleEmitOrder}
                  disabled={emitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:from-blue-500 hover:to-indigo-500 disabled:opacity-60"
                >
                  {emitting ? (
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <FileText size={16} />
                  )}
                  Emitir orden de trabajo
                </button>
              )}
              <button
                onClick={goToOrder}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 px-5 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 transition hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                Ver órdenes
              </button>
              <button
                onClick={resetAll}
                className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-slate-500 dark:text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Nueva recepción
              </button>
            </div>
          </div>
        )}

        {!created && step === 0 && (
          <div>
            <h2 className="mb-1 text-lg font-bold text-slate-900 dark:text-white">Selecciona el cliente y vehículo</h2>
            <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
              Busca el cliente por nombre o documento. Luego elige uno de sus vehículos.
            </p>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/40 p-4 dark:border-slate-700 dark:bg-slate-800/25">
                <div className="mb-3 flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm dark:bg-slate-900 dark:text-blue-300">
                    <UserRound size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Cliente</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Busca por nombre, documento o código.</p>
                  </div>
                </div>
                <div className="relative">
                  <Search size={17} className="pointer-events-none absolute inset-y-0 left-3 my-auto text-slate-400 dark:text-slate-500" />
                  <input
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setCustomerSearchOpen(true);
                    }}
                    onFocus={() => setCustomerSearchOpen(true)}
                    onBlur={() => setTimeout(() => setCustomerSearchOpen(false), 150)}
                    className="block w-full rounded-xl border border-slate-300 dark:border-slate-600 py-2.5 pl-10 pr-3 text-slate-900 dark:text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                    placeholder="Buscar cliente..."
                  />
                  {customerSearchOpen && !loadingCustomer && (
                    <div className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl">
                      {filteredCustomers.length === 0 && (
                        <p className="px-4 py-3 text-sm text-slate-400 dark:text-slate-500">Sin resultados.</p>
                      )}
                      {filteredCustomers.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => selectCustomer(c)}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-blue-50 dark:hover:bg-blue-500/10"
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
                            <UserRound size={16} />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-slate-900 dark:text-white">
                              {c.firstName} {c.lastName}
                            </span>
                            <span className="block text-xs text-slate-500 dark:text-slate-400">
                              {c.documentNumber} · {c.phone}
                            </span>
                          </span>
                          {c.code && (
                            <span className="ml-auto rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                              {c.code}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {customer && (
                  <div className="mt-3 flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50/60 p-3 animate-fade-in dark:border-blue-500/30 dark:bg-blue-500/10">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                      {customer.firstName.charAt(0)}
                      {customer.lastName.charAt(0)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                        {customer.firstName} {customer.lastName}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {customer.documentNumber} · {customer.phone}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomer(null);
                        setCustomerSearch('');
                        setVehicle(null);
                        setVehicles([]);
                        setVehiclesError(null);
                      }}
                      className="ml-auto rounded-lg p-1.5 text-slate-400 dark:text-slate-500 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300"
                      aria-label="Quitar cliente"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/40 p-4 dark:border-slate-700 dark:bg-slate-800/25">
                <div className="mb-3 flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm dark:bg-slate-900 dark:text-blue-300">
                    <Car size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Vehículo</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Selecciona el vehículo que ingresa al taller.</p>
                  </div>
                </div>
                {!customer ? (
                  <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 p-6 text-center text-sm text-slate-400 dark:text-slate-500">
                    Primero selecciona un cliente para ver sus vehículos.
                  </div>
                ) : loadingVehicles ? (
                  <div className="grid gap-3">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
                    ))}
                  </div>
                ) : vehiclesError ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center dark:border-red-500/30 dark:bg-red-500/10">
                    <p className="text-xs font-medium text-red-700 dark:text-red-300">{vehiclesError}</p>
                    <button
                      type="button"
                      onClick={() => setVehiclesReloadKey((value) => value + 1)}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 dark:border-red-500/30 dark:bg-slate-900 dark:text-red-300 dark:hover:bg-red-500/10"
                    >
                      <RefreshCw size={13} /> Reintentar
                    </button>
                  </div>
                ) : vehicles.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 p-6 text-center text-sm text-slate-400 dark:text-slate-500">
                    Este cliente no tiene vehículos registrados.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {vehicles.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setVehicle(v)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition',
                          vehicle?.id === v.id
                            ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/20 dark:bg-blue-500/10'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        )}
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                          <Car size={18} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-slate-900 dark:text-white">{v.plate}</span>
                          <span className="block text-xs text-slate-500 dark:text-slate-400">
                            {v.brand} {v.model} {v.year} · {v.color}
                          </span>
                        </span>
                        {vehicle?.id === v.id && (
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white">
                            <Check size={14} />
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* PASO 1: Datos de recepción */}
        {!created && step === 1 && (
          <div className="space-y-4">
            <AvisoFormulario>
              Registra el estado real del vehículo al momento de la entrada. Estos datos quedarán en la ficha digital.
            </AvisoFormulario>

            <SeccionFormulario
              title="Datos del vehículo"
              description="Kilometraje y combustible al ingresar al taller."
              icon={Car}
            >
              <CampoFormulario label="Kilometraje actual (km)" required>
                <input
                  id="mileage"
                  type="number"
                  min={0}
                  value={form.mileage}
                  onChange={(e) => setForm((f) => ({ ...f, mileage: e.target.value }))}
                  className={estiloCampo}
                  placeholder="Ej. 45200"
                />
              </CampoFormulario>
              <CampoFormulario label="Nivel de combustible">
                <div className="relative">
                  <Fuel size={17} className="pointer-events-none absolute inset-y-0 left-3 my-auto text-slate-400 dark:text-slate-500" />
                  <select
                    id="fuel"
                    value={form.fuelLevel}
                    onChange={(e) => setForm((f) => ({ ...f, fuelLevel: e.target.value }))}
                    className={cn(estiloCampo, 'pl-10')}
                  >
                    <option value="">Seleccionar...</option>
                    {FUEL_LEVELS.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
              </CampoFormulario>
            </SeccionFormulario>

            <SeccionFormulario
              title="Estado de entrada"
              description="Describe el estado exterior y general del vehículo."
              icon={ClipboardCheck}
            >
              <CampoFormulario label="Estado exterior">
                <input
                  id="exterior"
                  value={form.exteriorState}
                  onChange={(e) => setForm((f) => ({ ...f, exteriorState: e.target.value }))}
                  className={estiloCampo}
                  placeholder="Ej. Lavado regular, sin pisos"
                />
              </CampoFormulario>
              <CampoFormulario label="Estado general">
                <input
                  id="general"
                  value={form.generalState}
                  onChange={(e) => setForm((f) => ({ ...f, generalState: e.target.value }))}
                  className={estiloCampo}
                  placeholder="Ej. Operativo, sin ruidos"
                />
              </CampoFormulario>
            </SeccionFormulario>

            <SeccionFormulario
              title="Accesorios y documentos"
              description="Marca los elementos entregados con el vehículo."
              icon={ClipboardList}
              contentClassName="sm:grid-cols-1"
            >
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {ACCESSORIES.map((a) => {
                  const selected = accessories.includes(a);
                  return (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setAccessories((acc) => (selected ? acc.filter((x) => x !== a) : [...acc, a]))}
                      className={cn(
                        'flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition',
                        selected
                          ? 'border-blue-500 bg-blue-50/70 font-medium text-blue-700 dark:bg-blue-500/15 dark:text-blue-300'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300',
                      )}
                    >
                      <span className={cn(
                        'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                        selected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 dark:border-slate-600',
                      )}>
                        {selected && <Check size={11} />}
                      </span>
                      {a}
                    </button>
                  );
                })}
              </div>
            </SeccionFormulario>

            <SeccionFormulario
              title="Síntomas y observaciones"
              description="Información reportada por el cliente y notas internas."
              icon={FileText}
              contentClassName="sm:grid-cols-1"
            >
              <CampoFormulario label="Síntomas reportados por el cliente">
                <textarea
                  id="symptoms"
                  rows={3}
                  value={form.symptoms}
                  onChange={(e) => setForm((f) => ({ ...f, symptoms: e.target.value }))}
                  className={cn(estiloCampo, 'resize-none')}
                  placeholder="Ej. Ruido al frenar, se enciende la luz del motor..."
                />
              </CampoFormulario>
              <CampoFormulario label="Observaciones">
                <textarea
                  id="obs"
                  rows={2}
                  value={form.observations}
                  onChange={(e) => setForm((f) => ({ ...f, observations: e.target.value }))}
                  className={cn(estiloCampo, 'resize-none')}
                  placeholder="Notas adicionales..."
                />
              </CampoFormulario>
            </SeccionFormulario>
          </div>
        )}

        {/* PASO 2: Inspección visual */}
        {!created && step === 2 && (
          <div>
            <h2 className="mb-1 text-lg font-bold text-slate-900 dark:text-white">Inspección visual del vehículo</h2>
            <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
              Selecciona una zona del esquema, registra el daño y adjunta una fotografía. Cambia de lado (izquierda o
              derecha) para inspeccionar las puertas y espejos del otro costado.
            </p>
            {damages.length === 0 && (
              <p className="mb-5 rounded-xl border border-blue-100 bg-blue-50/60 px-3.5 py-2.5 text-xs font-medium text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
                Si el vehículo no presenta daños, puedes continuar sin registrar zonas.
              </p>
            )}
            {damages.length > 0 && <div className="mb-5" />}

            <div className="grid gap-6 lg:grid-cols-5">
              <div className="lg:col-span-3">
                <VehicleInspector
                  side={side}
                  onSideChange={handleSideChange}
                  counts={damageCounts}
                  selectedZone={selectedZone}
                  onSelectZone={handleSelectZone}
                />
              </div>

              <div className="space-y-4 lg:col-span-2">
                {selectedZone && zoneInfo ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm animate-fade-in dark:border-slate-700 dark:bg-slate-900">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400">
                        <ClipboardCheck size={16} />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">Registrar daño</p>
                        <p className="text-xs text-blue-600 dark:text-blue-400">{zoneInfo.label}</p>
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Tipo de daño</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {DAMAGE_TYPES.map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setDampType(t)}
                            className={cn(
                              'rounded-lg border px-2 py-1.5 text-xs font-medium transition',
                              dampType === t
                                ? 'border-blue-500 bg-blue-600 text-white'
                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-blue-300'
                            )}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mt-3">
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Nivel / severidad</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {SEVERITIES.map((s) => (
                          <button
                            key={s.value}
                            type="button"
                            onClick={() => setDampSeverity(s.value)}
                            className={cn(
                              'rounded-lg border px-2 py-1.5 text-xs font-semibold transition',
                              dampSeverity === s.value ? s.active : s.idle
                            )}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mt-3">
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Descripción</label>
                      <textarea
                        rows={2}
                        value={dampDesc}
                        onChange={(e) => setDampDesc(e.target.value)}
                        placeholder="Detalle del daño (opcional)"
                        className={`${estiloCampo} resize-none`}
                      />
                    </div>

                    <div className="mt-3">
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Observación</label>
                      <textarea
                        rows={2}
                        value={dampObs}
                        onChange={(e) => setDampObs(e.target.value)}
                        placeholder="Notas adicionales (opcional)"
                        className={`${estiloCampo} resize-none`}
                      />
                    </div>

                    <div className="mt-3">
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Fotografía del daño</label>
                      <input
                        ref={damagePhotoRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleDamagePhotoChange(e.target.files?.[0] || null)}
                      />
                      {dampPhotoPreview ? (
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => damagePhotoRef.current?.click()}
                            className="group block h-28 w-full overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700"
                          >
                            <img src={dampPhotoPreview} alt="Foto del daño" className="h-full w-full object-cover" />
                            <span className="absolute inset-0 flex items-center justify-center bg-slate-900/0 transition group-hover:bg-slate-900/30">
                              <Camera size={20} className="text-white opacity-0 transition group-hover:opacity-100" />
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDamagePhotoChange(null)}
                            className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white shadow transition hover:bg-red-500"
                            aria-label="Quitar foto del daño"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => damagePhotoRef.current?.click()}
                          className="flex h-28 w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500 transition hover:border-blue-400 hover:text-blue-500"
                        >
                          <Camera size={18} />
                          <span className="text-xs font-medium">Subir fotografía</span>
                        </button>
                      )}
                    </div>

                    <button
                      onClick={addDamage}
                      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500"
                    >
                      Agregar daño
                    </button>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 p-6 text-center">
                    <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-500 dark:bg-blue-500/15 dark:text-blue-400">
                      <Car size={22} />
                    </span>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Selecciona una zona del vehículo</p>
                    <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                      Haz clic sobre el esquema o en una de las fichas de zona para registrar un daño.
                    </p>
                  </div>
                )}

                {damages.length > 0 && (
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                    <p className="border-b border-slate-100 dark:border-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-900 dark:text-white">
                      Daños registrados ({damages.length})
                    </p>
                    <ul className="max-h-72 space-y-1 overflow-y-auto p-3">
                      {damages.map((d, i) => {
                        const sev = SEV_STYLE[d.severity] || SEV_STYLE.MODERADO;
                        return (
                          <li key={i} className="flex items-start gap-2.5 rounded-lg p-2 text-sm transition hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', sev.dot)} />
                            <span className="min-w-0 flex-1">
                              <span className="block font-medium text-slate-900 dark:text-white">
                                {d.zoneLabel} · {d.damageType}
                              </span>
                              <span className={cn('block text-[11px] font-semibold', sev.text)}>
                                Severidad {d.severity}
                                {d.photo && <span className="ml-1.5 font-normal text-slate-400 dark:text-slate-500">· con foto</span>}
                              </span>
                              {d.description && <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{d.description}</span>}
                              {d.observation && (
                                <span className="mt-0.5 block truncate text-xs italic text-slate-400 dark:text-slate-500">
                                  Obs: {d.observation}
                                </span>
                              )}
                            </span>
                            <button
                              onClick={() => removeDamage(i)}
                              className="rounded-lg p-1.5 text-slate-400 dark:text-slate-500 transition hover:bg-red-50 hover:text-red-500"
                              aria-label="Quitar daño"
                            >
                              <Trash2 size={15} />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
                  <Camera size={16} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Fotografías generales del vehículo</p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Adjunta una imagen por categoría para completar el expediente digital.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
                {PHOTO_CATEGORIES.map((cat, i) => (
                  <div key={cat} className="relative">
                    <input
                      ref={(el) => {
                        fileRefs.current[i] = el;
                      }}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handlePhotoChange(i, e.target.files?.[0] || null)}
                    />
                    {photoPreviews[i] ? (
                      <button
                        onClick={() => fileRefs.current[i]?.click()}
                        className="group relative block h-24 w-full overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700"
                      >
                        <img src={photoPreviews[i]!} alt={cat} className="h-full w-full object-cover" />
                        <span className="absolute inset-0 flex items-center justify-center bg-slate-900/0 transition group-hover:bg-slate-900/30">
                          <Camera size={20} className="text-white opacity-0 transition group-hover:opacity-100" />
                        </span>
                      </button>
                    ) : (
                      <button
                        onClick={() => fileRefs.current[i]?.click()}
                        className="flex h-24 w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500 transition hover:border-blue-400 hover:text-blue-500"
                      >
                        <Upload size={16} />
                        <span className="text-center text-[10px] font-medium leading-tight">{cat}</span>
                      </button>
                    )}
                    {photoPreviews[i] && (
                      <button
                        onClick={() => handlePhotoChange(i, null)}
                        className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white shadow transition hover:bg-red-500"
                        aria-label={`Quitar foto ${cat}`}
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
                Las fotos generales se archivarán en el expediente digital junto con las fotografías de cada daño.
              </p>
            </div>
          </div>
        )}

        {/* PASO 3: Confirmar */}
        {!created && step === 3 && (
          <div className="space-y-4">
            <AvisoFormulario>
              Revisa la información antes de guardar. Al confirmar se generará la ficha digital de recepción.
            </AvisoFormulario>

            <div className="grid gap-4 lg:grid-cols-2">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <div className="mb-4 flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
                    <UserRound size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Cliente y vehículo</p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Datos principales de la recepción.</p>
                  </div>
                </div>
                <p className="text-base font-semibold text-slate-900 dark:text-white">
                  {customer?.firstName} {customer?.lastName}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{customer?.documentNumber} · {customer?.phone}</p>
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-700 dark:bg-slate-800/40">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
                    <Car size={16} className="text-blue-600 dark:text-blue-300" />
                    {vehicle?.plate}
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {vehicle?.brand} {vehicle?.model} {vehicle?.year} · {vehicle?.color}
                  </p>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <div className="mb-4 flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
                    <ClipboardList size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Datos ingresados</p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Resumen de la ficha de entrada.</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ['Kilometraje', `${Number(form.mileage).toLocaleString('es-ES')} km`],
                    ['Combustible', form.fuelLevel || '—'],
                    ['Accesorios', String(accessories.length)],
                    ['Daños', String(damages.length)],
                    ['Fotografías', String(photos.filter(Boolean).length + damages.filter((d) => d.photo).length)],
                    ['Recibido por', `${user?.name || ''} ${user?.lastName || ''}`.trim() || '—'],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2 dark:border-slate-800 dark:bg-slate-800/30">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
                      <p className="mt-0.5 truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{value}</p>
                    </div>
                  ))}
                </div>
              </section>

              {damages.length > 0 && (
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 lg:col-span-2">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300">
                      <ClipboardCheck size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Resumen de la inspección</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{damages.length} daño(s) registrado(s).</p>
                    </div>
                  </div>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {damages.map((d, i) => {
                      const sev = SEV_STYLE[d.severity] || SEV_STYLE.MODERADO;
                      return (
                        <li key={i} className="flex items-start gap-2 rounded-xl border border-slate-100 px-3 py-2 text-sm dark:border-slate-800">
                          <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', sev.dot)} />
                          <span className="min-w-0">
                            <span className="block font-medium text-slate-800 dark:text-slate-100">
                              {d.zoneLabel} · {d.damageType}
                            </span>
                            <span className={cn('text-[11px] font-semibold', sev.text)}>{d.severity}</span>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}
            </div>
          </div>
        )}
        </div>
      </div>

      {!created && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronLeft size={16} /> Anterior
          </button>
          {step < 3 ? (
            <button
              onClick={() => setStep((s) => Math.min(3, s + 1))}
              disabled={continueDisabled}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Siguiente <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={saving || !canSubmit}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:from-blue-500 hover:to-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <Check size={16} />
              )}
              Guardar recepción
            </button>
          )}
        </div>
      )}
      </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingPath)}
        title="Descartar recepción"
        message="Hay datos sin guardar. Si sales ahora, se perderá la información ingresada."
        confirmLabel="Descartar y salir"
        cancelLabel="Seguir editando"
        busy={false}
        onCancel={() => setPendingPath(null)}
        onConfirm={() => {
          const destination = pendingPath;
          setPendingPath(null);
          if (destination) navigate(destination);
        }}
      />
    </div>
  );
}
