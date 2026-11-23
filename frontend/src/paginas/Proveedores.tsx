import { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Contact,
  FileSignature,
  Info,
  Pencil,
  Plus,
  Power,
  RotateCcw,
  Search,
  RefreshCw,
  X,
  CircleCheck,
  CircleOff,
} from 'lucide-react';
import ResponsiveTable from '../componentes/interfaz/TablaAdaptable';
import type { ResponsiveColumn } from '../componentes/interfaz/TablaAdaptable';
import ConfirmDialog from '../componentes/interfaz/DialogoConfirmacion';
import EncabezadoModulo from '../componentes/interfaz/EncabezadoModulo';
import {
  AvisoFormulario,
  CampoFormulario,
  SeccionFormulario,
  estiloCampo,
} from '../componentes/interfaz/Formulario';
import Modal from '../componentes/interfaz/Modal';
import PestanasModulo from '../componentes/interfaz/PestanasModulo';
import SelectorFecha from '../componentes/interfaz/SelectorFecha';
import TarjetaMetrica from '../componentes/interfaz/TarjetaMetrica';
import { useToast } from '../componentes/interfaz/Avisos';
import { usePermissions } from '../contexto/ContextoPermisos';
import { cn } from '../lib/utilidades';
import {
  createContract,
  createSupplier,
  deactivateContract,
  deactivateSupplier,
  getContracts,
  getSuppliers,
  reactivateContract,
  updateContract,
  updateSupplier,
} from '../servicios/comprasServicio';
import type { Contract, ContractPayload, Supplier, SupplierPayload } from '../servicios/comprasServicio';

type Tab = 'suppliers' | 'contracts';

const emptySupplier: SupplierPayload = {
  businessName: '',
  taxId: '',
  contactName: '',
  email: '',
  phone: '',
  address: '',
  active: true,
};

const emptyContract = (): ContractPayload => ({
  startsAt: new Date().toISOString().slice(0, 10),
  endsAt: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().slice(0, 10),
  currency: 'PEN',
  discountPercentage: 0,
  paymentDays: 30,
  minimumPurchase: 0,
  terms: '',
  active: true,
});

const money = (value: number) =>
  (value || 0).toLocaleString('es-PE', { style: 'currency', currency: 'PEN' });

const date = (value?: string) => (value ? new Date(value).toLocaleDateString('es-PE') : '—');

