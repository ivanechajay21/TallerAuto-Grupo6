import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Building2,
  Mail,
  Bell,
  Database,
  Upload,
  X,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Check,
  Wrench,
  Lock,
  Info,
  Settings2,
} from 'lucide-react';
import type { FC } from 'react';
import { useShopSettings } from '../contexto/ContextoConfiguracion';
import { usePermissions } from '../contexto/ContextoPermisos';
import { useToast } from '../componentes/interfaz/Avisos';
import Modal from '../componentes/interfaz/Modal';
import ConfirmDialog from '../componentes/interfaz/DialogoConfirmacion';
import EncabezadoModulo from '../componentes/interfaz/EncabezadoModulo';
import { AvisoFormulario, CampoFormulario, SeccionFormulario, estiloCampo } from '../componentes/interfaz/Formulario';
import PestanasModulo from '../componentes/interfaz/PestanasModulo';
import ResponsiveTable from '../componentes/interfaz/TablaAdaptable';
import type { ResponsiveColumn } from '../componentes/interfaz/TablaAdaptable';
import { cn } from '../lib/utilidades';
import {
  getCatalog,
  createCatalogItem,
  updateCatalogItem,
  deleteCatalogItem,
  getAllServicesCatalog,
  createServiceCatalog,
  updateServiceCatalog,
  testEmailConfiguration,
  CATALOG_TIPOS,
} from '../servicios/configuracionServicio';
import type { CatalogItem, CatalogTipo, ServiceCatalog, Settings } from '../servicios/configuracionServicio';

type Tab = 'taller' | 'correo' | 'notifs' | 'sistema';

const TABS: {
  id: Tab;
  label: string;
  description: string;
  icon: FC<{ size?: number; className?: string }>;
}[] = [
  { id: 'taller', label: 'Datos del taller', description: 'Identidad, contacto y logo', icon: Building2 },
  { id: 'correo', label: 'Correo saliente', description: 'SMTP y remitente de avisos', icon: Mail },
  { id: 'notifs', label: 'Notificaciones', description: 'Eventos y alertas automáticas', icon: Bell },
  { id: 'sistema', label: 'Sistema', description: 'Catálogos y trazabilidad', icon: Database },
];

const inputCls = estiloCampo;
const labelCls = 'mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200';

const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:opacity-60';

function Toggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label ?? 'Activar o desactivar'}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-6 w-11 shrink-0 rounded-full transition-colors',
        checked ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700',
        disabled && 'cursor-not-allowed opacity-60'
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all',
          checked ? 'left-[22px]' : 'left-0.5'
        )}
      />
    </button>
  );
}

function downscaleImage(file: File, maxDim: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('canvas sin contexto'));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject(new Error('imagen inválida'));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error('no se pudo leer el archivo'));
    reader.readAsDataURL(file);
  });
}

