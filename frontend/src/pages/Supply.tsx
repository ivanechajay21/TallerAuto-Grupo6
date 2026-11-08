import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  ClipboardList,
  DollarSign,
  Plus,
  RefreshCw,
  X,
} from 'lucide-react';
import ResponsiveTable from '../components/ui/ResponsiveTable';
import type { ResponsiveColumn } from '../components/ui/ResponsiveTable';
import { useToast } from '../components/ui/Toast';
import { usePermissions } from '../context/PermissionContext';
import { cn } from '../lib/utils';
import { getAllProducts } from '../services/productService';
import type { Product } from '../services/productService';
import {
  cancelPayable,
  createPlan,
  createPurchaseRequest,
  convertPlan,
  getBudget,
  getPayables,
  getPolicies,
  getPlans,
  getReplenishmentSuggestions,
  getSuppliers,
  getSupplyDashboard,
  payPayable,
  saveBudget,
  savePolicy,
} from '../services/purchasingService';
import type {
  BudgetStatus,
  Payable,
  ReplenishmentSuggestion,
  Supplier,
  SupplyDashboard,
  SupplyPlan,
  SupplyPolicy,
} from '../services/purchasingService';

type Tab = 'dashboard' | 'replenishment' | 'planning' | 'payables' | 'budget';

const money = (value: number) =>
  (value || 0).toLocaleString('es-PE', { style: 'currency', currency: 'PEN' });
const date = (value?: string) => (value ? new Date(value).toLocaleDateString('es-PE') : '—');

