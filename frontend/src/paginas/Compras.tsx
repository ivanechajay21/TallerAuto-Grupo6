import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  FileText,
  PackageCheck,
  Plus,
  RotateCcw,
  Search,
  ShoppingCart,
  Truck,
  X,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import ResponsiveTable from '../componentes/interfaz/TablaAdaptable';
import type { ResponsiveColumn } from '../componentes/interfaz/TablaAdaptable';
import ConfirmDialog from '../componentes/interfaz/DialogoConfirmacion';
import EncabezadoModulo from '../componentes/interfaz/EncabezadoModulo';
import {
  AvisoFormulario,
  CajaResumen,
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
import { roleLabel } from '../lib/roles';
import { getAllProducts } from '../servicios/productosServicio';
import type { Product } from '../servicios/productosServicio';
import {
  acceptQuote,
  cancelPurchase,
  createApprovalLevel,
  createPurchase,
  createQuote,
  createReturn,
  decideApproval,
  getApprovalHistory,
  getApprovalLevels,
  getPurchases,
  getReturns,
  getSuppliers,
  getTracking,
  receivePurchase,
  saveTracking,
} from '../servicios/comprasServicio';
import type {
  ApprovalDecision,
  ApprovalLevel,
  PurchaseOrder,
  PurchaseReturn,
  Supplier,
  Tracking,
} from '../servicios/comprasServicio';

type Tab = 'orders' | 'quotes' | 'approvals';
type OrderStatusFilter = 'TODOS' | 'PENDIENTE_APROBACION' | 'ABIERTAS' | 'RECIBIDA' | 'ANULADA';

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

const trackingLabel: Record<string, string> = {
  ENVIADA: 'Enviada',
  EN_TRANSITO: 'En tránsito',
  DEMORADA: 'Demorada',
  ENTREGADA: 'Entregada',
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
  const canReturn = hasPermission('COMPRAS:DEVOLVER');

  const [tab, setTab] = useState<Tab>('orders');
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [levels, setLevels] = useState<ApprovalLevel[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>('TODOS');
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [quoteMode, setQuoteMode] = useState(false);
  const [createForm, setCreateForm] = useState(emptyOrder);
  const [selected, setSelected] = useState<PurchaseOrder | null>(null);
  const [history, setHistory] = useState<ApprovalDecision[]>([]);
  const [returns, setReturns] = useState<PurchaseReturn[]>([]);
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [returnItems, setReturnItems] = useState<Record<number, number>>({});
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [receiveItems, setReceiveItems] = useState<Record<number, number>>({});
  const [trackingOpen, setTrackingOpen] = useState(false);
  const [tracking, setTracking] = useState<Partial<Tracking>>({ status: 'EN_TRANSITO' });
  const [levelOpen, setLevelOpen] = useState(false);
  const [levelForm, setLevelForm] = useState({ level: 1, amountFrom: 0, amountTo: '', requiredRole: 'ROLE_MANAGER', requiredApprovals: 1 });
  const [saving, setSaving] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

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

  const quotes = useMemo(
    () => orders.filter((order) => order.status === 'COTIZACION'),
    [orders],
  );
  const baseOrders = useMemo(
    () => orders.filter((order) => order.status !== 'COTIZACION'),
    [orders],
  );

  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim();
    return baseOrders.filter((order) => {
      const matchesStatus =
        statusFilter === 'TODOS'
        || (statusFilter === 'ABIERTAS' && ['PENDIENTE', 'PARCIAL'].includes(order.status))
        || (statusFilter !== 'ABIERTAS' && order.status === statusFilter);
      if (!matchesStatus) return false;
      if (!query) return true;
      return [order.code, order.supplier?.businessName, order.status]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query));
    });
  }, [baseOrders, search, statusFilter]);

  const applicableLevels = useMemo(
    () => selected ? levels.filter((level) =>
      selected.total >= level.amountFrom && (level.amountTo == null || selected.total <= level.amountTo)
    ) : [],
    [levels, selected]
  );

  const pendingApprovals = useMemo(
    () => baseOrders.filter((order) => order.status === 'PENDIENTE_APROBACION'),
    [baseOrders],
  );

  const stats = useMemo(() => ({
    approval: baseOrders.filter((order) => order.status === 'PENDIENTE_APROBACION').length,
    pending: baseOrders.filter((order) => order.status === 'PENDIENTE' || order.status === 'PARCIAL').length,
    received: baseOrders.filter((order) => order.status === 'RECIBIDA').length,
    quotes: quotes.length,
    total: baseOrders.filter((order) => order.status !== 'ANULADA').reduce((sum, order) => sum + order.total, 0),
  }), [baseOrders, quotes.length]);

  const createTotal = createForm.items.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitCost) || 0),
    0
  );

  const loadHistory = async (orderId: number) => {
    try {
      setHistory(await getApprovalHistory(orderId));
    } catch {
      setHistory([]);
    }
  };

  const loadReturns = async (orderId: number) => {
    try {
      setReturns(await getReturns(orderId));
    } catch {
      setReturns([]);
    }
  };

  const openDetail = async (order: PurchaseOrder) => {
    setSelected(order);
    setHistory([]);
    setReturns([]);
    setDetailOpen(true);
    await Promise.all([loadHistory(order.id), loadReturns(order.id)]);
  };

  const selectApprovalOrder = async (order: PurchaseOrder) => {
    setSelected(order);
    setHistory([]);
    setReturns([]);
    await Promise.all([loadHistory(order.id), loadReturns(order.id)]);
  };

  const openCreateOrder = () => {
    setQuoteMode(false);
    setCreateForm({ ...emptyOrder, supplierId: suppliers[0]?.id || 0 });
    setCreateOpen(true);
  };

  const openCreateQuote = () => {
    setQuoteMode(true);
    setCreateForm({ ...emptyOrder, supplierId: suppliers[0]?.id || 0 });
    setCreateOpen(true);
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
      const payload = {
        supplierId: createForm.supplierId,
        expectedDate: createForm.expectedDate || undefined,
        notes: createForm.notes || undefined,
        items: createForm.items,
      };
      if (quoteMode) {
        await createQuote(payload);
        toast.success('Cotización creada');
        setTab('quotes');
      } else {
        await createPurchase(payload);
        toast.success('Orden creada');
      }
      setCreateOpen(false);
      setCreateForm({ ...emptyOrder, supplierId: suppliers[0]?.id || 0 });
      load();
    } catch (error: any) {
      toast.error('Error', error?.response?.data?.message || 'No se pudo crear el documento.');
    } finally {
      setSaving(false);
    }
  };

  const accept = async (order: PurchaseOrder) => {
    try {
      await acceptQuote(order.id);
      toast.success('Cotización aceptada');
      load();
    } catch (error: any) {
      toast.error('Error', error?.response?.data?.message || 'No se pudo aceptar la cotización.');
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

  const openReturn = (order: PurchaseOrder) => {
    setSelected(order);
    setReturnReason('');
    setReturnItems(Object.fromEntries(order.items.map((item) => [
      item.id,
      Math.max(0, item.receivedQuantity - item.returnedQuantity),
    ])));
    setReturnOpen(true);
  };

  const submitReturn = async () => {
    if (!selected) return;
    const items = Object.entries(returnItems)
      .map(([id, quantity]) => ({ purchaseItemId: Number(id), quantity: Number(quantity) }))
      .filter((item) => item.quantity > 0);
    if (!items.length) {
      toast.error('Validación', 'Ingresa al menos una cantidad a devolver.');
      return;
    }
    setSaving(true);
    try {
      await createReturn(selected.id, { reason: returnReason.trim() || undefined, items });
      toast.success('Devolución registrada');
      setReturnOpen(false);
      await load();
      await loadReturns(selected.id);
    } catch (error: any) {
      toast.error('Error', error?.response?.data?.message || 'No se pudo registrar la devolución.');
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
      className: 'text-right',
      render: (order) => <span className="font-semibold tabular-nums">{money(order.total)}</span>,
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
            <button type="button" onClick={() => openReceive(order)} className="rounded-lg p-2 text-emerald-600 transition hover:bg-emerald-50 dark:hover:bg-emerald-500/10" title="Recepcionar" aria-label={`Recepcionar ${order.code}`}>
              <PackageCheck size={16} />
            </button>
          )}
          {canReturn && ['RECIBIDA', 'PARCIAL'].includes(order.status)
            && order.items.some((item) => item.receivedQuantity > item.returnedQuantity) && (
            <button type="button" onClick={() => openReturn(order)} className="rounded-lg p-2 text-amber-600 transition hover:bg-amber-50 dark:hover:bg-amber-500/10" title="Devolver al proveedor" aria-label={`Devolver ${order.code}`}>
              <RotateCcw size={16} />
            </button>
          )}
          {canTrack && ['PENDIENTE', 'PARCIAL', 'RECIBIDA'].includes(order.status) && (
            <button type="button" onClick={() => void openTracking(order)} className="rounded-lg p-2 text-blue-600 transition hover:bg-blue-50 dark:hover:bg-blue-500/10" title="Seguimiento" aria-label={`Ver seguimiento de ${order.code}`}>
              <Truck size={16} />
            </button>
          )}
          {canCancel && order.status === 'PENDIENTE' && (
            <button type="button" onClick={() => { setSelected(order); setConfirmCancel(true); }} className="rounded-lg p-2 text-red-500 transition hover:bg-red-50 dark:hover:bg-red-500/10" title="Anular" aria-label={`Anular ${order.code}`}>
              <XCircle size={16} />
            </button>
          )}
        </div>
      ),
    },
  ];

  const quoteColumns: ResponsiveColumn<PurchaseOrder>[] = [
    {
      key: 'code',
      header: 'Cotización',
      render: (order) => (
        <div>
          <p className="font-mono text-xs font-bold">{order.code}</p>
          <p className="mt-1 text-xs text-slate-500">{order.supplier?.businessName}</p>
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Emisión',
      render: (order) => <span className="text-xs">{date(order.issueDate)}</span>,
    },
    {
      key: 'total',
      header: 'Total',
      className: 'text-right',
      render: (order) => <span className="font-semibold tabular-nums">{money(order.total)}</span>,
    },
    {
      key: 'status',
      header: 'Estado',
      render: (order) => (
        <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
          {statusLabel[order.status] || order.status}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (order) => (
        <div className="flex justify-end gap-1">
          <button onClick={() => void openDetail(order)} className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">
            Ver
          </button>
          {canApprove && order.status === 'COTIZACION' && (
            <button onClick={() => void accept(order)} className="rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-bold text-white">
              Aceptar
            </button>
          )}
        </div>
      ),
    },
  ];

  const headerActions = (
    <>
      <button
        type="button"
        onClick={load}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
      >
        <RefreshCw size={14} className={cn(loading && 'animate-spin')} /> Actualizar
      </button>
      {canCreate && (
        <button onClick={openCreateOrder} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-500">
          <Plus size={17} /> Nueva orden
        </button>
      )}
    </>
  );

  return (
    <div className="space-y-6">
      <EncabezadoModulo
        eyebrow="Cadena de suministro"
        title="Compras y aprobaciones"
        description="Controla órdenes, cotizaciones, aprobaciones, recepciones y seguimiento logístico."
        icon={ShoppingCart}
        actions={headerActions}
        meta={(
          <>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
              {baseOrders.length} orden(es)
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
              {quotes.length} cotización(es)
            </span>
          </>
        )}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Por aprobar', value: stats.approval, icon: Clock3, tone: 'amber' as const, filter: 'PENDIENTE_APROBACION' as OrderStatusFilter },
          { label: 'Órdenes abiertas', value: stats.pending, icon: ShoppingCart, tone: 'blue' as const, filter: 'ABIERTAS' as OrderStatusFilter },
          { label: 'Recibidas', value: stats.received, icon: PackageCheck, tone: 'emerald' as const, filter: 'RECIBIDA' as OrderStatusFilter },
          { label: 'Importe comprometido', value: money(stats.total), icon: ClipboardCheck, tone: 'violet' as const, filter: 'TODOS' as OrderStatusFilter },
        ].map((item) => (
          <TarjetaMetrica
            key={item.label}
            label={item.label}
            value={item.value}
            icon={item.icon}
            tone={item.tone}
            active={statusFilter === item.filter && tab === 'orders'}
            onClick={() => { setTab('orders'); setStatusFilter(item.filter); }}
          />
        ))}
      </div>

      <PestanasModulo
        items={[
          { value: 'orders', label: 'Órdenes', icon: ClipboardCheck, count: baseOrders.length },
          { value: 'quotes', label: 'Cotizaciones', icon: FileText, count: quotes.length },
          { value: 'approvals', label: 'Aprobaciones', icon: Check, count: stats.approval },
        ]}
        value={tab}
        onChange={(value) => setTab(value as Tab)}
      />

      {tab === 'orders' ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="space-y-3 border-b border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-800/20">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar orden, proveedor o estado..."
                  className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-10 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100" />
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
                {(
                  [
                    ['TODOS', 'Todas'],
                    ['PENDIENTE_APROBACION', 'Por aprobar'],
                    ['ABIERTAS', 'Abiertas'],
                    ['RECIBIDA', 'Recibidas'],
                    ['ANULADA', 'Anuladas'],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setStatusFilter(value)}
                    className={cn(
                      'rounded-full px-3 py-1.5 text-xs font-semibold transition',
                      statusFilter === value
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20 dark:bg-blue-500 dark:text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                    )}
                  >
                    {label}
                  </button>
                ))}
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                  {filtered.length} orden(es)
                </span>
              </div>
            </div>
          </div>
          <ResponsiveTable columns={columns} rows={filtered} keyField={(order) => order.id}
            emptyMessage={loading ? 'Cargando compras...' : 'No hay órdenes de compra.'}
            pageSize={10} itemLabel="órdenes" cardTitle={(order) => <span className="font-mono text-xs">{order.code}</span>} />
        </div>
      ) : tab === 'quotes' ? (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold">Cotizaciones de proveedor</h2>
              <p className="mt-1 text-sm text-slate-500">Registra ofertas y acéptalas para iniciar el flujo de aprobación.</p>
            </div>
            {canCreate && (
              <button onClick={openCreateQuote} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500">
                <Plus size={16} /> Nueva cotización
              </button>
            )}
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <ResponsiveTable columns={quoteColumns} rows={quotes} keyField={(order) => order.id}
              emptyMessage={loading ? 'Cargando cotizaciones...' : 'No hay cotizaciones registradas.'}
              pageSize={10} itemLabel="cotizaciones" cardTitle={(order) => <span className="font-mono text-xs">{order.code}</span>} />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
                  <Check size={19} />
                </span>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">Niveles de aprobación</h2>
                  <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                    Define montos, roles responsables y cantidad de aprobaciones requeridas.
                  </p>
                </div>
              </div>
              {canApprove && (
                <button
                  type="button"
                  onClick={() => setLevelOpen(true)}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Plus size={16} /> Configurar nivel
                </button>
              )}
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/20">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Órdenes pendientes</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Selecciona una orden para revisar y decidir.</p>
              </div>
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                {pendingApprovals.length} pendiente(s)
              </span>
            </div>
            {pendingApprovals.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Check size={26} className="mx-auto text-emerald-400" />
                <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">Sin órdenes pendientes</p>
                <p className="mt-1 text-xs text-slate-400">Todas las órdenes están al día.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {pendingApprovals.map((order) => (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => void selectApprovalOrder(order)}
                    className={cn(
                      'flex w-full items-center gap-3 px-4 py-3 text-left transition',
                      selected?.id === order.id
                        ? 'bg-blue-50/70 dark:bg-blue-500/10'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40',
                    )}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300">
                      <Clock3 size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-mono text-xs font-bold text-slate-800 dark:text-slate-100">{order.code}</span>
                      <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{order.supplier?.businessName}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-sm font-bold tabular-nums text-slate-800 dark:text-slate-100">{money(order.total)}</span>
                      <span className="text-[10px] text-slate-400">{date(order.issueDate)}</span>
                    </span>
                    <ChevronRight size={15} className="shrink-0 text-slate-300 dark:text-slate-600" />
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Niveles configurados</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Reglas aplicadas según el importe de la orden.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                {levels.length} nivel(es)
              </span>
            </div>
            {levels.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center dark:border-slate-700">
                <Check size={26} className="mx-auto text-slate-300 dark:text-slate-600" />
                <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">No hay niveles configurados.</p>
                {canApprove && (
                  <button type="button" onClick={() => setLevelOpen(true)} className="mt-3 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400">
                    Configurar el primer nivel
                  </button>
                )}
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {levels.map((level) => (
                  <article key={level.id} className="rounded-2xl border border-slate-200 bg-slate-50/40 p-4 dark:border-slate-700 dark:bg-slate-800/25">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">Nivel {level.level}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {money(level.amountFrom)} {level.amountTo ? `— ${money(level.amountTo)}` : 'en adelante'}
                        </p>
                      </div>
                      <span className={cn(
                        'rounded-full px-2 py-1 text-[10px] font-bold',
                        level.active
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
                      )}>
                        {level.active ? 'ACTIVO' : 'INACTIVO'}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700">
                        {roleLabel(level.requiredRole)}
                      </span>
                      <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                        {level.requiredApprovals} aprobación(es)
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          {selected?.status === 'PENDIENTE_APROBACION' && canApprove && (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-amber-900 dark:text-amber-200">Aprobar orden {selected.code}</p>
                  <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">Total: {money(selected.total)}</p>
                </div>
                <button type="button" onClick={() => void openDetail(selected)} className="inline-flex items-center gap-1.5 self-start rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 dark:border-amber-500/30 dark:bg-slate-900 dark:text-amber-200 sm:self-auto">
                  Ver detalle <ChevronRight size={13} />
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {applicableLevels.map((level) => (
                  <div key={level.id} className="flex items-center gap-2 rounded-xl border border-amber-200 bg-white px-3 py-2 dark:border-amber-500/30 dark:bg-slate-900">
                    <span className="text-xs font-semibold">Nivel {level.level}</span>
                    <button type="button" onClick={() => void decide(level.id, 'APROBADA')} className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-500">Aprobar</button>
                    <button type="button" onClick={() => void decide(level.id, 'RECHAZADA')} className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-bold text-red-600 hover:bg-red-50">Rechazar</button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {selected && (
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
                  <ClipboardCheck size={16} />
                </span>
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Historial de {selected.code}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Decisiones registradas por nivel.</p>
                </div>
              </div>
              {history.length === 0 ? (
                <p className="mt-3 rounded-xl border border-dashed border-slate-200 px-3 py-5 text-center text-xs text-slate-400 dark:border-slate-700">
                  Sin decisiones registradas.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {history.map((item) => (
                    <li key={item.id} className="flex items-start gap-2 rounded-xl border border-slate-100 px-3 py-2 dark:border-slate-800">
                      <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', item.decision === 'APROBADA' ? 'bg-emerald-500' : 'bg-red-500')} />
                      <span className="min-w-0 text-sm text-slate-600 dark:text-slate-300">
                        Nivel {item.level.level} · <strong>{item.decision}</strong> · {date(item.decidedAt)}
                        {item.comment && <span className="mt-0.5 block text-xs text-slate-400">{item.comment}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {selected && returns.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Devoluciones de {selected.code}</p>
              <ul className="mt-3 space-y-2">
                {returns.map((item) => (
                  <li key={item.id} className="rounded-xl border border-slate-100 px-3 py-2 text-sm dark:border-slate-800">
                    <p className="font-semibold text-slate-700 dark:text-slate-200">{item.number} · {date(item.returnedAt)}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.reason} · {item.items.reduce((sum, line) => sum + line.quantity, 0)} unidad(es)</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {createOpen && (
        <Modal
          title={quoteMode ? 'Nueva cotización' : 'Nueva orden de compra'}
          description={quoteMode ? 'Registra una oferta de proveedor para evaluarla antes de comprar.' : 'Selecciona al proveedor y las líneas de productos que deseas adquirir.'}
          icon={quoteMode ? FileText : ShoppingCart}
          size="xl"
          onClose={() => setCreateOpen(false)}
          footer={
            <>
              <button onClick={() => setCreateOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">Cancelar</button>
              <button onClick={createOrder} disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:opacity-50">{saving ? 'Guardando...' : quoteMode ? 'Crear cotización' : 'Crear orden'}</button>
            </>
          }
        >
          <div className="space-y-4">
            <AvisoFormulario>
              Los campos con <span className="font-bold">*</span> son obligatorios. Revisa el proveedor, las líneas y el total antes de guardar.
            </AvisoFormulario>
            <SeccionFormulario
              title="Datos del documento"
              description={quoteMode ? 'Datos generales de la oferta del proveedor.' : 'Datos generales de la orden de compra.'}
              icon={quoteMode ? FileText : ShoppingCart}
            >
              <CampoFormulario label="Proveedor" required>
                <select value={createForm.supplierId} onChange={(event) => setCreateForm({ ...createForm, supplierId: Number(event.target.value) })} className={estiloCampo}>
                  <option value={0}>Selecciona un proveedor</option>
                  {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.businessName}</option>)}
                </select>
              </CampoFormulario>
              <CampoFormulario label="Fecha esperada" hint="Opcional. Se usa para planificar la entrega.">
                <SelectorFecha value={createForm.expectedDate} onChange={(value) => setCreateForm({ ...createForm, expectedDate: value })} />
              </CampoFormulario>
              <CampoFormulario label="Notas" className="sm:col-span-2">
                <input value={createForm.notes} onChange={(event) => setCreateForm({ ...createForm, notes: event.target.value })} placeholder="Observaciones para el proveedor..." className={estiloCampo} />
              </CampoFormulario>
            </SeccionFormulario>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/40 p-4 dark:border-slate-700 dark:bg-slate-800/25">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm dark:bg-slate-900 dark:text-blue-300">
                    <ShoppingCart size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Productos</p>
                    <p className="text-xs text-slate-500">Agrega una línea por cada repuesto solicitado.</p>
                  </div>
                </div>
                <button onClick={() => setCreateForm({ ...createForm, items: [...createForm.items, { productId: 0, quantity: 1, unitCost: 0 }] })}
                  className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-300"><Plus size={14} /> Agregar</button>
              </div>
              <div className="space-y-2">
                {createForm.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 items-center gap-2">
                    <select value={item.productId} onChange={(event) => {
                      const product = products.find((value) => value.id === Number(event.target.value));
                      const items = [...createForm.items];
                      items[index] = { ...item, productId: Number(event.target.value), unitCost: product?.purchasePrice || 0 };
                      setCreateForm({ ...createForm, items });
                    }} className="col-span-12 rounded-lg border border-slate-300 px-2 py-2 text-xs outline-none focus:border-blue-500 sm:col-span-6 dark:border-slate-600 dark:bg-slate-950">
                      <option value={0}>Selecciona un producto</option>
                      {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                    </select>
                    <input type="number" min={1} value={item.quantity} onChange={(event) => {
                      const items = [...createForm.items]; items[index] = { ...item, quantity: Number(event.target.value) }; setCreateForm({ ...createForm, items });
                    }} className="col-span-3 rounded-lg border border-slate-300 px-2 py-2 text-xs sm:col-span-2 dark:border-slate-600 dark:bg-slate-950" placeholder="Cantidad" />
                    <input type="number" min={0} value={item.unitCost} onChange={(event) => {
                      const items = [...createForm.items]; items[index] = { ...item, unitCost: Number(event.target.value) }; setCreateForm({ ...createForm, items });
                    }} className="col-span-3 rounded-lg border border-slate-300 px-2 py-2 text-xs sm:col-span-2 dark:border-slate-600 dark:bg-slate-950" placeholder="Costo unit." />
                    <span className="col-span-2 text-right text-xs font-semibold text-slate-600 sm:col-span-1 dark:text-slate-300">
                      {money((Number(item.quantity) || 0) * (Number(item.unitCost) || 0))}
                    </span>
                    <button onClick={() => setCreateForm({ ...createForm, items: createForm.items.filter((_, i) => i !== index) })}
                      className="col-span-1 text-red-500 transition hover:text-red-600" aria-label="Quitar producto"><X size={15} /></button>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <CajaResumen
                  label="Total estimado"
                  value={money(createTotal)}
                  helper={quoteMode ? 'La cotización no compromete inventario hasta ser aceptada.' : 'El importe se enviará al flujo de aprobación.'}
                />
              </div>
            </div>
          </div>
        </Modal>
      )}

      {detailOpen && selected && (
        <Modal
          title="Detalle de orden"
          description={`${selected.supplier?.businessName || 'Proveedor'} · ${date(selected.issueDate)}`}
          icon={ClipboardCheck}
          size="xl"
          onClose={() => setDetailOpen(false)}
          footer={(
            <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => setDetailOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cerrar
              </button>
              <div className="flex flex-wrap justify-end gap-2">
                {canReceive && ['PENDIENTE', 'PARCIAL'].includes(selected.status) && (
                  <button
                    type="button"
                    onClick={() => { setDetailOpen(false); openReceive(selected); }}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
                  >
                    <PackageCheck size={15} /> Recepcionar
                  </button>
                )}
                {canTrack && ['PENDIENTE', 'PARCIAL', 'RECIBIDA'].includes(selected.status) && (
                  <button
                    type="button"
                    onClick={() => { setDetailOpen(false); void openTracking(selected); }}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
                  >
                    <Truck size={15} /> Seguimiento
                  </button>
                )}
                {canReturn && ['RECIBIDA', 'PARCIAL'].includes(selected.status)
                  && selected.items.some((item) => item.receivedQuantity > item.returnedQuantity) && (
                  <button
                    type="button"
                    onClick={() => { setDetailOpen(false); openReturn(selected); }}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
                  >
                    <RotateCcw size={15} /> Devolver
                  </button>
                )}
              </div>
            </div>
          )}
        >
          <div className="space-y-5">
            <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm dark:border-slate-700">
              <div className="bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 px-5 py-5 text-white">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-100">Orden de compra</p>
                    <p className="mt-1 font-mono text-xl font-bold tracking-wide">{selected.code}</p>
                    <p className="mt-1 text-sm text-blue-100">{selected.supplier?.businessName || 'Sin proveedor'}</p>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-100">Total de la orden</p>
                    <p className="mt-1 text-2xl font-bold tabular-nums">{money(selected.total)}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold ring-1 ring-inset ring-white/20">
                    {statusLabel[selected.status] || selected.status}
                  </span>
                  <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-blue-50">
                    {selected.items.length} línea(s)
                  </span>
                  {selected.expectedDate && (
                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-blue-50">
                      Entrega: {date(selected.expectedDate)}
                    </span>
                  )}
                </div>
              </div>
              <div className="grid divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                {[
                  ['Proveedor', selected.supplier?.businessName || '—'],
                  ['Fecha de emisión', date(selected.issueDate)],
                  ['Entrega prevista', selected.expectedDate ? date(selected.expectedDate) : 'Sin fecha'],
                ].map(([label, value]) => (
                  <div key={label} className="px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
                    <p className="mt-1 truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <section className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/30">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Detalle de la orden</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Productos, cantidades y costos comprometidos.</p>
                </div>
                <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-500 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700">
                  {selected.items.length} ítem(s)
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-[560px] w-full text-sm">
                  <thead className="bg-white text-left text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:bg-slate-900">
                    <tr>
                      <th className="px-4 py-2.5">Producto</th>
                      <th className="px-3 py-2.5 text-right">Solicitado</th>
                      <th className="px-3 py-2.5 text-right">Recibido</th>
                      <th className="px-3 py-2.5 text-right">Costo unit.</th>
                      <th className="px-4 py-2.5 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {selected.items.map((item) => (
                      <tr key={item.id} className="transition hover:bg-blue-50/40 dark:hover:bg-blue-500/5">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
                              <ShoppingCart size={14} />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-slate-800 dark:text-slate-100">{item.product?.name || 'Producto'}</p>
                              <p className="font-mono text-[10px] text-slate-400">{item.product?.code || '—'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums text-slate-600 dark:text-slate-300">{item.requestedQuantity}</td>
                        <td className="px-3 py-3 text-right tabular-nums">
                          <span className={cn(
                            'rounded-full px-2 py-0.5 text-[10px] font-bold',
                            item.receivedQuantity >= item.requestedQuantity
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
                          )}>
                            {item.receivedQuantity}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums text-slate-600 dark:text-slate-300">{money(item.unitCost)}</td>
                        <td className="px-4 py-3 text-right font-bold tabular-nums text-slate-900 dark:text-white">{money(item.requestedQuantity * item.unitCost)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t border-slate-200 bg-slate-50/60 dark:border-slate-700 dark:bg-slate-800/30">
                    <tr>
                      <td colSpan={4} className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Total de la orden
                      </td>
                      <td className="px-4 py-3 text-right text-base font-bold tabular-nums text-slate-900 dark:text-white">{money(selected.total)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>

            {selected.status === 'PENDIENTE_APROBACION' && canApprove && applicableLevels.length > 0 && (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-amber-600 shadow-sm dark:bg-slate-900 dark:text-amber-300">
                    <Clock3 size={17} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-amber-900 dark:text-amber-200">Decisión de aprobación</p>
                    <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-300">La orden requiere decisión en los siguientes niveles.</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {applicableLevels.map((level) => (
                        <div key={level.id} className="flex items-center gap-2 rounded-xl border border-amber-200 bg-white px-3 py-2 dark:border-amber-500/30 dark:bg-slate-900">
                          <span className="text-xs font-semibold">Nivel {level.level}</span>
                          <button type="button" onClick={() => void decide(level.id, 'APROBADA')} className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-500">Aprobar</button>
                          <button type="button" onClick={() => void decide(level.id, 'RECHAZADA')} className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-bold text-red-600 hover:bg-red-50">Rechazar</button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            )}

            <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
                  <ClipboardCheck size={15} className="text-blue-600 dark:text-blue-300" /> Historial de aprobación
                </h3>
                {history.length === 0 ? (
                  <p className="mt-3 rounded-xl border border-dashed border-slate-200 px-3 py-5 text-center text-xs text-slate-400 dark:border-slate-700">
                    Sin decisiones registradas.
                  </p>
                ) : (
                  <ol className="relative mt-4 space-y-4 border-l border-slate-200 pl-4 dark:border-slate-700">
                    {history.map((item) => (
                      <li key={item.id} className="relative">
                        <span className={cn(
                          'absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-white dark:ring-slate-900',
                          item.decision === 'APROBADA' ? 'bg-emerald-500' : 'bg-red-500'
                        )} />
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                          Nivel {item.level.level} · {item.decision}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-400">{date(item.decidedAt)}</p>
                        {item.comment && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{item.comment}</p>}
                      </li>
                    ))}
                  </ol>
                )}
              </section>

              <div className="space-y-4">
                <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
                    <FileText size={15} className="text-slate-400" /> Notas de la orden
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    {selected.notes || 'Sin notas registradas.'}
                  </p>
                </section>
                {returns.length > 0 && (
                  <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                    <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
                      <RotateCcw size={15} className="text-amber-500" /> Devoluciones
                    </h3>
                    <ul className="mt-2 space-y-2">
                      {returns.map((item) => (
                        <li key={item.id} className="rounded-xl border border-slate-100 px-3 py-2 text-xs dark:border-slate-800">
                          <p className="font-semibold text-slate-700 dark:text-slate-200">{item.number} · {date(item.returnedAt)}</p>
                          <p className="mt-0.5 text-slate-500">{item.reason}</p>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {receiveOpen && selected && (
        <Modal
          title={`Recepcionar ${selected.code}`}
          description="Ingresa las cantidades que llegaron físicamente. Puedes registrar una recepción parcial."
          icon={PackageCheck}
          onClose={() => setReceiveOpen(false)}
          footer={
            <>
              <button onClick={() => setReceiveOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">Cancelar</button>
              <button onClick={receive} disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:opacity-50">Registrar recepción</button>
            </>
          }
        >
          <div className="space-y-3">
            {selected.items.map((item) => {
              const pending = item.requestedQuantity - item.receivedQuantity;
              return (
                <div key={item.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-3 sm:flex-row sm:items-center dark:border-slate-700">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{item.product.name}</p>
                    <p className="text-xs text-slate-500">Pendiente: {pending} · Costo: {money(item.unitCost)}</p>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-slate-500">
                    Recibir
                    <input type="number" min={0} max={pending}
                      value={receiveItems[item.id] ?? 0} onChange={(event) => setReceiveItems({ ...receiveItems, [item.id]: Number(event.target.value) })}
                      className="w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-950" />
                  </label>
                </div>
              );
            })}
          </div>
        </Modal>
      )}

      {returnOpen && selected && (
        <Modal
          title={`Devolver ${selected.code}`}
          description="Registra las cantidades que se devuelven al proveedor. El stock se descuenta automáticamente."
          icon={RotateCcw}
          onClose={() => setReturnOpen(false)}
          footer={
            <>
              <button onClick={() => setReturnOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 dark:border-slate-600 dark:text-slate-300">Cancelar</button>
              <button onClick={submitReturn} disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Registrar devolución</button>
            </>
          }
        >
          <div className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium">Motivo</span>
              <input value={returnReason} onChange={(event) => setReturnReason(event.target.value)} placeholder="Producto defectuoso, exceso, etc." className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-950" />
            </label>
            {selected.items.map((item) => {
              const available = Math.max(0, item.receivedQuantity - item.returnedQuantity);
              return (
                <div key={item.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-3 sm:flex-row sm:items-center dark:border-slate-700">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{item.product.name}</p>
                    <p className="text-xs text-slate-500">Disponible para devolver: {available} · Costo: {money(item.unitCost)}</p>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-slate-500">
                    Devolver
                    <input type="number" min={0} max={available}
                      value={returnItems[item.id] ?? 0}
                      onChange={(event) => setReturnItems({ ...returnItems, [item.id]: Number(event.target.value) })}
                      className="w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-amber-500 dark:border-slate-600 dark:bg-slate-950" />
                  </label>
                </div>
              );
            })}
          </div>
        </Modal>
      )}

      {trackingOpen && selected && (
        <Modal
          title={`Seguimiento ${selected.code}`}
          description="Actualiza el estado logístico y los datos de transporte de la orden."
          icon={Truck}
          onClose={() => setTrackingOpen(false)}
          footer={
            <>
              <button onClick={() => setTrackingOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">Cancelar</button>
              <button onClick={saveTrackingForm} disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:opacity-50">Guardar seguimiento</button>
            </>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm">Estado<select value={tracking.status || 'EN_TRANSITO'} onChange={(event) => setTracking({ ...tracking, status: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-950">
              {['ENVIADA', 'EN_TRANSITO', 'DEMORADA', 'ENTREGADA'].map((status) => <option key={status} value={status}>{trackingLabel[status]}</option>)}
            </select></label>
            <label className="text-sm">Transportista<input value={tracking.carrier || ''} onChange={(event) => setTracking({ ...tracking, carrier: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-950" /></label>
            <label className="text-sm">Guía de remisión<input value={tracking.shippingGuide || ''} onChange={(event) => setTracking({ ...tracking, shippingGuide: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-950" /></label>
            <CampoFormulario label="Llegada estimada">
              <SelectorFecha value={tracking.estimatedArrival || ''} onChange={(value) => setTracking({ ...tracking, estimatedArrival: value })} />
            </CampoFormulario>
            <CampoFormulario label="Llegada real">
              <SelectorFecha value={tracking.actualArrival || ''} onChange={(value) => setTracking({ ...tracking, actualArrival: value })} />
            </CampoFormulario>
            <label className="text-sm sm:col-span-2">Notas<textarea rows={3} value={tracking.notes || ''} onChange={(event) => setTracking({ ...tracking, notes: event.target.value })} className="mt-1.5 w-full resize-none rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-950" /></label>
          </div>
        </Modal>
      )}

      {levelOpen && (
        <Modal
          title="Nuevo nivel de aprobación"
          description="Define el rango de importe y el rol que podrá aprobar las órdenes."
          icon={Check}
          size="md"
          onClose={() => setLevelOpen(false)}
          footer={
            <>
              <button onClick={() => setLevelOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">Cancelar</button>
              <button onClick={async () => {
                try {
                  await createApprovalLevel({ ...levelForm, amountTo: levelForm.amountTo ? Number(levelForm.amountTo) : undefined, active: true });
                  toast.success('Nivel creado');
                  setLevelOpen(false);
                  load();
                } catch (error: any) {
                  toast.error('Error', error?.response?.data?.message || 'No se pudo crear el nivel.');
                }
              }} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500">Guardar nivel</button>
            </>
          }
        >
          <div className="space-y-4">
            <AvisoFormulario>
              El nivel se aplicará a las órdenes cuyo importe esté dentro del rango definido.
            </AvisoFormulario>
            <SeccionFormulario
              title="Rango de aprobación"
              description="Define el monto y el rol que podrá aprobar las órdenes."
              icon={Check}
            >
              <CampoFormulario label="Nivel" required>
                <input type="number" min={1} value={levelForm.level} onChange={(e) => setLevelForm({ ...levelForm, level: Number(e.target.value) })} className={estiloCampo} />
              </CampoFormulario>
              <CampoFormulario label="Rol requerido" required>
                <select value={levelForm.requiredRole} onChange={(e) => setLevelForm({ ...levelForm, requiredRole: e.target.value })} className={estiloCampo}>
                  <option value="ROLE_MANAGER">Gerente</option>
                  <option value="ROLE_ADMIN">Administrador</option>
                </select>
              </CampoFormulario>
              <CampoFormulario label="Desde (S/)" required>
                <input type="number" min={0} value={levelForm.amountFrom} onChange={(e) => setLevelForm({ ...levelForm, amountFrom: Number(e.target.value) })} className={estiloCampo} />
              </CampoFormulario>
              <CampoFormulario label="Hasta (S/)" hint="Dejar vacío para aplicar sin límite superior.">
                <input type="number" min={0} value={levelForm.amountTo} onChange={(e) => setLevelForm({ ...levelForm, amountTo: e.target.value })} className={estiloCampo} placeholder="Sin límite" />
              </CampoFormulario>
              <CampoFormulario label="Aprobaciones requeridas" required>
                <input type="number" min={1} value={levelForm.requiredApprovals} onChange={(e) => setLevelForm({ ...levelForm, requiredApprovals: Number(e.target.value) })} className={estiloCampo} />
              </CampoFormulario>
            </SeccionFormulario>
          </div>
        </Modal>
      )}

      <ConfirmDialog open={confirmCancel} title="Anular orden de compra" message="Solo se pueden anular órdenes pendientes sin recepciones."
        confirmLabel="Anular" busy={saving} onCancel={() => setConfirmCancel(false)}
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
