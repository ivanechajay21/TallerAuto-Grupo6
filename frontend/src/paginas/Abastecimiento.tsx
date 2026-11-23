import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRightLeft,
  Ban,
  CalendarClock,
  Check,
  ClipboardList,
  CreditCard,
  DollarSign,
  Eye,
  Info,
  LayoutDashboard,
  PackageSearch,
  PieChart,
  Plus,
  RefreshCw,
  ShoppingCart,
  TrendingUp,
  Wallet,
  Search,
  X,
} from 'lucide-react';
import AccionesTabla from '../componentes/interfaz/AccionesTabla';
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
import { getAllProducts } from '../servicios/productosServicio';
import type { Product } from '../servicios/productosServicio';
import {
  cancelPayable,
  changePurchaseRequestStatus,
  convertPlan,
  convertPurchaseRequest,
  createPayable,
  createPlan,
  createPurchaseRequest,
  generatePlan,
  getBudget,
  getForecasts,
  getPayables,
  getPolicies,
  getPlans,
  getPurchaseRequestHistory,
  getPurchaseRequests,
  getPurchases,
  getReplenishmentSuggestions,
  getSuppliers,
  getSupplyDashboard,
  payPayable,
  saveBudget,
  saveForecast,
  savePolicy,
} from '../servicios/comprasServicio';
import type {
  BudgetStatus,
  Forecast,
  Payable,
  PurchaseOrder,
  PurchaseRequest,
  PurchaseRequestHistory,
  ReplenishmentSuggestion,
  Supplier,
  SupplyDashboard,
  SupplyPlan,
  SupplyPolicy,
} from '../servicios/comprasServicio';

type Tab = 'dashboard' | 'replenishment' | 'planning' | 'forecast' | 'requests' | 'payables' | 'budget';

const money = (value: number) =>
  (value || 0).toLocaleString('es-PE', { style: 'currency', currency: 'PEN' });
const date = (value?: string) => (value ? new Date(value).toLocaleDateString('es-PE') : '—');