export default function Supply() {
  const toast = useToast();
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission('COMPRAS:EDITAR');
  const canApprove = hasPermission('COMPRAS:APROBAR');

  const [tab, setTab] = useState<Tab>('dashboard');
  const [dashboard, setDashboard] = useState<SupplyDashboard | null>(null);
  const [suggestions, setSuggestions] = useState<ReplenishmentSuggestion[]>([]);
  const [policies, setPolicies] = useState<SupplyPolicy[]>([]);
  const [plans, setPlans] = useState<SupplyPlan[]>([]);
  const [payables, setPayables] = useState<Payable[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [budget, setBudget] = useState<BudgetStatus | null>(null);
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [policyForm, setPolicyForm] = useState({ productId: 0, supplierId: '', reorderPoint: 5, minimumLot: 1, targetStock: 10, leadTimeDays: 0 });
  const [planOpen, setPlanOpen] = useState(false);
  const [planForm, setPlanForm] = useState({ period: new Date().toISOString().slice(0, 7), notes: '', productId: 0, quantity: 1 });
  const [paying, setPaying] = useState<Payable | null>(null);
  const [payForm, setPayForm] = useState({ amount: 0, method: 'TRANSFER', reference: '' });
  const [budgetForm, setBudgetForm] = useState({ limitAmount: 0, alertPercentage: 80 });

  const loadAll = async () => {
    setLoading(true);
    try {
      const [board, suggestionList, policyList, planList, payableList, productList, supplierList] = await Promise.all([
        getSupplyDashboard(), getReplenishmentSuggestions(), getPolicies(), getPlans(), getPayables(),
        getAllProducts({ incluirInactivos: false }), getSuppliers(false),
      ]);
      setDashboard(board);
      setSuggestions(suggestionList);
      setPolicies(policyList);
      setPlans(planList);
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
    getBudget(period).then(setBudget).catch(() => setBudget(null));
  }, [period]);

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

  const savePolicyForm = async () => {
    if (!policyForm.productId) return;
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
    }
  };

  const savePlanForm = async () => {
    if (!planForm.productId) return;
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
    }
  };

  const saveBudgetForm = async () => {
    try {
      await saveBudget({ period, limitAmount: budgetForm.limitAmount, alertPercentage: budgetForm.alertPercentage, active: true });
      toast.success('Presupuesto guardado');
      setBudget(await getBudget(period));
    } catch (error: any) {
      toast.error('Error', error?.response?.data?.message || 'No se pudo guardar el presupuesto.');
    }
  };

  const pay = async () => {
    if (!paying) return;
    try {
      await payPayable(paying.id, payForm);
      toast.success('Pago registrado');
      setPaying(null);
      loadAll();
    } catch (error: any) {
      toast.error('Error', error?.response?.data?.message || 'No se pudo registrar el pago.');
    }
  };

  const suggestionColumns: ResponsiveColumn<ReplenishmentSuggestion>[] = [
    { key: 'product', header: 'Producto', render: (item) => <div><p className="font-semibold">{item.name}</p><p className="text-xs text-slate-500">{item.code}</p></div> },
    { key: 'stock', header: 'Stock', render: (item) => <span>{item.currentStock} / mín. {item.minStock}</span> },
    { key: 'quantity', header: 'Sugerido', render: (item) => <span className="font-bold text-blue-700 dark:text-blue-300">{item.suggestedQuantity}</span> },
    { key: 'policy', header: 'Política', render: (item) => <span className="text-xs">{item.policyApplied ? `Sí · plazo ${item.leadTimeDays} días` : 'Básica'}</span> },
    { key: 'supplier', header: 'Proveedor preferido', hideOnMobile: true, render: (item) => <span className="text-xs">{item.preferredSupplier || '—'}</span> },
  ];

  const planColumns: ResponsiveColumn<SupplyPlan>[] = [
    { key: 'code', header: 'Plan', render: (plan) => <div><p className="font-mono text-xs font-bold">{plan.code}</p><p className="text-xs text-slate-500">{plan.period}</p></div> },
    { key: 'status', header: 'Estado', render: (plan) => <span className="text-xs">{plan.status}</span> },
    { key: 'items', header: 'Líneas', render: (plan) => <span>{plan.items.length}</span> },
    { key: 'actions', header: '', className: 'text-right', render: (plan) => canApprove && plan.status === 'BORRADOR' ? (
      <button onClick={async () => {
        try { await convertPlan(plan.id); toast.success('Solicitud generada'); loadAll(); }
        catch (error: any) { toast.error('Error', error?.response?.data?.message || 'No se pudo convertir el plan.'); }
      }} className="rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-bold text-white">Convertir</button>
    ) : null },
  ];

  const payableColumns: ResponsiveColumn<Payable>[] = [
    { key: 'number', header: 'Factura', render: (item) => <div><p className="font-mono text-xs font-bold">{item.number}</p><p className="text-xs text-slate-500">{item.purchaseOrder?.code}</p></div> },
    { key: 'due', header: 'Vence', render: (item) => <span className="text-xs">{date(item.dueDate)}</span> },
    { key: 'balance', header: 'Saldo', render: (item) => <span className="font-semibold">{money(item.balance)}</span> },
    { key: 'status', header: 'Estado', render: (item) => <span className="text-xs font-bold">{item.status}</span> },
    { key: 'actions', header: '', className: 'text-right', render: (item) => (
      <div className="flex justify-end gap-1">
        {canApprove && ['PENDIENTE', 'PARCIAL'].includes(item.status) && (
          <button onClick={() => { setPaying(item); setPayForm({ amount: item.balance, method: 'TRANSFER', reference: '' }); }}
            className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white">Pagar</button>
        )}
        {canApprove && item.status !== 'ANULADA' && item.status !== 'PAGADA' && (
          <button onClick={async () => {
            try { await cancelPayable(item.id); toast.success('Factura anulada'); loadAll(); }
            catch (error: any) { toast.error('Error', error?.response?.data?.message || 'No se pudo anular.'); }
          }} className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-bold text-red-600">Anular</button>
        )}
      </div>
    ) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Abastecimiento</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Reposición, planificación, presupuesto y cuentas por pagar.</p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-700">
        {[
          ['dashboard', 'Tablero'], ['replenishment', 'Reposición'], ['planning', 'Planificación'],
          ['payables', 'Cuentas por pagar'], ['budget', 'Presupuesto'],
        ].map(([value, label]) => (
          <button key={value} onClick={() => setTab(value as Tab)}
            className={cn('border-b-2 px-4 py-3 text-sm font-semibold',
              tab === value ? 'border-blue-600 text-blue-700 dark:text-blue-300' : 'border-transparent text-slate-500')}>
            {label}
          </button>
        ))}
      </div>

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
              <h2 className="font-semibold">Top proveedores</h2>
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
          <div className="flex flex-wrap justify-end gap-2">
            {canEdit && <button onClick={() => setPolicyOpen(true)} className="rounded-xl border px-4 py-2 text-sm font-semibold dark:border-slate-600">Configurar política</button>}
            {canEdit && <button onClick={requestFromSuggestions} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"><Plus size={16} /> Solicitud desde sugerencias</button>}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
            <ResponsiveTable columns={suggestionColumns} rows={suggestions} keyField={(item) => item.productId} emptyMessage="No hay productos que reponer." pageSize={10} itemLabel="sugerencias" />
          </div>
          {policies.length > 0 && <p className="text-xs text-slate-500">{policies.length} política(s) activa(s).</p>}
        </div>
      )}

      {!loading && tab === 'planning' && (
        <div className="space-y-4">
          {canEdit && <div className="flex justify-end"><button onClick={() => setPlanOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"><Plus size={16} /> Nuevo plan</button></div>}
          <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
            <ResponsiveTable columns={planColumns} rows={plans} keyField={(plan) => plan.id} emptyMessage="No hay planes de compra." pageSize={10} itemLabel="planes" />
          </div>
        </div>
      )}

      {!loading && tab === 'payables' && (
        <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          <ResponsiveTable columns={payableColumns} rows={payables} keyField={(item) => item.id} emptyMessage="No hay cuentas por pagar." pageSize={10} itemLabel="facturas" />
        </div>
      )}

      {!loading && tab === 'budget' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
            <h2 className="font-semibold">Consultar / configurar presupuesto</h2>
            <label className="mt-4 block text-sm">Período<input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 dark:border-slate-600 dark:bg-slate-950" /></label>
            {budget && <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800">
              <p>Límite: <strong>{money(budget.limitAmount)}</strong></p>
              <p>Comprometido: <strong>{money(budget.committedAmount)}</strong></p>
              <p>Disponible: <strong>{money(budget.availableAmount)}</strong></p>
              <p>Uso: <strong>{budget.percentageUsed}% · {budget.status}</strong></p>
            </div>}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-sm">Límite<input type="number" value={budgetForm.limitAmount} onChange={(e) => setBudgetForm({ ...budgetForm, limitAmount: Number(e.target.value) })} className="mt-1 w-full rounded-xl border px-3 py-2 dark:border-slate-600 dark:bg-slate-950" /></label>
              <label className="text-sm">Alerta (%)<input type="number" value={budgetForm.alertPercentage} onChange={(e) => setBudgetForm({ ...budgetForm, alertPercentage: Number(e.target.value) })} className="mt-1 w-full rounded-xl border px-3 py-2 dark:border-slate-600 dark:bg-slate-950" /></label>
            </div>
            <button onClick={saveBudgetForm} className="mt-4 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">Guardar presupuesto</button>
          </div>
        </div>
      )}

      {policyOpen && <Modal title="Configurar política de reposición" onClose={() => setPolicyOpen(false)}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">Producto<select value={policyForm.productId} onChange={(e) => setPolicyForm({ ...policyForm, productId: Number(e.target.value) })} className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-slate-600 dark:bg-slate-950">{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
          <label className="text-sm">Proveedor preferido<select value={policyForm.supplierId} onChange={(e) => setPolicyForm({ ...policyForm, supplierId: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-slate-600 dark:bg-slate-950"><option value="">Sin preferencia</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.businessName}</option>)}</select></label>
          {[['reorderPoint', 'Punto de reorden'], ['minimumLot', 'Lote mínimo'], ['targetStock', 'Stock objetivo'], ['leadTimeDays', 'Plazo (días)']].map(([key, label]) => <label key={key} className="text-sm">{label}<input type="number" value={(policyForm as any)[key]} onChange={(e) => setPolicyForm({ ...policyForm, [key]: Number(e.target.value) })} className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-slate-600 dark:bg-slate-950" /></label>)}
        </div>
        <div className="mt-4 flex justify-end gap-3"><button onClick={() => setPolicyOpen(false)} className="rounded-xl border px-4 py-2.5 text-sm dark:border-slate-600">Cancelar</button><button onClick={savePolicyForm} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white">Guardar</button></div>
      </Modal>}

      {planOpen && <Modal title="Nuevo plan de compra" onClose={() => setPlanOpen(false)}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">Período<input type="month" value={planForm.period} onChange={(e) => setPlanForm({ ...planForm, period: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-slate-600 dark:bg-slate-950" /></label>
          <label className="text-sm">Producto<select value={planForm.productId} onChange={(e) => setPlanForm({ ...planForm, productId: Number(e.target.value) })} className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-slate-600 dark:bg-slate-950">{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
          <label className="text-sm">Cantidad<input type="number" min={1} value={planForm.quantity} onChange={(e) => setPlanForm({ ...planForm, quantity: Number(e.target.value) })} className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-slate-600 dark:bg-slate-950" /></label>
          <label className="text-sm">Notas<input value={planForm.notes} onChange={(e) => setPlanForm({ ...planForm, notes: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-slate-600 dark:bg-slate-950" /></label>
        </div>
        <div className="mt-4 flex justify-end gap-3"><button onClick={() => setPlanOpen(false)} className="rounded-xl border px-4 py-2.5 text-sm dark:border-slate-600">Cancelar</button><button onClick={savePlanForm} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white">Crear plan</button></div>
      </Modal>}

      {paying && <Modal title={`Pagar ${paying.number}`} onClose={() => setPaying(null)}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">Monto<input type="number" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: Number(e.target.value) })} className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-slate-600 dark:bg-slate-950" /></label>
          <label className="text-sm">Método<select value={payForm.method} onChange={(e) => setPayForm({ ...payForm, method: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-slate-600 dark:bg-slate-950"><option value="TRANSFER">Transferencia</option><option value="CARD">Tarjeta</option><option value="CASH">Efectivo</option></select></label>
          <label className="text-sm sm:col-span-2">Referencia<input value={payForm.reference} onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 dark:border-slate-600 dark:bg-slate-950" /></label>
        </div>
        <div className="mt-4 flex justify-end gap-3"><button onClick={() => setPaying(null)} className="rounded-xl border px-4 py-2.5 text-sm dark:border-slate-600">Cancelar</button><button onClick={pay} className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white">Registrar pago</button></div>
      </Modal>}
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true"><div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900"><div className="mb-5 flex items-start justify-between"><h2 className="text-lg font-bold">{title}</h2><button onClick={onClose} className="rounded-lg p-1.5 text-slate-500" aria-label="Cerrar"><X size={18} /></button></div>{children}</div></div>;
}
