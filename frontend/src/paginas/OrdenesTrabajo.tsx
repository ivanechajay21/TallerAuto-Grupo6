import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Calendar,
  ArrowRight,
  Pause,
  Play,
  CircleDot,
  Gauge,
  Fuel,
  Save,
  ClipboardList,
  Car,
  Pencil,
  Trash2,
  Undo2,
  RefreshCw,
  CheckCircle2,
  Wrench,
  PackageCheck,
  Inbox,
  AlertTriangle,
  GripVertical,
  CircleDollarSign,
  LayoutGrid,
  List,
  SlidersHorizontal,
  X,
  UserRound,
  Clock3,
  ChevronRight,
} from 'lucide-react';
import {
  getPaginatedWorkOrders,
  getWorkOrderById,
  updateWorkOrderStatus,
  updateWorkOrder,
  addWorkOrderItem,
  updateWorkOrderItem,
  deleteWorkOrderItem,
  updateItemStatus,
  getServicesCatalog,
} from '../servicios/ordenesTrabajoServicio';
import type { WorkOrder, WorkOrderItem, WorkOrderSummary } from '../servicios/ordenesTrabajoServicio';
import { getMechanics } from '../servicios/usuariosServicio';
import type { MechanicInfo } from '../servicios/usuariosServicio';
import { getAllProducts } from '../servicios/productosServicio';
import type { Product } from '../servicios/productosServicio';
import { cn } from '../lib/utilidades';
import { useToast } from '../componentes/interfaz/Avisos';
import { usePermissions } from '../contexto/ContextoPermisos';
import Modal from '../componentes/interfaz/Modal';
import ConfirmDialog from '../componentes/interfaz/DialogoConfirmacion';
import { CampoFormulario, SeccionFormulario, estiloCampo } from '../componentes/interfaz/Formulario';
import EncabezadoModulo from '../componentes/interfaz/EncabezadoModulo';
import Pagination from '../componentes/interfaz/Paginacion';
import TarjetaMetrica from '../componentes/interfaz/TarjetaMetrica';

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

