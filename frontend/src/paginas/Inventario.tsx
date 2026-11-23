import { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Plus,
  Package,
  ArrowDownToLine,
  ArrowUpToLine,
  AlertTriangle,
  Pencil,
  Trash2,
  History,
  Save,
  Filter,
  XCircle,
  Tag,
  PackagePlus,
  Boxes,
} from 'lucide-react';
import ResponsiveTable from '../componentes/interfaz/TablaAdaptable';
import type { ResponsiveColumn } from '../componentes/interfaz/TablaAdaptable';
import Pagination from '../componentes/interfaz/Paginacion';
import { cn } from '../lib/utilidades';
import { useToast } from '../componentes/interfaz/Avisos';
import Modal from '../componentes/interfaz/Modal';
import ConfirmDialog from '../componentes/interfaz/DialogoConfirmacion';
import EncabezadoModulo from '../componentes/interfaz/EncabezadoModulo';
import { CampoFormulario, SeccionFormulario, estiloCampo } from '../componentes/interfaz/Formulario';
import TarjetaMetrica from '../componentes/interfaz/TarjetaMetrica';
import { usePermissions } from '../contexto/ContextoPermisos';
import {
  getPaginatedProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  adjustStock,
  getProductTransactions,
} from '../servicios/productosServicio';
import type { Product, ProductPayload, InventoryTransactionInfo, ProductStockFilter, ProductSummary } from '../servicios/productosServicio';

function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn('h-3.5 w-3.5 animate-spin', className)} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

const formatMoney = (n?: number) =>
  `S/ ${(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatMovementDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })} · ${date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`;
};

interface ProductForm {
  code: string;
  name: string;
  description: string;
  brand: string;
  category: string;
  purchasePrice: string;
  salePrice: string;
  currentStock: string;
  minStock: string;
  active: boolean;
}

const emptyForm = (): ProductForm => ({
  code: '',
  name: '',
  description: '',
  brand: '',
  category: '',
  purchasePrice: '',
  salePrice: '',
  currentStock: '0',
  minStock: '5',
  active: true,
});

const EMPTY_SUMMARY: ProductSummary = {
  total: 0,
  lowStock: 0,
  outOfStock: 0,
  inactive: 0,
  value: 0,
};

