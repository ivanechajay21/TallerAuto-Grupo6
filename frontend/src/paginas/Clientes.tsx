import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Car,
  Edit2,
  Trash2,
  Phone,
  Mail,
  MessageCircle,
  MapPin,
  X,
  CreditCard,
  User,
  StickyNote,
  AlertCircle,
  Users,
  UserCheck,
  UserX,
  LayoutGrid,
  List,
  ArrowUpRight,
  UserPlus,
  Save,
  IdCard,
  Contact,
} from 'lucide-react';
import { createCustomer, updateCustomer, deleteCustomer, getPaginatedCustomers } from '../servicios/clientesServicio';
import type { Customer, CustomerStatusFilter, CustomerSummary } from '../servicios/clientesServicio';
import ResponsiveTable from '../componentes/interfaz/TablaAdaptable';
import type { ResponsiveColumn } from '../componentes/interfaz/TablaAdaptable';
import Pagination from '../componentes/interfaz/Paginacion';
import { cn } from '../lib/utilidades';
import { useToast } from '../componentes/interfaz/Avisos';
import { usePermissions } from '../contexto/ContextoPermisos';
import Modal from '../componentes/interfaz/Modal';
import ConfirmDialog from '../componentes/interfaz/DialogoConfirmacion';
import EncabezadoModulo from '../componentes/interfaz/EncabezadoModulo';
import { CampoFormulario, SeccionFormulario, estiloCampo } from '../componentes/interfaz/Formulario';
import TarjetaMetrica from '../componentes/interfaz/TarjetaMetrica';

type CustomerView = 'tabla' | 'tarjetas';

const EMPTY_SUMMARY: CustomerSummary = {
  total: 0,
  active: 0,
  inactive: 0,
  whatsapp: 0,
};

const EMPTY_FORM = {
  documentNumber: '',
  firstName: '',
  lastName: '',
  phone: '',
  whatsapp: '',
  email: '',
  address: '',
  observations: '',
  active: true,
};

type CustomerForm = typeof EMPTY_FORM;
type CustomerPayload = Omit<Customer, 'id' | 'code' | 'registrationDate'>;
type FieldName = keyof CustomerForm;

function FieldError({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <p className="mt-1 flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400" role="alert">
      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
      {error}
    </p>
  );
}