const STATUS_CLS: Record<string, string> = {
  RECIBIDO: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  EN_DIAGNOSTICO: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
  DIAGNOSTICO_REALIZADO: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
  PENDIENTE_APROBACION: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  EN_REPARACION: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  PAUSADO: 'bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
  LISTO_PARA_ENTREGA: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  FINALIZADO: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
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

const COLUMNS: {
  title: string;
  statuses: string[];
  dropStatus: string;
  icon: typeof Inbox;
  headerCls: string;
  bgCls: string;
  accent: string;
}[] = [
  {
    title: 'Recepción',
    statuses: ['RECIBIDO'],
    dropStatus: 'RECIBIDO',
    icon: Inbox,
    headerCls: 'text-slate-700 dark:text-slate-200 bg-slate-100/80 dark:bg-slate-700/60',
    bgCls: 'bg-slate-50 dark:bg-slate-800/50',
    accent: 'bg-slate-400',
  },
  {
    title: 'Diagnóstico',
    statuses: ['EN_DIAGNOSTICO', 'DIAGNOSTICO_REALIZADO', 'PENDIENTE_APROBACION'],
    dropStatus: 'EN_DIAGNOSTICO',
    icon: ClipboardList,
    headerCls: 'text-indigo-700 dark:text-indigo-300 bg-indigo-100/80 dark:bg-indigo-500/20',
    bgCls: 'bg-indigo-50/40 dark:bg-indigo-500/10',
    accent: 'bg-indigo-500',
  },
  {
    title: 'En reparación',
    statuses: ['EN_REPARACION', 'PAUSADO'],
    dropStatus: 'EN_REPARACION',
    icon: Wrench,
    headerCls: 'text-amber-700 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-500/20',
    bgCls: 'bg-amber-50/40 dark:bg-amber-500/10',
    accent: 'bg-amber-500',
  },
  {
    title: 'Listo para entrega',
    statuses: ['LISTO_PARA_ENTREGA'],
    dropStatus: 'LISTO_PARA_ENTREGA',
    icon: PackageCheck,
    headerCls: 'text-blue-700 dark:text-blue-300 bg-blue-100/80 dark:bg-blue-500/20',
    bgCls: 'bg-blue-50/40 dark:bg-blue-500/10',
    accent: 'bg-blue-500',
  },
  {
    title: 'Finalizado',
    statuses: ['FINALIZADO'],
    dropStatus: 'FINALIZADO',
    icon: CheckCircle2,
    headerCls: 'text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-500/20',
    bgCls: 'bg-emerald-50/40 dark:bg-emerald-500/10',
    accent: 'bg-emerald-500',
  },
];

const BOARD_COLUMNS = COLUMNS.filter((column) => column.title !== 'Finalizado');

const EMPTY_SUMMARY: WorkOrderSummary = {
  total: 0,
  active: 0,
  history: 0,
  urgent: 0,
  ready: 0,
  estimatedValue: 0,
};

function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn('h-3.5 w-3.5 animate-spin', className)} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function formatMoney(value?: number) {
  return `S/ ${(value || 0).toLocaleString('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function daysInWorkshop(order: WorkOrder) {
  if (!order.receptionDate) return 0;
  const start = new Date(order.receptionDate).getTime();
  if (Number.isNaN(start)) return 0;
  return Math.max(0, Math.floor((Date.now() - start) / 86_400_000));
}

function orderMechanics(order: WorkOrder) {
  const names = new Map<number, string>();
  (order.items || []).forEach((item) => {
    if (item.mechanic?.id) {
      names.set(item.mechanic.id, `${item.mechanic.name} ${item.mechanic.lastName}`.trim());
    }
  });
  return [...names.entries()].map(([id, name]) => ({ id, name }));
}

function isStale(order: WorkOrder) {
  return order.status !== 'FINALIZADO' && daysInWorkshop(order) >= 7;
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
  const [summary, setSummary] = useState<WorkOrderSummary>(EMPTY_SUMMARY);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'activas' | 'historial'>('activas');
  const [viewMode, setViewMode] = useState<'kanban' | 'lista'>('kanban');
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('TODAS');
  const [statusFilter, setStatusFilter] = useState('TODAS');
  const [mechanicFilter, setMechanicFilter] = useState('TODOS');
  const [onlyUrgent, setOnlyUrgent] = useState(false);
  const [onlyUnassigned, setOnlyUnassigned] = useState(false);
  const [onlyNoItems, setOnlyNoItems] = useState(false);
  const [onlyStale, setOnlyStale] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'prioridad' | 'antigua' | 'reciente' | 'total'>('prioridad');
  const [mobileColumn, setMobileColumn] = useState(COLUMNS[0].title);
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
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
  const [deleteTarget, setDeleteTarget] = useState<WorkOrderItem | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await getPaginatedWorkOrders({
        page: viewMode === 'kanban' ? 0 : Math.max(0, page - 1),
        size: viewMode === 'kanban' ? 250 : 10,
        tab: activeTab,
        search,
        status: statusFilter,
        priority: priorityFilter,
        mechanicId: mechanicFilter === 'TODOS' ? null : Number(mechanicFilter),
        onlyUrgent,
        onlyUnassigned,
        onlyNoItems,
        onlyStale,
        sort: sortBy,
      });
      setOrders(response.content);
      setSummary(response.summary ?? EMPTY_SUMMARY);
      setTotalPages(response.totalPages);
      setTotalElements(response.totalElements);
      if (viewMode === 'lista' && response.page !== page) setPage(response.page);
    } catch {
      toast.error('Error', 'No se pudieron cargar las órdenes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delay = search ? 280 : 0;
    const timer = window.setTimeout(() => {
      void fetchOrders();
    }, delay);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeTab,
    page,
    search,
    priorityFilter,
    statusFilter,
    mechanicFilter,
    onlyUrgent,
    onlyUnassigned,
    onlyNoItems,
    onlyStale,
    sortBy,
    viewMode,
  ]);

  useEffect(() => {
    setPage(1);
  }, [
    activeTab,
    search,
    priorityFilter,
    statusFilter,
    mechanicFilter,
    onlyUrgent,
    onlyUnassigned,
    onlyNoItems,
    onlyStale,
    sortBy,
  ]);

  useEffect(() => {
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

  const activeFilterCount =
    (priorityFilter !== 'TODAS' ? 1 : 0) +
    (statusFilter !== 'TODAS' ? 1 : 0) +
    (mechanicFilter !== 'TODOS' ? 1 : 0) +
    (onlyUrgent ? 1 : 0) +
    (onlyUnassigned ? 1 : 0) +
    (onlyNoItems ? 1 : 0) +
    (onlyStale ? 1 : 0);

  // El servidor ya devuelve la página filtrada y ordenada.
  const filtered = orders;
  const ordered = orders;
  const stats = summary;

  const applyOrder = (updated: WorkOrder) => {
    setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    setSelected(updated);
  };

  const refreshDetail = async (id: number) => {
    try {
      applyOrder(await getWorkOrderById(id));
      void fetchOrders();
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
      void fetchOrders();
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
      void fetchOrders();
      toast.info('Orden actualizada', `${order.orderNumber} → ${STATUS_LABELS[target] || target}`);
    } catch (err: any) {
      toast.error('Error', err?.response?.data?.message || 'No se pudo actualizar la orden.');
    } finally {
      setMovingId(null);
    }
  };

  const moveToColumn = async (order: WorkOrder, target: string) => {
    if (!canChangeOrderStatus || !order.id || order.status === target) return;
    setMovingId(order.id);
    try {
      const updated = await updateWorkOrderStatus(order.id, target);
      setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
      if (selected?.id === order.id) setSelected(updated);
      void fetchOrders();
      toast.success('Etapa actualizada', `${order.orderNumber} → ${STATUS_LABELS[target] || target}`);
    } catch (err: any) {
      toast.error('Error', err?.response?.data?.message || 'No se pudo mover la orden.');
    } finally {
      setMovingId(null);
      setDraggedId(null);
      setDragOverColumn(null);
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
    setDeleteTarget(null);
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
      void fetchOrders();
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

  const deleteItem = (item: WorkOrderItem) => {
    setDeleteTarget(item);
  };

  const confirmDeleteItem = async () => {
    if (!deleteTarget) return;
    setDeletingItem(deleteTarget.id);
    try {
      await deleteWorkOrderItem(deleteTarget.id);
      toast.success('Ítem eliminado', 'El trabajo se eliminó de la orden.');
      if (editingItem?.id === deleteTarget.id) setEditingItem(null);
      setDeleteTarget(null);
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

  const resetFilters = () => {
    setSearch('');
    setPriorityFilter('TODAS');
    setStatusFilter('TODAS');
    setMechanicFilter('TODOS');
    setOnlyUrgent(false);
    setOnlyUnassigned(false);
    setOnlyNoItems(false);
    setOnlyStale(false);
  };

  return (
    <div className="flex min-h-full flex-col space-y-4">
      <EncabezadoModulo
        eyebrow="Operación del taller"
        title="Órdenes de trabajo"
        description="Seguimiento visual de reparaciones por etapa."
        icon={ClipboardList}
        actions={(
          <>
            <button
              onClick={() => void fetchOrders()}
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 sm:w-auto"
            >
              <RefreshCw size={16} className={cn(loading && 'animate-spin')} /> Actualizar
            </button>
            <button
              onClick={() => navigate('/recepcion')}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 sm:w-auto"
            >
              <Plus className="h-4 w-4" /> Nueva recepción
            </button>
          </>
        )}
        meta={(
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
            {stats.active} activas
          </span>
        )}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {[
          { label: 'Total órdenes', value: stats.total, icon: ClipboardList, tone: 'blue' },
          { label: 'En taller', value: stats.active, icon: Wrench, tone: 'amber' },
          { label: 'Urgentes', value: stats.urgent, icon: AlertTriangle, tone: 'red' },
          { label: 'Listas para entrega', value: stats.ready, icon: PackageCheck, tone: 'emerald' },
          { label: 'Valor estimado', value: formatMoney(stats.estimatedValue), icon: CircleDollarSign, tone: 'violet' },
        ].map((stat) => (
          <TarjetaMetrica
            key={stat.label}
            label={stat.label}
            value={stat.value}
            icon={stat.icon}
            tone={stat.tone as 'blue' | 'amber' | 'red' | 'emerald' | 'violet'}
          />
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          role="tablist"
          aria-label="Vistas de órdenes"
          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900"
        >
          {[
            { value: 'activas' as const, label: 'Activas', count: stats.active },
            { value: 'historial' as const, label: 'Historial', count: stats.history },
          ].map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.value}
              onClick={() => {
                setActiveTab(tab.value);
                setStatusFilter('TODAS');
                if (tab.value === 'historial') {
                  setViewMode('lista');
                } else {
                  setViewMode('kanban');
                  setMobileColumn(BOARD_COLUMNS[0].title);
                }
              }}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition',
                activeTab === tab.value
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20 dark:bg-blue-500'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
              )}
            >
              {tab.label}
              <span className={cn(
                'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                activeTab === tab.value ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
              )}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {activeTab === 'activas' && (
          <div className="inline-flex w-fit items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              aria-pressed={viewMode === 'kanban'}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                viewMode === 'kanban'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'
              )}
            >
              <LayoutGrid size={14} /> Kanban
            </button>
            <button
              type="button"
              onClick={() => setViewMode('lista')}
              aria-pressed={viewMode === 'lista'}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                viewMode === 'lista'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'
              )}
            >
              <List size={14} /> Lista
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative w-full sm:max-w-md">
          <CircleDot size={16} className="pointer-events-none absolute inset-y-0 left-3 my-auto text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800/60 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-slate-800"
            placeholder="Filtrar por placa, OT o cliente..."
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            aria-label="Filtrar por prioridad"
          >
            <option value="TODAS">Todas las prioridades</option>
            <option value="URGENTE">Urgente</option>
            <option value="ALTA">Alta</option>
            <option value="NORMAL">Normal</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            aria-label="Ordenar órdenes"
          >
            <option value="prioridad">Prioridad y antigüedad</option>
            <option value="antigua">Más antiguas primero</option>
            <option value="reciente">Más recientes primero</option>
            <option value="total">Mayor importe</option>
          </select>
          <button
            type="button"
            onClick={() => setShowFilters((visible) => !visible)}
            aria-expanded={showFilters}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-semibold transition',
              showFilters || activeFilterCount > 0
                ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
            )}
          >
            <SlidersHorizontal size={15} /> Filtros
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
          {(search || activeFilterCount > 0) && (
            <button
              onClick={resetFilters}
              className="rounded-lg px-2 py-1.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-50 dark:hover:bg-blue-500/10"
            >
              Limpiar
            </button>
          )}
        </div>
        <span className="text-sm text-slate-500 sm:ml-auto dark:text-slate-400">
          {filtered.length} de {activeTab === 'activas' ? stats.active : stats.history} orden(es)
        </span>
      </div>

      {showFilters && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Filtros avanzados</p>
            <button
              type="button"
              onClick={() => setShowFilters(false)}
              className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              aria-label="Cerrar filtros"
            >
              <X size={15} />
            </button>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold text-slate-500 dark:text-slate-400">Estado</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="TODAS">Todos los estados</option>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold text-slate-500 dark:text-slate-400">Mecánico asignado</span>
              <select
                value={mechanicFilter}
                onChange={(e) => setMechanicFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="TODOS">Todos los mecánicos</option>
                {mechanics.map((mechanic) => (
                  <option key={mechanic.id} value={String(mechanic.id)}>
                    {mechanic.name} {mechanic.lastName}
                  </option>
                ))}
              </select>
            </label>
            <div className="sm:col-span-2">
              <span className="mb-1 block text-[11px] font-semibold text-slate-500 dark:text-slate-400">Alertas rápidas</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: 'Urgentes', active: onlyUrgent, toggle: () => setOnlyUrgent((v) => !v), tone: 'red' },
                  { label: 'Sin mecánico', active: onlyUnassigned, toggle: () => setOnlyUnassigned((v) => !v), tone: 'amber' },
                  { label: 'Sin ítems', active: onlyNoItems, toggle: () => setOnlyNoItems((v) => !v), tone: 'slate' },
                  { label: '+7 días en taller', active: onlyStale, toggle: () => setOnlyStale((v) => !v), tone: 'red' },
                ].map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={chip.toggle}
                    aria-pressed={chip.active}
                    className={cn(
                      'rounded-full border px-2.5 py-1 text-[11px] font-semibold transition',
                      chip.active
                        ? chip.tone === 'red'
                          ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300'
                          : chip.tone === 'amber'
                            ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300'
                            : 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200'
                        : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'
                    )}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'activas' && viewMode === 'kanban' && (
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:hidden" role="tablist" aria-label="Etapas de la orden">
        {BOARD_COLUMNS.map((col) => {
          const count = ordered.filter((order) => col.statuses.includes(order.status)).length;
          return (
            <button
              key={col.title}
              role="tab"
              aria-selected={mobileColumn === col.title}
              onClick={() => setMobileColumn(col.title)}
              className={cn(
                'inline-flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition',
                mobileColumn === col.title
                  ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
              )}
            >
              <col.icon size={14} /> {col.title}
              <span className={cn('rounded-full px-1.5 py-0.5 text-[10px]',
                mobileColumn === col.title ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-800')}>
                {count}
              </span>
            </button>
          );
        })}
      </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-64 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />)}
        </div>
      ) : activeTab === 'activas' && viewMode === 'kanban' ? (
        <div className="flex-1 overflow-x-auto pb-2 max-sm:min-h-[500px]">
          <div className="flex min-h-[420px] items-stretch gap-4 sm:min-h-[520px]">
            {BOARD_COLUMNS.map((col) => {
              const colOrders = ordered.filter((o) => col.statuses.includes(o.status));
              const isDropTarget = dragOverColumn === col.title;
              return (
                <section
                  key={col.title}
                  className={cn(
                    'w-full shrink-0 flex-col rounded-2xl border border-transparent transition-all sm:flex sm:w-[280px] xl:w-auto xl:min-w-[250px] xl:flex-1',
                    mobileColumn === col.title ? 'flex' : 'hidden sm:flex',
                    col.bgCls,
                    isDropTarget && 'border-blue-400 bg-blue-50/70 ring-2 ring-blue-400/30 dark:border-blue-400 dark:bg-blue-500/10'
                  )}
                  onDragOver={(event) => {
                    if (!canChangeOrderStatus) return;
                    event.preventDefault();
                    setDragOverColumn(col.title);
                  }}
                  onDragLeave={(event) => {
                    if (event.currentTarget === event.target) setDragOverColumn(null);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    const order = orders.find((o) => o.id === draggedId);
                    if (order) void moveToColumn(order, col.dropStatus);
                  }}
                >
                  <div className={cn('relative overflow-hidden rounded-t-2xl px-4 py-3.5', col.headerCls)}>
                    <span className={cn('absolute inset-y-0 left-0 w-1', col.accent)} />
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/70 dark:bg-slate-900/40">
                        <col.icon size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className="truncate text-sm font-bold">{col.title}</h2>
                        <p className="text-[10px] font-medium opacity-70">
                          {colOrders.length} {colOrders.length === 1 ? 'orden' : 'órdenes'}
                        </p>
                      </div>
                      <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-bold dark:bg-slate-900/50">
                        {colOrders.length}
                      </span>
                    </div>
                  </div>

                  <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 sm:max-h-[calc(100vh-390px)]">
                    {colOrders.length === 0 && (
                      <div className="flex min-h-[150px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300/80 bg-white/40 px-4 py-8 text-center dark:border-slate-600 dark:bg-slate-900/20">
                        <col.icon size={24} className="text-slate-300 dark:text-slate-600" />
                        <p className="mt-2 text-xs font-semibold text-slate-400 dark:text-slate-500">Sin órdenes</p>
                        <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
                          {canChangeOrderStatus ? 'Arrastra una orden aquí' : 'No hay órdenes en esta etapa'}
                        </p>
                      </div>
                    )}

                    {colOrders.map((order) => {
                      const step = NEXT_STATUS[order.status];
                      const paused = order.status === 'PAUSADO';
                      const prio = priorityMeta(order.priority);
                      const itemCount = order.items?.length || 0;
                      const completedItems = order.items?.filter((item) => item.status === 'COMPLETED').length || 0;
                      const itemProgress = itemCount ? Math.round((completedItems / itemCount) * 100) : 0;
                      const customerName = order.customer
                        ? `${order.customer.firstName} ${order.customer.lastName}`.trim()
                        : 'Sin cliente';
                      const mechanics = orderMechanics(order);
                      const days = daysInWorkshop(order);
                      const stale = isStale(order);
                      return (
                        <article
                          key={order.id}
                          draggable={canChangeOrderStatus}
                          onDragStart={() => setDraggedId(order.id || null)}
                          onDragEnd={() => { setDraggedId(null); setDragOverColumn(null); }}
                          onClick={() => void openDetail(order.id!)}
                          className={cn(
                            'group cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-500/40',
                            paused && 'border-dashed',
                            draggedId === order.id && 'opacity-40',
                            movingId === order.id && 'pointer-events-none opacity-60'
                          )}
                        >
                          <div className="mb-3 flex items-start justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-2">
                              {canChangeOrderStatus && (
                                <GripVertical size={13} className="shrink-0 cursor-grab text-slate-300 dark:text-slate-600" />
                              )}
                              <span className="truncate font-mono text-[11px] font-bold text-slate-500 dark:text-slate-400">{order.orderNumber}</span>
                            </div>
                            {canChangeOrderStatus && order.status !== 'FINALIZADO' && (
                              <button
                                onClick={(e) => { e.stopPropagation(); void togglePause(order); }}
                                className={cn('flex h-7 w-7 items-center justify-center rounded-lg transition',
                                  paused
                                    ? 'bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300'
                                    : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:bg-slate-800 dark:text-slate-500')}
                                title={paused ? 'Reanudar' : 'Pausar'}
                              >
                                {movingId === order.id ? <Spinner /> : paused ? <Play size={13} /> : <Pause size={13} />}
                              </button>
                            )}
                          </div>

                          <div className="flex items-start gap-2">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                              <Car size={15} />
                            </div>
                            <div className="min-w-0">
                              <h3 className="truncate text-sm font-bold text-slate-900 dark:text-white">
                                {order.vehicle ? `${order.vehicle.brand} ${order.vehicle.model}` : 'Sin vehículo'}
                              </h3>
                              <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                                <span className="font-mono font-semibold">{order.vehicle?.plate || '—'}</span>
                                {order.vehicle?.color && <span>· {order.vehicle.color}</span>}
                              </p>
                            </div>
                          </div>

                          <div className="mt-3 flex items-center gap-2">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[10px] font-bold text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
                              {customerName.charAt(0).toUpperCase()}
                            </div>
                            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{customerName}</p>
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] text-slate-500 dark:text-slate-400">
                            {mechanics.length > 0 ? (
                              <span className="flex min-w-0 items-center gap-1">
                                <UserRound size={11} className="shrink-0 text-slate-400" />
                                <span className="max-w-[150px] truncate">{mechanics.map((m) => m.name).join(', ')}</span>
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                                <UserRound size={11} /> Sin asignar
                              </span>
                            )}
                            <span className={cn('flex items-center gap-1 font-semibold', stale ? 'text-red-600 dark:text-red-400' : 'text-slate-400 dark:text-slate-500')}>
                              <Clock3 size={11} /> {days} d
                            </span>
                            {stale && (
                              <span className="flex items-center gap-1 rounded-full bg-red-50 px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-red-600 dark:bg-red-500/10 dark:text-red-300">
                                <AlertTriangle size={9} /> Estancada
                              </span>
                            )}
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-1.5">
                            <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', prio.cls)}>{prio.label}</span>
                            {itemCount > 0 && (
                              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
                                {itemCount} {itemCount === 1 ? 'ítem' : 'ítems'}
                              </span>
                            )}
                            {order.currentMileage != null && (
                              <span className="flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                <Gauge size={10} /> {order.currentMileage.toLocaleString('es-PE')} km
                              </span>
                            )}
                          </div>

                          {itemCount > 0 && (
                            <div className="mt-3">
                              <div className="flex items-center justify-between text-[10px] text-slate-400">
                                <span>{completedItems}/{itemCount} ítems completados</span>
                                <span>{itemProgress}%</span>
                              </div>
                              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${itemProgress}%` }} />
                              </div>
                            </div>
                          )}

                          <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                            <span className="flex items-center gap-1 text-[11px] text-slate-400">
                              <Calendar size={11} />
                              {order.receptionDate
                                ? new Date(order.receptionDate.replace('T', ' ')).toLocaleDateString('es-PE')
                                : '—'}
                            </span>
                            {step?.next ? (
                              <button
                                onClick={(e) => { e.stopPropagation(); void advance(order); }}
                                disabled={movingId === order.id}
                                className="flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:opacity-50"
                              >
                                {movingId === order.id ? <Spinner /> : <ArrowRight size={11} />}
                                {step.label}
                              </button>
                            ) : (
                              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 size={12} /> Cerrada
                              </span>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-[940px] w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-800/60">
                  <tr>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">OT</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Cliente / Vehículo</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Prioridad</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Estado</th>
                    <th className="hidden px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 lg:table-cell">Mecánico</th>
                    <th className="hidden px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 md:table-cell">Días</th>
                    <th className="hidden px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 xl:table-cell">Ítems</th>
                    <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total</th>
                    <th className="w-10 px-2 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {orders.map((order) => {
                    const prio = priorityMeta(order.priority);
                    const days = daysInWorkshop(order);
                    const stale = isStale(order);
                    const mechanics = orderMechanics(order);
                    const itemCount = order.items?.length || 0;
                    const completedItems = order.items?.filter((item) => item.status === 'COMPLETED').length || 0;
                    const customerName = order.customer
                      ? `${order.customer.firstName} ${order.customer.lastName}`.trim()
                      : 'Sin cliente';
                    return (
                      <tr
                        key={order.id}
                        onClick={() => void openDetail(order.id!)}
                        className="group cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                      >
                        <td className="px-4 py-3 font-mono text-xs font-bold text-slate-700 dark:text-slate-200">
                          {order.orderNumber}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            {order.vehicle ? `${order.vehicle.brand} ${order.vehicle.model}` : 'Sin vehículo'}
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                            <span className="font-mono font-semibold">{order.vehicle?.plate || '—'}</span>
                            <span> · {customerName}</span>
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', prio.cls)}>{prio.label}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', STATUS_CLS[order.status] || 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300')}>
                            {STATUS_LABELS[order.status] || order.status}
                          </span>
                        </td>
                        <td className="hidden px-4 py-3 text-xs text-slate-500 dark:text-slate-400 lg:table-cell">
                          {mechanics.length > 0 ? (
                            <span className="flex items-center gap-1.5">
                              <UserRound size={12} />
                              <span className="max-w-[180px] truncate">
                                {mechanics.map((m) => m.name).join(', ')}
                              </span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                              Sin asignar
                            </span>
                          )}
                        </td>
                        <td className="hidden px-4 py-3 md:table-cell">
                          <span className={cn(
                            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                            stale
                              ? 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                          )}>
                            <Clock3 size={11} /> {days} d
                          </span>
                        </td>
                        <td className="hidden px-4 py-3 text-xs text-slate-500 dark:text-slate-400 xl:table-cell">
                          {completedItems}/{itemCount} completados
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-bold tabular-nums text-slate-900 dark:text-white">
                          {formatMoney(order.totalAmount)}
                        </td>
                        <td className="px-2 py-3">
                          <ChevronRight size={15} className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-500 dark:text-slate-600" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 p-3 md:hidden">
              {orders.map((order) => {
                const prio = priorityMeta(order.priority);
                const days = daysInWorkshop(order);
                const stale = isStale(order);
                const mechanics = orderMechanics(order);
                const itemCount = order.items?.length || 0;
                const completedItems = order.items?.filter((item) => item.status === 'COMPLETED').length || 0;
                const customerName = order.customer
                  ? `${order.customer.firstName} ${order.customer.lastName}`.trim()
                  : 'Sin cliente';

                return (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => void openDetail(order.id!)}
                    className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-500/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-mono text-xs font-bold text-slate-700 dark:text-slate-200">{order.orderNumber}</p>
                        <p className="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-white">
                          {order.vehicle ? `${order.vehicle.brand} ${order.vehicle.model}` : 'Sin vehículo'}
                        </p>
                        <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">
                          <span className="font-mono font-semibold">{order.vehicle?.plate || '—'}</span> · {customerName}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-bold tabular-nums text-slate-900 dark:text-white">{formatMoney(order.totalAmount)}</p>
                        <ChevronRight size={15} className="ml-auto mt-1 text-slate-300 dark:text-slate-600" />
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', prio.cls)}>{prio.label}</span>
                      <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', STATUS_CLS[order.status] || 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300')}>
                        {STATUS_LABELS[order.status] || order.status}
                      </span>
                      <span className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                        stale ? 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                      )}>
                        <Clock3 size={11} /> {days} d
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5 text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <UserRound size={12} />
                        <span className="truncate">{mechanics.length > 0 ? mechanics.map((m) => m.name).join(', ') : 'Sin asignar'}</span>
                      </span>
                      <span className="shrink-0">{completedItems}/{itemCount} ítems</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {ordered.length === 0 && (
              <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
                {activeTab === 'historial' ? (
                  <CheckCircle2 size={28} className="text-emerald-300 dark:text-emerald-500/60" />
                ) : (
                  <Inbox size={28} className="text-slate-300 dark:text-slate-600" />
                )}
                <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {activeTab === 'historial' ? 'Aún no hay órdenes finalizadas' : 'No hay órdenes que coincidan'}
                </p>
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                  {activeTab === 'historial'
                    ? 'Las órdenes cerradas aparecerán en este historial.'
                    : 'Prueba con otro filtro o limpia la búsqueda.'}
                </p>
                {activeTab === 'activas' && (search || activeFilterCount > 0) && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="mt-3 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>
            )}
          </div>
          {totalPages > 1 && (
            <Pagination
              page={page}
              pageCount={totalPages}
              onChange={setPage}
              total={totalElements}
              from={totalElements === 0 ? 0 : (page - 1) * 10 + 1}
              to={Math.min(totalElements, (page - 1) * 10 + orders.length)}
              itemLabel="órdenes"
            />
          )}
        </div>
      )}

      {/* Detalle y gestión */}
      {selected && (
        <Modal
          title={`Orden ${selected.orderNumber}`}
          description={[
            selected.vehicle
              ? `${selected.vehicle.plate} · ${selected.vehicle.brand} ${selected.vehicle.model}`
              : 'Sin vehículo',
            selected.customer
              ? `${selected.customer.firstName} ${selected.customer.lastName}${selected.customer.phone ? ' · ' + selected.customer.phone : ''}`
              : 'Sin cliente',
          ].join(' · ')}
          icon={ClipboardList}
          size="xl"
          onClose={closeDetail}
          footer={
            <button
              onClick={closeDetail}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cerrar
            </button>
          }
        >
          {detailLoading ? (
            <div className="flex h-64 items-center justify-center text-sm text-slate-400 dark:text-slate-500">
              <Spinner className="mr-2 h-5 w-5" /> Cargando detalles...
            </div>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                  {STATUS_LABELS[selected.status] || selected.status}
                </span>
                <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', priorityMeta(selected.priority).cls)}>
                  Prioridad {priorityMeta(selected.priority).label}
                </span>
                <span className="ml-auto flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                  <Calendar size={13} />
                  {selected.receptionDate
                    ? new Date(selected.receptionDate.replace('T', ' ')).toLocaleDateString('es-PE')
                    : 'Sin fecha'}
                </span>
              </div>

              <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: 'Kilometraje', value: selected.currentMileage != null ? `${selected.currentMileage.toLocaleString('es-PE')} km` : '—', icon: Gauge },
                  { label: 'Combustible', value: selected.fuelLevel || '—', icon: Fuel },
                  { label: 'Ítems', value: String(selected.items?.length || 0), icon: ClipboardList },
                  { label: 'Total estimado', value: formatMoney(totalAmount), icon: CircleDollarSign },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                    <item.icon size={15} className="text-blue-600 dark:text-blue-300" />
                    <p className="mt-2 truncate text-sm font-bold text-slate-800 dark:text-slate-100">{item.value}</p>
                    <p className="truncate text-[10px] uppercase tracking-wide text-slate-400">{item.label}</p>
                  </div>
                ))}
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
                <SeccionFormulario
                  title="Detalles y diagnóstico"
                  description="Prioridad, kilometraje, combustible y observaciones técnicas."
                  icon={ClipboardList}
                  contentClassName="sm:grid-cols-3"
                >
                  {edit && canEditOrder && (
                    <>
                      <CampoFormulario label="Prioridad">
                        <select
                          value={edit.priority}
                          onChange={(e) => setEdit((x) => (x ? { ...x, priority: e.target.value } : x))}
                          className={estiloCampo}
                        >
                          <option value="NORMAL">Normal</option>
                          <option value="ALTA">Alta</option>
                          <option value="URGENTE">Urgente</option>
                        </select>
                      </CampoFormulario>
                      <CampoFormulario label="Kilometraje actual (km)">
                        <div className="relative">
                          <Gauge size={13} className="pointer-events-none absolute inset-y-0 left-2.5 my-auto text-slate-400 dark:text-slate-500" />
                          <input
                            type="number"
                            min={0}
                            value={edit.currentMileage}
                            onChange={(e) => setEdit((x) => (x ? { ...x, currentMileage: e.target.value } : x))}
                            className={`${estiloCampo} pl-8`}
                          />
                        </div>
                      </CampoFormulario>
                      <CampoFormulario label="Nivel de combustible">
                        <div className="relative">
                          <Fuel size={13} className="pointer-events-none absolute inset-y-0 left-2.5 my-auto text-slate-400 dark:text-slate-500" />
                          <select
                            value={edit.fuelLevel}
                            onChange={(e) => setEdit((x) => (x ? { ...x, fuelLevel: e.target.value } : x))}
                            className={`${estiloCampo} pl-8`}
                          >
                            <option value="">— Sin especificar —</option>
                            {FUEL_LEVELS.map((f) => (
                              <option key={f} value={f}>
                                {f}
                              </option>
                            ))}
                          </select>
                        </div>
                      </CampoFormulario>
                      <CampoFormulario label="Síntomas reportados por el cliente" className="sm:col-span-3">
                        <textarea
                          value={edit.customerSymptoms}
                          rows={2}
                          onChange={(e) => setEdit((x) => (x ? { ...x, customerSymptoms: e.target.value } : x))}
                          className={`${estiloCampo} resize-none`}
                          placeholder="Describe lo que el cliente reportó..."
                        />
                      </CampoFormulario>
                      <CampoFormulario label="Diagnóstico técnico" className="sm:col-span-3">
                        <textarea
                          value={edit.technicalDiagnosis}
                          rows={2}
                          onChange={(e) => setEdit((x) => (x ? { ...x, technicalDiagnosis: e.target.value } : x))}
                          className={`${estiloCampo} resize-none`}
                          placeholder="Resultado del diagnóstico técnico..."
                        />
                      </CampoFormulario>
                      <CampoFormulario label="Daños visuales registrados" className="sm:col-span-3">
                        <textarea
                          value={edit.visualDamages}
                          rows={2}
                          onChange={(e) => setEdit((x) => (x ? { ...x, visualDamages: e.target.value } : x))}
                          className={`${estiloCampo} resize-none`}
                          placeholder="Resumen de daños visuales detectados en la inspección..."
                        />
                      </CampoFormulario>
                    </>
                  )}
                  {!canEditOrder && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 sm:col-span-3">
                      No tienes permiso para editar esta orden.
                    </p>
                  )}
                  {canEditOrder && (
                    <div className="flex justify-end sm:col-span-3">
                      <button
                        type="button"
                        onClick={saveOrder}
                        disabled={saving}
                        className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:opacity-50"
                      >
                        {saving ? <Spinner /> : <Save size={14} />}
                        Guardar cambios
                      </button>
                    </div>
                  )}
                </SeccionFormulario>

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
                    <SeccionFormulario
                      title={editingItem ? 'Editar ítem' : 'Agregar trabajo'}
                      description="Repuesto o servicio, responsable, cantidad y precio."
                      icon={Wrench}
                      className="mt-4"
                    >
                      {editingItem && (
                        <div className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2 dark:border-blue-500/20 dark:bg-blue-500/10 sm:col-span-2">
                          <p className="text-xs font-semibold text-blue-800 dark:text-blue-200">
                            Editando: {editingItem.description}
                          </p>
                          <button
                            type="button"
                            onClick={cancelEditingItem}
                            className="flex items-center gap-1 text-[11px] font-semibold text-blue-700 transition hover:text-blue-900 dark:text-blue-300"
                          >
                            <Undo2 size={12} /> Cancelar
                          </button>
                        </div>
                      )}
                      <CampoFormulario label="Repuesto">
                        <select
                          value={itemForm.productId}
                          onChange={(e) => onProductChange(e.target.value)}
                          className={estiloCampo}
                        >
                          <option value="">Sin repuesto (mano de obra)</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.code} · {p.name} ({p.currentStock} und.)
                            </option>
                          ))}
                        </select>
                      </CampoFormulario>
                      <CampoFormulario label="Servicio del catálogo">
                        <select
                          value={itemForm.serviceId}
                          onChange={(e) => onServiceChange(e.target.value)}
                          className={estiloCampo}
                        >
                          <option value="">Sin servicio del catálogo</option>
                          {services.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.code} · {s.name}
                            </option>
                          ))}
                        </select>
                      </CampoFormulario>
                      <CampoFormulario label="Mecánico">
                        <select
                          value={itemForm.mechanicId}
                          onChange={(e) => setItemForm((f) => ({ ...f, mechanicId: e.target.value }))}
                          className={estiloCampo}
                        >
                          <option value="">Sin mecánico asignado</option>
                          {mechanics.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} {m.lastName}
                            </option>
                          ))}
                        </select>
                      </CampoFormulario>
                      <CampoFormulario label="Descripción">
                        <input
                          type="text"
                          value={itemForm.description}
                          onChange={(e) => setItemForm((f) => ({ ...f, description: e.target.value }))}
                          placeholder="Descripción del trabajo"
                          className={estiloCampo}
                        />
                      </CampoFormulario>
                      <CampoFormulario label="Cantidad" required>
                        <input
                          type="number"
                          min={1}
                          value={itemForm.quantity}
                          onChange={(e) => setItemForm((f) => ({ ...f, quantity: e.target.value }))}
                          className={estiloCampo}
                        />
                      </CampoFormulario>
                      <CampoFormulario label="Precio unitario (S/)" required>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={itemForm.price}
                          onChange={(e) => setItemForm((f) => ({ ...f, price: e.target.value }))}
                          className={estiloCampo}
                        />
                      </CampoFormulario>
                      <div className="flex justify-end sm:col-span-2">
                        <button
                          type="button"
                          onClick={saveItem}
                          disabled={addingItem}
                          className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:opacity-50"
                        >
                          {addingItem ? <Spinner /> : editingItem ? <Save size={14} /> : <Plus size={14} />}
                          {editingItem ? 'Guardar cambios' : 'Agregar ítem'}
                        </button>
                      </div>
                    </SeccionFormulario>
                  )}

                </section>
            </>
          )}
        </Modal>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Eliminar ítem de la orden"
        message={deleteTarget ? `¿Eliminar "${deleteTarget.description}"? Esta acción no se puede deshacer.` : undefined}
        confirmLabel="Eliminar ítem"
        busy={deletingItem != null}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteItem}
      />
    </div>
  );
}
