import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Check,
  ChevronRight,
  ClipboardCheck,
  PackageCheck,
  Plus,
  Search,
  Truck,
  X,
  XCircle,
} from 'lucide-react';
import ResponsiveTable from '../components/ui/ResponsiveTable';
import type { ResponsiveColumn } from '../components/ui/ResponsiveTable';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useToast } from '../components/ui/Toast';
import { usePermissions } from '../context/PermissionContext';
import { cn } from '../lib/utils';
import { getAllProducts } from '../services/productService';
import type { Product } from '../services/productService';
import {
  cancelPurchase,
  createApprovalLevel,
  createPurchase,
  decideApproval,
  getApprovalHistory,
  getApprovalLevels,
  getPurchases,
  getSuppliers,
  getTracking,
  receivePurchase,
  saveTracking,
} from '../services/purchasingService';
import type {
  ApprovalDecision,
  ApprovalLevel,
  PurchaseOrder,
  Supplier,
  Tracking,
} from '../services/purchasingService';

type Tab = 'orders' | 'approvals';

const money = (value: number) =>
  (value || 0).toLocaleString('es-PE', { style: 'currency', currency: 'PEN' });
const date = (value?: string) => (value ? new Date(value).toLocaleDateString('es-PE') : '—');

const statusLabel: Record<string, string> = {
  PENDIENTE_APROBACION: 'Pendiente de aprobación',
  PENDIENTE: 'Pendiente',
  PARCIAL: 'Recepción parcial',
  RECIBIDA: 'Recibida',
  RECHAZADA: 'Rechazada',
  ANULADA: 'Anulada',
  COTIZACION: 'Cotización',
};

const statusClass: Record<string, string> = {
  PENDIENTE_APROBACION: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  PENDIENTE: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  PARCIAL: 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  RECIBIDA: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  RECHAZADA: 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  ANULADA: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
};

const emptyOrder = {
  supplierId: 0,
  expectedDate: '',
  notes: '',
  items: [{ productId: 0, quantity: 1, unitCost: 0 }],
};