export default function Inventory() {
  const toast = useToast();
  const { hasPermission, hasAny } = usePermissions();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [stockFilter, setStockFilter] = useState<ProductStockFilter>('TODOS');
  const [categoryFilter, setCategoryFilter] = useState('TODAS');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [summary, setSummary] = useState<ProductSummary>(EMPTY_SUMMARY);
  const [categories, setCategories] = useState<string[]>([]);
  const [reloadKey, setReloadKey] = useState(0);

  // Crear / editar producto
  const [formOpen, setFormOpen] = useState<'create' | 'edit' | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [initialForm, setInitialForm] = useState<ProductForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  // Confirmación para no perder datos al cerrar un modal con cambios sin guardar.
  const [discard, setDiscard] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    action: () => void;
  } | null>(null);

  // Movimiento de stock
  const [deactivateTarget, setDeactivateTarget] = useState<Product | null>(null);
  const [deactivating, setDeactivating] = useState(false);
  const [stockProduct, setStockProduct] = useState<Product | null>(null);
  const [stockType, setStockType] = useState<'IN' | 'OUT'>('IN');
  const [quantity, setQuantity] = useState('');
  const [reference, setReference] = useState('');
  const [savingStock, setSavingStock] = useState(false);

  // Historial
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
  const [transactions, setTransactions] = useState<InventoryTransactionInfo[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<'TODOS' | 'IN' | 'OUT'>('TODOS');

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await getPaginatedProducts({
          page: page - 1,
          size: 10,
          incluirInactivos: showInactive,
          search,
          category: categoryFilter,
          stock: stockFilter,
        });
        if (response.totalPages > 0 && page > response.totalPages) {
          setPage(response.totalPages);
          return;
        }
        setProducts(response.content);
        setTotalPages(response.totalPages);
        setTotalElements(response.totalElements);
        setSummary(response.summary ?? EMPTY_SUMMARY);
        setCategories(response.categories ?? []);
      } catch {
        toast.error('Error', 'No se pudieron cargar los productos.');
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, showInactive, search, categoryFilter, stockFilter, reloadKey]);

  const refresh = () => setReloadKey((value) => value + 1);
  const stats = summary;

  const activeFilterCount = (search ? 1 : 0) + (stockFilter !== 'TODOS' ? 1 : 0) + (categoryFilter !== 'TODAS' ? 1 : 0);

  const applyStockFilter = (filter: ProductStockFilter) => {
    setStockFilter(filter);
    setPage(1);
    if (filter === 'INACTIVO' && !showInactive) setShowInactive(true);
  };

  const canCreate = hasPermission('PRODUCTOS:CREAR');
  const canEdit = hasPermission('PRODUCTOS:EDITAR');
  const canDelete = hasPermission('PRODUCTOS:ELIMINAR');
  const canMove = hasAny(['MOVIMIENTOS:CREAR', 'PRODUCTOS:EDITAR']);
  const canSeeHistory = hasPermission('MOVIMIENTOS:VER');

  const openCreate = () => {
    setEditingProduct(null);
    const base = emptyForm();
    setForm(base);
    setInitialForm(base);
    setFormOpen('create');
  };

  const openEdit = (p: Product) => {
    setEditingProduct(p);
    const base: ProductForm = {
      code: p.code,
      name: p.name,
      description: p.description || '',
      brand: p.brand || '',
      category: p.category || '',
      purchasePrice: String(p.purchasePrice ?? ''),
      salePrice: String(p.salePrice ?? ''),
      currentStock: String(p.currentStock ?? '0'),
      minStock: String(p.minStock ?? '5'),
      active: p.active,
    };
    setForm(base);
    setInitialForm(base);
    setFormOpen('edit');
  };

  const closeForm = () => {
    setFormOpen(null);
    setEditingProduct(null);
  };

  // Solo cierra si no hay cambios; si los hay, pide confirmación.
  const requestCloseForm = () => {
    if (JSON.stringify(form) !== JSON.stringify(initialForm)) {
      setDiscard({
        title: '¿Descartar cambios?',
        message: 'Se perderán los datos del producto que ingresaste.',
        confirmLabel: 'Descartar',
        action: closeForm,
      });
    } else {
      closeForm();
    }
  };

  const requestCloseMovement = () => {
    if (quantity.trim() !== '' || reference.trim() !== '') {
      setDiscard({
        title: '¿Descartar movimiento?',
        message: 'Se perderá el movimiento de existencias que ingresaste.',
        confirmLabel: 'Descartar',
        action: () => setStockProduct(null),
      });
    } else {
      setStockProduct(null);
    }
  };

  const saveProduct = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      toast.error('Validación', 'El código y el nombre son obligatorios.');
      return;
    }
    const purchase = Number(form.purchasePrice);
    const sale = Number(form.salePrice);
    if (Number.isNaN(purchase) || purchase < 0) {
      toast.error('Validación', 'Ingresa un precio de compra válido (≥ 0).');
      return;
    }
    if (Number.isNaN(sale) || sale <= 0) {
      toast.error('Validación', 'Ingresa un precio de venta válido (> 0).');
      return;
    }
    setSaving(true);
    try {
      const payload: ProductPayload = {
        code: form.code.trim(),
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        brand: form.brand.trim() || undefined,
        category: form.category.trim() || undefined,
        purchasePrice: purchase,
        salePrice: sale,
        minStock: Number(form.minStock) || 0,
        active: form.active,
      };
      if (formOpen === 'create') {
        payload.currentStock = Number(form.currentStock) || 0;
        payload.active = true;
        await createProduct(payload);
        toast.success('Producto creado', `«${form.name.trim()}» se registró en el inventario.`);
        setPage(1);
      } else if (editingProduct) {
        await updateProduct(editingProduct.id, payload);
        toast.success('Producto actualizado', `«${form.name.trim()}» se actualizó correctamente.`);
      }
      closeForm();
      await refresh();
    } catch (err: any) {
      toast.error('Error', err?.response?.data?.message || 'No se pudo guardar el producto.');
    } finally {
      setSaving(false);
    }
  };

  const openMovement = (p: Product, type: 'IN' | 'OUT') => {
    setStockProduct(p);
    setStockType(type);
    setQuantity('');
    setReference('');
  };

  const saveMovement = async () => {
    if (!stockProduct) return;
    const qty = Number(quantity);
    if (!qty || qty < 1) {
      toast.error('Validación', 'La cantidad debe ser mayor a 0.');
      return;
    }
    setSavingStock(true);
    try {
      await adjustStock(stockProduct.id, {
        quantity: qty,
        type: stockType,
        reference: reference.trim() || undefined,
      });
      toast.success(
        'Movimiento registrado',
        `${stockType === 'IN' ? 'Entrada' : 'Salida'} de ${qty} unidad(es) de «${stockProduct.name}».`
      );
      setStockProduct(null);
      await refresh();
    } catch (err: any) {
      toast.error('Error', err?.response?.data?.message || 'No se pudo registrar el movimiento.');
    } finally {
      setSavingStock(false);
    }
  };

  const removeProduct = async () => {
    if (!deactivateTarget) return;
    setDeactivating(true);
    try {
      await deleteProduct(deactivateTarget.id);
      toast.success('Producto desactivado', `«${deactivateTarget.name}» ya no aparece en el inventario activo.`);
      setDeactivateTarget(null);
      await refresh();
    } catch (err: any) {
      toast.error('Error', err?.response?.data?.message || 'No se pudo desactivar el producto.');
    } finally {
      setDeactivating(false);
    }
  };

  const openHistory = async (p: Product) => {
    setHistoryProduct(p);
    setHistoryFilter('TODOS');
    setTransactions([]);
    setLoadingHistory(true);
    try {
      setTransactions(await getProductTransactions(p.id));
    } catch {
      toast.error('Error', 'No se pudo cargar el historial de movimientos.');
    } finally {
      setLoadingHistory(false);
    }
  };

  const historySummary = useMemo(() => {
    const entradas = transactions.filter((movimiento) => movimiento.type === 'IN');
    const salidas = transactions.filter((movimiento) => movimiento.type === 'OUT');
    const totalEntradas = entradas.reduce((total, movimiento) => total + movimiento.quantity, 0);
    const totalSalidas = salidas.reduce((total, movimiento) => total + movimiento.quantity, 0);
    return {
      totalEntradas,
      totalSalidas,
      saldo: totalEntradas - totalSalidas,
      entradas: entradas.length,
      salidas: salidas.length,
      movimientos: transactions.length,
    };
  }, [transactions]);

  const visibleTransactions = useMemo(() => {
    const ordenadas = [...transactions].sort(
      (a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()
    );
    return historyFilter === 'TODOS'
      ? ordenadas
      : ordenadas.filter((movimiento) => movimiento.type === historyFilter);
  }, [transactions, historyFilter]);

  const historyStock = useMemo(() => {
    const stock = historyProduct?.currentStock ?? 0;
    const minStock = historyProduct?.minStock ?? 0;
    if (stock <= 0) {
      return {
        label: 'Agotado',
        className: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/15 dark:text-red-300',
        dot: 'bg-red-500',
      };
    }
    if (stock <= minStock) {
      return {
        label: 'Stock bajo',
        className: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/15 dark:text-amber-300',
        dot: 'bg-amber-500',
      };
    }
    return {
      label: 'Disponible',
      className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/15 dark:text-emerald-300',
      dot: 'bg-emerald-500',
    };
  }, [historyProduct]);

  const columns: ResponsiveColumn<Product>[] = [
    {
      key: 'product',
      header: 'Código / Producto',
      render: (p) => (
        <div className="flex items-center">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400">
            <Package className="h-5 w-5" />
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-slate-900 dark:text-white">{p.name}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{p.code}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'brand',
      header: 'Marca / Categoría',
      render: (p) => (
        <div className="text-xs text-slate-500 dark:text-slate-400">
          <p className="font-medium text-slate-600 dark:text-slate-300">{p.brand || '—'}</p>
          {p.category && (
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <Tag size={9} /> {p.category}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'stock',
      header: 'Existencias',
      render: (p) => {
        const low = p.currentStock > 0 && p.currentStock <= p.minStock;
        const out = p.currentStock <= 0;
        const health = p.minStock > 0
          ? Math.min(100, Math.round((p.currentStock / (p.minStock * 2)) * 100))
          : p.currentStock > 0 ? 100 : 0;
        return (
          <div className="w-32">
            <div className="flex items-center justify-between gap-2">
              <span className={cn('text-sm font-bold', out ? 'text-red-600' : low ? 'text-amber-600' : 'text-slate-900 dark:text-white')}>
                {p.currentStock} <span className="text-[10px] font-normal text-slate-400">unid.</span>
              </span>
              {(out || low) && <AlertTriangle className={cn('h-3.5 w-3.5', out ? 'text-red-500' : 'text-amber-500')} />}
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className={cn('h-full rounded-full transition-all', out ? 'bg-red-500' : low ? 'bg-amber-500' : 'bg-emerald-500')}
                style={{ width: `${health}%` }}
              />
            </div>
            <p className="mt-1 text-[10px] text-slate-400">mín. {p.minStock}</p>
          </div>
        );
      },
    },
    {
      key: 'purchase',
      header: 'P. compra',
      hideOnMobile: true,
      render: (p) => <span className="text-sm text-slate-600 dark:text-slate-300">{formatMoney(p.purchasePrice)}</span>,
    },
    {
      key: 'sale',
      header: 'P. venta',
      render: (p) => <span className="text-sm font-medium text-slate-900 dark:text-white">{formatMoney(p.salePrice)}</span>,
    },
    {
      key: 'value',
      header: 'Valor inv.',
      hideOnMobile: true,
      render: (p) => <span className="text-sm text-emerald-600 dark:text-emerald-400">{formatMoney(p.salePrice * p.currentStock)}</span>,
    },
    {
      key: 'state',
      header: 'Estado',
      hideOnMobile: true,
      render: (p) => {
        const out = p.currentStock <= 0;
        const low = p.currentStock > 0 && p.currentStock <= p.minStock;
        return (
          <div className="flex flex-col items-start gap-1">
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                p.active
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
              )}
            >
              {p.active ? 'Activo' : 'Inactivo'}
            </span>
            <span className={cn('text-[10px] font-medium', out ? 'text-red-500' : low ? 'text-amber-600' : 'text-slate-400')}>
              {out ? 'Agotado' : low ? 'Reponer' : 'Disponible'}
            </span>
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (p) => (
        <div className="flex justify-end gap-1.5">
          {canMove && (
            <button
              onClick={() => openMovement(p, 'IN')}
              title="Ingreso de existencias"
              className="rounded-lg bg-emerald-50 p-1.5 text-emerald-600 transition hover:bg-emerald-100 dark:bg-emerald-500/20 dark:text-emerald-400"
            >
              <ArrowDownToLine size={14} />
            </button>
          )}
          {canMove && (
            <button
              onClick={() => openMovement(p, 'OUT')}
              title="Salida de existencias"
              className="rounded-lg bg-amber-50 p-1.5 text-amber-600 transition hover:bg-amber-100 dark:bg-amber-500/20 dark:text-amber-400"
            >
              <ArrowUpToLine size={14} />
            </button>
          )}
          {canSeeHistory && (
            <button
              onClick={() => openHistory(p)}
              title="Historial de movimientos"
              className="rounded-lg bg-slate-100 p-1.5 text-slate-500 transition hover:bg-slate-200 hover:text-blue-600 dark:bg-slate-800 dark:text-slate-300"
            >
              <History size={14} />
            </button>
          )}
          {canEdit && (
            <button
              onClick={() => openEdit(p)}
              title="Editar producto" aria-label={`Editar ${p.name}`}
              className="rounded-lg bg-slate-100 p-1.5 text-slate-500 transition hover:bg-slate-200 hover:text-blue-600 dark:bg-slate-800 dark:text-slate-300"
            >
              <Pencil size={14} />
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => setDeactivateTarget(p)}
              title="Desactivar producto" aria-label={`Desactivar ${p.name}`}
              className="rounded-lg bg-slate-100 p-1.5 text-slate-500 transition hover:bg-red-100 hover:text-red-600 dark:bg-slate-800 dark:text-slate-300"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      ),
    },
  ];

  const formPurchase = Number(form.purchasePrice) || 0;
  const formSale = Number(form.salePrice) || 0;
  const margin = formPurchase > 0 ? Math.round(((formSale - formPurchase) / formPurchase) * 100) : 0;

  return (
    <div className="space-y-6">
      <EncabezadoModulo
        eyebrow="Inventario y abastecimiento"
        title="Inventario y repuestos"
        description="Control de existencias, precios y reposición de piezas."
        icon={Package}
        actions={(
          <>
            {canMove && (
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/40">
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setShowInactive(checked);
                    setPage(1);
                    if (!checked && stockFilter === 'INACTIVO') setStockFilter('TODOS');
                  }}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-600"
                />
                Ver inactivos
              </label>
            )}
            {canCreate && (
              <button
                onClick={openCreate}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500"
              >
                <Plus size={17} /> Nuevo producto
              </button>
            )}
          </>
        )}
        meta={(
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
            {stats.total} producto(s)
          </span>
        )}
      />

      {(stats.lowStock > 0 || stats.outOfStock > 0) && (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4 dark:border-amber-500/30 dark:from-amber-500/10 dark:to-orange-500/10 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/70 text-amber-600 dark:bg-slate-900/50 dark:text-amber-300">
              <AlertTriangle size={18} />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-900 dark:text-amber-200">Reposición recomendada</p>
              <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-300">
                {stats.outOfStock} agotado(s) y {stats.lowStock} con existencias bajas.
              </p>
            </div>
          </div>
          <button
            onClick={() => applyStockFilter('BAJO')}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-amber-500"
          >
            <Filter size={13} /> Ver críticos
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          { label: 'Productos registrados', value: stats.total, icon: Package, tone: 'blue' },
          { label: 'Existencias bajas', value: stats.lowStock, icon: AlertTriangle, tone: 'amber' },
          { label: 'Productos agotados', value: stats.outOfStock, icon: XCircle, tone: 'red' },
          { label: 'Valor del inventario', value: formatMoney(stats.value), icon: ArrowUpToLine, tone: 'emerald' },
        ].map((stat) => (
          <TarjetaMetrica
            key={stat.label}
            label={stat.label}
            value={stat.value}
            icon={stat.icon}
            tone={stat.tone as 'blue' | 'amber' | 'red' | 'emerald'}
          />
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 dark:border-slate-700 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-md">
            <Search className="pointer-events-none absolute inset-y-0 left-3 my-auto h-4 w-4 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="block w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800/60 dark:text-white dark:placeholder:text-slate-500"
              placeholder="Buscar por código, nombre, marca o categoría..."
            />
          </div>
          <div className="flex items-center gap-2">
            <Tag size={15} className="text-slate-400" />
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              aria-label="Filtrar por categoría"
            >
              <option value="TODAS">Todas las categorías</option>
              {categories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </div>
          <span className="text-sm text-slate-500 sm:ml-auto dark:text-slate-400">{totalElements} producto(s)</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          {[
            { key: 'TODOS' as const, label: 'Todos', count: stats.total, tone: 'slate' },
            { key: 'BAJO' as const, label: 'Existencias bajas', count: stats.lowStock, tone: 'amber' },
            { key: 'AGOTADO' as const, label: 'Agotados', count: stats.outOfStock, tone: 'red' },
            { key: 'INACTIVO' as const, label: 'Inactivos', count: stats.inactive, tone: 'slate' },
          ].map((filter) => (
            <button
              key={filter.key}
              onClick={() => applyStockFilter(filter.key)}
              className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                stockFilter === filter.key
                  ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                  : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800')}
            >
              {filter.tone === 'amber' && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
              {filter.tone === 'red' && <span className="h-1.5 w-1.5 rounded-full bg-red-500" />}
              {filter.label}
              <span className={cn('rounded-full px-1.5 py-0.5 text-[10px]',
                stockFilter === filter.key ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-800')}>
                {filter.count}
              </span>
            </button>
          ))}
          {activeFilterCount > 0 && (
            <button
              onClick={() => {
                setSearch('');
                setCategoryFilter('TODAS');
                setStockFilter('TODOS');
                setPage(1);
              }}
              className="ml-auto rounded-lg px-2 py-1.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-50 dark:hover:bg-blue-500/10"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-slate-400 dark:text-slate-500">
            <Spinner className="mr-2 h-5 w-5" /> Cargando inventario...
          </div>
        ) : (
          <>
            <ResponsiveTable
              columns={columns}
              rows={products}
              keyField={(p) => p.id}
              emptyMessage="No se encontraron productos."
              pageSize={0}
              itemLabel="productos"
            />
            <Pagination
              page={page}
              pageCount={totalPages}
              onChange={setPage}
              total={totalElements}
              from={totalElements === 0 ? 0 : (page - 1) * 10 + 1}
              to={Math.min(totalElements, (page - 1) * 10 + products.length)}
              itemLabel="productos"
            />
          </>
        )}
      </div>

      {/* Modal crear/editar producto */}
      {formOpen && (
        <Modal
          title={formOpen === 'edit' ? 'Editar producto' : 'Nuevo producto'}
          description={formOpen === 'edit' ? 'Actualiza los datos comerciales y existencias del producto.' : 'Registra un repuesto o insumo en el inventario del taller.'}
          icon={PackagePlus}
          size="lg"
          onClose={requestCloseForm}
          footer={
            <>
              <button
                type="button"
                onClick={requestCloseForm}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="product-form"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? <Spinner className="h-4 w-4" /> : <Save size={16} />}
                {formOpen === 'edit' ? 'Guardar cambios' : 'Registrar producto'}
              </button>
            </>
          }
        >
          <form
            id="product-form"
            onSubmit={(event) => {
              event.preventDefault();
              void saveProduct();
            }}
            className="space-y-5"
          >
            <SeccionFormulario
              title="Información del producto"
              description="Identificación, marca y categoría del repuesto o insumo."
              icon={Tag}
            >
              <CampoFormulario label="Código (SKU)" required>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                  disabled={formOpen === 'edit' && !canEdit}
                  placeholder="Ej: ACE-5W30"
                  className={cn(estiloCampo, 'font-mono uppercase')}
                />
              </CampoFormulario>
              <CampoFormulario label="Nombre" required>
                <input
                  type="text"
                  aria-label="Nombre"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ej: Aceite Sintético 5W-30"
                  className={estiloCampo}
                />
              </CampoFormulario>
              <CampoFormulario label="Marca">
                <input
                  type="text"
                  value={form.brand}
                  onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
                  placeholder="Ej: Castrol"
                  className={estiloCampo}
                />
              </CampoFormulario>
              <CampoFormulario label="Categoría">
                <input
                  type="text"
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  placeholder="Ej: Aceites"
                  className={estiloCampo}
                />
              </CampoFormulario>
              <CampoFormulario label="Descripción" className="sm:col-span-2">
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Características, presentación o uso del producto..."
                  className={cn(estiloCampo, 'resize-none')}
                />
              </CampoFormulario>
            </SeccionFormulario>

            <SeccionFormulario
              title="Precios y margen"
              description="Define el costo de compra y el precio de venta."
              icon={Boxes}
            >
              <CampoFormulario label="Precio de compra (S/)">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.purchasePrice}
                  onChange={(e) => setForm((f) => ({ ...f, purchasePrice: e.target.value }))}
                  placeholder="0.00"
                  className={estiloCampo}
                />
              </CampoFormulario>
              <CampoFormulario label="Precio de venta (S/)" required>
                <input
                  type="number"
                  min={0.01}
                  step="0.01"
                  value={form.salePrice}
                  onChange={(e) => setForm((f) => ({ ...f, salePrice: e.target.value }))}
                  placeholder="0.00"
                  className={estiloCampo}
                />
              </CampoFormulario>
              <div className={cn(
                'sm:col-span-2 flex items-center justify-between rounded-xl px-3 py-2.5 text-sm',
                margin >= 0
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                  : 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300'
              )}>
                <span className="font-medium">Margen estimado</span>
                <span className="font-bold">{margin}%</span>
              </div>
            </SeccionFormulario>

            <SeccionFormulario
              title="Existencias"
              description="Stock actual, mínimo de reposición y disponibilidad."
              icon={Package}
            >
              {formOpen === 'create' && (
                <CampoFormulario label="Existencias iniciales">
                  <input
                    type="number"
                    min={0}
                    value={form.currentStock}
                    onChange={(e) => setForm((f) => ({ ...f, currentStock: e.target.value }))}
                    className={estiloCampo}
                  />
                </CampoFormulario>
              )}
              <CampoFormulario label="Existencias mínimas" className={formOpen === 'create' ? '' : 'sm:col-span-2'}>
                <input
                  type="number"
                  min={0}
                  value={form.minStock}
                  onChange={(e) => setForm((f) => ({ ...f, minStock: e.target.value }))}
                  className={estiloCampo}
                />
              </CampoFormulario>
              <div className="sm:col-span-2 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                <AlertTriangle size={14} className="text-amber-500" />
                Se mostrará una alerta cuando las existencias lleguen al mínimo.
              </div>
              {formOpen === 'edit' && (
                <label className="sm:col-span-2 flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white/60 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900/30">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-600"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Producto activo</span>
                    <span className="block text-[11px] text-slate-400 dark:text-slate-500">Disponible para venta y movimientos.</span>
                  </span>
                </label>
              )}
            </SeccionFormulario>
          </form>
        </Modal>
      )}

      {/* Modal movimiento de stock */}
      {stockProduct && (
        <Modal
          title={stockType === 'IN' ? 'Ingreso de existencias' : 'Salida de existencias'}
          description={`${stockProduct.code} · ${stockProduct.name} · Stock actual: ${stockProduct.currentStock}`}
          icon={stockType === 'IN' ? ArrowDownToLine : ArrowUpToLine}
          size="sm"
          onClose={requestCloseMovement}
          footer={(
            <>
              <button
                type="button"
                onClick={requestCloseMovement}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveMovement}
                disabled={savingStock}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition disabled:opacity-50',
                  stockType === 'IN' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-amber-600 hover:bg-amber-500'
                )}
              >
                {savingStock ? <Spinner /> : stockType === 'IN' ? <ArrowDownToLine size={14} /> : <ArrowUpToLine size={14} />}
                Registrar {stockType === 'IN' ? 'entrada' : 'salida'}
              </button>
            </>
          )}
        >
          <SeccionFormulario
            title="Datos del movimiento"
            description="Indica el tipo, la cantidad y una referencia opcional."
            icon={Boxes}
          >
            <CampoFormulario label="Tipo de movimiento" required>
              <select
                value={stockType}
                onChange={(e) => setStockType(e.target.value as 'IN' | 'OUT')}
                className={estiloCampo}
              >
                <option value="IN">Entrada</option>
                <option value="OUT">Salida</option>
              </select>
            </CampoFormulario>
            <CampoFormulario label="Cantidad" required>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className={estiloCampo}
              />
            </CampoFormulario>
            <CampoFormulario label="Referencia" className="sm:col-span-2" hint="Ejemplo: compra a proveedor, OT-000001 o ajuste de inventario.">
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Referencia opcional"
                className={estiloCampo}
              />
            </CampoFormulario>
            <div className="sm:col-span-2 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
              <Package size={14} className="text-blue-500" />
              Stock resultante: <strong>{stockType === 'IN' ? stockProduct.currentStock + (Number(quantity) || 0) : stockProduct.currentStock - (Number(quantity) || 0)}</strong>
            </div>
          </SeccionFormulario>
        </Modal>
      )}

      {/* Modal historial */}
      {historyProduct && (
        <Modal
          title="Movimientos" aria-label={`Ver movimientos de ${historyProduct.name}`}
          description="Entradas y salidas registradas para este producto."
          icon={History}
          size="lg"
          onClose={() => setHistoryProduct(null)}
          footer={
            <button
              type="button"
              onClick={() => setHistoryProduct(null)}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cerrar
            </button>
          }
        >
          <div className="space-y-5">
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-800/30">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:text-blue-300 dark:ring-slate-700">
                <Package size={23} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{historyProduct.name}</p>
                <p className="mt-0.5 font-mono text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                  {historyProduct.code}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <span className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ring-inset',
                  historyStock.className
                )}>
                  <span className={cn('h-1.5 w-1.5 rounded-full', historyStock.dot)} />
                  {historyStock.label}
                </span>
                <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                  {historyProduct.currentStock} disponibles · mín. {historyProduct.minStock}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 dark:border-emerald-500/20 dark:bg-emerald-500/5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700/70 dark:text-emerald-300/70">Entradas</p>
                <p className="mt-1 text-xl font-bold text-emerald-700 dark:text-emerald-300">+{historySummary.totalEntradas}</p>
                <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/60">{historySummary.entradas} movimiento(s)</p>
              </div>
              <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3 dark:border-amber-500/20 dark:bg-amber-500/5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-amber-700/70 dark:text-amber-300/70">Salidas</p>
                <p className="mt-1 text-xl font-bold text-amber-700 dark:text-amber-300">-{historySummary.totalSalidas}</p>
                <p className="text-[10px] text-amber-600/70 dark:text-amber-400/60">{historySummary.salidas} movimiento(s)</p>
              </div>
              <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 dark:border-blue-500/20 dark:bg-blue-500/5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-blue-700/70 dark:text-blue-300/70">Saldo</p>
                <p className="mt-1 text-xl font-bold text-blue-700 dark:text-blue-300">
                  {historySummary.saldo > 0 ? '+' : ''}{historySummary.saldo}
                </p>
                <p className="text-[10px] text-blue-600/70 dark:text-blue-400/60">Entradas - salidas</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-800/30">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Registros</p>
                <p className="mt-1 text-xl font-bold text-slate-700 dark:text-slate-200">{historySummary.movimientos}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">Movimientos totales</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div role="tablist" aria-label="Filtrar movimientos" className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800/50">
                {[
                  { value: 'TODOS' as const, label: 'Todos', count: historySummary.movimientos },
                  { value: 'IN' as const, label: 'Entradas', count: historySummary.entradas },
                  { value: 'OUT' as const, label: 'Salidas', count: historySummary.salidas },
                ].map((filtro) => (
                  <button
                    key={filtro.value}
                    type="button"
                    role="tab"
                    aria-selected={historyFilter === filtro.value}
                    onClick={() => setHistoryFilter(filtro.value)}
                    className={cn(
                      'rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition',
                      historyFilter === filtro.value
                        ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                    )}
                  >
                    {filtro.label}
                    <span className="ml-1 text-[10px] opacity-60">{filtro.count}</span>
                  </button>
                ))}
              </div>
              <span className="text-xs text-slate-400 dark:text-slate-500">
                {visibleTransactions.length} movimiento(s)
              </span>
            </div>

            {loadingHistory ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
                ))}
              </div>
            ) : visibleTransactions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-5 py-10 text-center dark:border-slate-700 dark:bg-slate-800/20">
                <History size={24} className="mx-auto text-slate-300 dark:text-slate-600" />
                <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                  {transactions.length === 0 ? 'Sin movimientos registrados' : 'No hay movimientos con este filtro'}
                </p>
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                  {transactions.length === 0 ? 'Las entradas y salidas del producto aparecerán aquí.' : 'Selecciona otro filtro para ver más registros.'}
                </p>
                {transactions.length > 0 && historyFilter !== 'TODOS' && (
                  <button
                    type="button"
                    onClick={() => setHistoryFilter('TODOS')}
                    className="mt-3 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  >
                    Ver todos los movimientos
                  </button>
                )}
              </div>
            ) : (
              <div className="relative space-y-2.5">
                <span className="absolute bottom-4 left-[19px] top-4 w-px bg-slate-100 dark:bg-slate-800" aria-hidden="true" />
                {visibleTransactions.map((t) => (
                  <article
                    key={t.id}
                    className="relative flex gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-slate-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600"
                  >
                    <span className={cn(
                      'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-4 ring-white dark:ring-slate-900',
                      t.type === 'IN'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
                    )}>
                      {t.type === 'IN' ? <ArrowDownToLine size={15} /> : <ArrowUpToLine size={15} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className={cn(
                          'rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide',
                          t.type === 'IN'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
                        )}>
                          {t.type === 'IN' ? 'Entrada' : 'Salida'}
                        </span>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">x{t.quantity}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">@ {formatMoney(t.unitPrice)}</span>
                        <span className="ml-auto text-[10px] text-slate-400 dark:text-slate-500">
                          {formatMovementDate(t.transactionDate)}
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="truncate">Ref. {t.reference || 'Sin referencia'}</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                          Total {formatMoney(t.quantity * t.unitPrice)}
                        </span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Confirmación para no perder datos sin guardar */}
      <ConfirmDialog
        open={Boolean(deactivateTarget)}
        title="Desactivar producto"
        message={deactivateTarget ? `¿Desactivar «${deactivateTarget.name}»? Puedes volver a activarlo editándolo.` : undefined}
        confirmLabel="Desactivar"
        busy={deactivating}
        busyLabel="Desactivando..."
        danger={false}
        onCancel={() => setDeactivateTarget(null)}
        onConfirm={() => void removeProduct()}
      />

      <ConfirmDialog
        open={discard !== null}
        danger
        title={discard?.title ?? ''}
        message={discard?.message}
        confirmLabel={discard?.confirmLabel ?? 'Descartar'}
        cancelLabel="Seguir editando"
        onConfirm={() => {
          discard?.action();
          setDiscard(null);
        }}
        onCancel={() => setDiscard(null)}
      />
    </div>
  );
}
