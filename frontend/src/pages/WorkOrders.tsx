import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Calendar,
  ArrowRight,
  Pause,
  Play,
  X,
  CircleDot,
  Gauge,
  Fuel,
  Save,
  ClipboardList,
  User,
  Car,
  Pencil,
  Trash2,
  Undo2,
} from 'lucide-react';
import {
  getAllWorkOrders,
  getWorkOrderById,
  updateWorkOrderStatus,
  updateWorkOrder,
  addWorkOrderItem,
  updateWorkOrderItem,
  deleteWorkOrderItem,
  updateItemStatus,
  getServicesCatalog,
} from '../services/workOrderService';
import type { WorkOrder, WorkOrderItem } from '../services/workOrderService';
import { getMechanics } from '../services/userService';
import type { MechanicInfo } from '../services/userService';
import { getAllProducts } from '../services/productService';
import type { Product } from '../services/productService';
import { cn } from '../lib/utils';
import { useToast } from '../components/ui/Toast';
import { usePermissions } from '../context/PermissionContext';
import usePagination from '../hooks/usePagination';
import Pagination from '../components/ui/Pagination';

const NEXT_STATUS: Record<string, { next?: string; label: string }> = {
  RECIBIDO: { next: 'EN_DIAGNOSTICO', label: 'Iniciar diagnóstico' },
  EN_DIAGNOSTICO: { next: 'DIAGNOSTICO_REALIZADO', label: 'Diagnóstico listo' },
  DIAGNOSTICO_REALIZADO: { next: 'PENDIENTE_APROBACION', label: 'Enviar a aprobación' },
  PENDIENTE_APROBACION: { next: 'EN_REPARACION', label: 'Aprobar y reparar' },
  EN_REPARACION: { next: 'LISTO_PARA_ENTREGA', label: 'Listo para entrega' },
  LISTO_PARA_ENTREGA: { next: 'FINALIZADO', label: 'Finalizar (entregar)' },
  PAUSADO: { next: 'EN_REPARACION', label: 'Reanudar reparación' },
  FINALIZADO: { label: 'Orden cerrada' },
};

const STATUS_LABELS: Record<string, string> = {
  RECIBIDO: 'Recibido',
  EN_DIAGNOSTICO: 'En diagnóstico',
  DIAGNOSTICO_REALIZADO: 'Diagnóstico realizado',
  PENDIENTE_APROBACION: 'Pendiente aprobación',
  EN_REPARACION: 'En reparación',
  PAUSADO: 'Pausado',
  LISTO_PARA_ENTREGA: 'Listo para entrega',
  FINALIZADO: 'Finalizado',
};