export default function Customers() {
  const toast = useToast();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission('CLIENTES:CREAR');
  const canEdit = hasPermission('CLIENTES:EDITAR');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<CustomerStatusFilter>('TODOS');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [summary, setSummary] = useState<CustomerSummary>(EMPTY_SUMMARY);
  const [reloadKey, setReloadKey] = useState(0);
  const [view, setView] = useState<CustomerView>('tabla');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<CustomerForm>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Customer | null>(null);
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [touched, setTouched] = useState<Set<FieldName>>(new Set());

  const validateField = (field: FieldName, value: string | boolean): string => {
    if (field === 'active') return '';
    if (typeof value === 'boolean') return '';
    const v = value.trim();

    if (field === 'documentNumber') {
      if (editing) return ''; // El documento no se puede modificar al editar
      if (!v) return 'El documento es obligatorio.';
      if (!/^\d{8}$|^\d{11}$/.test(v)) return 'Ingresa un DNI (8 dígitos) o RUC (11 dígitos) válido.';
      if (customers.some((c) => c.documentNumber.toLowerCase() === v.toLowerCase()))
        return 'Ya existe un cliente con este documento.';
      return '';
    }

    if (field === 'firstName' || field === 'lastName') {
      const label = field === 'firstName' ? 'nombre' : 'apellido';
      if (!v) return `El ${label} es obligatorio.`;
      if (v.length < 2) return `El ${label} debe tener al menos 2 caracteres.`;
      if (!/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ']+(?:[\s'\\-][A-Za-zÁÉÍÓÚÜÑáéíóúüñ']+)*$/.test(v))
        return `El ${label} solo puede contener letras.`;
      return '';
    }

    if (field === 'phone' || field === 'whatsapp') {
      if (!v) return '';
      if (!/^\+?[\d\s()\\-]{6,15}$/.test(v)) return 'Ingresa un número de teléfono válido.';
      return '';
    }

    if (field === 'email') {
      if (!v) return '';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'Correo electrónico inválido.';
      return '';
    }

    if (field === 'address') {
      if (!v) return '';
      if (v.length < 3) return 'La dirección es muy corta.';
      return '';
    }

    return '';
  };

  const handleFieldChange = (field: FieldName, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value } as CustomerForm));
    if (touched.has(field) || errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: validateField(field, value) }));
    }
  };

  const handleFieldBlur = (field: FieldName) => {
    setTouched((prev) => new Set(prev).add(field));
    setErrors((prev) => ({ ...prev, [field]: validateField(field, formData[field]) }));
  };

  const focusFirstError = (errs: Partial<Record<FieldName, string>>) => {
    const order: FieldName[] = [
      'documentNumber',
      'firstName',
      'lastName',
      'phone',
      'whatsapp',
      'email',
      'address',
      'observations',
    ];
    const first = order.find((f) => errs[f]);
    if (first) document.getElementById(`field-${first}`)?.focus();
  };

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await getPaginatedCustomers({
          page: page - 1,
          size: 9,
          search,
          status: statusFilter,
          sort: 'reciente',
        });
        if (response.totalPages > 0 && page > response.totalPages) {
          setPage(response.totalPages);
          return;
        }
        setCustomers(response.content);
        setTotalPages(response.totalPages);
        setTotalElements(response.totalElements);
        setSummary(response.summary ?? EMPTY_SUMMARY);
      } catch {
        toast.error('Error', 'No se pudieron cargar los clientes.');
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => window.clearTimeout(timer);
    // El toast no se incluye para evitar recargas por identidad.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, statusFilter, reloadKey]);

  const refresh = () => setReloadKey((value) => value + 1);
  const stats = summary;

  const openCreate = () => {
    setEditing(null);
    setFormData({ ...EMPTY_FORM });
    setErrors({});
    setTouched(new Set());
    setIsModalOpen(true);
  };

  const openEdit = (c: Customer) => {
    setEditing(c);
    setFormData({
      documentNumber: c.documentNumber,
      firstName: c.firstName,
      lastName: c.lastName,
      phone: c.phone || '',
      whatsapp: c.whatsapp || '',
      email: c.email || '',
      address: c.address || '',
      observations: c.observations || '',
      active: c.active,
    });
    setErrors({});
    setTouched(new Set());
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = Object.fromEntries(
      (Object.keys(formData) as FieldName[]).map((f) => [f, validateField(f, formData[f])])
    ) as Partial<Record<FieldName, string>>;
    setErrors(errs);
    setTouched(new Set(Object.keys(formData) as FieldName[]));
    if (Object.values(errs).some(Boolean)) {
      focusFirstError(errs);
      return;
    }
    setSaving(true);
    const payload: CustomerPayload = {
      documentNumber: formData.documentNumber.trim(),
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      phone: formData.phone.trim(),
      whatsapp: formData.whatsapp.trim(),
      email: formData.email.trim(),
      address: formData.address.trim(),
      observations: formData.observations.trim(),
      active: formData.active,
    };
    try {
      if (editing?.id) {
        const updated = await updateCustomer(editing.id, payload);
        toast.success('Cliente actualizado', `${updated.firstName} ${updated.lastName} · ${updated.code || ''}`);
        refresh();
      } else {
        const created = await createCustomer(payload);
        toast.success('Cliente registrado', `${created.firstName} ${created.lastName} · ${created.code || ''}`);
        setPage(1);
        refresh();
      }
      setIsModalOpen(false);
      setEditing(null);
      setFormData({ ...EMPTY_FORM });
    } catch (err: any) {
      toast.error(
        editing ? 'No se pudo actualizar' : 'No se pudo registrar',
        err?.response?.data?.message || err?.message || 'Verifica los datos e inténtalo de nuevo.'
      );
    } finally {
      setSaving(false);
    }
  };

  const removeCustomer = async () => {
    if (!confirmDelete) return;
    const name = `${confirmDelete.firstName} ${confirmDelete.lastName}`;
    setDeletingId(confirmDelete.id ?? null);
    try {
      await deleteCustomer(confirmDelete.id!);
      toast.success('Cliente desactivado', `${name} ya no está activo en el directorio.`);
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

  const columns: ResponsiveColumn<Customer>[] = [
    {
      key: 'name',
      header: 'Cliente',
      render: (c) => (
        <div className="flex items-center">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white shadow-sm">
            {initials(c)}
          </div>
          <div className="ml-4">
            <div className="font-semibold text-slate-900 dark:text-white">
              {c.firstName} {c.lastName}
            </div>
            <div className="text-sm text-slate-400 dark:text-slate-500">
              {c.code ? `${c.code} · ` : ''}Cliente desde{' '}
              {c.registrationDate ? new Date(c.registrationDate).toLocaleDateString('es-ES') : '—'}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'doc',
      header: 'Documento',
      render: (c) => <span className="font-mono text-slate-700 dark:text-slate-200">{c.documentNumber}</span>,
    },
    {
      key: 'contact',
      header: 'Contacto',
      render: (c) => (
        <div className="space-y-1">
          {c.phone ? (
            <a
              href={phoneHref(c.phone)}
              className="flex items-center gap-1.5 text-slate-600 transition hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400"
            >
              <Phone size={13} className="text-slate-400 dark:text-slate-500" /> {c.phone}
            </a>
          ) : (
            <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
              <Phone size={13} /> Sin teléfono
            </div>
          )}
          {c.whatsapp && (
            <a
              href={whatsappHref(c.whatsapp)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 font-medium text-emerald-600 transition hover:text-emerald-700 dark:text-emerald-400"
            >
              <MessageCircle size={13} /> {c.whatsapp}
            </a>
          )}
          {c.email ? (
            <a
              href={`mailto:${c.email}`}
              className="flex max-w-[220px] items-center gap-1.5 truncate text-slate-500 transition hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
            >
              <Mail size={13} /> {c.email}
            </a>
          ) : (
            <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
              <Mail size={13} /> Sin correo
            </div>
          )}
          {c.address && (
            <div className="flex max-w-[220px] items-center gap-1.5 truncate text-slate-400 dark:text-slate-500">
              <MapPin size={13} /> {c.address}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (c) => (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset',
            statusStyles(c.active)
          )}
        >
          <span className={cn('h-1.5 w-1.5 rounded-full', c.active ? 'bg-emerald-500' : 'bg-red-500')} />
          {c.active ? 'Activo' : 'Inactivo'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (c) => (
        <div className="flex justify-end gap-1">
          {c.whatsapp && (
            <a
              href={whatsappHref(c.whatsapp)}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg p-2 text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-600 dark:text-slate-500 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400"
              title="Abrir WhatsApp"
              aria-label={`Abrir WhatsApp de ${c.firstName} ${c.lastName}`}
            >
              <MessageCircle size={18} />
            </a>
          )}
          <button
            onClick={() => navigate(`/vehiculos?q=${encodeURIComponent(`${c.firstName} ${c.lastName}`)}`)}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600 dark:text-slate-500 dark:hover:bg-blue-500/10 dark:hover:text-blue-400"
            title="Ver vehículos"
          >
            <Car size={18} />
          </button>
          {canEdit && (
            <button
              onClick={() => openEdit(c)}
              className="rounded-lg p-2 text-slate-400 dark:text-slate-500 transition hover:bg-blue-50 hover:text-blue-600"
              title="Editar" aria-label={`Editar ${c.firstName} ${c.lastName}`}
            >
              <Edit2 size={18} />
            </button>
          )}
          {hasPermission('CLIENTES:ELIMINAR') && (
            <button
              onClick={() => setConfirmDelete(c)}
              disabled={deletingId === c.id}
              className="rounded-lg p-2 text-slate-400 dark:text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
              title="Eliminar" aria-label={`Desactivar ${c.firstName} ${c.lastName}`}
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
      ),
    },
  ];

  const initials = (c: Customer) => `${c.firstName.charAt(0)}${c.lastName.charAt(0)}`.toUpperCase();
  const phoneHref = (value?: string) => `tel:${(value || '').replace(/[^\d+]/g, '')}`;
  const whatsappHref = (value?: string) => `https://wa.me/${(value || '').replace(/\D/g, '')}`;

  const statusStyles = (active: boolean) =>
    active
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/15 dark:text-emerald-300'
      : 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/15 dark:text-red-300';

  const inputClass = (error?: string) =>
    cn(
      estiloCampo,
      'pl-10',
      error && 'border-red-400 bg-red-50/40 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500/50 dark:bg-red-500/10'
    );
  const textareaClass = (error?: string) =>
    cn(
      estiloCampo,
      'resize-none',
      error && 'border-red-400 bg-red-50/40 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500/50 dark:bg-red-500/10'
    );

  const statCards = [
    {
      label: 'Total de clientes',
      value: stats.total,
      icon: Users,
      tone: 'blue',
      filter: 'TODOS' as CustomerStatusFilter,
    },
    {
      label: 'Clientes activos',
      value: stats.active,
      icon: UserCheck,
      tone: 'emerald',
      filter: 'ACTIVOS' as CustomerStatusFilter,
    },
    {
      label: 'Clientes inactivos',
      value: stats.inactive,
      icon: UserX,
      tone: 'red',
      filter: 'INACTIVOS' as CustomerStatusFilter,
    },
    {
      label: 'Con WhatsApp',
      value: stats.whatsapp,
      icon: MessageCircle,
      tone: 'violet',
      filter: null,
    },
  ] as const;

  return (
    <div className="space-y-6">
      <EncabezadoModulo
        eyebrow="Relación con clientes"
        title="Clientes"
        description="Directorio centralizado con contacto rápido, vehículos y estado de cada cliente."
        icon={Users}
        actions={canCreate ? (
          <button
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nuevo cliente
          </button>
        ) : undefined}
        meta={(
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
            {stats.total} cliente(s)
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
                <Search className="h-4 w-4 text-slate-400 dark:text-slate-500" aria-hidden="true" />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="block w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
                placeholder="Buscar por nombre, documento, teléfono o correo..."
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
              {(['TODOS', 'ACTIVOS', 'INACTIVOS'] as CustomerStatusFilter[]).map((status) => (
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
                {totalElements} {totalElements === 1 ? 'cliente' : 'clientes'}
              </span>
              <div className="ml-auto flex rounded-xl border border-slate-200 p-0.5 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setView('tabla')}
                  className={cn(
                    'rounded-lg p-1.5 transition',
                    view === 'tabla'
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20 dark:bg-blue-500 dark:text-white'
                      : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  )}
                  title="Vista de tabla"
                  aria-label="Vista de tabla"
                >
                  <List size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setView('tarjetas')}
                  className={cn(
                    'rounded-lg p-1.5 transition',
                    view === 'tarjetas'
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20 dark:bg-blue-500 dark:text-white'
                      : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  )}
                  title="Vista de tarjetas"
                  aria-label="Vista de tarjetas"
                >
                  <LayoutGrid size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {view === 'tabla' ? (
          <>
            <ResponsiveTable
              columns={columns}
              rows={customers}
              keyField={(c) => c.id || c.documentNumber}
              emptyMessage={loading ? 'Cargando clientes...' : 'No se encontraron clientes con los filtros seleccionados.'}
              pageSize={0}
              itemLabel="clientes"
            />
            <Pagination
              page={page}
              pageCount={totalPages}
              onChange={setPage}
              total={totalElements}
              from={totalElements === 0 ? 0 : (page - 1) * 9 + 1}
              to={Math.min(totalElements, (page - 1) * 9 + customers.length)}
              itemLabel="clientes"
            />
          </>
        ) : totalElements === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
            <UserX size={30} className="mb-2 text-slate-300 dark:text-slate-600" />
            <p className="text-sm text-slate-400 dark:text-slate-500">
              No se encontraron clientes con los filtros seleccionados.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 bg-slate-50/60 p-4 dark:bg-slate-800/30 sm:grid-cols-2 xl:grid-cols-3">
              {customers.map((c) => (
                <article
                  key={c.id || c.documentNumber}
                  className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-500/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white shadow-sm">
                        {initials(c)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-bold text-slate-900 dark:text-white">
                          {c.firstName} {c.lastName}
                        </h3>
                        <p className="truncate font-mono text-[11px] text-slate-400 dark:text-slate-500">
                          {c.code || 'Sin código'} · {c.documentNumber}
                        </p>
                      </div>
                    </div>
                    <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset', statusStyles(c.active))}>
                      <span className={cn('h-1.5 w-1.5 rounded-full', c.active ? 'bg-emerald-500' : 'bg-red-500')} />
                      {c.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>

                  <div className="mt-4 space-y-1.5 text-sm">
                    {c.phone && (
                      <a href={phoneHref(c.phone)} className="flex items-center gap-2 text-slate-600 transition hover:text-blue-600 dark:text-slate-300">
                        <Phone size={14} className="text-slate-400" /> {c.phone}
                      </a>
                    )}
                    {c.whatsapp && (
                      <a href={whatsappHref(c.whatsapp)} target="_blank" rel="noreferrer" className="flex items-center gap-2 font-medium text-emerald-600 transition hover:text-emerald-700 dark:text-emerald-400">
                        <MessageCircle size={14} /> {c.whatsapp}
                      </a>
                    )}
                    {c.email && (
                      <a href={`mailto:${c.email}`} className="flex items-center gap-2 truncate text-slate-500 transition hover:text-blue-600 dark:text-slate-400">
                        <Mail size={14} className="shrink-0" /> <span className="truncate">{c.email}</span>
                      </a>
                    )}
                    {c.address && (
                      <p className="flex items-center gap-2 truncate text-slate-400 dark:text-slate-500">
                        <MapPin size={14} className="shrink-0" /> <span className="truncate">{c.address}</span>
                      </p>
                    )}
                  </div>

                  {c.observations && (
                    <p className="mt-3 line-clamp-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                      {c.observations}
                    </p>
                  )}

                  <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => navigate(`/vehiculos?q=${encodeURIComponent(`${c.firstName} ${c.lastName}`)}`)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 dark:bg-blue-500/15 dark:text-blue-300"
                    >
                      <Car size={14} /> Ver vehículos <ArrowUpRight size={12} />
                    </button>
                    <div className="flex items-center gap-1">
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => openEdit(c)}
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/10 dark:hover:text-blue-400"
                          title="Editar cliente"
                          aria-label={`Editar ${c.firstName} ${c.lastName}`}
                        >
                          <Edit2 size={16} />
                        </button>
                      )}
                      {hasPermission('CLIENTES:ELIMINAR') && (
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(c)}
                          disabled={deletingId === c.id}
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                          title="Desactivar cliente"
                          aria-label={`Desactivar ${c.firstName} ${c.lastName}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <Pagination
              page={page}
              pageCount={totalPages}
              onChange={setPage}
              total={totalElements}
              from={totalElements === 0 ? 0 : (page - 1) * 9 + 1}
              to={Math.min(totalElements, (page - 1) * 9 + customers.length)}
              itemLabel="clientes"
            />
          </>
        )}
      </div>

      {isModalOpen && (
        <Modal
          title={editing ? 'Editar cliente' : 'Registrar nuevo cliente'}
          description={editing ? 'Actualiza los datos de contacto y preferencias del cliente.' : 'Crea la ficha del cliente para asociar vehículos, citas y órdenes.'}
          icon={UserPlus}
          size="lg"
          onClose={() => setIsModalOpen(false)}
          footer={
            <>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="customer-form"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save size={16} />
                {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Registrar cliente'}
              </button>
            </>
          }
        >
          <form id="customer-form" onSubmit={handleSubmit} noValidate className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-700 dark:bg-slate-800/30">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {editing ? `Cliente ${formData.firstName} ${formData.lastName}`.trim() : 'Ficha del cliente'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Los campos con <span className="text-red-500">*</span> son obligatorios.
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {Math.round(
                      ([formData.documentNumber, formData.firstName, formData.lastName, formData.phone, formData.email].filter(Boolean).length / 5) * 100
                    )}%
                  </p>
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">Completado</p>
                </div>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all"
                  style={{
                    width: `${Math.round(
                      ([formData.documentNumber, formData.firstName, formData.lastName, formData.phone, formData.email].filter(Boolean).length / 5) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>

            <SeccionFormulario
              title="Identificación"
              description="Documento, nombres y apellidos del cliente."
              icon={IdCard}
            >
              <CampoFormulario label="DNI / RUC" required className="sm:col-span-2">
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex w-10 items-center justify-center">
                    <CreditCard className={cn('h-4 w-4', errors.documentNumber ? 'text-red-400' : 'text-slate-400 dark:text-slate-500')} aria-hidden="true" />
                  </div>
                  <input
                    id="field-documentNumber"
                    type="text"
                    inputMode="numeric"
                    maxLength={11}
                    disabled={!!editing}
                    value={formData.documentNumber}
                    onChange={(e) => handleFieldChange('documentNumber', e.target.value)}
                    onBlur={() => handleFieldBlur('documentNumber')}
                    placeholder="Ej. 45678912 (DNI) o 20123456789 (RUC)"
                    className={inputClass(errors.documentNumber)}
                  />
                </div>
                <FieldError error={errors.documentNumber} />
              </CampoFormulario>
              <CampoFormulario label="Nombres" required>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex w-10 items-center justify-center">
                    <User className={cn('h-4 w-4', errors.firstName ? 'text-red-400' : 'text-slate-400 dark:text-slate-500')} aria-hidden="true" />
                  </div>
                  <input
                    id="field-firstName"
                    type="text"
                    maxLength={100}
                    value={formData.firstName}
                    onChange={(e) => handleFieldChange('firstName', e.target.value)}
                    onBlur={() => handleFieldBlur('firstName')}
                    placeholder="Ej. María Fernanda"
                    className={inputClass(errors.firstName)}
                  />
                </div>
                <FieldError error={errors.firstName} />
              </CampoFormulario>
              <CampoFormulario label="Apellidos" required>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex w-10 items-center justify-center">
                    <User className={cn('h-4 w-4', errors.lastName ? 'text-red-400' : 'text-slate-400 dark:text-slate-500')} aria-hidden="true" />
                  </div>
                  <input
                    id="field-lastName"
                    type="text"
                    maxLength={100}
                    value={formData.lastName}
                    onChange={(e) => handleFieldChange('lastName', e.target.value)}
                    onBlur={() => handleFieldBlur('lastName')}
                    placeholder="Ej. González Pérez"
                    className={inputClass(errors.lastName)}
                  />
                </div>
                <FieldError error={errors.lastName} />
              </CampoFormulario>
            </SeccionFormulario>

            <SeccionFormulario
              title="Datos de contacto"
              description="Canales de contacto y dirección del cliente."
              icon={Contact}
            >
              <CampoFormulario label="Teléfono">
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex w-10 items-center justify-center">
                    <Phone className={cn('h-4 w-4', errors.phone ? 'text-red-400' : 'text-slate-400 dark:text-slate-500')} aria-hidden="true" />
                  </div>
                  <input
                    id="field-phone"
                    type="tel"
                    maxLength={15}
                    value={formData.phone}
                    onChange={(e) => handleFieldChange('phone', e.target.value)}
                    onBlur={() => handleFieldBlur('phone')}
                    placeholder="Ej. 987 654 321"
                    className={inputClass(errors.phone)}
                  />
                </div>
                <FieldError error={errors.phone} />
              </CampoFormulario>
              <CampoFormulario label="WhatsApp">
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex w-10 items-center justify-center">
                    <MessageCircle className={cn('h-4 w-4', errors.whatsapp ? 'text-red-400' : 'text-emerald-500')} aria-hidden="true" />
                  </div>
                  <input
                    id="field-whatsapp"
                    type="tel"
                    maxLength={15}
                    value={formData.whatsapp}
                    onChange={(e) => handleFieldChange('whatsapp', e.target.value)}
                    onBlur={() => handleFieldBlur('whatsapp')}
                    placeholder="Ej. 987 654 321"
                    className={inputClass(errors.whatsapp)}
                  />
                </div>
                <FieldError error={errors.whatsapp} />
              </CampoFormulario>
              <CampoFormulario label="Correo electrónico">
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex w-10 items-center justify-center">
                    <Mail className={cn('h-4 w-4', errors.email ? 'text-red-400' : 'text-slate-400 dark:text-slate-500')} aria-hidden="true" />
                  </div>
                  <input
                    id="field-email"
                    type="email"
                    maxLength={150}
                    value={formData.email}
                    onChange={(e) => handleFieldChange('email', e.target.value)}
                    onBlur={() => handleFieldBlur('email')}
                    placeholder="Ej. cliente@correo.com"
                    className={inputClass(errors.email)}
                  />
                </div>
                <FieldError error={errors.email} />
              </CampoFormulario>
              <CampoFormulario label="Dirección">
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex w-10 items-center justify-center">
                    <MapPin className={cn('h-4 w-4', errors.address ? 'text-red-400' : 'text-slate-400 dark:text-slate-500')} aria-hidden="true" />
                  </div>
                  <input
                    id="field-address"
                    type="text"
                    maxLength={255}
                    value={formData.address}
                    onChange={(e) => handleFieldChange('address', e.target.value)}
                    onBlur={() => handleFieldBlur('address')}
                    placeholder="Ej. Av. Los Olivos 123, Lima"
                    className={inputClass(errors.address)}
                  />
                </div>
                <FieldError error={errors.address} />
              </CampoFormulario>
            </SeccionFormulario>

            <SeccionFormulario
              title="Notas y estado"
              description="Preferencias, observaciones y disponibilidad del cliente."
              icon={StickyNote}
              contentClassName="sm:grid-cols-1"
            >
              <CampoFormulario label="Observaciones">
                <textarea
                  rows={3}
                  maxLength={500}
                  value={formData.observations}
                  onChange={(e) => handleFieldChange('observations', e.target.value)}
                  className={textareaClass()}
                  placeholder="Preferencias, notas de contacto o información relevante..."
                />
              </CampoFormulario>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white/60 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900/30">
                <input
                  id="cust-active"
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => handleFieldChange('active', e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-600"
                />
                <span>
                  <span className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Cliente activo</span>
                  <span className="block text-[11px] text-slate-400 dark:text-slate-500">Puede recibir citas y órdenes de trabajo.</span>
                </span>
              </label>
            </SeccionFormulario>
          </form>
        </Modal>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title="Eliminar cliente"
        message={
          confirmDelete && (
            <>
              ¿Desactivar al cliente{' '}
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {confirmDelete.firstName} {confirmDelete.lastName}
              </span>
              ? El registro se conserva en el sistema como inactivo y podrás reactivarlo editándolo.
            </>
          )
        }
        confirmLabel="Eliminar"
        busy={deletingId !== null}
        onConfirm={removeCustomer}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}