import { useEffect, useMemo, useState } from 'react';
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
} from 'lucide-react';
import { createCustomer, updateCustomer, deleteCustomer, getAllCustomers } from '../services/customerService';
import type { Customer } from '../services/customerService';
import ResponsiveTable from '../components/ui/ResponsiveTable';
import type { ResponsiveColumn } from '../components/ui/ResponsiveTable';
import { cn } from '../lib/utils';
import { useToast } from '../components/ui/Toast';
import { usePermissions } from '../context/PermissionContext';
import ConfirmDialog from '../components/ui/ConfirmDialog';

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
    <p className="mt-1 flex items-center gap-1 text-xs font-medium text-red-600" role="alert">
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
  const [search, setSearch] = useState('');
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

  const fetchCustomers = async () => {
    try {
      setCustomers(await getAllCustomers());
    } catch {
      toast.error('Error', 'No se pudieron cargar los clientes.');
    }
  };

  useEffect(() => {
    fetchCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
        c.documentNumber.includes(q) ||
        (c.code || '').toLowerCase().includes(q)
    );
  }, [customers, search]);

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
        setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        toast.success('Cliente actualizado', `${updated.firstName} ${updated.lastName} · ${updated.code || ''}`);
      } else {
        const created = await createCustomer(payload);
        setCustomers((prev) => [created, ...prev]);
        toast.success('Cliente registrado', `${created.firstName} ${created.lastName} · ${created.code || ''}`);
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
      await fetchCustomers();
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
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-lg font-semibold text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
            {c.firstName.charAt(0)}
          </div>
          <div className="ml-4">
            <div className="font-medium text-slate-900 dark:text-white">
              {c.firstName} {c.lastName}
            </div>
            <div className="text-sm text-slate-400 dark:text-slate-500">
              {c.code ? `${c.code} · ` : ''}Reg: {c.registrationDate ? new Date(c.registrationDate).toLocaleDateString('es-ES') : '—'}
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
        <div className="space-y-0.5">
          <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
            <Phone size={13} className="text-slate-400 dark:text-slate-500" /> {c.phone || '—'}
          </div>
          {c.whatsapp && (
            <div className="flex items-center gap-1 text-emerald-600">
              <MessageCircle size={13} /> {c.whatsapp}
            </div>
          )}
          <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
            <Mail size={13} /> {c.email || '—'}
          </div>
          {c.address && (
            <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
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
            'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset',
            c.active
              ? 'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-500/15 dark:text-green-400'
              : 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/15 dark:text-red-400'
          )}
        >
          {c.active ? 'Activo' : 'Inactivo'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (c) => (
        <div className="flex justify-end gap-2">
          <button
            onClick={() => navigate(`/vehiculos?q=${encodeURIComponent(`${c.firstName} ${c.lastName}`)}`)}
            className="rounded-lg p-2 text-slate-400 dark:text-slate-500 transition hover:bg-blue-50 hover:text-blue-600"
            title="Ver vehículos"
          >
            <Car size={18} />
          </button>
          {canEdit && (
            <button
              onClick={() => openEdit(c)}
              className="rounded-lg p-2 text-slate-400 dark:text-slate-500 transition hover:bg-blue-50 hover:text-blue-600"
              title="Editar"
            >
              <Edit2 size={18} />
            </button>
          )}
          {hasPermission('CLIENTES:ELIMINAR') && (
            <button
              onClick={() => setConfirmDelete(c)}
              disabled={deletingId === c.id}
              className="rounded-lg p-2 text-slate-400 dark:text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
              title="Eliminar"
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
      ),
    },
  ];

  const inputClass = (error?: string) =>
    cn(
      'block w-full rounded-xl border bg-white dark:bg-slate-900 px-3 py-2.5 pl-10 text-slate-900 dark:text-white outline-none transition placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2',
      error
        ? 'border-red-400 bg-red-50/40 focus:border-red-500 focus:ring-red-500/20'
        : 'border-slate-300 dark:border-slate-600 focus:border-blue-600 focus:ring-blue-600/20'
    );
  const textareaClass = (error?: string) =>
    cn(
      'block w-full resize-none rounded-xl border bg-white dark:bg-slate-900 px-3 py-2.5 text-slate-900 dark:text-white outline-none transition placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2',
      error
        ? 'border-red-400 bg-red-50/40 focus:border-red-500 focus:ring-red-500/20'
        : 'border-slate-300 dark:border-slate-600 focus:border-blue-600 focus:ring-blue-600/20'
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Clientes</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Gestiona el directorio de clientes del taller.</p>
        </div>
        {canCreate && (
          <button
            onClick={openCreate}
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500"
          >
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Nuevo Cliente
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 dark:border-slate-700 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-slate-400 dark:text-slate-500" aria-hidden="true" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full rounded-lg border border-slate-300 dark:border-slate-600 py-2 pl-10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 sm:text-sm"
              placeholder="Buscar por nombre o documento..."
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500 dark:text-slate-400">{filtered.length} registros</span>
          </div>
        </div>

        <ResponsiveTable
          columns={columns}
          rows={filtered}
          keyField={(c) => c.id || c.documentNumber}
          emptyMessage="No se encontraron clientes."
          pageSize={10}
          itemLabel="clientes"
        />
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-lg animate-slide-up overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {editing ? 'Editar Cliente' : 'Registrar Nuevo Cliente'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  DNI / RUC <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex w-10 items-center justify-center">
                    <CreditCard
                      className={cn('h-4 w-4', errors.documentNumber ? 'text-red-400' : 'text-slate-400 dark:text-slate-500')}
                      aria-hidden="true"
                    />
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
                    className={cn(inputClass(errors.documentNumber), editing && 'cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500')}
                  />
                </div>
                <FieldError error={errors.documentNumber} />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                    Nombres <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex w-10 items-center justify-center">
                      <User
                        className={cn('h-4 w-4', errors.firstName ? 'text-red-400' : 'text-slate-400 dark:text-slate-500')}
                        aria-hidden="true"
                      />
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
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                    Apellidos <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex w-10 items-center justify-center">
                      <User
                        className={cn('h-4 w-4', errors.lastName ? 'text-red-400' : 'text-slate-400 dark:text-slate-500')}
                        aria-hidden="true"
                      />
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
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Teléfono</label>
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
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">WhatsApp</label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex w-10 items-center justify-center">
                      <MessageCircle
                        className={cn('h-4 w-4', errors.whatsapp ? 'text-red-400' : 'text-emerald-500')}
                        aria-hidden="true"
                      />
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
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Correo electrónico</label>
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
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Dirección</label>
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
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Observaciones</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex w-10 items-center justify-center">
                    <StickyNote className="h-4 w-4 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                  </div>
                  <textarea
                    rows={2}
                    maxLength={500}
                    value={formData.observations}
                    onChange={(e) => handleFieldChange('observations', e.target.value)}
                    className={cn(textareaClass(), 'pl-10')}
                    placeholder="Notas voluntarias sobre el cliente..."
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="cust-active"
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => handleFieldChange('active', e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="cust-active" className="text-sm text-slate-700 dark:text-slate-200">
                  Cliente activo
                </label>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-500 disabled:opacity-60"
                >
                  {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
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