export default function Supply() {
  const toast = useToast();
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission('COMPRAS:EDITAR');
  const canCreate = hasPermission('COMPRAS:CREAR');
  const canApprove = hasPermission('COMPRAS:APROBAR');
  const canCancelPayable = hasPermission('COMPRAS:ANULAR');

  const [tab, setTab] = useState<Tab>('dashboard');
  const [dashboard, setDashboard] = useState<SupplyDashboard | null>(null);
  const [suggestions, setSuggestions] = useState<ReplenishmentSuggestion[]>([]);
  const [policies, setPolicies] = useState<SupplyPolicy[]>([]);
  const [plans, setPlans] = useState<SupplyPlan[]>([]);
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [payables, setPayables] = useState<Payable[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [budget, setBudget] = useState<BudgetStatus | null>(null);
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);
  const [budgetLoading, setBudgetLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [policyForm, setPolicyForm] = useState({ productId: 0, supplierId: '', reorderPoint: 5, minimumLot: 1, targetStock: 10, leadTimeDays: 0 });
  const [planOpen, setPlanOpen] = useState(false);
  const [planForm, setPlanForm] = useState({ period: new Date().toISOString().slice(0, 7), notes: '', productId: 0, quantity: 1 });
  const [forecastOpen, setForecastOpen] = useState(false);
  const [forecastForm, setForecastForm] = useState({ productId: 0, forecastQuantity: 0, safetyStock: 0, notes: '' });
  const [paying, setPaying] = useState<Payable | null>(null);
  const [payForm, setPayForm] = useState({ amount: 0, method: 'TRANSFER', reference: '' });
  const [confirmPayable, setConfirmPayable] = useState<Payable | null>(null);
  const [budgetForm, setBudgetForm] = useState({ limitAmount: 0, alertPercentage: 80 });
  const [suggestionQuery, setSuggestionQuery] = useState('');
  const [planQuery, setPlanQuery] = useState('');
  const [planStatus, setPlanStatus] = useState('TODOS');
  const [requestQuery, setRequestQuery] = useState('');
  const [requestStatus, setRequestStatus] = useState('TODOS');
  const [selectedRequest, setSelectedRequest] = useState<PurchaseRequest | null>(null);
  const [requestHistory, setRequestHistory] = useState<PurchaseRequestHistory[]>([]);
  const [requestToConvert, setRequestToConvert] = useState<PurchaseRequest | null>(null);
  const [requestSupplierId, setRequestSupplierId] = useState(0);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({
    purchaseOrderId: 0,
    number: '',
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    total: 0,
  });
  const [payableStatus, setPayableStatus] = useState('TODOS');

  const loadAll = async () => {
    setLoading(true);
    try {
      const [board, suggestionList, policyList, planList, requestList, orderList, payableList, productList, supplierList] = await Promise.all([
        getSupplyDashboard(), getReplenishmentSuggestions(), getPolicies(), getPlans(), getPurchaseRequests(),
        getPurchases(), getPayables(), getAllProducts({ incluirInactivos: false }), getSuppliers(false),
      ]);
      setDashboard(board);
      setSuggestions(suggestionList);
      setPolicies(policyList);
      setPlans(planList);
      setRequests(requestList);
      setPurchaseOrders(orderList);
      setPayables(payableList);
      setProducts(productList);
      setSuppliers(supplierList);
      setPolicyForm((current) => ({ ...current, productId: current.productId || productList[0]?.id || 0 }));
      setPlanForm((current) => ({ ...current, productId: current.productId || productList[0]?.id || 0 }));
    } catch {
      toast.error('Error', 'No se pudo cargar abastecimiento.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setBudgetLoading(true);
    setBudget(null);
    getBudget(period)
      .then((data) => {
        setBudget(data);
        setBudgetForm({
          limitAmount: data.limitAmount,
          alertPercentage: data.alertPercentage ?? 80,
        });
      })
      .catch(() => {
        setBudget(null);
        setBudgetForm({ limitAmount: 0, alertPercentage: 80 });
      })
      .finally(() => setBudgetLoading(false));
  }, [period]);

  useEffect(() => {
    getForecasts(period)
      .then((data) => {
        setForecasts(data);
        setForecastForm((current) => ({ ...current, productId: current.productId || products[0]?.id || 0 }));
      })
      .catch(() => setForecasts([]));
  }, [period, products]);

  const requestFromSuggestions = async () => {
    if (!suggestions.length) return;
    try {
      await createPurchaseRequest({
        notes: 'Generada desde sugerencias de reposición',
        items: suggestions.map((item) => ({ productId: item.productId, quantity: item.suggestedQuantity })),
      });
      toast.success('Solicitud creada');
      loadAll();
    } catch (error: any) {
      toast.error('Error', error?.response?.data?.message || 'No se pudo crear la solicitud.');
    }
  };

  const openRequest = async (request: PurchaseRequest) => {
    setSelectedRequest(request);
    setRequestHistory([]);
    try {
      setRequestHistory(await getPurchaseRequestHistory(request.id));
    } catch {
      setRequestHistory([]);
    }
  };

  const decideRequest = async (request: PurchaseRequest, status: 'APROBADA' | 'RECHAZADA' | 'CANCELADA') => {
    if (!canApprove) return;
    try {
      await changePurchaseRequestStatus(request.id, status, `Cambio desde Abastecimiento`);
      toast.success(status === 'APROBADA' ? 'Solicitud aprobada' : status === 'RECHAZADA' ? 'Solicitud rechazada' : 'Solicitud cancelada');
      await loadAll();
      if (selectedRequest?.id === request.id) {
        await openRequest({ ...request, status });
      }
    } catch (error: any) {
      toast.error('Error', error?.response?.data?.message || 'No se pudo actualizar la solicitud.');
    }
  };

  const openConvertRequest = (request: PurchaseRequest) => {
    setRequestToConvert(request);
    setRequestSupplierId(suppliers[0]?.id || 0);
  };

  const confirmConvertRequest = async () => {
    if (!requestToConvert || !requestSupplierId) {
      toast.error('Validación', 'Selecciona un proveedor.');
      return;
    }
    setSaving(true);
    try {
      await convertPurchaseRequest(requestToConvert.id, requestSupplierId);
      toast.success('Solicitud convertida en orden de compra');
      setRequestToConvert(null);
      await loadAll();
    } catch (error: any) {
      toast.error('Error', error?.response?.data?.message || 'No se pudo convertir la solicitud.');
    } finally {
      setSaving(false);
    }
  };

  const openInvoice = () => {
    const order = purchaseOrders.find((item) => ['RECIBIDA', 'PARCIAL'].includes(item.status));
    setInvoiceForm({
      purchaseOrderId: order?.id || 0,
      number: '',
      issueDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      total: order?.total || 0,
    });
    setInvoiceOpen(true);
  };

  const saveInvoice = async () => {
    if (!invoiceForm.purchaseOrderId || !invoiceForm.number.trim()) {
      toast.error('Validación', 'Selecciona una orden y escribe el número de factura.');
      return;
    }
    if (invoiceForm.total <= 0) {
      toast.error('Validación', 'El total de la factura debe ser mayor a cero.');
      return;
    }
    if (invoiceForm.dueDate < invoiceForm.issueDate) {
      toast.error('Validación', 'La fecha de vencimiento no puede ser anterior a la emisión.');
      return;
    }
    setSaving(true);
    try {
      await createPayable({
        purchaseOrderId: invoiceForm.purchaseOrderId,
        number: invoiceForm.number.trim(),
        issueDate: invoiceForm.issueDate,
        dueDate: invoiceForm.dueDate,
        total: invoiceForm.total,
      });
      toast.success('Factura registrada', 'Ya está disponible en cuentas por pagar.');
      setInvoiceOpen(false);
      await loadAll();
    } catch (error: any) {
      toast.error('Error', error?.response?.data?.message || 'No se pudo registrar la factura.');
    } finally {
      setSaving(false);
    }
  };

  const savePolicyForm = async () => {
    if (!policyForm.productId) {
      toast.error('Validación', 'Selecciona un producto.');
      return;
    }
    if ([policyForm.reorderPoint, policyForm.minimumLot, policyForm.targetStock, policyForm.leadTimeDays].some((value) => value < 0)) {
      toast.error('Validación', 'Los valores de la política no pueden ser negativos.');
      return;
    }
    setSaving(true);
    try {
      await savePolicy(policyForm.productId, policyForm.supplierId ? Number(policyForm.supplierId) : null, {
        reorderPoint: policyForm.reorderPoint,
        minimumLot: policyForm.minimumLot,
        targetStock: policyForm.targetStock,
        leadTimeDays: policyForm.leadTimeDays,
      });
      toast.success('Política guardada');
      setPolicyOpen(false);
      loadAll();
    } catch (error: any) {
      toast.error('Error', error?.response?.data?.message || 'No se pudo guardar la política.');
    } finally {
      setSaving(false);
    }
  };

  const savePlanForm = async () => {
    if (!planForm.productId) {
      toast.error('Validación', 'Selecciona un producto.');
      return;
    }
    if (planForm.quantity < 1) {
      toast.error('Validación', 'La cantidad debe ser al menos 1.');
      return;
    }
    setSaving(true);
    try {
      await createPlan({
        period: planForm.period,
        notes: planForm.notes || undefined,
        items: [{ productId: planForm.productId, quantity: planForm.quantity }],
      });
      toast.success('Plan creado');
      setPlanOpen(false);
      loadAll();
    } catch (error: any) {
      toast.error('Error', error?.response?.data?.message || 'No se pudo crear el plan.');
    } finally {
      setSaving(false);
    }
  };

  const saveForecastForm = async () => {
    if (!forecastForm.productId) {
      toast.error('Validación', 'Selecciona un producto.');
      return;
    }
    if (forecastForm.forecastQuantity < 0 || forecastForm.safetyStock < 0) {
      toast.error('Validación', 'El pronóstico y el stock de seguridad no pueden ser negativos.');
      return;
    }
    setSaving(true);
    try {
      await saveForecast(forecastForm.productId, {
        period,
        forecastQuantity: forecastForm.forecastQuantity,
        safetyStock: forecastForm.safetyStock,
        notes: forecastForm.notes || undefined,
      });
      toast.success('Pronóstico guardado');
      setForecastOpen(false);
      const data = await getForecasts(period);
      setForecasts(data);
    } catch (error: any) {
      toast.error('Error', error?.response?.data?.message || 'No se pudo guardar el pronóstico.');
    } finally {
      setSaving(false);
    }
  };

  const generatePlanFromForecast = async () => {
    if (!canEdit) return;
    setSaving(true);
    try {
      await generatePlan(period, 'Generado desde pronósticos de demanda');
      toast.success('Plan generado', 'Revisa la pestaña Planificación.');
      await loadAll();
      setTab('planning');
    } catch (error: any) {
      toast.error('Error', error?.response?.data?.message || 'No se pudo generar el plan.');
    } finally {
      setSaving(false);
    }
  };

  const saveBudgetForm = async () => {
    if (budgetForm.limitAmount <= 0) {
      toast.error('Validación', 'El límite del presupuesto debe ser mayor que cero.');
      return;
    }
    if (budgetForm.alertPercentage < 0 || budgetForm.alertPercentage > 100) {
      toast.error('Validación', 'El porcentaje de alerta debe estar entre 0 y 100.');
      return;
    }
    setSaving(true);
    try {
      await saveBudget({ period, limitAmount: budgetForm.limitAmount, alertPercentage: budgetForm.alertPercentage, active: true });
      toast.success('Presupuesto guardado', 'El límite y el umbral de alerta quedaron actualizados.');
      const updated = await getBudget(period);
      setBudget(updated);
      setBudgetForm({ limitAmount: updated.limitAmount, alertPercentage: updated.alertPercentage ?? 80 });
    } catch (error: any) {
      toast.error('Error', error?.response?.data?.message || 'No se pudo guardar el presupuesto.');
    } finally {
      setSaving(false);
    }
  };

  const pay = async () => {
    if (!paying) return;
    if (payForm.amount <= 0 || payForm.amount > paying.balance) {
      toast.error('Validación', 'El monto debe ser mayor que cero y no superar el saldo pendiente.');
      return;
    }
    setSaving(true);
    try {
      await payPayable(paying.id, payForm);
      toast.success('Pago registrado');
      setPaying(null);
      loadAll();
    } catch (error: any) {
      toast.error('Error', error?.response?.data?.message || 'No se pudo registrar el pago.');
    } finally {
      setSaving(false);
    }
  };

  const cancelPayableConfirmed = async () => {
    if (!confirmPayable) return;
    setSaving(true);
    try {
      await cancelPayable(confirmPayable.id);
      toast.success('Factura anulada');
      setConfirmPayable(null);
      loadAll();
    } catch (error: any) {
      toast.error('Error', error?.response?.data?.message || 'No se pudo anular la factura.');
    } finally {
      setSaving(false);
    }
  };

  const tabs: Array<{ value: Tab; label: string; icon: typeof LayoutDashboard; count?: number }> = [
    { value: 'dashboard', label: 'Tablero', icon: LayoutDashboard },
    { value: 'replenishment', label: 'Reposición', icon: PackageSearch, count: suggestions.length },
    { value: 'planning', label: 'Planificación', icon: CalendarClock, count: plans.length },
    { value: 'forecast', label: 'Pronósticos', icon: TrendingUp, count: forecasts.length },
    { value: 'requests', label: 'Solicitudes', icon: ClipboardList, count: requests.length },
    { value: 'payables', label: 'Cuentas por pagar', icon: Wallet, count: payables.length },
    { value: 'budget', label: 'Presupuesto', icon: PieChart },
  ];

  const budgetUsage = budget ? Math.min(100, Math.max(0, Number(budget.percentageUsed))) : 0;
  const budgetLabel = new Intl.DateTimeFormat('es-PE', { month: 'long', year: 'numeric' })
    .format(new Date(`${period}-01T00:00:00`));
  const budgetTone = budget?.status === 'EXCEDIDO'
    ? 'red'
    : budget?.status === 'ALERTA'
      ? 'amber'
      : 'emerald';
  const budgetBadge = budgetTone === 'red'
    ? 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300'
    : budgetTone === 'amber'
      ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
      : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300';
  const budgetBar = budgetTone === 'red'
    ? 'bg-red-500'
    : budgetTone === 'amber'
      ? 'bg-amber-500'
      : 'bg-emerald-500';

  const visibleSuggestions = suggestions.filter((item) => {
    const q = suggestionQuery.toLowerCase().trim();
    if (!q) return true;
    return item.name.toLowerCase().includes(q)
      || item.code.toLowerCase().includes(q)
      || (item.preferredSupplier || '').toLowerCase().includes(q);
  });
  const planStatuses = Array.from(new Set(plans.map((plan) => plan.status)));
  const visiblePlans = plans.filter((plan) => {
    if (planStatus !== 'TODOS' && plan.status !== planStatus) return false;
    const q = planQuery.toLowerCase().trim();
    if (!q) return true;
    return plan.code.toLowerCase().includes(q)
      || plan.period.toLowerCase().includes(q)
      || plan.status.toLowerCase().includes(q);
  });
  const payableStatuses = Array.from(new Set(payables.map((item) => item.status)));
  const visiblePayables = payables.filter((item) => {
    if (payableStatus !== 'TODOS' && item.status !== payableStatus) return false;
    return true;
  });
  const suggestionColumns: ResponsiveColumn<ReplenishmentSuggestion>[] = [
    { key: 'product', header: 'Producto', render: (item) => <div><p className="font-semibold">{item.name}</p><p className="text-xs text-slate-500">{item.code}</p></div> },
    { key: 'stock', header: 'Existencias', className: 'text-right', render: (item) => <span className="tabular-nums">{item.currentStock} / mín. {item.minStock}</span> },
    { key: 'quantity', header: 'Sugerido', className: 'text-right', render: (item) => <span className="font-bold tabular-nums text-blue-700 dark:text-blue-300">{item.suggestedQuantity}</span> },
    { key: 'policy', header: 'Política', render: (item) => <span className="text-xs">{item.policyApplied ? `Sí · plazo ${item.leadTimeDays} días` : 'Básica'}</span> },
    { key: 'supplier', header: 'Proveedor preferido', hideOnMobile: true, render: (item) => <span className="text-xs">{item.preferredSupplier || '—'}</span> },
  ];

  const planColumns: ResponsiveColumn<SupplyPlan>[] = [
    { key: 'code', header: 'Plan', render: (plan) => <div><p className="font-mono text-xs font-bold">{plan.code}</p><p className="text-xs text-slate-500">{plan.period}</p></div> },
    { key: 'status', header: 'Estado', render: (plan) => (
      <span className={cn(
        'rounded-full px-2 py-1 text-[10px] font-bold',
        plan.status === 'BORRADOR'
          ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
          : plan.status === 'APROBADO'
            ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300'
            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
      )}>
        {plan.status}
      </span>
    ) },
    { key: 'items', header: 'Líneas', className: 'text-right', render: (plan) => <span className="tabular-nums">{plan.items.length}</span> },
    { key: 'actions', header: '', className: 'text-right', render: (plan) => canApprove && plan.status === 'BORRADOR' ? (
      <button onClick={async () => {
        try { await convertPlan(plan.id); toast.success('Solicitud generada'); loadAll(); }
        catch (error: any) { toast.error('Error', error?.response?.data?.message || 'No se pudo convertir el plan.'); }
      }} className="rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-bold text-white">Convertir</button>
    ) : null },
  ];

  const forecastColumns: ResponsiveColumn<Forecast>[] = [
    {
      key: 'product',
      header: 'Producto',
      render: (item) => (
        <div>
          <p className="font-semibold">{item.product.name}</p>
          <p className="text-xs text-slate-500">{item.product.code}</p>
        </div>
      ),
    },
    {
      key: 'forecast',
      header: 'Demanda prevista',
      className: 'text-right',
      render: (item) => <span className="font-bold tabular-nums text-blue-700 dark:text-blue-300">{item.forecastQuantity}</span>,
    },
    {
      key: 'safety',
      header: 'Stock seguridad',
      className: 'text-right',
      render: (item) => <span className="tabular-nums">{item.safetyStock}</span>,
    },
    {
      key: 'stock',
      header: 'Stock actual',
      hideOnMobile: true,
      className: 'text-right',
      render: (item) => <span className="tabular-nums">{item.product.currentStock}</span>,
    },
    {
      key: 'notes',
      header: 'Notas',
      hideOnMobile: true,
      render: (item) => <span className="text-xs text-slate-500">{item.notes || '—'}</span>,
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (item) => canEdit ? (
        <button
          onClick={() => {
            setForecastForm({
              productId: item.product.id,
              forecastQuantity: item.forecastQuantity,
              safetyStock: item.safetyStock,
              notes: item.notes || '',
            });
            setForecastOpen(true);
          }}
          className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Editar
        </button>
      ) : null,
    },
  ];

  const requestStatuses = Array.from(new Set(requests.map((request) => request.status)));
  const visibleRequests = requests.filter((request) => {
    if (requestStatus !== 'TODOS' && request.status !== requestStatus) return false;
    const q = requestQuery.toLowerCase().trim();
    if (!q) return true;
    return request.code.toLowerCase().includes(q)
      || request.status.toLowerCase().includes(q)
      || (request.notes || '').toLowerCase().includes(q);
  });
  const invoiceableOrders = purchaseOrders.filter((order) => ['RECIBIDA', 'PARCIAL'].includes(order.status));

  const requestColumns: ResponsiveColumn<PurchaseRequest>[] = [
    {
      key: 'code',
      header: 'Solicitud',
      render: (request) => (
        <div>
          <p className="font-mono text-xs font-bold">{request.code}</p>
          <p className="text-xs text-slate-500">{date(request.requestedAt)}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (request) => (
        <span className={cn(
          'rounded-full px-2 py-1 text-[10px] font-bold',
          request.status === 'PENDIENTE' ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
            : request.status === 'APROBADA' ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300'
              : request.status === 'CONVERTIDA' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                : 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300'
        )}>
          {request.status}
        </span>
      ),
    },
    {
      key: 'items',
      header: 'Líneas',
      className: 'text-right',
      render: (request) => <span className="tabular-nums">{request.items.length}</span>,
    },
    {
      key: 'notes',
      header: 'Notas',
      hideOnMobile: true,
      render: (request) => <span className="text-xs text-slate-500">{request.notes || '—'}</span>,
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (request) => (
        <AccionesTabla
          acciones={[
            { label: 'Ver', icon: Eye, onClick: () => void openRequest(request) },
            ...(canApprove && request.status === 'PENDIENTE'
              ? [
                  { label: 'Aprobar', icon: Check, tone: 'primary' as const, onClick: () => void decideRequest(request, 'APROBADA') },
                  { label: 'Rechazar', icon: Ban, tone: 'danger' as const, onClick: () => void decideRequest(request, 'RECHAZADA') },
                ]
              : []),
            ...(canCreate && request.status === 'APROBADA'
              ? [{ label: 'Convertir', icon: ArrowRightLeft, tone: 'success' as const, onClick: () => openConvertRequest(request) }]
              : []),
          ]}
        />
      ),
    },
  ];

  const payableColumns: ResponsiveColumn<Payable>[] = [
    { key: 'number', header: 'Factura', render: (item) => <div><p className="font-mono text-xs font-bold">{item.number}</p><p className="text-xs text-slate-500">{item.purchaseOrder?.code}</p></div> },
    { key: 'due', header: 'Vence', render: (item) => <span className="text-xs">{date(item.dueDate)}</span> },
    { key: 'balance', header: 'Saldo', className: 'text-right', render: (item) => <span className="font-semibold tabular-nums">{money(item.balance)}</span> },
    { key: 'status', header: 'Estado', render: (item) => (
      <span className={cn(
        'rounded-full px-2 py-1 text-[10px] font-bold',
        item.status === 'PENDIENTE'
          ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
          : item.status === 'PARCIAL'
            ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300'
            : item.status === 'PAGADA'
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
              : item.status === 'VENCIDA'
                ? 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300'
                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
      )}>
        {item.status}
      </span>
    ) },
    { key: 'actions', header: '', className: 'text-right', render: (item) => (
      <AccionesTabla
        acciones={[
          ...(canApprove && ['PENDIENTE', 'PARCIAL'].includes(item.status)
            ? [{
                label: 'Pagar',
                icon: CreditCard,
                tone: 'success' as const,
                onClick: () => {
                  setPaying(item);
                  setPayForm({ amount: item.balance, method: 'TRANSFER', reference: '' });
                },
              }]
            : []),
          ...(canCancelPayable && item.status !== 'ANULADA' && item.status !== 'PAGADA'
            ? [{ label: 'Anular', icon: Ban, tone: 'danger' as const, onClick: () => setConfirmPayable(item) }]
            : []),
        ]}
      />
    ) },
  ];

  const headerActions = (
    <>
      <button
        type="button"
        onClick={loadAll}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
      >
        <RefreshCw size={14} className={cn(loading && 'animate-spin')} /> Actualizar
      </button>
      {canEdit && (
        <button onClick={() => setPlanOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-500">
          <Plus size={17} /> Nuevo plan
        </button>
      )}
    </>
  );

  return (
    <div className="space-y-6">
      <EncabezadoModulo
        eyebrow="Operación de abastecimiento"
        title="Abastecimiento"
        description="Reposición, planificación, presupuesto, solicitudes y cuentas por pagar en una vista ordenada."
        icon={PackageSearch}
        actions={headerActions}
        meta={(
          <>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
              {suggestions.length} sugerencia(s)
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
              {requests.length} solicitud(es)
            </span>
          </>
        )}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Sugerencias de reposición', value: suggestions.length, icon: PackageSearch, tone: 'amber' as const, target: 'replenishment' as Tab },
          { label: 'Planes de compra', value: plans.length, icon: CalendarClock, tone: 'blue' as const, target: 'planning' as Tab },
          { label: 'Cuentas por pagar', value: payables.length, icon: Wallet, tone: 'violet' as const, target: 'payables' as Tab },
          { label: `Presupuesto usado · ${budgetUsage}%`, value: budget ? money(budget.committedAmount) : '—', icon: PieChart, tone: budgetTone as 'red' | 'amber' | 'emerald', target: 'budget' as Tab },
        ].map((card) => (
          <TarjetaMetrica
            key={card.label}
            label={card.label}
            value={card.value}
            icon={card.icon}
            tone={card.tone}
            active={tab === card.target}
            onClick={() => setTab(card.target)}
          />
        ))}
      </div>

      <PestanasModulo
        items={tabs}
        value={tab}
        onChange={(value) => setTab(value as Tab)}
      />

      {loading && <div className="h-32 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />}

      {!loading && tab === 'dashboard' && dashboard && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {[
              ['Productos críticos', dashboard.criticalProducts, AlertTriangle],
              ['Solicitudes', dashboard.pendingRequests, ClipboardList],
              ['Órdenes abiertas', dashboard.pendingOrders, CalendarClock],
              ['Entregas demoradas', dashboard.delayedShipments, RefreshCw],
              ['Deuda abierta', money(dashboard.openDebt), DollarSign],
            ].map(([label, value, Icon]: any) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                <Icon size={17} className="text-blue-600" />
                <p className="mt-2 text-xl font-bold">{value}</p>
                <p className="text-xs text-slate-500">{label}</p>
              </div>
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <h2 className="font-semibold">Acciones sugeridas</h2>
              <div className="mt-3 space-y-2">
                {dashboard.actions.map((action) => <p key={action.message} className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">{action.message}</p>)}
                {dashboard.actions.length === 0 && <p className="text-sm text-slate-500">Sin acciones pendientes.</p>}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <h2 className="font-semibold">Proveedores destacados</h2>
              <div className="mt-3 space-y-2">
                {dashboard.topSuppliers.map((supplier) => <div key={supplier.supplierId} className="flex justify-between text-sm"><span>{supplier.supplier}</span><span className="font-bold">{supplier.averageScore} ⭐</span></div>)}
                {dashboard.topSuppliers.length === 0 && <p className="text-sm text-slate-500">Sin evaluaciones registradas.</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {!loading && tab === 'replenishment' && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-800/20 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={suggestionQuery}
                  onChange={(event) => setSuggestionQuery(event.target.value)}
                  placeholder="Buscar producto o proveedor..."
                  className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-10 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
                />
                {suggestionQuery && (
                  <button type="button" onClick={() => setSuggestionQuery('')} className="absolute inset-y-0 right-2 my-auto flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Limpiar búsqueda">
                    <X size={14} />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">{visibleSuggestions.length} sugerencia(s)</span>
                {canEdit && <button onClick={() => setPolicyOpen(true)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold dark:border-slate-700">Configurar política</button>}
                {canCreate && <button onClick={requestFromSuggestions} className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white"><Plus size={14} /> Solicitud</button>}
              </div>
            </div>
            <ResponsiveTable columns={suggestionColumns} rows={visibleSuggestions} keyField={(item) => item.productId} emptyMessage="No hay productos que reponer." pageSize={10} itemLabel="sugerencias" />
          </div>
          {policies.length > 0 && <p className="text-xs text-slate-500">{policies.length} política(s) activa(s).</p>}
        </div>
      )}

      {!loading && tab === 'planning' && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-800/20 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input value={planQuery} onChange={(event) => setPlanQuery(event.target.value)} placeholder="Buscar plan, período o estado..." className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-10 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100" />
                {planQuery && <button type="button" onClick={() => setPlanQuery('')} className="absolute inset-y-0 right-2 my-auto flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Limpiar búsqueda"><X size={14} /></button>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {['TODOS', ...planStatuses].map((status) => (
                  <button key={status} type="button" onClick={() => setPlanStatus(status)} className={cn('rounded-full px-3 py-1.5 text-xs font-semibold transition', planStatus === status ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20 dark:bg-blue-500 dark:text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300')}>
                    {status === 'TODOS' ? 'Todos' : status}
                  </button>
                ))}
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">{visiblePlans.length} plan(es)</span>
              </div>
            </div>
            <ResponsiveTable columns={planColumns} rows={visiblePlans} keyField={(plan) => plan.id} emptyMessage="No hay planes de compra." pageSize={10} itemLabel="planes" />
          </div>
        </div>
      )}

      {!loading && tab === 'forecast' && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-800/20 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold">Pronóstico de demanda · {period}</h2>
                <p className="mt-1 text-sm text-slate-500">La demanda prevista más el stock de seguridad alimenta la generación de planes.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {canEdit && (
                  <button
                    onClick={() => {
                      setForecastForm({ productId: products[0]?.id || 0, forecastQuantity: 0, safetyStock: 0, notes: '' });
                      setForecastOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold dark:border-slate-700"
                  >
                    <Plus size={14} /> Registrar
                  </button>
                )}
                {canEdit && (
                  <button onClick={() => void generatePlanFromForecast()} disabled={saving || forecasts.length === 0} className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
                    <CalendarClock size={14} /> Generar plan
                  </button>
                )}
              </div>
            </div>
            <ResponsiveTable columns={forecastColumns} rows={forecasts} keyField={(item) => item.id} emptyMessage="No hay pronósticos para este período." pageSize={10} itemLabel="pronósticos" />
          </div>
        </div>
      )}

      {!loading && tab === 'requests' && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-800/20 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input value={requestQuery} onChange={(event) => setRequestQuery(event.target.value)} placeholder="Buscar solicitud, estado o nota..." className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-10 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100" />
                {requestQuery && <button type="button" onClick={() => setRequestQuery('')} className="absolute inset-y-0 right-2 my-auto flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Limpiar búsqueda"><X size={14} /></button>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {['TODOS', ...requestStatuses].map((status) => (
                  <button key={status} type="button" onClick={() => setRequestStatus(status)} className={cn('rounded-full px-3 py-1.5 text-xs font-semibold transition', requestStatus === status ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20 dark:bg-blue-500 dark:text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300')}>
                    {status === 'TODOS' ? 'Todas' : status}
                  </button>
                ))}
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">{visibleRequests.length} solicitud(es)</span>
              </div>
            </div>
            <ResponsiveTable columns={requestColumns} rows={visibleRequests} keyField={(request) => request.id} emptyMessage="No hay solicitudes de compra." pageSize={10} itemLabel="solicitudes" />
          </div>
        </div>
      )}

      {!loading && tab === 'payables' && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-800/20">
              {['TODOS', ...payableStatuses].map((status) => (
                <button key={status} type="button" onClick={() => setPayableStatus(status)} className={cn('rounded-full px-3 py-1.5 text-xs font-semibold transition', payableStatus === status ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20 dark:bg-blue-500 dark:text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300')}>
                  {status === 'TODOS' ? 'Todas' : status}
                </button>
              ))}
              <span className="ml-auto rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">{visiblePayables.length} factura(s)</span>
              {canCreate && (
                <button type="button" onClick={openInvoice} className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500">
                  <Plus size={14} /> Nueva factura
                </button>
              )}
            </div>
            <ResponsiveTable columns={payableColumns} rows={visiblePayables} keyField={(item) => item.id} emptyMessage="No hay cuentas por pagar." pageSize={10} itemLabel="facturas" />
          </div>
        </div>
      )}

      {!loading && tab === 'budget' && (
        <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="border-b border-slate-100 bg-gradient-to-r from-blue-50/80 to-indigo-50/60 px-5 py-5 dark:border-slate-800 dark:from-blue-500/10 dark:to-indigo-500/5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm dark:bg-slate-800 dark:text-blue-300">
                  <PieChart size={21} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">Configurar presupuesto</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Define cuánto puedes comprometer en compras durante el período.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-5 p-5">
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium text-slate-700 dark:text-slate-200">Período</span>
                <SelectorFecha mode="month" value={period} onChange={setPeriod} />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm">
                  <span className="mb-1.5 block font-medium text-slate-700 dark:text-slate-200">Límite mensual (S/)</span>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={budgetForm.limitAmount}
                    onChange={(e) => setBudgetForm({ ...budgetForm, limitAmount: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1.5 block font-medium text-slate-700 dark:text-slate-200">Alerta de consumo (%)</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={budgetForm.alertPercentage}
                    onChange={(e) => setBudgetForm({ ...budgetForm, alertPercentage: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
                  />
                </label>
              </div>

              <div>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Alertas rápidas</p>
                <div className="flex gap-2">
                  {[70, 80, 90].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setBudgetForm((current) => ({ ...current, alertPercentage: value }))}
                      className={cn(
                        'rounded-full px-3 py-1.5 text-xs font-semibold transition',
                        budgetForm.alertPercentage === value
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                      )}
                    >
                      {value}%
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-start gap-2.5 rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-xs leading-relaxed text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
                <Info size={15} className="mt-0.5 shrink-0" />
                Se mostrará una alerta cuando el importe comprometido alcance el porcentaje configurado.
              </div>

              <button
                onClick={saveBudgetForm}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:opacity-50"
              >
                <PieChart size={16} /> {saving ? 'Guardando...' : 'Guardar presupuesto'}
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Resumen del período</p>
                <h2 className="mt-1 text-base font-bold capitalize text-slate-900 dark:text-white">{budgetLabel}</h2>
              </div>
              {budget && (
                <span className={cn('rounded-full px-2.5 py-1 text-[10px] font-bold', budgetBadge)}>
                  {budget.status}
                </span>
              )}
            </div>

            {budgetLoading ? (
              <div className="mt-6 h-56 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
            ) : budget ? (
              <div className="mt-6">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Disponible</p>
                    <p className={cn('mt-1 text-3xl font-bold tracking-tight', budget.availableAmount < 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white')}>
                      {money(budget.availableAmount)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Uso</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{budget.percentageUsed}%</p>
                  </div>
                </div>

                <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className={cn('h-full rounded-full transition-all', budgetBar)} style={{ width: `${budgetUsage}%` }} />
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Alerta configurada al {budget.alertPercentage ?? 80}% del límite.
                </p>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Límite</p>
                    <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-100">{money(budget.limitAmount)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Comprometido</p>
                    <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-100">{money(budget.committedAmount)}</p>
                  </div>
                </div>

                {budget.status !== 'DISPONIBLE' && (
                  <div className={cn('mt-4 flex items-start gap-2 rounded-xl p-3 text-xs',
                    budgetTone === 'red'
                      ? 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300'
                      : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300')}>
                    <TrendingUp size={15} className="mt-0.5 shrink-0" />
                    {budgetTone === 'red'
                      ? 'El presupuesto está excedido. Revisa las compras comprometidas.'
                      : 'Estás cerca del límite configurado para este período.'}
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 px-5 py-12 text-center dark:border-slate-700">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
                  <PieChart size={22} />
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Sin presupuesto definido</p>
                <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  Configura un límite mensual para controlar las compras y recibir alertas de consumo.
                </p>
              </div>
            )}
          </section>
        </div>
      )}

      {selectedRequest && (
        <Modal
          title={`Solicitud ${selectedRequest.code}`}
          description="Detalle de líneas e historial de cambios."
          icon={ClipboardList}
          size="lg"
          onClose={() => setSelectedRequest(null)}
          footer={<button onClick={() => setSelectedRequest(null)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">Cerrar</button>}
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn('rounded-full px-2.5 py-1 text-[10px] font-bold',
                selectedRequest.status === 'PENDIENTE' ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
                  : selectedRequest.status === 'APROBADA' ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300'
                    : selectedRequest.status === 'CONVERTIDA' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                      : 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300')}>
                {selectedRequest.status}
              </span>
              <span className="text-xs text-slate-500">{date(selectedRequest.requestedAt)}</span>
            </div>
            {selectedRequest.notes && <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">{selectedRequest.notes}</p>}
            <div>
              <p className="mb-2 text-sm font-semibold">Líneas</p>
              <div className="space-y-2">
                {selectedRequest.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
                    <span>{item.product.name} <span className="text-xs text-slate-500">({item.product.code})</span></span>
                    <span className="font-bold">{item.quantity}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold">Historial</p>
              {requestHistory.length === 0 ? <p className="text-sm text-slate-500">Sin cambios registrados.</p> : (
                <div className="space-y-2">
                  {requestHistory.map((item) => (
                    <div key={item.id} className="rounded-xl border border-slate-200 px-3 py-2 text-xs dark:border-slate-700">
                      <p className="font-semibold">{item.previousStatus || '—'} → {item.newStatus}</p>
                      <p className="mt-1 text-slate-500">{date(item.changedAt)}{item.comment ? ` · ${item.comment}` : ''}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {requestToConvert && (
        <Modal
          title={`Convertir ${requestToConvert.code}`}
          description="Selecciona el proveedor para emitir la orden de compra."
          icon={ShoppingCart}
          onClose={() => setRequestToConvert(null)}
          footer={
            <>
              <button onClick={() => setRequestToConvert(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 dark:border-slate-600 dark:text-slate-300">Cancelar</button>
              <button onClick={confirmConvertRequest} disabled={saving} className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Convertir en orden</button>
            </>
          }
        >
          <div className="space-y-4">
            <AvisoFormulario>
              La solicitud aprobada se convertirá en una orden de compra para el proveedor seleccionado.
            </AvisoFormulario>
            <SeccionFormulario
              title="Proveedor de la orden"
              description="Selecciona a quién se emitirá la orden."
              icon={ShoppingCart}
              contentClassName="sm:grid-cols-1"
            >
              <CampoFormulario label="Proveedor" required>
                <select value={requestSupplierId} onChange={(event) => setRequestSupplierId(Number(event.target.value))} className={estiloCampo}>
                  <option value={0}>Selecciona un proveedor</option>
                  {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.businessName}</option>)}
                </select>
              </CampoFormulario>
            </SeccionFormulario>
            <CajaResumen label="Líneas de la solicitud" value={requestToConvert.items.length} helper={`${requestToConvert.items.reduce((sum, item) => sum + item.quantity, 0)} unidad(es) en total`} />
          </div>
        </Modal>
      )}

      {invoiceOpen && (
        <Modal
          title="Nueva factura de proveedor"
          description="Registra una factura asociada a una orden recibida o parcial."
          icon={Wallet}
          onClose={() => setInvoiceOpen(false)}
          footer={
            <>
              <button onClick={() => setInvoiceOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 dark:border-slate-600 dark:text-slate-300">Cancelar</button>
              <button onClick={saveInvoice} disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Registrar factura</button>
            </>
          }
        >
          <div className="space-y-4">
            <AvisoFormulario>
              Solo se pueden facturar órdenes con recepción total o parcial. El total no debe superar el importe pendiente de la orden.
            </AvisoFormulario>
            <SeccionFormulario
              title="Orden y comprobante"
              description="Vincula la factura con la orden de compra correspondiente."
              icon={Wallet}
            >
              <CampoFormulario label="Orden de compra" required className="sm:col-span-2">
                <select
                  value={invoiceForm.purchaseOrderId}
                  onChange={(event) => {
                    const order = invoiceableOrders.find((item) => item.id === Number(event.target.value));
                    setInvoiceForm({ ...invoiceForm, purchaseOrderId: Number(event.target.value), total: order?.total || 0 });
                  }}
                  className={estiloCampo}
                >
                  <option value={0}>Selecciona una orden recibida</option>
                  {invoiceableOrders.map((order) => <option key={order.id} value={order.id}>{order.code} · {order.supplier?.businessName} · {money(order.total)}</option>)}
                </select>
              </CampoFormulario>
              <CampoFormulario label="Número de factura" required>
                <input value={invoiceForm.number} onChange={(event) => setInvoiceForm({ ...invoiceForm, number: event.target.value })} placeholder="F001-000123" className={estiloCampo} />
              </CampoFormulario>
              <CampoFormulario label="Total (S/)" required hint="Debe ser mayor a cero.">
                <input type="number" min={0} step={0.01} value={invoiceForm.total} onChange={(event) => setInvoiceForm({ ...invoiceForm, total: Number(event.target.value) })} className={estiloCampo} />
              </CampoFormulario>
            </SeccionFormulario>
            <SeccionFormulario
              title="Fechas de la factura"
              description="La fecha de vencimiento no puede ser anterior a la emisión."
              icon={CalendarClock}
              contentClassName="sm:grid-cols-2"
            >
              <CampoFormulario label="Emisión" required>
                <SelectorFecha value={invoiceForm.issueDate} onChange={(value) => setInvoiceForm({ ...invoiceForm, issueDate: value })} />
              </CampoFormulario>
              <CampoFormulario label="Vencimiento" required>
                <SelectorFecha value={invoiceForm.dueDate} min={invoiceForm.issueDate} onChange={(value) => setInvoiceForm({ ...invoiceForm, dueDate: value })} />
              </CampoFormulario>
            </SeccionFormulario>
            <CajaResumen label="Total a registrar" value={money(invoiceForm.total)} helper="Quedará como saldo pendiente en cuentas por pagar." />
            {invoiceableOrders.length === 0 && <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">No hay órdenes recibidas o parciales para facturar.</p>}
          </div>
        </Modal>
      )}

      {forecastOpen && (
        <Modal
          title="Pronóstico de demanda"
          description={`Registra la demanda prevista para ${period}.`}
          icon={TrendingUp}
          onClose={() => setForecastOpen(false)}
          footer={
            <>
              <button onClick={() => setForecastOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 dark:border-slate-600 dark:text-slate-300">Cancelar</button>
              <button onClick={saveForecastForm} disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Guardar pronóstico</button>
            </>
          }
        >
          <div className="space-y-4">
            <AvisoFormulario>
              La demanda prevista y el stock de seguridad se usarán para generar el plan de compra del período.
            </AvisoFormulario>
            <SeccionFormulario
              title="Datos del pronóstico"
              description="Selecciona el producto y registra la demanda esperada."
              icon={TrendingUp}
            >
              <CampoFormulario label="Producto" required className="sm:col-span-2">
                <select value={forecastForm.productId} onChange={(event) => setForecastForm({ ...forecastForm, productId: Number(event.target.value) })} className={estiloCampo}>
                  {products.map((product) => <option key={product.id} value={product.id}>{product.name} · stock {product.currentStock}</option>)}
                </select>
              </CampoFormulario>
              <CampoFormulario label="Demanda prevista" required>
                <input type="number" min={0} value={forecastForm.forecastQuantity} onChange={(event) => setForecastForm({ ...forecastForm, forecastQuantity: Number(event.target.value) })} className={estiloCampo} />
              </CampoFormulario>
              <CampoFormulario label="Stock de seguridad" required>
                <input type="number" min={0} value={forecastForm.safetyStock} onChange={(event) => setForecastForm({ ...forecastForm, safetyStock: Number(event.target.value) })} className={estiloCampo} />
              </CampoFormulario>
              <CampoFormulario label="Notas" className="sm:col-span-2">
                <input value={forecastForm.notes} onChange={(event) => setForecastForm({ ...forecastForm, notes: event.target.value })} placeholder="Campaña, estacionalidad, etc." className={estiloCampo} />
              </CampoFormulario>
            </SeccionFormulario>
          </div>
        </Modal>
      )}

      {policyOpen && (
        <Modal
          title="Configurar política de reposición"
          description="Define cuándo reponer un producto y cuál es su proveedor preferido."
          icon={PackageSearch}
          onClose={() => setPolicyOpen(false)}
          footer={
            <>
              <button onClick={() => setPolicyOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">Cancelar</button>
              <button onClick={savePolicyForm} disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:opacity-50">Guardar política</button>
            </>
          }
        >
          <div className="space-y-4">
            <AvisoFormulario>
              La política se aplicará en las sugerencias de reposición del producto seleccionado.
            </AvisoFormulario>
            <SeccionFormulario
              title="Parámetros de reposición"
              description="Define el punto de reorden y el stock objetivo."
              icon={PackageSearch}
            >
              <CampoFormulario label="Producto" required>
                <select value={policyForm.productId} onChange={(e) => setPolicyForm({ ...policyForm, productId: Number(e.target.value) })} className={estiloCampo}>
                  {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                </select>
              </CampoFormulario>
              <CampoFormulario label="Proveedor preferido">
                <select value={policyForm.supplierId} onChange={(e) => setPolicyForm({ ...policyForm, supplierId: e.target.value })} className={estiloCampo}>
                  <option value="">Sin preferencia</option>
                  {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.businessName}</option>)}
                </select>
              </CampoFormulario>
              {[['reorderPoint', 'Punto de reorden'], ['minimumLot', 'Lote mínimo'], ['targetStock', 'Existencias objetivo'], ['leadTimeDays', 'Plazo (días)']].map(([key, label]) => (
                <CampoFormulario key={key} label={label} required>
                  <input type="number" min={0} value={(policyForm as any)[key]} onChange={(e) => setPolicyForm({ ...policyForm, [key]: Number(e.target.value) })} className={estiloCampo} />
                </CampoFormulario>
              ))}
            </SeccionFormulario>
          </div>
        </Modal>
      )}

      {planOpen && (
        <Modal
          title="Nuevo plan de compra"
          description="Genera una línea de planificación para el período seleccionado."
          icon={CalendarClock}
          onClose={() => setPlanOpen(false)}
          footer={
            <>
              <button onClick={() => setPlanOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">Cancelar</button>
              <button onClick={savePlanForm} disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:opacity-50">Crear plan</button>
            </>
          }
        >
          <div className="space-y-4">
            <AvisoFormulario>
              Los campos con <span className="font-bold">*</span> son obligatorios. El plan quedará en estado borrador para su revisión.
            </AvisoFormulario>
            <SeccionFormulario
              title="Datos del plan"
              description="Define el período y la necesidad concreta de abastecimiento."
              icon={CalendarClock}
            >
              <CampoFormulario label="Período" required>
                <SelectorFecha mode="month" value={planForm.period} onChange={(value) => setPlanForm({ ...planForm, period: value })} />
              </CampoFormulario>
              <CampoFormulario label="Producto" required>
                <select value={planForm.productId} onChange={(e) => setPlanForm({ ...planForm, productId: Number(e.target.value) })} className={estiloCampo}>
                  {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                </select>
              </CampoFormulario>
              <CampoFormulario label="Cantidad" required hint="Se sugiere planificar al menos una unidad.">
                <input type="number" min={1} value={planForm.quantity} onChange={(e) => setPlanForm({ ...planForm, quantity: Number(e.target.value) })} className={estiloCampo} />
              </CampoFormulario>
              <CampoFormulario label="Notas" className="sm:col-span-2">
                <input value={planForm.notes} onChange={(e) => setPlanForm({ ...planForm, notes: e.target.value })} placeholder="Motivo o referencia del plan..." className={estiloCampo} />
              </CampoFormulario>
            </SeccionFormulario>
            <CajaResumen label="Unidades a planificar" value={planForm.quantity} helper="Se convertirán en solicitud de compra al aprobar el plan." />
          </div>
        </Modal>
      )}

      {paying && (
        <Modal
          title={`Pagar ${paying.number}`}
          description={`Saldo pendiente: ${money(paying.balance)}`}
          icon={Wallet}
          onClose={() => setPaying(null)}
          footer={
            <>
              <button onClick={() => setPaying(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">Cancelar</button>
              <button onClick={pay} disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:opacity-50">Registrar pago</button>
            </>
          }
        >
          <div className="space-y-4">
            <AvisoFormulario>
              Saldo pendiente de la factura: <span className="font-bold">{money(paying.balance)}</span>. Puedes registrar un pago parcial.
            </AvisoFormulario>
            <SeccionFormulario
              title="Datos del pago"
              description="Registra el importe y el medio utilizado."
              icon={Wallet}
            >
              <CampoFormulario label="Monto" required hint="No puede superar el saldo pendiente.">
                <input type="number" min={0} max={paying.balance} value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: Number(e.target.value) })} className={estiloCampo} />
              </CampoFormulario>
              <CampoFormulario label="Método" required>
                <select value={payForm.method} onChange={(e) => setPayForm({ ...payForm, method: e.target.value })} className={estiloCampo}>
                  <option value="TRANSFER">Transferencia</option>
                  <option value="CARD">Tarjeta</option>
                  <option value="CASH">Efectivo</option>
                </select>
              </CampoFormulario>
              <CampoFormulario label="Referencia" className="sm:col-span-2">
                <input value={payForm.reference} onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })} placeholder="N.º de operación, voucher, etc." className={estiloCampo} />
              </CampoFormulario>
            </SeccionFormulario>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        open={Boolean(confirmPayable)}
        title="Anular factura de proveedor"
        message={confirmPayable ? `¿Anular la factura ${confirmPayable.number}? Esta acción no se puede deshacer.` : undefined}
        confirmLabel="Anular factura"
        busy={saving}
        onCancel={() => setConfirmPayable(null)}
        onConfirm={cancelPayableConfirmed}
      />
    </div>
  );
}