export default function Purchases() {
  const toast = useToast();
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission('COMPRAS:CREAR');
  const canApprove = hasPermission('COMPRAS:APROBAR');
  const canReceive = hasPermission('COMPRAS:RECEPCIONAR');
  const canCancel = hasPermission('COMPRAS:ANULAR');
  const canTrack = hasPermission('COMPRAS:EDITAR');

  const [tab, setTab] = useState<Tab>('orders');
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [levels, setLevels] = useState<ApprovalLevel[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyOrder);
  const [selected, setSelected] = useState<PurchaseOrder | null>(null);
  const [history, setHistory] = useState<ApprovalDecision[]>([]);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [receiveItems, setReceiveItems] = useState<Record<number, number>>({});
  const [trackingOpen, setTrackingOpen] = useState(false);
  const [tracking, setTracking] = useState<Partial<Tracking>>({ status: 'EN_TRANSITO' });
  const [levelOpen, setLevelOpen] = useState(false);
  const [levelForm, setLevelForm] = useState({ level: 1, amountFrom: 0, amountTo: '', requiredRole: 'ROLE_MANAGER', requiredApprovals: 1 });
  const [saving, setSaving] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [purchases, supplierList, levelList] = await Promise.all([
        getPurchases(), getSuppliers(false), getApprovalLevels(),
      ]);
      setOrders(purchases);
      setSuppliers(supplierList);
      setLevels(levelList);
      setCreateForm((current) => ({ ...current, supplierId: current.supplierId || supplierList[0]?.id || 0 }));
      setSelected((current) => current ? purchases.find((order) => order.id === current.id) || null : null);
    } catch {
      toast.error('Error', 'No se pudieron cargar las compras.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    getAllProducts({ incluirInactivos: false }).then(setProducts).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) return orders;
    return orders.filter((order) =>
      [order.code, order.supplier?.businessName, order.status]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query))
    );
  }, [orders, search]);

  const applicableLevels = useMemo(
    () => selected ? levels.filter((level) =>
      selected.total >= level.amountFrom && (level.amountTo == null || selected.total <= level.amountTo)
    ) : [],
    [levels, selected]
  );

  const loadHistory = async (orderId: number) => {
    try {
      setHistory(await getApprovalHistory(orderId));
    } catch {
      setHistory([]);
    }
  };

  const openDetail = async (order: PurchaseOrder) => {
    setSelected(order);
    setHistory([]);
    await loadHistory(order.id);
  };

  const createOrder = async () => {
    if (!createForm.supplierId || createForm.items.length === 0) {
      toast.error('Validación', 'Selecciona proveedor y al menos un producto.');
      return;
    }
    if (createForm.items.some((item) => !item.productId || item.quantity < 1 || item.unitCost < 0)) {
      toast.error('Validación', 'Revisa productos, cantidades y costos.');
      return;
    }
    setSaving(true);
    try {
      await createPurchase({
        supplierId: createForm.supplierId,
        expectedDate: createForm.expectedDate || undefined,
        notes: createForm.notes || undefined,
        items: createForm.items,
      });
      toast.success('Orden creada');
      setCreateOpen(false);
      setCreateForm({ ...emptyOrder, supplierId: suppliers[0]?.id || 0 });
      load();
    } catch (error: any) {
      toast.error('Error', error?.response?.data?.message || 'No se pudo crear la orden.');
    } finally {
      setSaving(false);
    }
  };

  const decide = async (levelId: number, decision: 'APROBADA' | 'RECHAZADA') => {
    if (!selected) return;
    try {
      await decideApproval(selected.id, levelId, decision);
      toast.success(decision === 'APROBADA' ? 'Nivel aprobado' : 'Orden rechazada');
      load();
      await loadHistory(selected.id);
    } catch (error: any) {
      toast.error('Error', error?.response?.data?.message || 'No se pudo registrar la decisión.');
    }
  };

  const openReceive = (order: PurchaseOrder) => {
    setSelected(order);
    setReceiveItems(Object.fromEntries(order.items.map((item) => [
      item.id,
      Math.max(0, item.requestedQuantity - item.receivedQuantity),
    ])));
    setReceiveOpen(true);
  };

  const receive = async () => {
    if (!selected) return;
    const items = Object.entries(receiveItems)
      .map(([id, quantity]) => ({ purchaseItemId: Number(id), quantity: Number(quantity) }))
      .filter((item) => item.quantity > 0);
    if (!items.length) {
      toast.error('Validación', 'Ingresa al menos una cantidad recibida.');
      return;
    }
    setSaving(true);
    try {
      await receivePurchase(selected.id, items);
      toast.success('Recepción registrada');
      setReceiveOpen(false);
      load();
    } catch (error: any) {
      toast.error('Error', error?.response?.data?.message || 'No se pudo registrar la recepción.');
    } finally {
      setSaving(false);
    }
  };

  const openTracking = async (order: PurchaseOrder) => {
    setSelected(order);
    try {
      setTracking(await getTracking(order.id));
    } catch {
      setTracking({ status: 'EN_TRANSITO' });
    }
    setTrackingOpen(true);
  };

  const saveTrackingForm = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await saveTracking(selected.id, {
        status: tracking.status || 'EN_TRANSITO',
        dispatchedAt: tracking.dispatchedAt,
        estimatedArrival: tracking.estimatedArrival,
        actualArrival: tracking.actualArrival,
        shippingGuide: tracking.shippingGuide,
        carrier: tracking.carrier,
        notes: tracking.notes,
      });
      toast.success('Seguimiento actualizado');
      setTrackingOpen(false);
      load();
    } catch (error: any) {
      toast.error('Error', error?.response?.data?.message || 'No se pudo guardar el seguimiento.');
    } finally {
      setSaving(false);
    }
  };

  const columns: ResponsiveColumn<PurchaseOrder>[] = [
    {
      key: 'code',
      header: 'Orden',
      render: (order) => (
        <div>
          <p className="font-mono text-xs font-bold text-slate-800 dark:text-slate-100">{order.code}</p>
          <p className="mt-1 text-xs text-slate-500">{order.supplier?.businessName}</p>
        </div>
      ),
    },
    { key: 'date', header: 'Emisión', render: (order) => <span className="text-xs">{date(order.issueDate)}</span> },
    {
      key: 'total',
      header: 'Total',
      render: (order) => <span className="font-semibold">{money(order.total)}</span>,
    },
    {
      key: 'status',
      header: 'Estado',
      render: (order) => (
        <span className={cn('rounded-full px-2 py-1 text-[10px] font-bold', statusClass[order.status] || statusClass.PENDIENTE)}>
          {statusLabel[order.status] || order.status}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (order) => (
        <div className="flex flex-wrap justify-end gap-1">
          <button onClick={() => void openDetail(order)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" title="Detalle">
            <ChevronRight size={16} />
          </button>
          {canReceive && ['PENDIENTE', 'PARCIAL'].includes(order.status) && (
            <button onClick={() => openReceive(order)} className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10" title="Recepcionar">
              <PackageCheck size={16} />
            </button>
          )}
          {canTrack && ['PENDIENTE', 'PARCIAL', 'RECIBIDA'].includes(order.status) && (
            <button onClick={() => void openTracking(order)} className="rounded-lg p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10" title="Seguimiento">
              <Truck size={16} />
            </button>
          )}
          {canCancel && order.status === 'PENDIENTE' && (
            <button onClick={() => { setSelected(order); setConfirmCancel(true); }} className="rounded-lg p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10" title="Anular">
              <XCircle size={16} />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Compras y Abastecimiento</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Órdenes, aprobaciones, recepciones y seguimiento logístico.</p>
        </div>
        {canCreate && (
          <button onClick={() => setCreateOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500">
            <Plus size={17} /> Nueva orden
          </button>
        )}
      </div>

      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
        {[
          { value: 'orders', label: 'Órdenes', icon: ClipboardCheck },
          { value: 'approvals', label: 'Aprobaciones', icon: Check },
        ].map((item) => (
          <button key={item.value} onClick={() => setTab(item.value as Tab)}
            className={cn('flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold',
              tab === item.value ? 'border-blue-600 text-blue-700 dark:text-blue-300' : 'border-transparent text-slate-500')}>
            <item.icon size={16} /> {item.label}
          </button>
        ))}
      </div>

      {tab === 'orders' ? (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="border-b border-slate-200 p-4 dark:border-slate-700">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar orden, proveedor o estado..."
                className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-3 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100" />
            </div>
          </div>
          <ResponsiveTable columns={columns} rows={filtered} keyField={(order) => order.id}
            emptyMessage={loading ? 'Cargando compras...' : 'No hay órdenes de compra.'}
            pageSize={10} itemLabel="órdenes" cardTitle={(order) => <span className="font-mono text-xs">{order.code}</span>} />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-end">
            {canApprove && (
              <button onClick={() => setLevelOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold dark:border-slate-600">
                <Plus size={16} /> Configurar nivel
              </button>
            )}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {levels.map((level) => (
              <div key={level.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <div className="flex justify-between">
                  <p className="font-semibold">Nivel {level.level}</p>
                  <span className="text-[10px] font-bold text-slate-400">{level.active ? 'ACTIVO' : 'INACTIVO'}</span>
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  Desde {money(level.amountFrom)} {level.amountTo ? `hasta ${money(level.amountTo)}` : 'sin límite'}
                </p>
                <p className="mt-1 text-xs text-slate-500">Rol: {level.requiredRole} · {level.requiredApprovals} aprobación(es)</p>
              </div>
            ))}
            {levels.length === 0 && <p className="text-sm text-slate-500">No hay niveles configurados.</p>}
          </div>
          {selected?.status === 'PENDIENTE_APROBACION' && canApprove && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
              <p className="font-semibold text-amber-900 dark:text-amber-200">Aprobar orden {selected.code}</p>
              <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">Total: {money(selected.total)}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {applicableLevels.map((level) => (
                  <div key={level.id} className="flex items-center gap-2 rounded-xl border border-amber-200 bg-white px-3 py-2 dark:border-amber-500/30 dark:bg-slate-900">
                    <span className="text-xs font-semibold">Nivel {level.level}</span>
                    <button onClick={() => void decide(level.id, 'APROBADA')} className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white">Aprobar</button>
                    <button onClick={() => void decide(level.id, 'RECHAZADA')} className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-bold text-white">Rechazar</button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {selected && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <p className="text-sm font-semibold">Historial de {selected.code}</p>
              {history.length === 0 ? <p className="mt-2 text-sm text-slate-500">Sin decisiones registradas.</p> : (
                <ul className="mt-2 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  {history.map((item) => <li key={item.id}>{item.level.level} · {item.decision} · {date(item.decidedAt)}</li>)}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {createOpen && (
        <Modal title="Nueva orden de compra" onClose={() => setCreateOpen(false)}>
          <div className="space-y-4">
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Proveedor</span>
              <select value={createForm.supplierId} onChange={(event) => setCreateForm({ ...createForm, supplierId: Number(event.target.value) })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100">
                <option value={0}>Selecciona un proveedor</option>
                {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.businessName}</option>)}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Notas</span>
              <input value={createForm.notes} onChange={(event) => setCreateForm({ ...createForm, notes: event.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100" />
            </label>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Productos</p>
                <button onClick={() => setCreateForm({ ...createForm, items: [...createForm.items, { productId: 0, quantity: 1, unitCost: 0 }] })}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600"><Plus size={14} /> Agregar</button>
              </div>
              {createForm.items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2">
                  <select value={item.productId} onChange={(event) => {
                    const product = products.find((value) => value.id === Number(event.target.value));
                    const items = [...createForm.items];
                    items[index] = { ...item, productId: Number(event.target.value), unitCost: product?.purchasePrice || 0 };
                    setCreateForm({ ...createForm, items });
                  }} className="col-span-6 rounded-lg border px-2 py-2 text-xs dark:border-slate-600 dark:bg-slate-950">
                    <option value={0}>Producto</option>
                    {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                  </select>
                  <input type="number" min={1} value={item.quantity} onChange={(event) => {
                    const items = [...createForm.items]; items[index] = { ...item, quantity: Number(event.target.value) }; setCreateForm({ ...createForm, items });
                  }} className="col-span-2 rounded-lg border px-2 py-2 text-xs dark:border-slate-600 dark:bg-slate-950" placeholder="Cant." />
                  <input type="number" min={0} value={item.unitCost} onChange={(event) => {
                    const items = [...createForm.items]; items[index] = { ...item, unitCost: Number(event.target.value) }; setCreateForm({ ...createForm, items });
                  }} className="col-span-3 rounded-lg border px-2 py-2 text-xs dark:border-slate-600 dark:bg-slate-950" placeholder="Costo" />
                  <button onClick={() => setCreateForm({ ...createForm, items: createForm.items.filter((_, i) => i !== index) })}
                    className="col-span-1 text-red-500" aria-label="Quitar producto"><X size={15} /></button>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 border-t pt-4 dark:border-slate-800">
              <button onClick={() => setCreateOpen(false)} className="rounded-xl border px-4 py-2.5 text-sm dark:border-slate-600">Cancelar</button>
              <button onClick={createOrder} disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Guardando...' : 'Crear orden'}</button>
            </div>
          </div>
        </Modal>
      )}

      {receiveOpen && selected && (
        <Modal title={`Recepcionar ${selected.code}`} onClose={() => setReceiveOpen(false)}>
          <div className="space-y-3">
            {selected.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <div>
                  <p className="text-sm font-semibold">{item.product.name}</p>
                  <p className="text-xs text-slate-500">Pendiente: {item.requestedQuantity - item.receivedQuantity}</p>
                </div>
                <input type="number" min={0} max={item.requestedQuantity - item.receivedQuantity}
                  value={receiveItems[item.id] ?? 0} onChange={(event) => setReceiveItems({ ...receiveItems, [item.id]: Number(event.target.value) })}
                  className="w-24 rounded-lg border px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-950" />
              </div>
            ))}
            <div className="flex justify-end gap-3 pt-3">
              <button onClick={() => setReceiveOpen(false)} className="rounded-xl border px-4 py-2.5 text-sm dark:border-slate-600">Cancelar</button>
              <button onClick={receive} disabled={saving} className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Registrar recepción</button>
            </div>
          </div>
        </Modal>
      )}

      {trackingOpen && selected && (
        <Modal title={`Seguimiento ${selected.code}`} onClose={() => setTrackingOpen(false)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">Estado<select value={tracking.status || 'EN_TRANSITO'} onChange={(event) => setTracking({ ...tracking, status: event.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-slate-600 dark:bg-slate-950">
              {['ENVIADA', 'EN_TRANSITO', 'DEMORADA', 'ENTREGADA'].map((status) => <option key={status}>{status}</option>)}
            </select></label>
            <label className="text-sm">Transportista<input value={tracking.carrier || ''} onChange={(event) => setTracking({ ...tracking, carrier: event.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-slate-600 dark:bg-slate-950" /></label>
            <label className="text-sm">Guía<input value={tracking.shippingGuide || ''} onChange={(event) => setTracking({ ...tracking, shippingGuide: event.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-slate-600 dark:bg-slate-950" /></label>
            <label className="text-sm">Llegada estimada<input type="date" value={tracking.estimatedArrival || ''} onChange={(event) => setTracking({ ...tracking, estimatedArrival: event.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-slate-600 dark:bg-slate-950" /></label>
            <label className="text-sm">Llegada real<input type="date" value={tracking.actualArrival || ''} onChange={(event) => setTracking({ ...tracking, actualArrival: event.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-slate-600 dark:bg-slate-950" /></label>
          </div>
          <div className="mt-4 flex justify-end gap-3">
            <button onClick={() => setTrackingOpen(false)} className="rounded-xl border px-4 py-2.5 text-sm dark:border-slate-600">Cancelar</button>
            <button onClick={saveTrackingForm} disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Guardar</button>
          </div>
        </Modal>
      )}

      {levelOpen && (
        <Modal title="Nuevo nivel de aprobación" onClose={() => setLevelOpen(false)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">Nivel<input type="number" min={1} value={levelForm.level} onChange={(e) => setLevelForm({ ...levelForm, level: Number(e.target.value) })} className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-slate-600 dark:bg-slate-950" /></label>
            <label className="text-sm">Rol requerido<input value={levelForm.requiredRole} onChange={(e) => setLevelForm({ ...levelForm, requiredRole: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-slate-600 dark:bg-slate-950" /></label>
            <label className="text-sm">Desde<input type="number" value={levelForm.amountFrom} onChange={(e) => setLevelForm({ ...levelForm, amountFrom: Number(e.target.value) })} className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-slate-600 dark:bg-slate-950" /></label>
            <label className="text-sm">Hasta<input type="number" value={levelForm.amountTo} onChange={(e) => setLevelForm({ ...levelForm, amountTo: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-slate-600 dark:bg-slate-950" placeholder="Sin límite" /></label>
            <label className="text-sm">Aprobaciones<input type="number" min={1} value={levelForm.requiredApprovals} onChange={(e) => setLevelForm({ ...levelForm, requiredApprovals: Number(e.target.value) })} className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-slate-600 dark:bg-slate-950" /></label>
          </div>
          <div className="mt-4 flex justify-end gap-3">
            <button onClick={() => setLevelOpen(false)} className="rounded-xl border px-4 py-2.5 text-sm dark:border-slate-600">Cancelar</button>
            <button onClick={async () => {
              try {
                await createApprovalLevel({ ...levelForm, amountTo: levelForm.amountTo ? Number(levelForm.amountTo) : undefined, active: true });
                toast.success('Nivel creado');
                setLevelOpen(false);
                load();
              } catch (error: any) {
                toast.error('Error', error?.response?.data?.message || 'No se pudo crear el nivel.');
              }
            }} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white">Guardar</button>
          </div>
        </Modal>
      )}

      <ConfirmDialog open={confirmCancel} title="Anular orden de compra" message="Solo se pueden anular órdenes pendientes sin recepciones."
        confirmLabel="Anular" onCancel={() => setConfirmCancel(false)}
        onConfirm={async () => {
          if (!selected) return;
          try {
            await cancelPurchase(selected.id);
            toast.success('Orden anulada');
            setConfirmCancel(false);
            load();
          } catch (error: any) {
            toast.error('Error', error?.response?.data?.message || 'No se pudo anular la orden.');
          }
        }} />
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true">
      <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Cerrar"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