export default function Suppliers() {
  const toast = useToast();
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission('PROVEEDORES:CREAR');
  const canEdit = hasPermission('PROVEEDORES:EDITAR');
  const canDelete = hasPermission('PROVEEDORES:ELIMINAR');
  const canContract = hasPermission('COMPRAS:APROBAR');

  const [tab, setTab] = useState<Tab>('suppliers');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'ACTIVOS' | 'INACTIVOS'>('TODOS');
  const [loading, setLoading] = useState(true);
  const [supplierFormOpen, setSupplierFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierForm, setSupplierForm] = useState<SupplierPayload>({ ...emptySupplier });
  const [contractFormOpen, setContractFormOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [contractForm, setContractForm] = useState<ContractPayload>(emptyContract());
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState<{ title: string; message: string; action: () => Promise<void> } | null>(null);

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const data = await getSuppliers(true);
      setSuppliers(data);
      setSelectedSupplier((current) => current ?? data[0]?.id ?? null);
    } catch {
      toast.error('Error', 'No se pudieron cargar los proveedores.');
    } finally {
      setLoading(false);
    }
  };

  const loadContracts = async (supplierId: number) => {
    try {
      setContracts(await getContracts(supplierId));
    } catch {
      toast.error('Error', 'No se pudieron cargar los contratos.');
    }
  };

  useEffect(() => {
    loadSuppliers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedSupplier) loadContracts(selectedSupplier);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSupplier]);

  const filteredSuppliers = useMemo(() => {
    const query = search.toLowerCase().trim();
    return suppliers.filter((supplier) => {
      if (statusFilter === 'ACTIVOS' && !supplier.active) return false;
      if (statusFilter === 'INACTIVOS' && supplier.active) return false;
      if (!query) return true;
      return [supplier.businessName, supplier.taxId, supplier.contactName, supplier.email]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query));
    });
  }, [search, suppliers, statusFilter]);

  const supplierStats = useMemo(() => ({
    total: suppliers.length,
    active: suppliers.filter((supplier) => supplier.active).length,
    inactive: suppliers.filter((supplier) => !supplier.active).length,
    contracts: contracts.length,
    activeContracts: contracts.filter((contract) => contract.active).length,
  }), [suppliers, contracts]);

  const statCards = [
    { label: 'Proveedores', value: supplierStats.total, icon: Building2, tone: 'blue', filter: 'TODOS' as const },
    { label: 'Activos', value: supplierStats.active, icon: CircleCheck, tone: 'emerald', filter: 'ACTIVOS' as const },
    { label: 'Inactivos', value: supplierStats.inactive, icon: CircleOff, tone: 'red', filter: 'INACTIVOS' as const },
    { label: 'Contratos', value: supplierStats.contracts, icon: FileSignature, tone: 'violet', filter: null },
  ] as const;

  const supplierColumns: ResponsiveColumn<Supplier>[] = [
    {
      key: 'businessName',
      header: 'Proveedor',
      render: (supplier) => (
        <div>
          <p className="font-semibold text-slate-800 dark:text-slate-100">{supplier.businessName}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{supplier.taxId}</p>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contacto',
      render: (supplier) => (
        <div className="text-xs text-slate-600 dark:text-slate-300">
          <p>{supplier.contactName || '—'}</p>
          <p className="text-slate-400">{supplier.phone || supplier.email || '—'}</p>
        </div>
      ),
    },
    {
      key: 'address',
      header: 'Dirección',
      hideOnMobile: true,
      render: (supplier) => <span className="text-xs text-slate-500">{supplier.address || '—'}</span>,
    },
    {
      key: 'active',
      header: 'Estado',
      render: (supplier) => (
        <span className={cn('rounded-full px-2 py-1 text-[10px] font-bold',
          supplier.active ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400')}>
          {supplier.active ? 'ACTIVO' : 'INACTIVO'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (supplier) => (
        <div className="flex justify-end gap-1">
          {canContract && (
            <button
              onClick={() => {
                setSelectedSupplier(supplier.id);
                setTab('contracts');
              }}
              className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/10"
              title="Ver contratos"
            >
              <FileSignature size={15} />
            </button>
          )}
          {canEdit && (
            <button
              onClick={() => {
                setEditingSupplier(supplier);
                setSupplierForm({
                  businessName: supplier.businessName,
                  taxId: supplier.taxId,
                  contactName: supplier.contactName || '',
                  email: supplier.email || '',
                  phone: supplier.phone || '',
                  address: supplier.address || '',
                  active: supplier.active,
                });
                setSupplierFormOpen(true);
              }}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
              title="Editar proveedor"
            >
              <Pencil size={15} />
            </button>
          )}
          {canDelete && supplier.active && (
            <button
              onClick={() =>
                setConfirm({
                  title: 'Desactivar proveedor',
                  message: `¿Desactivar a ${supplier.businessName}? No se podrá usar en nuevas compras.`,
                  action: async () => {
                    await deactivateSupplier(supplier.id);
                    toast.success('Proveedor desactivado');
                    loadSuppliers();
                  },
                })
              }
              className="rounded-lg p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
              title="Desactivar proveedor"
            >
              <Power size={15} />
            </button>
          )}
        </div>
      ),
    },
  ];

  const contractColumns: ResponsiveColumn<Contract>[] = [
    {
      key: 'code',
      header: 'Contrato',
      render: (contract) => <span className="font-mono text-xs font-bold">{contract.code}</span>,
    },
    {
      key: 'vigencia',
      header: 'Vigencia',
      render: (contract) => (
        <span className="text-xs text-slate-500">
          {date(contract.startsAt)} → {date(contract.endsAt)}
        </span>
      ),
    },
    {
      key: 'conditions',
      header: 'Condiciones',
      render: (contract) => (
        <span className="text-xs text-slate-600 dark:text-slate-300">
          {contract.discountPercentage}% dto. · {contract.paymentDays} días · mín. {money(contract.minimumPurchase)}
        </span>
      ),
    },
    {
      key: 'active',
      header: 'Estado',
      render: (contract) => (
        <span className={cn('rounded-full px-2 py-1 text-[10px] font-bold',
          contract.active ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400')}>
          {contract.active ? 'ACTIVO' : 'INACTIVO'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (contract) => (
        <div className="flex justify-end gap-1">
          {canContract && (
            <>
              <button
                onClick={() => {
                  setEditingContract(contract);
                  setContractForm({
                    startsAt: contract.startsAt.slice(0, 10),
                    endsAt: contract.endsAt.slice(0, 10),
                    currency: contract.currency,
                    discountPercentage: contract.discountPercentage,
                    paymentDays: contract.paymentDays,
                    minimumPurchase: contract.minimumPurchase,
                    terms: contract.terms || '',
                    active: contract.active,
                  });
                  setContractFormOpen(true);
                }}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                title="Editar contrato"
              >
                <Pencil size={15} />
              </button>
              <button
                onClick={async () => {
                  try {
                    if (contract.active) await deactivateContract(selectedSupplier!, contract.id);
                    else await reactivateContract(selectedSupplier!, contract.id);
                    toast.success(contract.active ? 'Contrato desactivado' : 'Contrato reactivado');
                    loadContracts(selectedSupplier!);
                  } catch {
                    toast.error('Error', 'No se pudo cambiar el contrato.');
                  }
                }}
                className={cn('rounded-lg p-2',
                  contract.active ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10'
                    : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10')}
                title={contract.active ? 'Desactivar contrato' : 'Reactivar contrato'}
              >
                {contract.active ? <Power size={15} /> : <RotateCcw size={15} />}
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  const saveSupplier = async () => {
    if (!supplierForm.businessName.trim() || !supplierForm.taxId.trim()) {
      toast.error('Validación', 'Razón social y RUC son obligatorios.');
      return;
    }
    if (supplierForm.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supplierForm.email.trim())) {
      toast.error('Validación', 'El correo del proveedor no es válido.');
      return;
    }
    setSaving(true);
    try {
      if (editingSupplier) await updateSupplier(editingSupplier.id, supplierForm);
      else await createSupplier(supplierForm);
      toast.success(editingSupplier ? 'Proveedor actualizado' : 'Proveedor creado');
      setSupplierFormOpen(false);
      setEditingSupplier(null);
      loadSuppliers();
    } catch (error: any) {
      toast.error('Error', error?.response?.data?.message || 'No se pudo guardar el proveedor.');
    } finally {
      setSaving(false);
    }
  };

  const saveContract = async () => {
    if (!selectedSupplier) return;
    if (!contractForm.startsAt || !contractForm.endsAt) {
      toast.error('Validación', 'Las fechas de inicio y fin son obligatorias.');
      return;
    }
    if (contractForm.endsAt < contractForm.startsAt) {
      toast.error('Validación', 'La fecha de fin no puede ser anterior al inicio.');
      return;
    }
    if (contractForm.discountPercentage < 0 || contractForm.discountPercentage > 100) {
      toast.error('Validación', 'El descuento debe estar entre 0 y 100%.');
      return;
    }
    if (contractForm.paymentDays < 0 || contractForm.minimumPurchase < 0) {
      toast.error('Validación', 'Los días de pago y la compra mínima no pueden ser negativos.');
      return;
    }
    setSaving(true);
    try {
      if (editingContract) await updateContract(selectedSupplier, editingContract.id, contractForm);
      else await createContract(selectedSupplier, contractForm);
      toast.success(editingContract ? 'Contrato actualizado' : 'Contrato creado');
      setContractFormOpen(false);
      setEditingContract(null);
      loadContracts(selectedSupplier);
    } catch (error: any) {
      toast.error('Error', error?.response?.data?.message || 'No se pudo guardar el contrato.');
    } finally {
      setSaving(false);
    }
  };

  const headerActions = (
    <>
      {tab === 'suppliers' && canCreate && (
        <button
          onClick={() => {
            setEditingSupplier(null);
            setSupplierForm({ ...emptySupplier });
            setSupplierFormOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-500"
        >
          <Plus size={17} /> Nuevo proveedor
        </button>
      )}
      {tab === 'contracts' && canContract && selectedSupplier && (
        <button
          onClick={() => {
            setEditingContract(null);
            setContractForm(emptyContract());
            setContractFormOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-500"
        >
          <Plus size={17} /> Nuevo contrato
        </button>
      )}
    </>
  );

  return (
    <div className="space-y-6">
      <EncabezadoModulo
        eyebrow="Gestión comercial"
        title="Proveedores y contratos"
        description="Centraliza contactos, condiciones comerciales y acuerdos de compra en un solo lugar."
        icon={Building2}
        actions={headerActions}
        meta={(
          <>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
              {suppliers.length} proveedor(es)
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
              {supplierStats.active} activo(s)
            </span>
          </>
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
            active={Boolean(card.filter) && card.filter === statusFilter}
            onClick={card.filter ? () => setStatusFilter(card.filter!) : undefined}
          />
        ))}
      </div>

      <PestanasModulo
        items={[
          { value: 'suppliers', label: 'Proveedores', icon: Building2, count: suppliers.length },
          { value: 'contracts', label: 'Contratos', icon: FileSignature, count: contracts.length },
        ]}
        value={tab}
        onChange={(value) => setTab(value as Tab)}
      />

      {tab === 'suppliers' ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="space-y-3 border-b border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-800/20">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar razón social, RUC o contacto..."
                  className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-10 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute inset-y-0 right-2 my-auto flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    aria-label="Limpiar búsqueda"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {(['TODOS', 'ACTIVOS', 'INACTIVOS'] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    className={cn(
                      'rounded-full px-3 py-1.5 text-xs font-semibold transition',
                      statusFilter === status
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20 dark:bg-blue-500 dark:text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                    )}
                  >
                    {status === 'TODOS' ? 'Todos' : status === 'ACTIVOS' ? 'Activos' : 'Inactivos'}
                  </button>
                ))}
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                  {filteredSuppliers.length} proveedor(es)
                </span>
                <button
                  type="button"
                  onClick={loadSuppliers}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <RefreshCw size={13} className={cn(loading && 'animate-spin')} /> Actualizar
                </button>
              </div>
            </div>
          </div>
          <ResponsiveTable
            columns={supplierColumns}
            rows={filteredSuppliers}
            keyField={(supplier) => supplier.id}
            emptyMessage={loading ? 'Cargando proveedores...' : 'No hay proveedores registrados.'}
            pageSize={10}
            itemLabel="proveedores"
            cardTitle={(supplier) => <span className="font-semibold">{supplier.businessName}</span>}
          />
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-800/20 sm:flex-row sm:items-center">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Proveedor</label>
            <select
              value={selectedSupplier ?? ''}
              onChange={(event) => setSelectedSupplier(Number(event.target.value))}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-medium dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 sm:max-w-sm"
            >
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>{supplier.businessName}</option>
              ))}
            </select>
            <div className="flex items-center gap-2 sm:ml-auto">
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                {supplierStats.activeContracts} contrato(s) activo(s)
              </span>
              <button
                type="button"
                onClick={() => selectedSupplier && loadContracts(selectedSupplier)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <RefreshCw size={13} /> Actualizar
              </button>
            </div>
          </div>
          <ResponsiveTable
            columns={contractColumns}
            rows={contracts}
            keyField={(contract) => contract.id}
            emptyMessage="Este proveedor no tiene contratos."
            pageSize={10}
            itemLabel="contratos"
            cardTitle={(contract) => <span className="font-mono text-xs">{contract.code}</span>}
          />
        </div>
      )}

      {supplierFormOpen && (
        <Modal
          title={editingSupplier ? 'Editar proveedor' : 'Nuevo proveedor'}
          description="Completa la información fiscal y de contacto del proveedor."
          icon={Building2}
          onClose={() => setSupplierFormOpen(false)}
          footer={
            <>
              <p className="mr-auto hidden text-xs text-slate-400 dark:text-slate-500 sm:block">
                Los datos se usarán en órdenes de compra y contratos.
              </p>
              <button onClick={() => setSupplierFormOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">
                Cancelar
              </button>
              <button onClick={saveSupplier} disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50">
                {saving ? 'Guardando...' : 'Guardar proveedor'}
              </button>
            </>
          }
        >
          <div className="space-y-6">
            <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 dark:border-blue-500/20 dark:bg-blue-500/10">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm dark:bg-slate-900 dark:text-blue-300">
                <Info size={15} />
              </div>
              <p className="text-xs leading-relaxed text-blue-900/80 dark:text-blue-100/80">
                Los campos con <span className="font-bold text-blue-700 dark:text-blue-200">*</span> son obligatorios.
                Usa el RUC de 11 dígitos para compras formales.
              </p>
            </div>

            <section>
              <div className="mb-3 flex items-center gap-2">
                <Building2 size={15} className="text-blue-600 dark:text-blue-300" />
                <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                  Información fiscal
                </h3>
                <span className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Razón social"
                  value={supplierForm.businessName}
                  onChange={(value) => setSupplierForm({ ...supplierForm, businessName: value })}
                  placeholder="Ej. Repuestos del Norte S.A.C."
                  required
                  maxLength={150}
                />
                <Field
                  label="RUC / documento"
                  value={supplierForm.taxId}
                  onChange={(value) => setSupplierForm({ ...supplierForm, taxId: value })}
                  placeholder="20123456789"
                  hint="11 dígitos para RUC o 8 para DNI."
                  required
                  maxLength={20}
                />
              </div>
            </section>

            <section>
              <div className="mb-3 flex items-center gap-2">
                <Contact size={15} className="text-blue-600 dark:text-blue-300" />
                <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                  Datos de contacto
                </h3>
                <span className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Persona de contacto"
                  value={supplierForm.contactName || ''}
                  onChange={(value) => setSupplierForm({ ...supplierForm, contactName: value })}
                  placeholder="Nombre del vendedor o representante"
                  maxLength={120}
                />
                <Field
                  label="Teléfono"
                  value={supplierForm.phone || ''}
                  onChange={(value) => setSupplierForm({ ...supplierForm, phone: value })}
                  placeholder="999 999 999"
                  type="tel"
                  autoComplete="tel"
                  hint="Número directo para coordinar entregas."
                  maxLength={30}
                />
                <Field
                  label="Correo"
                  type="email"
                  value={supplierForm.email || ''}
                  onChange={(value) => setSupplierForm({ ...supplierForm, email: value })}
                  placeholder="ventas@proveedor.com"
                  autoComplete="email"
                  maxLength={150}
                />
                <Field
                  label="Dirección"
                  value={supplierForm.address || ''}
                  onChange={(value) => setSupplierForm({ ...supplierForm, address: value })}
                  placeholder="Av. Industrial 123, Lima"
                  maxLength={255}
                />
              </div>
            </section>
          </div>
        </Modal>
      )}

      {contractFormOpen && (
        <Modal
          title={editingContract ? 'Editar contrato' : 'Nuevo contrato'}
          description="Define la vigencia y las condiciones comerciales acordadas con el proveedor."
          icon={FileSignature}
          onClose={() => setContractFormOpen(false)}
          footer={
            <>
              <button onClick={() => setContractFormOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">
                Cancelar
              </button>
              <button onClick={saveContract} disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:opacity-50">
                {saving ? 'Guardando...' : 'Guardar contrato'}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <AvisoFormulario>
              Las fechas definen la vigencia del acuerdo. Las condiciones comerciales se aplicarán al emitir órdenes de compra.
            </AvisoFormulario>
            <SeccionFormulario
              title="Vigencia del contrato"
              description="Indica desde y hasta cuándo estará activo el acuerdo."
              icon={FileSignature}
            >
              <Field label="Inicio de vigencia" type="date" value={contractForm.startsAt}
                onChange={(value) => setContractForm({ ...contractForm, startsAt: value })} required />
              <Field label="Fin de vigencia" type="date" value={contractForm.endsAt}
                onChange={(value) => setContractForm({ ...contractForm, endsAt: value })} required />
              <SelectField label="Moneda" value={contractForm.currency}
                onChange={(value) => setContractForm({ ...contractForm, currency: value })}
                options={[{ value: 'PEN', label: 'Soles (S/)' }, { value: 'USD', label: 'Dólares (USD)' }]} />
            </SeccionFormulario>
            <SeccionFormulario
              title="Condiciones comerciales"
              description="Descuento, plazo de pago y compra mínima pactados."
              icon={CircleCheck}
            >
              <Field label="Descuento (%)" type="number" value={String(contractForm.discountPercentage)}
                onChange={(value) => setContractForm({ ...contractForm, discountPercentage: Number(value) })} />
              <Field label="Días de pago" type="number" value={String(contractForm.paymentDays)}
                onChange={(value) => setContractForm({ ...contractForm, paymentDays: Number(value) })} />
              <Field label="Compra mínima" type="number" value={String(contractForm.minimumPurchase)}
                onChange={(value) => setContractForm({ ...contractForm, minimumPurchase: Number(value) })} />
              <CampoFormulario label="Términos y condiciones" className="sm:col-span-2">
                <textarea
                  value={contractForm.terms || ''}
                  onChange={(event) => setContractForm({ ...contractForm, terms: event.target.value })}
                  rows={3}
                  className={cn(estiloCampo, 'resize-none')}
                  placeholder="Condiciones adicionales del acuerdo..."
                />
              </CampoFormulario>
            </SeccionFormulario>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.title || ''}
        message={confirm?.message}
        busy={saving}
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          if (!confirm) return;
          try {
            await confirm.action();
            setConfirm(null);
          } catch {
            toast.error('Error', 'No se pudo completar la operación.');
          }
        }}
      />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required,
  placeholder,
  hint,
  maxLength,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  maxLength?: number;
  autoComplete?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-200">
        {label}
        {required && <span className="text-red-500" aria-hidden="true">*</span>}
      </span>
      {type === 'date' ? (
        <SelectorFecha value={value} onChange={onChange} placeholder={placeholder} />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required={required}
          placeholder={placeholder}
          maxLength={maxLength}
          autoComplete={autoComplete}
          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-slate-600"
        />
      )}
      {hint && <span className="mt-1.5 block text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">{hint}</span>}
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium text-slate-700 dark:text-slate-200">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}
