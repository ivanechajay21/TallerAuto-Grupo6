import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Building2,
  FileSignature,
  Pencil,
  Plus,
  Power,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import ResponsiveTable from '../components/ui/ResponsiveTable';
import type { ResponsiveColumn } from '../components/ui/ResponsiveTable';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useToast } from '../components/ui/Toast';
import { usePermissions } from '../context/PermissionContext';
import { cn } from '../lib/utils';
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
} from '../services/purchasingService';
import type { Contract, ContractPayload, Supplier, SupplierPayload } from '../services/purchasingService';

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
    if (!query) return suppliers;
    return suppliers.filter((supplier) =>
      [supplier.businessName, supplier.taxId, supplier.contactName, supplier.email]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query))
    );
  }, [search, suppliers]);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Proveedores y Contratos</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Administra proveedores, condiciones comerciales y vigencias.
          </p>
        </div>
        {tab === 'suppliers' && canCreate && (
          <button
            onClick={() => {
              setEditingSupplier(null);
              setSupplierForm({ ...emptySupplier });
              setSupplierFormOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"
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
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"
          >
            <Plus size={17} /> Nuevo contrato
          </button>
        )}
      </div>

      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
        {[
          { value: 'suppliers', label: 'Proveedores', icon: Building2 },
          { value: 'contracts', label: 'Contratos', icon: FileSignature },
        ].map((item) => (
          <button
            key={item.value}
            onClick={() => setTab(item.value as Tab)}
            className={cn('flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition',
              tab === item.value ? 'border-blue-600 text-blue-700 dark:text-blue-300'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200')}
          >
            <item.icon size={16} /> {item.label}
          </button>
        ))}
      </div>

      {tab === 'suppliers' ? (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="border-b border-slate-200 p-4 dark:border-slate-700">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar razón social, RUC o contacto..."
                className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-3 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
              />
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
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Proveedor:</label>
            <select
              value={selectedSupplier ?? ''}
              onChange={(event) => setSelectedSupplier(Number(event.target.value))}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
            >
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>{supplier.businessName}</option>
              ))}
            </select>
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
        <Modal title={editingSupplier ? 'Editar proveedor' : 'Nuevo proveedor'} onClose={() => setSupplierFormOpen(false)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Razón social" value={supplierForm.businessName}
              onChange={(value) => setSupplierForm({ ...supplierForm, businessName: value })} required />
            <Field label="RUC / documento" value={supplierForm.taxId}
              onChange={(value) => setSupplierForm({ ...supplierForm, taxId: value })} required />
            <Field label="Contacto" value={supplierForm.contactName || ''}
              onChange={(value) => setSupplierForm({ ...supplierForm, contactName: value })} />
            <Field label="Teléfono" value={supplierForm.phone || ''}
              onChange={(value) => setSupplierForm({ ...supplierForm, phone: value })} />
            <Field label="Correo" type="email" value={supplierForm.email || ''}
              onChange={(value) => setSupplierForm({ ...supplierForm, email: value })} />
            <Field label="Dirección" value={supplierForm.address || ''}
              onChange={(value) => setSupplierForm({ ...supplierForm, address: value })} />
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button onClick={() => setSupplierFormOpen(false)} className="rounded-xl border px-4 py-2.5 text-sm dark:border-slate-600">
              Cancelar
            </button>
            <button onClick={saveSupplier} disabled={saving}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </Modal>
      )}

      {contractFormOpen && (
        <Modal title={editingContract ? 'Editar contrato' : 'Nuevo contrato'} onClose={() => setContractFormOpen(false)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Inicio" type="date" value={contractForm.startsAt}
              onChange={(value) => setContractForm({ ...contractForm, startsAt: value })} />
            <Field label="Fin" type="date" value={contractForm.endsAt}
              onChange={(value) => setContractForm({ ...contractForm, endsAt: value })} />
            <Field label="Moneda" value={contractForm.currency}
              onChange={(value) => setContractForm({ ...contractForm, currency: value })} />
            <Field label="Descuento (%)" type="number" value={String(contractForm.discountPercentage)}
              onChange={(value) => setContractForm({ ...contractForm, discountPercentage: Number(value) })} />
            <Field label="Días de pago" type="number" value={String(contractForm.paymentDays)}
              onChange={(value) => setContractForm({ ...contractForm, paymentDays: Number(value) })} />
            <Field label="Compra mínima" type="number" value={String(contractForm.minimumPurchase)}
              onChange={(value) => setContractForm({ ...contractForm, minimumPurchase: Number(value) })} />
            <div className="sm:col-span-2">
              <Field label="Términos" value={contractForm.terms || ''}
                onChange={(value) => setContractForm({ ...contractForm, terms: value })} />
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button onClick={() => setContractFormOpen(false)} className="rounded-xl border px-4 py-2.5 text-sm dark:border-slate-600">
              Cancelar
            </button>
            <button onClick={saveContract} disabled={saving}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.title || ''}
        message={confirm?.message}
        busy={false}
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium text-slate-700 dark:text-slate-200">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
      />
    </label>
  );
}

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