function ServicesManager({ readonly }: { readonly: boolean }) {
  const toast = useToast();
  const [services, setServices] = useState<ServiceCatalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<ServiceCatalog | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    code: '',
    name: '',
    category: '',
    defaultPrice: '',
    estimatedDurationMinutes: '',
    active: true,
  });

  const load = async () => {
    setLoading(true);
    try {
      setServices(await getAllServicesCatalog(true));
    } catch {
      toast.error('Error', 'No se pudo cargar el catálogo de servicios.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ code: '', name: '', category: '', defaultPrice: '', estimatedDurationMinutes: '', active: true });
    setModal(true);
  };

  const openEdit = (s: ServiceCatalog) => {
    setEditing(s);
    setForm({
      code: s.code,
      name: s.name,
      category: s.category || '',
      defaultPrice: s.defaultPrice != null ? String(s.defaultPrice) : '',
      estimatedDurationMinutes:
        s.estimatedDurationMinutes != null ? String(s.estimatedDurationMinutes) : '',
      active: s.active,
    });
    setModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Validación', 'El nombre del servicio es obligatorio.');
      return;
    }
    if (!editing && !form.code.trim()) {
      toast.error('Validación', 'El código del servicio es obligatorio.');
      return;
    }
    const price = form.defaultPrice === '' ? undefined : Number(form.defaultPrice);
    const duration = form.estimatedDurationMinutes === '' ? undefined : Number(form.estimatedDurationMinutes);
    if (price != null && (!Number.isFinite(price) || price < 0)) {
      toast.error('Validación', 'La tarifa debe ser un número mayor o igual a cero.');
      return;
    }
    if (duration != null && (!Number.isFinite(duration) || duration < 0)) {
      toast.error('Validación', 'La duración debe ser un número mayor o igual a cero.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category.trim() || undefined,
        defaultPrice: price,
        estimatedDurationMinutes: duration,
        active: form.active,
      };
      if (editing) {
        await updateServiceCatalog(editing.id, payload);
        toast.success('Servicio actualizado', form.name.trim());
      } else {
        await createServiceCatalog({ ...payload, code: form.code.trim().toUpperCase() });
        toast.success('Servicio creado', form.name.trim());
      }
      setModal(false);
      load();
    } catch (err: any) {
      toast.error('No se pudo guardar', err?.response?.data?.message || 'Verifica los datos.');
    } finally {
      setSaving(false);
    }
  };

  const serviceColumns: ResponsiveColumn<ServiceCatalog>[] = [
    {
      key: 'code',
      header: 'Código',
      hideOnMobile: true,
      render: (service) => <span className="font-mono text-xs text-slate-500">{service.code}</span>,
    },
    {
      key: 'name',
      header: 'Servicio',
      render: (service) => (
        <div>
          <p className="font-semibold text-slate-800 dark:text-slate-100">{service.name}</p>
          <p className="text-xs text-slate-400">{service.category || 'Sin categoría'}</p>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Categoría',
      hideOnMobile: true,
      render: (service) => <span className="text-slate-500">{service.category || '—'}</span>,
    },
    {
      key: 'price',
      header: 'Tarifa (S/)',
      className: 'text-right',
      render: (service) => (
        <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-200">
          {service.defaultPrice != null ? Number(service.defaultPrice).toLocaleString('es-ES') : '—'}
        </span>
      ),
    },
    {
      key: 'duration',
      header: 'Min.',
      className: 'text-right',
      hideOnMobile: true,
      render: (service) => (
        <span className="tabular-nums text-slate-500">
          {service.estimatedDurationMinutes != null ? `${service.estimatedDurationMinutes} min` : '—'}
        </span>
      ),
    },
    {
      key: 'active',
      header: 'Estado',
      render: (service) => (
        <span className={cn(
          'rounded-full px-2 py-1 text-[10px] font-bold',
          service.active
            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
        )}>
          {service.active ? 'ACTIVO' : 'INACTIVO'}
        </span>
      ),
    },
    ...(!readonly ? [{
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (service: ServiceCatalog) => (
        <button
          type="button"
          onClick={() => openEdit(service)}
          className="rounded-lg p-2 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/10 dark:hover:text-blue-400"
          title="Editar servicio"
          aria-label={`Editar ${service.name}`}
        >
          <Pencil size={15} />
        </button>
      ),
    }] : []),
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Catálogo de servicios</h4>
          <p className="text-xs text-slate-400">Servicios que se ofrecen en el taller y su tarifa sugerida.</p>
        </div>
        {!readonly && (
          <button onClick={openCreate} className={btnPrimary}>
            <Plus size={16} /> Nuevo servicio
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      ) : services.length === 0 ? (
        <p className="rounded-xl bg-slate-50 py-10 text-center text-sm text-slate-400 dark:bg-slate-800/60">
          Sin servicios registrados.
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <ResponsiveTable
            columns={serviceColumns}
            rows={services}
            keyField={(service) => service.id}
            emptyMessage="Sin servicios registrados."
            pageSize={10}
            itemLabel="servicios"
            cardTitle={(service) => <span className="font-semibold">{service.name}</span>}
          />
        </div>
      )}

      {modal && (
        <Modal
          title={editing ? 'Editar servicio' : 'Nuevo servicio'}
          description="Define el código, la tarifa sugerida y la duración estimada del trabajo."
          icon={Wrench}
          size="md"
          onClose={() => setModal(false)}
          footer={
            <>
              <button
                type="button"
                onClick={() => setModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button type="submit" form="servicio-form" disabled={saving} className={btnPrimary}>
                {saving && <Loader2 size={16} className="animate-spin" />}
                {editing ? 'Guardar cambios' : 'Crear servicio'}
              </button>
            </>
          }
        >
          <form id="servicio-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelCls}>Código *</label>
              <input
                className={inputCls}
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                placeholder="SRV-XXXX"
                disabled={!!editing}
              />
            </div>
            <div>
              <label className={labelCls}>Nombre *</label>
              <input
                className={inputCls}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ej. Cambio de aceite"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Categoría</label>
                <input
                  className={inputCls}
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  placeholder="Mantenimiento"
                />
              </div>
              <div>
                <label className={labelCls}>Tarifa sugerida (S/)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={inputCls}
                  value={form.defaultPrice}
                  onChange={(e) => setForm((f) => ({ ...f, defaultPrice: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className={labelCls}>Duración estimada (min)</label>
                <input
                  type="number"
                  min="0"
                  className={inputCls}
                  value={form.estimatedDurationMinutes}
                  onChange={(e) => setForm((f) => ({ ...f, estimatedDurationMinutes: e.target.value }))}
                  placeholder="60"
                />
              </div>
              <label className="flex items-center gap-2 pb-1 text-sm text-slate-600 dark:text-slate-300">
                <Toggle
                  checked={form.active}
                  onChange={(v) => setForm((f) => ({ ...f, active: v }))}
                  label="Servicio activo"
                />
                Servicio activo
              </label>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function CatalogManager({ tipo, label, readonly }: { tipo: CatalogTipo; label: string; readonly: boolean }) {
  const toast = useToast();
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', code: '' });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: '', code: '' });
  const [deleteTarget, setDeleteTarget] = useState<CatalogItem | null>(null);

  const showCode = tipo === 'ESTADO' || tipo === 'PRIORIDAD';

  const load = async () => {
    setLoading(true);
    try {
      setItems(await getCatalog(tipo));
    } catch {
      toast.error('Error', `No se pudo cargar ${label.toLowerCase()}.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo]);

  const handleAdd = async () => {
    if (!newItem.name.trim()) {
      toast.error('Validación', 'El nombre es obligatorio.');
      return;
    }
    setSaving(true);
    try {
      await createCatalogItem(tipo, {
        nombre: newItem.name.trim(),
        code: newItem.code.trim() || undefined,
        activo: true,
      });
      setNewItem({ name: '', code: '' });
      setAdding(false);
      toast.success(label, `"${newItem.name.trim()}" agregado.`);
      load();
    } catch (err: any) {
      toast.error('No se pudo guardar', err?.response?.data?.message || 'Verifica los datos.');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (it: CatalogItem) => {
    setEditingId(it.id);
    setEditForm({ name: it.nombre, code: it.code || '' });
  };

  const handleSaveEdit = async (it: CatalogItem) => {
    if (!editForm.name.trim()) {
      toast.error('Validación', 'El nombre es obligatorio.');
      return;
    }
    setSaving(true);
    try {
      await updateCatalogItem(it.id, tipo, {
        nombre: editForm.name.trim(),
        code: editForm.code.trim() || undefined,
      });
      setEditingId(null);
      toast.success(label, 'Elemento actualizado.');
      load();
    } catch (err: any) {
      toast.error('No se pudo guardar', err?.response?.data?.message || 'Verifica los datos.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (it: CatalogItem) => {
    setSaving(true);
    try {
      await updateCatalogItem(it.id, tipo, { activo: !it.activo });
      load();
    } catch (err: any) {
      toast.error('No se pudo actualizar', err?.response?.data?.message || 'Verifica los datos.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (it: CatalogItem) => {
    setDeleteTarget(it);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await deleteCatalogItem(deleteTarget.id);
      toast.success(label, `"${deleteTarget.nombre}" eliminado.`);
      setDeleteTarget(null);
      load();
    } catch (err: any) {
      toast.error('No se pudo eliminar', err?.response?.data?.message || 'Verifica los datos.');
    } finally {
      setSaving(false);
    }
  };

  const catalogColumns: ResponsiveColumn<CatalogItem>[] = [
    {
      key: 'index',
      header: '#',
      hideOnMobile: true,
      render: (item) => <span className="text-xs text-slate-400">{items.findIndex((i) => i.id === item.id) + 1}</span>,
    },
    ...(showCode
      ? [{
          key: 'code',
          header: 'Código',
          hideOnMobile: true,
          render: (item: CatalogItem) => <span className="font-mono text-xs text-slate-500">{item.code || '—'}</span>,
        }]
      : []),
    {
      key: 'name',
      header: 'Nombre',
      render: (item) => (
        editingId === item.id ? (
          <div className="flex flex-wrap items-center gap-2">
            {showCode && (
              <input
                className={cn(estiloCampo, 'w-32 py-1.5')}
                value={editForm.code}
                onChange={(e) => setEditForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
              />
            )}
            <input
              className={cn(estiloCampo, 'w-52 py-1.5')}
              value={editForm.name}
              onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
            />
            <button
              type="button"
              onClick={() => handleSaveEdit(item)}
              disabled={saving}
              className="rounded-lg bg-blue-600 p-2 text-white transition hover:bg-blue-500 disabled:opacity-50"
              title="Guardar"
              aria-label={`Guardar ${item.nombre}`}
            >
              <Check size={15} />
            </button>
            <button
              type="button"
              onClick={() => setEditingId(null)}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Cancelar"
              aria-label={`Cancelar edición de ${item.nombre}`}
            >
              <X size={15} />
            </button>
          </div>
        ) : (
          <span className={cn('font-medium text-slate-800 dark:text-slate-100', !item.activo && 'opacity-60')}>
            {item.nombre}
          </span>
        )
      ),
    },
    {
      key: 'active',
      header: 'Estado',
      render: (item) => (
        <Toggle
          checked={item.activo}
          disabled={readonly}
          onChange={() => toggleActive(item)}
          label={item.activo ? `Desactivar ${item.nombre}` : `Activar ${item.nombre}`}
        />
      ),
    },
    ...(!readonly
      ? [{
          key: 'actions',
          header: '',
          className: 'text-right',
          render: (item: CatalogItem) => editingId !== item.id ? (
            <div className="flex justify-end gap-1">
              <button
                type="button"
                onClick={() => startEdit(item)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/10 dark:hover:text-blue-400"
                title="Editar"
                aria-label={`Editar ${item.nombre}`}
              >
                <Pencil size={15} />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(item)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                title="Eliminar"
                aria-label={`Eliminar ${item.nombre}`}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ) : null,
        }]
      : []),
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">{label}</h4>
          <p className="text-xs text-slate-400">
            {tipo === 'ESTADO'
              ? 'Estados del flujo de órdenes de trabajo.'
              : tipo === 'PRIORIDAD'
                ? 'Prioridades de atención disponibles.'
                : tipo === 'UNIDAD'
                  ? 'Unidades de medida para productos.'
                  : 'Categorías para clasificar productos y servicios.'}
          </p>
        </div>
        {!readonly && (
          <button onClick={() => setAdding((v) => !v)} className={btnPrimary}>
            {adding ? <X size={16} /> : <Plus size={16} />} {adding ? 'Cancelar' : 'Agregar'}
          </button>
        )}
      </div>

      {adding && !readonly && (
        <div className="mb-4 flex flex-wrap items-end gap-3 rounded-2xl border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-500/30 dark:bg-blue-500/5">
          {showCode && (
            <div className="min-w-[10rem] flex-1">
              <label className={labelCls}>Código (interno)</label>
              <input
                className={inputCls}
                value={newItem.code}
                onChange={(e) => setNewItem((n) => ({ ...n, code: e.target.value.toUpperCase() }))}
                placeholder={tipo === 'ESTADO' ? 'RECIBIDO' : 'NORMAL'}
              />
            </div>
          )}
          <div className="min-w-[12rem] flex-1">
            <label className={labelCls}>Nombre *</label>
            <input
              className={inputCls}
              value={newItem.name}
              onChange={(e) => setNewItem((n) => ({ ...n, name: e.target.value }))}
              placeholder="Ingresa un nombre"
              autoFocus
            />
          </div>
          <button onClick={handleAdd} disabled={saving} className={btnPrimary}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Guardar
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-xl bg-slate-50 py-10 text-center text-sm text-slate-400 dark:bg-slate-800/60">
          Sin elementos en {label.toLowerCase()}.
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <ResponsiveTable
            columns={catalogColumns}
            rows={items}
            keyField={(item) => item.id}
            emptyMessage={`Sin elementos en ${label.toLowerCase()}.`}
            pageSize={10}
            itemLabel={label.toLowerCase()}
            cardTitle={(item) => <span className="font-semibold">{item.nombre}</span>}
          />
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Eliminar elemento del catálogo"
        message={deleteTarget ? `¿Eliminar "${deleteTarget.nombre}"? Esta acción no se puede deshacer.` : undefined}
        confirmLabel="Eliminar"
        busy={saving}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function SistemaTab({ readonly }: { readonly: boolean }) {
  const sistemas = useMemo(
    () => [
      { id: 'SERVICIOS', label: 'Servicios', icon: Wrench },
      ...CATALOG_TIPOS.map((c) => ({ id: c.tipo, label: c.label, icon: c.tipo === 'ESTADO' ? ShieldCheckIcon : HashIcon })),
    ],
    []
  );
  const [active, setActive] = useState('SERVICIOS');

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-2">
        {sistemas.map((s) => (
          <button
            key={s.id}
            onClick={() => setActive(s.id)}
            className={cn(
              'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition',
              active === s.id
                ? 'bg-blue-600 text-white shadow-sm'
                : 'border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
            )}
          >
            <s.icon size={15} />
            {s.label}
          </button>
        ))}
      </div>
      {active === 'SERVICIOS' ? (
        <ServicesManager readonly={readonly} />
      ) : (
        <CatalogManager
          key={active}
          tipo={active as CatalogTipo}
          label={sistemas.find((s) => s.id === active)?.label || ''}
          readonly={readonly}
        />
      )}
    </div>
  );
}

function ShieldCheckIcon({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function HashIcon({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="4" x2="20" y1="9" y2="9" />
      <line x1="4" x2="20" y1="15" y2="15" />
      <line x1="10" x2="8" y1="3" y2="21" />
      <line x1="16" x2="14" y1="3" y2="21" />
    </svg>
  );
}

export default function Configuracion() {
  const { settings, loading, error, refresh } = useShopSettings();
  const { hasPermission } = usePermissions();
  const [tab, setTab] = useState<Tab>('taller');

  const canView = hasPermission('CONFIGURACION:VER');
  const canEdit = hasPermission('CONFIGURACION:EDITAR');

  return (
    <div className="space-y-6">
      <EncabezadoModulo
        eyebrow="Administración del sistema"
        title="Configuración"
        description="Personaliza la identidad del taller, el correo saliente y las reglas del sistema."
        icon={Settings2}
        meta={(
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
            {TABS.length} secciones configurables
          </span>
        )}
      />

      {canView && (
        <AvisoFormulario>
          Solo quienes tengan el permiso <strong>CONFIGURACIÓN:VER</strong> pueden ingresar. Asígnalo por rol en{' '}
          <strong>Roles y permisos</strong>.
        </AvisoFormulario>
      )}

      {!canView ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
            <Lock size={26} />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Sin acceso a Configuración</h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
            Tu rol no tiene el permiso <span className="font-semibold">CONFIGURACIÓN:VER</span>. Solicítalo al
            administrador del sistema.
          </p>
        </div>
      ) : !settings ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
          {loading ? (
            <>
              <Loader2 size={26} className="mx-auto animate-spin text-blue-600" />
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Cargando configuración...</p>
            </>
          ) : (
            <>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                <Info size={26} />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">No se pudo cargar la configuración</h3>
              <p className="mx-auto mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
                {error || 'Revisa tu conexión e inténtalo de nuevo.'}
              </p>
              <button
                onClick={() => void refresh()}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
              >
                <Loader2 size={16} /> Reintentar
              </button>
            </>
          )}
        </div>
      ) : (
        <>
          <PestanasModulo
            items={TABS.map((t) => ({ value: t.id, label: t.label, icon: t.icon }))}
            value={tab}
            onChange={(value) => setTab(value as Tab)}
          />

          <div className="min-w-0">
            {tab === 'taller' && <TallerTab settings={settings} canEdit={canEdit} />}
            {tab === 'correo' && <CorreoTab settings={settings} canEdit={canEdit} />}
            {tab === 'notifs' && <NotificacionesTab settings={settings} canEdit={canEdit} />}
            {tab === 'sistema' && <SistemaTab readonly={!canEdit} />}
          </div>
        </>
      )}
    </div>
  );
}

function TallerTab({ settings, canEdit }: { settings: Settings | null; canEdit: boolean }) {
  const toast = useToast();
  const { save } = useShopSettings();
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    tallerNombre: '',
    tallerRuc: '',
    tallerDireccion: '',
    tallerTelefono: '',
    tallerCorreo: '',
    tallerHorario: '',
    tallerLogo: '',
  });

  useEffect(() => {
    if (!settings) return;
    setForm({
      tallerNombre: settings.tallerNombre || '',
      tallerRuc: settings.tallerRuc || '',
      tallerDireccion: settings.tallerDireccion || '',
      tallerTelefono: settings.tallerTelefono || '',
      tallerCorreo: settings.tallerCorreo || '',
      tallerHorario: settings.tallerHorario || '',
      tallerLogo: settings.tallerLogo || '',
    });
  }, [settings]);

  const handleLogoFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Logo', 'Selecciona un archivo de imagen.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo', 'La imagen no debe superar los 2 MB.');
      return;
    }
    try {
      const dataUrl = await downscaleImage(file, 256);
      setForm((f) => ({ ...f, tallerLogo: dataUrl }));
    } catch {
      toast.error('Logo', 'No se pudo procesar la imagen.');
    }
  };

  const handleSave = async () => {
    if (!form.tallerNombre.trim()) {
      toast.error('Validación', 'El nombre del taller es obligatorio.');
      return;
    }
    if (form.tallerNombre.trim().length > 150) {
      toast.error('Validación', 'El nombre del taller no puede superar 150 caracteres.');
      return;
    }
    if (form.tallerRuc.trim() && !/^\d{11}$/.test(form.tallerRuc.trim())) {
      toast.error('Validación', 'El RUC debe tener 11 dígitos.');
      return;
    }
    if (form.tallerCorreo.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.tallerCorreo.trim())) {
      toast.error('Validación', 'El correo de contacto no es válido.');
      return;
    }
    if (form.tallerTelefono.trim() && !/^[0-9+()\-\s]{6,30}$/.test(form.tallerTelefono.trim())) {
      toast.error('Validación', 'El teléfono no tiene un formato válido.');
      return;
    }
    setSaving(true);
    try {
      await save({
        tallerNombre: form.tallerNombre.trim(),
        tallerLogo: form.tallerLogo,
        tallerRuc: form.tallerRuc.trim(),
        tallerDireccion: form.tallerDireccion.trim(),
        tallerTelefono: form.tallerTelefono.trim(),
        tallerCorreo: form.tallerCorreo.trim(),
        tallerHorario: form.tallerHorario.trim(),
      });
      toast.success('Datos del taller', 'Configuración guardada correctamente.');
    } catch (err: any) {
      toast.error('No se pudo guardar', err?.response?.data?.message || 'Verifica los datos.');
    } finally {
      setSaving(false);
    }
  };

  const Ratio = ({ children }: { children: React.ReactNode }) => (
    <span className="text-[10px] text-amber-600/70">⚠ {children}</span>
  );

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2 dark:border-slate-700 dark:bg-slate-900">
        <SeccionFormulario
          title="Datos del taller"
          description="Aparecerán en la marca del sistema y en los documentos generados."
          icon={Building2}
          className="border-0 bg-transparent p-0"
        >
          <CampoFormulario label="Nombre del taller" required>
            <input
              className={estiloCampo}
              value={form.tallerNombre}
              onChange={(e) => setForm((f) => ({ ...f, tallerNombre: e.target.value }))}
              placeholder="Taller Mecánico"
              disabled={!canEdit}
            />
          </CampoFormulario>
          <CampoFormulario label="RUC">
            <input
              className={estiloCampo}
              value={form.tallerRuc}
              onChange={(e) => setForm((f) => ({ ...f, tallerRuc: e.target.value }))}
              placeholder="20123456789"
              disabled={!canEdit}
            />
          </CampoFormulario>
          <CampoFormulario label="Dirección" className="sm:col-span-2">
            <input
              className={estiloCampo}
              value={form.tallerDireccion}
              onChange={(e) => setForm((f) => ({ ...f, tallerDireccion: e.target.value }))}
              placeholder="Av. Principal 123, Lima"
              disabled={!canEdit}
            />
          </CampoFormulario>
          <CampoFormulario label="Teléfono">
            <input
              className={estiloCampo}
              value={form.tallerTelefono}
              onChange={(e) => setForm((f) => ({ ...f, tallerTelefono: e.target.value }))}
              placeholder="(01) 555-1234"
              disabled={!canEdit}
            />
          </CampoFormulario>
          <CampoFormulario label="Correo de contacto">
            <input
              type="email"
              className={estiloCampo}
              value={form.tallerCorreo}
              onChange={(e) => setForm((f) => ({ ...f, tallerCorreo: e.target.value }))}
              placeholder="taller@correo.com"
              disabled={!canEdit}
            />
          </CampoFormulario>
          <CampoFormulario label="Horario de atención" className="sm:col-span-2">
            <input
              className={estiloCampo}
              value={form.tallerHorario}
              onChange={(e) => setForm((f) => ({ ...f, tallerHorario: e.target.value }))}
              placeholder="Lun–Sáb 8:00 am – 7:00 pm"
              disabled={!canEdit}
            />
          </CampoFormulario>
        </SeccionFormulario>

        {canEdit && (
          <div className="mt-6 flex justify-end">
            <button onClick={handleSave} disabled={saving} className={btnPrimary}>
              {saving && <Loader2 size={16} className="animate-spin" />}
              Guardar cambios
            </button>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h3 className="mb-1 text-lg font-bold text-slate-800 dark:text-slate-100">Logo del taller</h3>
        <p className="mb-5 text-sm text-slate-400">Cuadrado o circular; se redimensiona automáticamente.</p>
        <div className="logo-preview mb-4 flex items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-10 dark:border-slate-700">
          {form.tallerLogo ? (
            <img
              src={form.tallerLogo}
              alt="Logo"
              className="h-28 w-28 rounded-2xl object-contain p-1 shadow-sm ring-4 ring-white dark:ring-slate-800"
            />
          ) : (
            <div className="flex h-28 w-28 items-center justify-center rounded-2xl bg-slate-200 text-slate-400 dark:bg-slate-700">
              <Building2 size={40} />
            </div>
          )}
        </div>
        {canEdit && (
          <>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleLogoFile(e.target.files?.[0])}
            />
            <div className="flex gap-2">
              <button
                onClick={() => fileRef.current?.click()}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Upload size={16} /> Subir logo
              </button>
              {form.tallerLogo && (
                <button
                  onClick={() => setForm((f) => ({ ...f, tallerLogo: '' }))}
                  className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-500 transition hover:bg-red-50 dark:border-red-500/30 dark:hover:bg-red-500/10"
                >
                  Quitar
                </button>
              )}
            </div>
          </>
        )}
        <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
          <Ratio>Formato PNG o JPG · máx. 2 MB.</Ratio>
        </p>
      </div>
    </div>
  );
}

function CorreoTab({ settings, canEdit }: { settings: Settings | null; canEdit: boolean }) {
  const toast = useToast();
  const { save } = useShopSettings();
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [form, setForm] = useState({
    correoTipo: 'GMAIL',
    correoRemitente: '',
    smtpHost: '',
    smtpPuerto: '',
    smtpSeguridad: 'STARTTLS',
  });

  useEffect(() => {
    if (!settings) return;
    setForm({
      correoTipo: settings.correoTipo || 'GMAIL',
      correoRemitente: settings.correoRemitente || '',
      smtpHost: settings.smtpHost || '',
      smtpPuerto: settings.smtpPuerto != null ? String(settings.smtpPuerto) : '',
      smtpSeguridad: settings.smtpSeguridad || 'STARTTLS',
    });
  }, [settings]);

  useEffect(() => {
    if (form.correoTipo === 'GMAIL' && !form.smtpHost) {
      setForm((f) => ({ ...f, smtpHost: 'smtp.gmail.com', smtpPuerto: '587', smtpSeguridad: 'STARTTLS' }));
    }
    if (form.correoTipo === 'SMTP' && !form.smtpHost) {
      setForm((f) => ({ ...f, smtpHost: '', smtpPuerto: '587', smtpSeguridad: 'STARTTLS' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.correoTipo]);

  const handleTest = async () => {
    setTesting(true);
    try {
      const result = await testEmailConfiguration();
      toast.success('Correo de prueba', result.message);
    } catch (err: any) {
      toast.error('No se pudo enviar', err?.response?.data?.message || 'Revisa MAIL_USERNAME y MAIL_PASSWORD.');
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!form.correoRemitente.trim()) {
      toast.error('Validación', 'El correo remitente es obligatorio.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correoRemitente.trim())) {
      toast.error('Validación', 'El correo remitente no es válido.');
      return;
    }
    const puerto = form.smtpPuerto === '' ? undefined : Number(form.smtpPuerto);
    if (puerto != null && (!Number.isInteger(puerto) || puerto < 1 || puerto > 65535)) {
      toast.error('Validación', 'El puerto SMTP debe estar entre 1 y 65535.');
      return;
    }
    const host = form.correoTipo === 'GMAIL' ? 'smtp.gmail.com' : form.smtpHost.trim();
    if (form.correoTipo === 'SMTP' && !host) {
      toast.error('Validación', 'El servidor SMTP es obligatorio para un proveedor propio.');
      return;
    }
    setSaving(true);
    try {
      await save({
        correoTipo: form.correoTipo,
        correoRemitente: form.correoRemitente.trim(),
        smtpHost: host,
        smtpPuerto: puerto,
        smtpSeguridad: form.smtpSeguridad,
      });
      toast.success('Correo saliente', 'Configuración guardada correctamente.');
    } catch (err: any) {
      toast.error('No se pudo guardar', err?.response?.data?.message || 'Verifica los datos.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2 dark:border-slate-700 dark:bg-slate-900">
        <SeccionFormulario
          title="Correo saliente"
          description="Proveedor de correo y datos del remitente para las notificaciones del sistema."
          icon={Mail}
          className="border-0 bg-transparent p-0"
        >
          <CampoFormulario label="Proveedor" className="sm:col-span-2">
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'GMAIL', label: 'Gmail', hint: 'smtp.gmail.com:587' },
                { id: 'SMTP', label: 'SMTP propio', hint: 'tu servidor SMTP' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  disabled={!canEdit}
                  onClick={() => setForm((f) => ({ ...f, correoTipo: opt.id }))}
                  className={cn(
                    'rounded-xl border-2 p-4 text-left transition',
                    form.correoTipo === opt.id
                      ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-500/10'
                      : 'border-slate-200 hover:border-slate-300 dark:border-slate-700',
                    !canEdit && 'cursor-not-allowed opacity-70'
                  )}
                >
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{opt.label}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{opt.hint}</p>
                </button>
              ))}
            </div>
          </CampoFormulario>
          <CampoFormulario label="Correo del remitente" required>
            <input
              type="email"
              className={estiloCampo}
              value={form.correoRemitente}
              onChange={(e) => setForm((f) => ({ ...f, correoRemitente: e.target.value }))}
              placeholder="notificaciones@tutaller.com"
              disabled={!canEdit}
            />
          </CampoFormulario>
          <CampoFormulario label="Servidor SMTP">
            <input
              className={estiloCampo}
              value={form.smtpHost}
              onChange={(e) => setForm((f) => ({ ...f, smtpHost: e.target.value }))}
              placeholder={form.correoTipo === 'GMAIL' ? 'smtp.gmail.com' : 'smtp.tucorreo.com'}
              disabled={!canEdit || form.correoTipo === 'GMAIL'}
            />
          </CampoFormulario>
          <CampoFormulario label="Puerto">
            <input
              type="number"
              className={estiloCampo}
              value={form.smtpPuerto}
              onChange={(e) => setForm((f) => ({ ...f, smtpPuerto: e.target.value }))}
              placeholder="587"
              disabled={!canEdit || form.correoTipo === 'GMAIL'}
            />
          </CampoFormulario>
          <CampoFormulario label="Seguridad">
            <select
              className={estiloCampo}
              value={form.smtpSeguridad}
              onChange={(e) => setForm((f) => ({ ...f, smtpSeguridad: e.target.value }))}
              disabled={!canEdit || form.correoTipo === 'GMAIL'}
            >
              <option value="NONE">Sin cifrado</option>
              <option value="STARTTLS">STARTTLS</option>
              <option value="SSL">SSL / TLS</option>
            </select>
          </CampoFormulario>
        </SeccionFormulario>

        {canEdit && (
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <button
              onClick={handleTest}
              disabled={testing}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {testing && <Loader2 size={16} className="animate-spin" />}
              Probar envío
            </button>
            <button onClick={handleSave} disabled={saving} className={btnPrimary}>
              {saving && <Loader2 size={16} className="animate-spin" />}
              Guardar cambios
            </button>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
          <Info size={22} />
        </div>
        <h3 className="mb-2 text-base font-bold text-slate-800 dark:text-slate-100">Credenciales por variables de entorno</h3>
        <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          Las credenciales (usuario y contraseña) no se guardan en la base de datos: se configuran con
          variables de entorno en el servidor.
        </p>
        <div className="mt-4 rounded-xl bg-slate-50 p-4 font-mono text-xs leading-relaxed text-slate-600 dark:bg-slate-800/70 dark:text-slate-300">
          <p>MAIL_USERNAME=tu.correo@gmail.com</p>
          <p>MAIL_PASSWORD=••••••••••</p>
          <p className="mt-2 text-slate-400 dark:text-slate-500">
            # Contraseña de aplicación de Gmail o credencial SMTP
          </p>
        </div>
      </div>
    </div>
  );
}

function NotificacionesTab({ settings, canEdit }: { settings: Settings | null; canEdit: boolean }) {
  const toast = useToast();
  const { save } = useShopSettings();
  const [saving, setSaving] = useState(false);
  const [flags, setFlags] = useState({
    notifConfirmacionCita: true,
    notifRecordatorio: true,
    notifVehiculoListo: true,
    notifAlertasInventario: true,
  });

  useEffect(() => {
    if (!settings) return;
    setFlags({
      notifConfirmacionCita: settings.notifConfirmacionCita ?? true,
      notifRecordatorio: settings.notifRecordatorio ?? true,
      notifVehiculoListo: settings.notifVehiculoListo ?? true,
      notifAlertasInventario: settings.notifAlertasInventario ?? true,
    });
  }, [settings]);

  const rows: { key: keyof typeof flags; title: string; desc: string }[] = [
    { key: 'notifConfirmacionCita', title: 'Confirmación de cita', desc: 'Al confirmar una cita en la agenda.' },
    { key: 'notifRecordatorio', title: 'Recordatorio', desc: 'Recordatorio de próxima visita del cliente.' },
    { key: 'notifVehiculoListo', title: 'Vehículo listo', desc: 'Cuando la orden de trabajo está lista para entrega.' },
    { key: 'notifAlertasInventario', title: 'Alertas de inventario', desc: 'Existencias bajas y productos agotados.' },
  ];

  const handleSave = async () => {
    setSaving(true);
    try {
      await save(flags);
      toast.success('Notificaciones', 'Preferencias guardadas correctamente.');
    } catch (err: any) {
      toast.error('No se pudo guardar', err?.response?.data?.message || 'Verifica los datos.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <h3 className="mb-1 text-lg font-bold text-slate-800 dark:text-slate-100">Notificaciones</h3>
      <p className="mb-5 text-sm text-slate-400">
        Activa o desactiva cada tipo de notificación del sistema.
      </p>
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {rows.map((row) => (
          <div key={row.key} className="flex items-center justify-between gap-4 py-4">
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{row.title}</p>
              <p className="text-xs text-slate-400">{row.desc}</p>
            </div>
            <Toggle
              checked={flags[row.key]}
              disabled={!canEdit}
              onChange={(v) => setFlags((f) => ({ ...f, [row.key]: v }))}
              label={row.title}
            />
          </div>
        ))}
      </div>
      {canEdit && (
        <div className="mt-5 flex justify-end">
          <button onClick={handleSave} disabled={saving} className={btnPrimary}>
            {saving && <Loader2 size={16} className="animate-spin" />}
            Guardar preferencias
          </button>
        </div>
      )}
    </div>
  );
}