const PRIORITY_META: Record<string, { label: string; cls: string }> = {
  URGENTE: { label: 'Urgente', cls: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400' },
  ALTA: { label: 'Alta', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400' },
  NORMAL: { label: 'Normal', cls: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200' },
};

/** Resuelve la metadata de prioridad de forma tolerante a mayúsculas/valores desconocidos. */
function priorityMeta(priority?: string) {
  const key = (priority || 'NORMAL').trim().toUpperCase();
  return PRIORITY_META[key] || PRIORITY_META.NORMAL;
}

const FUEL_LEVELS = ['Tanque lleno', '3/4', '1/2', '1/4', 'Reserva', 'Vacío'];

const ITEM_STATUS_META: Record<string, { label: string; cls: string }> = {
  COMPLETED: { label: 'Completado', cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' },
  IN_PROGRESS: { label: 'En progreso', cls: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400' },
  PENDING: { label: 'Pendiente', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
};

const COLUMNS: { title: string; statuses: string[]; headerCls: string; bgCls: string }[] = [
  { title: 'Recepción', statuses: ['RECIBIDO'], headerCls: 'text-slate-700 dark:text-slate-200 bg-slate-200/60 dark:bg-slate-700/60', bgCls: 'bg-slate-50 dark:bg-slate-800/50' },
  { title: 'Diagnóstico', statuses: ['EN_DIAGNOSTICO', 'DIAGNOSTICO_REALIZADO', 'PENDIENTE_APROBACION'], headerCls: 'text-indigo-700 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-500/20', bgCls: 'bg-indigo-50/40 dark:bg-indigo-500/10' },
  { title: 'En reparación', statuses: ['EN_REPARACION', 'PAUSADO'], headerCls: 'text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/20', bgCls: 'bg-amber-50/40 dark:bg-amber-500/10' },
  { title: 'Listo para entrega', statuses: ['LISTO_PARA_ENTREGA'], headerCls: 'text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-500/20', bgCls: 'bg-blue-50/40 dark:bg-blue-500/10' },
  { title: 'Finalizado', statuses: ['FINALIZADO'], headerCls: 'text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/20', bgCls: 'bg-emerald-50/40 dark:bg-emerald-500/10' },
];

function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn('h-3.5 w-3.5 animate-spin', className)} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function formatMoney(value?: number) {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(value || 0);
}

interface EditForm {
  currentMileage: string;
  fuelLevel: string;
  customerSymptoms: string;
  technicalDiagnosis: string;
  priority: string;
  visualDamages: string;
}

interface ItemForm {
  serviceId: string;
  productId: string;
  description: string;
  quantity: string;
  price: string;
  mechanicId: string;
}

export default function WorkOrders() {
  const navigate = useNavigate();
  const toast = useToast();
  const { hasPermission } = usePermissions();
  const canCreateItem = hasPermission('ITEMS:CREAR');
  const canEditItem = hasPermission('ITEMS:EDITAR');
  const canDeleteItem = hasPermission('ITEMS:ELIMINAR');
  const canChangeItemStatus = hasPermission('ITEMS:CAMBIAR_ESTADO');
  const canChangeOrderStatus = hasPermission('ORDENES:CAMBIAR_ESTADO');
  const canEditOrder = hasPermission('ORDENES:EDITAR');
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<WorkOrder | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [movingId, setMovingId] = useState<number | null>(null);
  const [services, setServices] = useState<{ id: number; code: string; name: string; defaultPrice?: number }[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [mechanics, setMechanics] = useState<MechanicInfo[]>([]);
  const [edit, setEdit] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [itemForm, setItemForm] = useState<ItemForm>({
    serviceId: '',
    productId: '',
    description: '',
    quantity: '1',
    price: '',
    mechanicId: '',
  });
  const [addingItem, setAddingItem] = useState(false);
  const [itemBusy, setItemBusy] = useState<number | null>(null);
  const [editingItem, setEditingItem] = useState<WorkOrderItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<number | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      setOrders(await getAllWorkOrders());
    } catch {
      toast.error('Error', 'No se pudieron cargar las órdenes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    getServicesCatalog()
      .then((data) =>
        setServices(data.map((s) => ({ id: s.id, code: s.code, name: s.name, defaultPrice: s.defaultPrice })))
      )
      .catch(() => toast.error('Error', 'No se pudo cargar el catálogo de servicios.'));
    getMechanics()
      .then((data) => setMechanics(data))
      .catch(() => toast.error('Error', 'No se pudo cargar la lista de mecánicos.'));
    getAllProducts()
      .then((data) => setProducts(data))
      .catch(() => toast.error('Error', 'No se pudo cargar el catálogo de repuestos.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return orders;
    return orders.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(q) ||
        (o.vehicle ? `${o.vehicle.brand} ${o.vehicle.model} ${o.vehicle.plate}`.toLowerCase().includes(q) : false) ||
        (o.customer ? `${o.customer.firstName} ${o.customer.lastName}`.toLowerCase().includes(q) : false)
    );
  }, [orders, search]);

  const pag = usePagination(filtered, 10);

  const applyOrder = (updated: WorkOrder) => {
    setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    setSelected(updated);
  };

  const refreshDetail = async (id: number) => {
    try {
      applyOrder(await getWorkOrderById(id));
    } catch (err: any) {
      toast.error('Error', err?.response?.data?.message || 'No se pudo actualizar la orden.');
    }
  };

  const advance = async (order: WorkOrder) => {
    const target = NEXT_STATUS[order.status]?.next;
    if (!target) return;
    setMovingId(order.id!);
    try {
      const updated = await updateWorkOrderStatus(order.id!, target);
      setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
      toast.success('Orden actualizada', `${order.orderNumber} → ${STATUS_LABELS[target] || target}`);
    } catch (err: any) {
      toast.error('Error', err?.response?.data?.message || 'No se pudo actualizar la orden.');
    } finally {
      setMovingId(null);
    }
  };

  const togglePause = async (order: WorkOrder) => {
    const target = order.status === 'PAUSADO' ? 'EN_REPARACION' : 'PAUSADO';
    setMovingId(order.id!);
    try {
      const updated = await updateWorkOrderStatus(order.id!, target);
      setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
      toast.info('Orden actualizada', `${order.orderNumber} → ${STATUS_LABELS[target] || target}`);
    } catch (err: any) {
      toast.error('Error', err?.response?.data?.message || 'No se pudo actualizar la orden.');
    } finally {
      setMovingId(null);
    }
  };

  const openDetail = async (id: number) => {
    setDetailLoading(true);
    try {
      const order = await getWorkOrderById(id);
      setSelected(order);
      setEdit({
        currentMileage: order.currentMileage != null ? String(order.currentMileage) : '',
        fuelLevel: order.fuelLevel || '',
        customerSymptoms: order.customerSymptoms || '',
        technicalDiagnosis: order.technicalDiagnosis || '',
        priority: order.priority || 'NORMAL',
        visualDamages: order.visualDamages || '',
      });
    } catch {
      toast.error('Error', 'No se pudo cargar la orden.');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setSelected(null);
    setEdit(null);
  };

  const saveOrder = async () => {
    if (!selected || !edit) return;
    setSaving(true);
    try {
      const updated = await updateWorkOrder(selected.id!, {
        currentMileage: edit.currentMileage !== '' ? Number(edit.currentMileage) : undefined,
        fuelLevel: edit.fuelLevel,
        customerSymptoms: edit.customerSymptoms,
        technicalDiagnosis: edit.technicalDiagnosis,
        priority: edit.priority,
        visualDamages: edit.visualDamages,
      });
      applyOrder(updated);
      toast.success('Guardado', 'La orden se actualizó correctamente.');
    } catch (err: any) {
      toast.error('Error', err?.response?.data?.message || 'No se pudieron guardar los cambios.');
    } finally {
      setSaving(false);
    }
  };

  const onServiceChange = (serviceId: string) => {
    const svc = services.find((s) => String(s.id) === serviceId);
    setItemForm((f) => ({
      ...f,
      serviceId,
      productId: serviceId ? '' : f.productId,
      description: svc ? svc.name : f.description,
      price: svc && svc.defaultPrice != null ? String(svc.defaultPrice) : f.price,
    }));
  };

  const onProductChange = (productId: string) => {
    const pr = products.find((p) => String(p.id) === productId);
    setItemForm((f) => ({
      ...f,
      productId,
      serviceId: productId ? '' : f.serviceId,
      description: pr ? pr.name : f.description,
      price: pr ? String(pr.salePrice) : f.price,
    }));
  };

  const saveItem = async () => {
    if (!selected) return;
    if (!itemForm.description.trim()) {
      toast.error('Validación', 'Describe el trabajo a realizar.');
      return;
    }
    const qty = Number(itemForm.quantity);
    if (!qty || qty < 1) {
      toast.error('Validación', 'La cantidad debe ser mayor a 0.');
      return;
    }
    setAddingItem(true);
    try {
      if (editingItem) {
        await updateWorkOrderItem(editingItem.id, {
          description: itemForm.description.trim(),
          quantity: qty,
          price: itemForm.price !== '' ? Number(itemForm.price) : 0,
          serviceCatalogId: itemForm.serviceId !== '' ? Number(itemForm.serviceId) : undefined,
          productId: itemForm.productId !== '' ? Number(itemForm.productId) : undefined,
          mechanicId: itemForm.mechanicId !== '' ? Number(itemForm.mechanicId) : undefined,
        });
        toast.success('Ítem actualizado', 'El trabajo se actualizó en la orden.');
        setEditingItem(null);
      } else {
        await addWorkOrderItem(selected.id!, {
          description: itemForm.description.trim(),
          quantity: qty,
          price: itemForm.price !== '' ? Number(itemForm.price) : 0,
          serviceCatalogId: itemForm.serviceId !== '' ? Number(itemForm.serviceId) : undefined,
          productId: itemForm.productId !== '' ? Number(itemForm.productId) : undefined,
          mechanicId: itemForm.mechanicId !== '' ? Number(itemForm.mechanicId) : undefined,
        });
        toast.success('Ítem agregado', 'El trabajo se registró en la orden.');
      }
      setItemForm({ serviceId: '', productId: '', description: '', quantity: '1', price: '', mechanicId: '' });
      await refreshDetail(selected.id!);
    } catch (err: any) {
      toast.error('Error', err?.response?.data?.message || 'No se pudo guardar el ítem.');
    } finally {
      setAddingItem(false);
    }
  };

  const startEditingItem = (item: WorkOrderItem) => {
    setEditingItem(item);
    setItemForm({
      serviceId: item.serviceCatalog ? String(item.serviceCatalog.id) : '',
      productId: item.product ? String(item.product.id) : '',
      description: item.description,
      quantity: item.quantity != null ? String(item.quantity) : '1',
      price: item.price != null ? String(item.price) : '',
      mechanicId: item.mechanic ? String(item.mechanic.id) : '',
    });
  };

  const cancelEditingItem = () => {
    setEditingItem(null);
    setItemForm({ serviceId: '', productId: '', description: '', quantity: '1', price: '', mechanicId: '' });
  };

  const deleteItem = async (item: WorkOrderItem) => {
    if (!window.confirm(`¿Eliminar el ítem "${item.description}"?`)) return;
    setDeletingItem(item.id);
    try {
      await deleteWorkOrderItem(item.id);
      toast.success('Ítem eliminado', 'El trabajo se eliminó de la orden.');
      if (editingItem?.id === item.id) setEditingItem(null);
      if (selected) await refreshDetail(selected.id!);
    } catch (err: any) {
      toast.error('Error', err?.response?.data?.message || 'No se pudo eliminar el ítem.');
    } finally {
      setDeletingItem(null);
    }
  };

  const changeItemStatus = async (item: WorkOrderItem, status: string) => {
    setItemBusy(item.id);
    try {
      await updateItemStatus(item.id, status);
      if (selected) await refreshDetail(selected.id!);
      toast.success('Ítem actualizado', ITEM_STATUS_META[status]?.label || status);
    } catch (err: any) {
      toast.error('Error', err?.response?.data?.message || 'No se pudo actualizar el ítem.');
    } finally {
      setItemBusy(null);
    }
  };

  const totalAmount = useMemo(
    () =>
      (selected?.items || []).reduce(
        (acc, item) => acc + (item.price || 0) * (item.quantity || 1),
        0
      ),
    [selected]
  );

  return (
    <div className="flex h-full flex-col space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Órdenes de Trabajo</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Panel de seguimiento de reparaciones por estado.</p>
        </div>
        <button
          onClick={() => navigate('/recepcion')}
          className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500"
        >
          <Plus className="mr-2 h-4 w-4" /> Nueva Recepción
        </button>
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
        <div className="relative w-full max-w-sm">
          <CircleDot size={16} className="pointer-events-none absolute inset-y-0 left-3 my-auto text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full rounded-lg border-0 py-1.5 pl-9 text-slate-900 placeholder:text-slate-400 focus:ring-0 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500 sm:text-sm"
            placeholder="Filtrar por placa, OT o cliente..."
          />
        </div>
        <span className="ml-auto hidden shrink-0 text-sm text-slate-500 sm:block dark:text-slate-400">
          {filtered.length} órdenes
        </span>
      </div>

      {loading ? (
        <div className="flex h-64 flex-1 items-center justify-center text-sm text-slate-400 dark:text-slate-500">
          <Spinner className="mr-2 h-5 w-5" /> Cargando órdenes...
        </div>
      ) : (
        <>
        <div className="flex-1 overflow-x-auto pb-4">
          <div className="flex h-full items-start gap-5">
            {COLUMNS.map((col) => {
              const colOrders = pag.pageItems.filter((o) => col.statuses.includes(o.status));
              return (
                <div key={col.title} className={cn('flex h-full w-80 shrink-0 flex-col rounded-2xl', col.bgCls)}>
                  <div className={cn('rounded-t-2xl p-4 font-semibold', col.headerCls)}>
                    {col.title}
                    <span className="ml-2 rounded-full bg-white/70 px-2 py-0.5 text-sm dark:bg-slate-800">{colOrders.length}</span>
                  </div>
                  <div className="min-h-[420px] flex-1 space-y-3 overflow-y-auto p-3">
                    {colOrders.length === 0 && (
                      <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400 dark:border-slate-600 dark:text-slate-500">
                        Sin órdenes
                      </p>
                    )}
                    {colOrders.map((order) => {
                      const step = NEXT_STATUS[order.status];
                      const paused = order.status === 'PAUSADO';
                      const prio = priorityMeta(order.priority);
                      return (
                        <div
                          key={order.id}
                          onClick={() => openDetail(order.id!)}
                          className={cn(
                            'cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-900',
                            paused && 'border-dashed'
                          )}
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{order.orderNumber}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePause(order);
                              }}
                              className={cn(
                                'flex h-7 w-7 items-center justify-center rounded-lg transition',
                                paused
                                  ? 'bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-400'
                                  : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:bg-slate-800 dark:text-slate-500'
                              )}
                              title={paused ? 'Reanudar' : 'Pausar'}
                            >
                              {paused ? <Play size={14} /> : <Pause size={14} />}
                            </button>
                          </div>
                          <h4 className="mb-1 text-sm font-bold text-slate-900 dark:text-white">
                            {order.vehicle
                              ? `${order.vehicle.brand} ${order.vehicle.model} (${order.vehicle.plate})`
                              : 'Sin vehículo'}
                          </h4>
                          <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
                            {order.customer ? `${order.customer.firstName} ${order.customer.lastName}` : 'Sin cliente'}
                          </p>
                          <div className="mb-3 flex flex-wrap items-center gap-2">
                            <span className={cn('rounded px-2 py-0.5 text-[10px] font-medium', prio.cls)}>{prio.label}</span>
                            {(order.items || []).length > 0 && (
                              <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                                {order.items!.length} ítems
                              </span>
                            )}
                            {order.currentMileage != null && (
                              <span className="flex items-center gap-1 rounded bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                <Gauge size={10} /> {order.currentMileage.toLocaleString('es-PE')} km
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-700">
                            <span className="flex items-center text-xs text-slate-400 dark:text-slate-500">
                              <Calendar size={12} className="mr-1" />
                              {order.receptionDate
                                ? new Date(order.receptionDate.replace('T', ' ')).toLocaleDateString('es-ES')
                                : '—'}
                            </span>
                            {step?.next && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  advance(order);
                                }}
                                disabled={movingId === order.id}
                                className="flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
                              >
                                {movingId === order.id ? <Spinner /> : <ArrowRight size={12} />}
                                {step.label}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <Pagination
          page={pag.page}
          pageCount={pag.pageCount}
          onChange={pag.setPage}
          total={pag.total}
          from={pag.from}
          to={pag.to}
          itemLabel="órdenes"
        />
        </>
      )}

      {/* Detalle y gestión */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 backdrop-blur-sm sm:items-center"
          onClick={closeDetail}
        >
          <div
            className="max-h-[90vh] w-full max-w-4xl animate-slide-up overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            {detailLoading ? (
              <div className="flex h-64 items-center justify-center text-sm text-slate-400 dark:text-slate-500">
                <Spinner className="mr-2 h-5 w-5" /> Cargando detalles...
              </div>
            ) : (
              <>
                <div className="mb-4 flex items-start justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white">{selected.orderNumber}</h2>
                      <span className="rounded-lg bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-500/20 dark:text-blue-400">
                        {STATUS_LABELS[selected.status] || selected.status}
                      </span>
                      <span
                        className={cn(
                          'rounded-lg px-2 py-0.5 text-xs font-semibold',
                          priorityMeta(selected.priority).cls
                        )}
                      >
                        {priorityMeta(selected.priority).label}
                      </span>
                    </div>
                    <p className="mt-1 flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
                      <Car size={14} />
                      {selected.vehicle
                        ? `${selected.vehicle.plate} · ${selected.vehicle.brand} ${selected.vehicle.model}${selected.vehicle.color ? ' · ' + selected.vehicle.color : ''}`
                        : ''}
                      <span className="mx-1 text-slate-300">|</span>
                      <User size={14} />
                      {selected.customer
                        ? `${selected.customer.firstName} ${selected.customer.lastName}${selected.customer.phone ? ' · ' + selected.customer.phone : ''}`
                        : ''}
                    </p>
                  </div>
                  <button
                    onClick={closeDetail}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800"
                    aria-label="Cerrar"
                  >
                    <X size={18} />
                  </button>
                </div>

                {canChangeOrderStatus && (
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => advance(selected)}
                    disabled={!NEXT_STATUS[selected.status]?.next || movingId === selected.id}
                    className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-500 disabled:opacity-40"
                  >
                    {movingId === selected.id ? <Spinner /> : <ArrowRight size={13} />}
                    {NEXT_STATUS[selected.status]?.label || 'Orden cerrada'}
                  </button>
                  {selected.status !== 'FINALIZADO' && (
                    <button
                      onClick={() => togglePause(selected)}
                      disabled={movingId === selected.id}
                      className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-200 disabled:opacity-40 dark:bg-slate-800 dark:text-slate-200"
                    >
                      {selected.status === 'PAUSADO' ? <Play size={13} /> : <Pause size={13} />}
                      {selected.status === 'PAUSADO' ? 'Reanudar' : 'Pausar'}
                    </button>
                  )}
                </div>
                )}

                {/* Detalles y diagnóstico editable */}
                <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                    <ClipboardList size={15} className="text-blue-600" /> Detalles y diagnóstico
                  </h3>
                  {edit && canEditOrder && (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                        Prioridad
                        <select
                          value={edit.priority}
                          onChange={(e) => setEdit((x) => (x ? { ...x, priority: e.target.value } : x))}
                          className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                        >
                          <option value="NORMAL">Normal</option>
                          <option value="ALTA">Alta</option>
                          <option value="URGENTE">Urgente</option>
                        </select>
                      </label>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                        Kilometraje actual (km)
                        <div className="relative mt-1">
                          <Gauge size={13} className="pointer-events-none absolute inset-y-0 left-2.5 my-auto text-slate-400 dark:text-slate-500" />
                          <input
                            type="number"
                            min={0}
                            value={edit.currentMileage}
                            onChange={(e) => setEdit((x) => (x ? { ...x, currentMileage: e.target.value } : x))}
                            className="block w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-8 pr-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                          />
                        </div>
                      </label>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                        Nivel de combustible
                        <div className="relative mt-1">
                          <Fuel size={13} className="pointer-events-none absolute inset-y-0 left-2.5 my-auto text-slate-400 dark:text-slate-500" />
                          <select
                            value={edit.fuelLevel}
                            onChange={(e) => setEdit((x) => (x ? { ...x, fuelLevel: e.target.value } : x))}
                            className="block w-full rounded-lg border border-slate-300 bg-white pl-8 pr-2 py-1.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                          >
                            <option value="">— Sin especificar —</option>
                            {FUEL_LEVELS.map((f) => (
                              <option key={f} value={f}>
                                {f}
                              </option>
                            ))}
                          </select>
                        </div>
                      </label>
                      <label className="block text-xs font-medium text-slate-600 sm:col-span-3 dark:text-slate-300">
                        Síntomas reportados por el cliente
                        <textarea
                          value={edit.customerSymptoms}
                          rows={2}
                          onChange={(e) => setEdit((x) => (x ? { ...x, customerSymptoms: e.target.value } : x))}
                          className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                          placeholder="Describe lo que el cliente reportó..."
                        />
                      </label>
                      <label className="block text-xs font-medium text-slate-600 sm:col-span-3 dark:text-slate-300">
                        Diagnóstico técnico
                        <textarea
                          value={edit.technicalDiagnosis}
                          rows={2}
                          onChange={(e) => setEdit((x) => (x ? { ...x, technicalDiagnosis: e.target.value } : x))}
                          className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                          placeholder="Resultado del diagnóstico técnico..."
                        />
                      </label>
                      <label className="block text-xs font-medium text-slate-600 sm:col-span-3 dark:text-slate-300">
                        Daños visuales registrados
                        <textarea
                          value={edit.visualDamages}
                          rows={2}
                          onChange={(e) => setEdit((x) => (x ? { ...x, visualDamages: e.target.value } : x))}
                          className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                          placeholder="Resumen de daños visuales detectados en la inspección..."
                        />
                      </label>
                    </div>
                  )}
                  {!canEditOrder && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      No tienes permiso para editar esta orden.
                    </p>
                  )}
                  {canEditOrder && (
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={saveOrder}
                      disabled={saving}
                      className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
                    >
                      {saving ? <Spinner /> : <Save size={13} />}
                      Guardar cambios
                    </button>
                  </div>
                  )}
                </section>

                {/* Ítems de trabajo */}
                <section className="mt-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                      <ClipboardList size={15} className="text-blue-600" /> Ítems de trabajo
                    </h3>
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Total: <span className="text-emerald-600 dark:text-emerald-400">{formatMoney(totalAmount)}</span>
                    </span>
                  </div>

                  <ul className="space-y-2">
                    {(selected.items || []).length === 0 && (
                      <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-sm text-slate-400 dark:border-slate-700 dark:text-slate-500">
                        {canCreateItem
                          ? 'Sin ítems asignados todavía. Agrega el primer trabajo a la orden.'
                          : 'Sin ítems asignados todavía.'}
                      </p>
                    )}
                    {(selected.items || []).map((item) => (
                      <li
                        key={item.id}
                        className="flex flex-col gap-2 rounded-xl border border-slate-200 p-3 text-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-700"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="flex flex-wrap items-center gap-2 font-medium text-slate-900 dark:text-white">
                            {item.description}
                            {item.serviceCatalog && (
                              <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                                {item.serviceCatalog.name}
                              </span>
                            )}
                            {item.product && (
                              <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                                {item.product.name}
                              </span>
                            )}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                            {item.mechanic
                              ? `Mecánico: ${item.mechanic.name} ${item.mechanic.lastName}`
                              : 'Sin mecánico asignado'}
                            {item.quantity ? ` · Cant. ${item.quantity}` : ''}
                            {item.observations ? ` · ${item.observations}` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="shrink-0 text-xs font-semibold text-slate-700 dark:text-slate-200">
                            {formatMoney((item.price || 0) * (item.quantity || 1))}
                          </span>
                          <span
                            className={cn(
                              'shrink-0 rounded-md px-2 py-1 text-xs font-medium',
                              ITEM_STATUS_META[item.status]?.cls || ITEM_STATUS_META.PENDING.cls
                            )}
                          >
                            {ITEM_STATUS_META[item.status]?.label || item.status}
                          </span>
                          <div className="flex shrink-0 gap-1">
                            {canChangeItemStatus && item.status === 'PENDING' && (
                              <button
                                onClick={() => changeItemStatus(item, 'IN_PROGRESS')}
                                disabled={itemBusy === item.id}
                                className="rounded-md bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-600 transition hover:bg-blue-100 disabled:opacity-50 dark:bg-blue-500/20 dark:text-blue-400"
                              >
                                <span className="flex items-center gap-1">{itemBusy === item.id && <Spinner />}Iniciar</span>
                              </button>
                            )}
                            {canChangeItemStatus && item.status === 'IN_PROGRESS' && (
                              <>
                                <button
                                  onClick={() => changeItemStatus(item, 'PENDING')}
                                  disabled={itemBusy === item.id}
                                  className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-200 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-300"
                                >
                                  {itemBusy === item.id ? <Spinner /> : 'Pausar'}
                                </button>
                                <button
                                  onClick={() => changeItemStatus(item, 'COMPLETED')}
                                  disabled={itemBusy === item.id}
                                  className="rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-600 transition hover:bg-emerald-100 disabled:opacity-50 dark:bg-emerald-500/20 dark:text-emerald-400"
                                >
                                  {itemBusy === item.id ? <Spinner /> : 'Completar'}
                                </button>
                              </>
                            )}
                            {canEditItem && (
                              <button
                                onClick={() => startEditingItem(item)}
                                disabled={itemBusy === item.id}
                                title="Editar ítem"
                                className="rounded-md bg-slate-100 p-1.5 text-slate-500 transition hover:bg-slate-200 hover:text-blue-600 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-300"
                              >
                                <Pencil size={13} />
                              </button>
                            )}
                            {canDeleteItem && (
                              <button
                                onClick={() => deleteItem(item)}
                                disabled={deletingItem === item.id}
                                title="Eliminar ítem"
                                className="rounded-md bg-slate-100 p-1.5 text-slate-500 transition hover:bg-red-100 hover:text-red-600 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-300"
                              >
                                {deletingItem === item.id ? <Spinner /> : <Trash2 size={13} />}
                              </button>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>

                  {/* Agregar / editar ítem */}
                  {(canCreateItem || (editingItem && canEditItem)) && (
                  <div className="mt-4 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                        {editingItem ? `Editando: ${editingItem.description}` : 'Agregar trabajo'}
                      </p>
                      {editingItem && (
                        <button
                          onClick={cancelEditingItem}
                          className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 transition hover:text-slate-700 dark:text-slate-400"
                        >
                          <Undo2 size={12} /> Cancelar
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      <select
                        value={itemForm.productId}
                        onChange={(e) => onProductChange(e.target.value)}
                        className="block w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                      >
                        <option value="">Sin repuesto (mano de obra)</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.code} · {p.name} ({p.currentStock} und.)
                          </option>
                        ))}
                      </select>
                      <select
                        value={itemForm.serviceId}
                        onChange={(e) => onServiceChange(e.target.value)}
                        className="block w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                      >
                        <option value="">Sin servicio del catálogo</option>
                        {services.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.code} · {s.name}
                          </option>
                        ))}
                      </select>
                      <select
                        value={itemForm.mechanicId}
                        onChange={(e) => setItemForm((f) => ({ ...f, mechanicId: e.target.value }))}
                        className="block w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                      >
                        <option value="">Sin mecánico asignado</option>
                        {mechanics.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} {m.lastName}
                          </option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={itemForm.description}
                          onChange={(e) => setItemForm((f) => ({ ...f, description: e.target.value }))}
                          placeholder="Descripción del trabajo"
                          className="block w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
                        />
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min={1}
                          value={itemForm.quantity}
                          onChange={(e) => setItemForm((f) => ({ ...f, quantity: e.target.value }))}
                          placeholder="Cant."
                          className="block w-20 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                        />
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={itemForm.price}
                          onChange={(e) => setItemForm((f) => ({ ...f, price: e.target.value }))}
                          placeholder="Precio (S/)"
                          className="block w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                        />
                      </div>
                      <button
                        onClick={saveItem}
                        disabled={addingItem}
                        className="flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
                      >
                        {addingItem ? <Spinner /> : editingItem ? <Save size={13} /> : <Plus size={13} />}
                        {editingItem ? 'Guardar cambios' : 'Agregar ítem'}
                      </button>
                    </div>
                  </div>
                  )}
                </section>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}