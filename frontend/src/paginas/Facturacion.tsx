import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Ban,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  Download,
  FileText,
  Loader2,
  Plus,
  Printer,
  Receipt,
  RefreshCw,
  Search,
  UserRound,
  Wallet,
  X,
} from 'lucide-react';
import { cancelInvoice, getAllInvoices, generateInvoice, payInvoice } from '../servicios/facturacionServicio';
import type { DocumentType, Invoice, InvoiceItem } from '../servicios/facturacionServicio';
import { getAllWorkOrders } from '../servicios/ordenesTrabajoServicio';
import type { WorkOrder } from '../servicios/ordenesTrabajoServicio';
import {
  DEFAULT_ISSUER,
  invoiceDate,
  invoiceDocumentLabel,
  invoiceInitials,
  invoiceKind,
  invoiceMoney,
  invoicePaymentLabel,
  invoiceStatusLabel,
} from '../servicios/formatoFactura';
import { cn } from '../lib/utilidades';
import { useToast } from '../componentes/interfaz/Avisos';
import ConfirmDialog from '../componentes/interfaz/DialogoConfirmacion';
import EncabezadoModulo from '../componentes/interfaz/EncabezadoModulo';
import { CampoFormulario, estiloCampo } from '../componentes/interfaz/Formulario';
import Modal from '../componentes/interfaz/Modal';
import TarjetaMetrica from '../componentes/interfaz/TarjetaMetrica';
import { usePermissions } from '../contexto/ContextoPermisos';
import { useOptionalShopSettings } from '../contexto/ContextoConfiguracion';
import usePagination from '../hooks/usePaginacion';
import Pagination from '../componentes/interfaz/Paginacion';

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Efectivo' },
  { value: 'CARD', label: 'Tarjeta' },
  { value: 'TRANSFER', label: 'Transferencia' },
];

const FILTERS = [
  { value: 'ALL', label: 'Todos' },
  { value: 'PENDING', label: 'Pendientes' },
  { value: 'PAID', label: 'Pagadas' },
  { value: 'CANCELLED', label: 'Anuladas' },
] as const;

type InvoiceFilter = (typeof FILTERS)[number]['value'];

function statusClasses(status: Invoice['status']) {
  if (status === 'PAID') {
    return 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300';
  }
  if (status === 'CANCELLED') {
    return 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300';
  }
  return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300';
}

function typeTone(invoice: Invoice) {
  return invoice.documentType === 'BOLETA'
    ? {
        icon: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
        bar: 'bg-blue-600',
        badge: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300',
      }
    : {
        icon: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
        bar: 'bg-indigo-600',
        badge: 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300',
      };
}

export default function Billing() {
  const toast = useToast();
  const { hasPermission } = usePermissions();
  const shop = useOptionalShopSettings();
  const settings = shop?.settings;
  const canApprove = hasPermission('FACTURAS:APROBAR');
  const canCreate = hasPermission('FACTURAS:CREAR');
  const canCancel = hasPermission('FACTURAS:ELIMINAR');

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceFilter>('ALL');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [paying, setPaying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const detailRef = useRef<HTMLElement | null>(null);

  const [generatingOpen, setGeneratingOpen] = useState(false);
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [newOrderId, setNewOrderId] = useState<number | null>(null);
  const [newDocumentType, setNewDocumentType] = useState<DocumentType>('BOLETA');
  const [generating, setGenerating] = useState(false);

  const issuer = {
    name: settings?.tallerNombre || DEFAULT_ISSUER.name,
    logo: settings?.tallerLogo || '',
    ruc: settings?.tallerRuc || DEFAULT_ISSUER.ruc,
    address: settings?.tallerDireccion || DEFAULT_ISSUER.address,
    phone: settings?.tallerTelefono || DEFAULT_ISSUER.phone,
    email: settings?.tallerCorreo || DEFAULT_ISSUER.email,
  };

  const fetchInvoices = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllInvoices();
      setInvoices(data);
      setSelectedId((current) => current ?? data[0]?.id ?? null);
    } catch {
      setError('No se pudieron cargar los comprobantes. Revisa la conexión e inténtalo de nuevo.');
      toast.error('Error', 'No se pudieron cargar las facturas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    const pending = invoices.filter((invoice) => invoice.status === 'PENDING').length;
    const paid = invoices.filter((invoice) => invoice.status === 'PAID').length;
    const billed = invoices.reduce((sum, invoice) => sum + (invoice.totalAmount || 0), 0);
    return { total: invoices.length, pending, paid, billed };
  }, [invoices]);

  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim();
    return invoices.filter((invoice) => {
      const matchesStatus = statusFilter === 'ALL' || invoice.status === statusFilter;
      const matchesQuery =
        !query ||
        invoice.invoiceNumber.toLowerCase().includes(query) ||
        (invoice.workOrder?.orderNumber || '').toLowerCase().includes(query) ||
        (invoice.customer || '').toLowerCase().includes(query);
      return matchesStatus && matchesQuery;
    });
  }, [invoices, search, statusFilter]);

  const pag = usePagination(filtered, 8);
  const selected = invoices.find((invoice) => invoice.id === selectedId) || null;
  const selectedOrder = orders.find((order) => order.id === newOrderId) || null;
  const selectedDocument = (selectedOrder?.customer?.documentNumber || '').replace(/\D/g, '');
  const selectedDocumentLabel =
    selectedDocument.length === 11 ? 'RUC' : selectedDocument.length === 8 ? 'DNI' : 'Documento no válido';
  const documentIsValid =
    newDocumentType === 'FACTURA' ? selectedDocument.length === 11 : [8, 11].includes(selectedDocument.length);
  const canGenerate = Boolean(selectedOrder) && documentIsValid && !generating;

  const displayItems = useMemo<InvoiceItem[]>(() => {
    if (selected?.items && selected.items.length > 0) return selected.items;
    if (!selected) return [];
    return [
      {
        id: undefined,
        description: 'Servicios de taller',
        quantity: 1,
        unitPrice: selected.subtotal || 0,
        lineTotal: selected.subtotal || 0,
      },
    ];
  }, [selected]);

  const openGenerate = async () => {
    setGeneratingOpen(true);
    setLoadingOrders(true);
    try {
      const all = await getAllWorkOrders();
      const invoiced = new Set(
        invoices
          .map((invoice) => invoice.workOrder?.id)
          .filter((id): id is number => typeof id === 'number')
      );
      const available = all.filter(
        (order) =>
          typeof order.id === 'number' &&
          ['FINALIZADO', 'ENTREGADO'].includes(order.status) &&
          !invoiced.has(order.id)
      );
      setOrders(available);
      setNewOrderId(available[0]?.id ?? null);
      const firstDocument = (available[0]?.customer?.documentNumber || '').replace(/\D/g, '');
      setNewDocumentType(firstDocument.length === 11 ? 'FACTURA' : 'BOLETA');
    } catch {
      toast.error('Error', 'No se pudieron cargar las órdenes de trabajo.');
    } finally {
      setLoadingOrders(false);
    }
  };

  const closeGenerate = () => {
    if (!generating) setGeneratingOpen(false);
  };

  const handleGenerate = async () => {
    if (!newOrderId || !canGenerate) return;
    setGenerating(true);
    try {
      const created = await generateInvoice(newOrderId, newDocumentType);
      setInvoices((prev) => [created, ...prev]);
      setSelectedId(created.id);
      setGeneratingOpen(false);
      toast.success(
        'Comprobante generado',
        `${created.invoiceNumber} · ${created.documentType === 'BOLETA' ? 'Boleta de venta' : 'Factura'}`
      );
    } catch (err: any) {
      toast.error('Error', err?.response?.data?.message || 'No se pudo emitir el comprobante.');
    } finally {
      setGenerating(false);
    }
  };

  const handlePay = async () => {
    if (!selected) return;
    setPaying(true);
    try {
      const updated = await payInvoice(selected.id, paymentMethod);
      setInvoices((prev) => prev.map((invoice) => (invoice.id === selected.id ? updated : invoice)));
      toast.success('Pago registrado', `${updated.invoiceNumber} quedó pagada.`);
    } catch (err: any) {
      toast.error('Error', err?.response?.data?.message || 'No se pudo registrar el pago.');
    } finally {
      setPaying(false);
    }
  };

  const handleCancelInvoice = async () => {
    if (!selected) return;
    setCancelling(true);
    try {
      const updated = await cancelInvoice(selected.id);
      setInvoices((prev) => prev.map((invoice) => (invoice.id === selected.id ? updated : invoice)));
      setConfirmCancel(false);
      toast.success('Comprobante anulado', `${updated.invoiceNumber} quedó anulado.`);
    } catch (err: any) {
      toast.error('Error', err?.response?.data?.message || 'No se pudo anular el comprobante.');
    } finally {
      setCancelling(false);
    }
  };

  const exportPdf = async (autoPrint = false) => {
    if (!selected) return;
    if (autoPrint) setPrinting(true);
    else setDownloadingPdf(true);
    try {
      const { exportInvoicePdf } = await import('../servicios/facturaPdfServicio');
      await exportInvoicePdf(selected, { autoPrint });
    } catch {
      toast.error('Error', 'No se pudo generar el comprobante PDF.');
    } finally {
      setPrinting(false);
      setDownloadingPdf(false);
    }
  };

  const selectInvoice = (id: number) => {
    setSelectedId(id);
    if (window.innerWidth < 1280) {
      window.setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    }
  };

  return (
    <div className="space-y-6">
      <EncabezadoModulo
        eyebrow="Comercial y cobros"
        title="Facturación y cobros"
        description="Emite facturas y boletas, controla el cobro y descarga comprobantes profesionales."
        icon={Receipt}
        actions={canCreate ? (
          <button
            onClick={openGenerate}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500"
          >
            <Plus size={17} />
            Nuevo comprobante
          </button>
        ) : undefined}
        meta={(
          <>
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
              {stats.total} {stats.total === 1 ? 'comprobante' : 'comprobantes'}
            </span>
            {stats.pending > 0 && (
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                {stats.pending} por cobrar
              </span>
            )}
          </>
        )}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <TarjetaMetrica icon={FileText} label="Comprobantes emitidos" value={String(stats.total)} />
        <TarjetaMetrica icon={Wallet} label="Pendientes de cobro" value={String(stats.pending)} tone="amber" />
        <TarjetaMetrica icon={CheckCircle2} label="Comprobantes cobrados" value={String(stats.paid)} tone="emerald" />
        <TarjetaMetrica icon={CircleDollarSign} label="Importe facturado" value={invoiceMoney(stats.billed)} tone="violet" />
      </div>

      {error && !loading && (
        <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-500/30 dark:bg-red-500/10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-red-800 dark:text-red-200">No se pudieron cargar los comprobantes</p>
            <p className="mt-0.5 text-xs text-red-700 dark:text-red-300">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => void fetchInvoices()}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 dark:border-red-500/30 dark:bg-slate-900 dark:text-red-300 dark:hover:bg-red-500/10"
          >
            <RefreshCw size={13} /> Reintentar
          </button>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <aside className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
              placeholder="Buscar número, cliente u orden..."
              aria-label="Buscar comprobante"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((filter) => {
              const count =
                filter.value === 'ALL'
                  ? invoices.length
                  : invoices.filter((invoice) => invoice.status === filter.value).length;
              return (
                <button
                  key={filter.value}
                  onClick={() => {
                    setStatusFilter(filter.value);
                    pag.setPage(1);
                  }}
                  aria-pressed={statusFilter === filter.value}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                    statusFilter === filter.value
                      ? 'border-blue-600 bg-blue-600 text-white shadow-sm shadow-blue-600/20 dark:border-blue-500 dark:bg-blue-500 dark:text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
                  )}
                >
                  {filter.label}
                  <span className="ml-1 opacity-70">{count}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            <span>Comprobantes</span>
            <span>{filtered.length} resultado{filtered.length === 1 ? '' : 's'}</span>
          </div>

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-24 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {pag.pageItems.map((invoice) => {
                const tone = typeTone(invoice);
                return (
                  <button
                    key={invoice.id}
                    onClick={() => selectInvoice(invoice.id)}
                    className={cn(
                      'group w-full rounded-xl border p-3.5 text-left transition',
                      selectedId === invoice.id
                        ? 'border-blue-400 bg-blue-50/60 shadow-sm ring-2 ring-blue-500/10 dark:border-blue-500/60 dark:bg-blue-500/10'
                        : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-500/50'
                    )}
                  >
                    <div className="flex gap-3">
                      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', tone.icon)}>
                        {invoice.documentType === 'BOLETA' ? <Receipt size={18} /> : <FileText size={18} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <span className="truncate font-mono text-xs font-bold text-slate-900 dark:text-white">
                            {invoice.invoiceNumber}
                          </span>
                          <span className={cn('shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold', statusClasses(invoice.status))}>
                            {invoiceStatusLabel(invoice.status)}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-sm font-semibold text-slate-700 dark:text-slate-200">
                          {invoice.customer || '—'}
                        </p>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span className="text-[11px] text-slate-400">{invoiceDate(invoice.issueDate)}</span>
                          <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                            {invoiceMoney(invoice.totalAmount)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className="mt-2 flex items-center justify-end gap-1 text-[10px] font-semibold text-blue-600 opacity-0 transition group-hover:opacity-100 dark:text-blue-400 xl:hidden">
                      Ver comprobante <ArrowUpRight size={11} />
                    </span>
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center dark:border-slate-700">
                  <Receipt className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
                  <p className="mt-3 text-sm font-semibold text-slate-600 dark:text-slate-300">Sin comprobantes</p>
                  <p className="mt-1 text-xs text-slate-400">Prueba con otro filtro o emite uno nuevo.</p>
                </div>
              )}
            </div>
          )}

          <Pagination
            page={pag.page}
            pageCount={pag.pageCount}
            onChange={pag.setPage}
            total={pag.total}
            from={pag.from}
            to={pag.to}
            itemLabel="registros"
          />
        </aside>

        <main ref={detailRef} className="min-w-0 scroll-mt-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <FileText size={17} className="text-slate-400" />
              Vista previa del comprobante
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => void exportPdf(true)}
                disabled={!selected || printing}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                title="Imprimir comprobante"
              >
                {printing ? <Loader2 size={15} className="animate-spin" /> : <Printer size={15} />}
                Imprimir
              </button>
              <button
                onClick={() => void exportPdf(false)}
                disabled={!selected || downloadingPdf}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
                title="Descargar PDF"
              >
                {downloadingPdf ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                {downloadingPdf ? 'Generando...' : 'PDF'}
              </button>
            </div>
          </div>

          {!selected ? (
            <div className="flex min-h-[480px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                <Receipt size={26} />
              </div>
              <h2 className="mt-4 text-lg font-bold text-slate-800 dark:text-slate-100">Sin comprobante seleccionado</h2>
              <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
                {loading ? 'Cargando comprobantes...' : 'Emite un comprobante desde una orden finalizada para verlo aquí.'}
              </p>
            </div>
          ) : (
            <>
              <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-200/50 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/20">
                <div className={cn('h-1.5', typeTone(selected).bar)} />
                <div className="p-5 sm:p-8">
                  <div className="flex flex-col gap-6 border-b border-slate-100 pb-6 dark:border-slate-800 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-2">
                      {issuer.logo ? (
                        <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl p-1.5 shadow-sm', typeTone(selected).bar)}>
                          <img
                            src={issuer.logo}
                            alt={`Logo de ${issuer.name}`}
                            className="h-full w-full object-contain"
                          />
                        </div>
                      ) : (
                        <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-black text-white', typeTone(selected).bar)}>
                          {invoiceInitials(issuer.name)}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{issuer.name}</p>
                        <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Servicio técnico automotriz</p>
                        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                          RUC {issuer.ruc} · {issuer.address}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {issuer.phone} · {issuer.email}
                        </p>
                      </div>
                    </div>
                    <div className="sm:text-right">
                      <span className={cn('inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em]', typeTone(selected).badge)}>
                        {invoiceKind(selected)}
                      </span>
                      <p className="mt-2 font-mono text-sm font-bold text-slate-800 dark:text-slate-100">{selected.invoiceNumber}</p>
                      <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Emitido el {invoiceDate(selected.issueDate)}</p>
                      <span className={cn('mt-2 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold', statusClasses(selected.status))}>
                        {invoiceStatusLabel(selected.status)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                        <UserRound size={13} /> Cliente
                      </div>
                      <p className="mt-2 text-sm font-bold text-slate-800 dark:text-slate-100">{selected.customer || '—'}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {invoiceDocumentLabel(selected)}: {selected.documentNumber || '—'}
                      </p>
                      {selected.customerPhone && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Teléfono: {selected.customerPhone}</p>}
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                        <CalendarDays size={13} /> Referencia
                      </div>
                      <div className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                        <p><span className="font-semibold text-slate-800 dark:text-slate-100">Orden:</span> {selected.workOrder?.orderNumber || '—'}</p>
                        <p><span className="font-semibold text-slate-800 dark:text-slate-100">Vehículo:</span> {selected.vehicle || '—'}</p>
                        <p><span className="font-semibold text-slate-800 dark:text-slate-100">Año:</span> {selected.vehicleYear || '—'}</p>
                        <p><span className="font-semibold text-slate-800 dark:text-slate-100">Emisión:</span> {invoiceDate(selected.issueDate)}</p>
                        <p><span className="font-semibold text-slate-800 dark:text-slate-100">Pago:</span> {invoicePaymentLabel(selected.paymentMethod)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                    <table className="min-w-[560px] w-full text-left">
                      <thead className={cn('text-[10px] font-bold uppercase tracking-[0.12em] text-white', typeTone(selected).bar)}>
                        <tr>
                          <th className="px-4 py-3">Descripción</th>
                          <th className="w-16 px-2 py-3 text-center">Cant.</th>
                          <th className="w-28 px-3 py-3 text-right">P. Unit.</th>
                          <th className="w-28 px-4 py-3 text-right">Importe</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {displayItems.map((item, index) => (
                          <tr key={`${item.id ?? 'item'}-${index}`} className="text-xs text-slate-600 dark:text-slate-300">
                            <td className="px-4 py-3">
                              <p className="font-semibold text-slate-800 dark:text-slate-100">{item.description}</p>
                            </td>
                            <td className="px-2 py-3 text-center tabular-nums">{item.quantity}</td>
                            <td className="px-3 py-3 text-right tabular-nums">{invoiceMoney(item.unitPrice)}</td>
                            <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-800 dark:text-slate-100">{invoiceMoney(item.lineTotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                    <div className="rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                      <p className="font-semibold text-slate-700 dark:text-slate-200">{invoiceStatusLabel(selected.status)}</p>
                      <p className="mt-1">
                        {selected.status === 'PAID'
                          ? `Pagado con ${invoicePaymentLabel(selected.paymentMethod).toLowerCase()}.`
                          : selected.status === 'CANCELLED'
                            ? 'Este comprobante fue anulado.'
                            : 'Pendiente de registro de pago.'}
                      </p>
                    </div>
                    <div className="w-full rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-800/60 sm:w-72">
                      <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span>Subtotal</span>
                        <span>{invoiceMoney(selected.subtotal)}</span>
                      </div>
                      <div className="mt-2 flex justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span>IGV (18%)</span>
                        <span>{invoiceMoney(selected.taxAmount)}</span>
                      </div>
                      <div className="mt-3 flex items-end justify-between border-t border-slate-200 pt-3 dark:border-slate-700">
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100">Total</span>
                        <span className="text-xl font-black text-slate-900 dark:text-white">{invoiceMoney(selected.totalAmount)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-col gap-1 border-t border-slate-100 pt-4 text-[10px] text-slate-400 dark:border-slate-800 dark:text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                    <span>Representación impresa de la {selected.documentType === 'BOLETA' ? 'boleta' : 'factura'} electrónica.</span>
                    <span>Gracias por confiar en {issuer.name}.</span>
                  </div>
                </div>
              </article>

              {selected.status === 'PENDING' && canApprove && (
                <div className="flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-emerald-500/30 dark:bg-emerald-500/10">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                      <CreditCard size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-emerald-900 dark:text-emerald-200">Registrar cobro</p>
                      <p className="text-xs text-emerald-700 dark:text-emerald-300">Marca este comprobante como pagado.</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={paymentMethod}
                      onChange={(event) => setPaymentMethod(event.target.value)}
                      className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none focus:border-emerald-500 dark:border-emerald-500/30 dark:bg-slate-900 dark:text-slate-200"
                      aria-label="Método de pago"
                    >
                      {PAYMENT_METHODS.map((method) => (
                        <option key={method.value} value={method.value}>
                          {method.label}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handlePay}
                      disabled={paying}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50"
                    >
                      {paying ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={15} />}
                      {paying ? 'Registrando...' : 'Registrar pago'}
                    </button>
                  </div>
                </div>
              )}

              {selected.status === 'PENDING' && canCancel && (
                <button
                  onClick={() => setConfirmCancel(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-bold text-red-700 transition hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
                >
                  <Ban size={15} />
                  Anular comprobante
                </button>
              )}

              {selected.status === 'CANCELLED' && (
                <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                  <X size={16} />
                  Este comprobante está anulado y no puede cobrarse.
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {generatingOpen && (
        <Modal
          title="Emitir comprobante"
          description="Elige una orden finalizada y el tipo de comprobante a emitir."
          icon={Receipt}
          size="lg"
          onClose={closeGenerate}
          footer={!loadingOrders && orders.length > 0 ? (
            <>
              <button
                onClick={closeGenerate}
                disabled={generating}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleGenerate}
                disabled={!canGenerate}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {generating ? <Loader2 size={16} className="animate-spin" /> : <ArrowUpRight size={16} />}
                {generating ? 'Emitiendo...' : 'Emitir'}
              </button>
            </>
          ) : undefined}
        >
          {loadingOrders ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500 dark:text-slate-400">
              <Loader2 size={18} className="animate-spin" />
              Cargando órdenes...
            </div>
          ) : orders.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center dark:border-slate-700">
              <Receipt className="mx-auto h-9 w-9 text-slate-300 dark:text-slate-600" />
              <p className="mt-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
                No hay órdenes finalizadas pendientes
              </p>
              <p className="mt-1 text-xs text-slate-400">Finaliza una orden de trabajo para poder emitir su comprobante.</p>
            </div>
          ) : (
            <div className="space-y-5">
              <CampoFormulario label="Orden de trabajo" required>
                <select
                  id="invoice-order"
                  value={newOrderId ?? ''}
                  onChange={(event) => setNewOrderId(Number(event.target.value))}
                  className={estiloCampo}
                >
                  {orders.map((order) => (
                    <option key={order.id} value={order.id}>
                      {order.orderNumber} · {order.customer?.firstName} {order.customer?.lastName}
                    </option>
                  ))}
                </select>
              </CampoFormulario>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Cliente</p>
                  <p className="mt-1.5 text-sm font-bold text-slate-800 dark:text-slate-100">
                    {selectedOrder?.customer?.firstName} {selectedOrder?.customer?.lastName}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {selectedDocumentLabel}: {selectedOrder?.customer?.documentNumber || '—'}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Vehículo</p>
                  <p className="mt-1.5 text-sm font-bold text-slate-800 dark:text-slate-100">
                    {selectedOrder?.vehicle?.plate || '—'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {selectedOrder?.vehicle?.brand} {selectedOrder?.vehicle?.model}
                  </p>
                </div>
              </div>

              <fieldset>
                <legend className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Tipo de comprobante</legend>
                <div className="grid grid-cols-2 gap-3">
                  {(['FACTURA', 'BOLETA'] as const).map((type) => {
                    const active = newDocumentType === type;
                    return (
                      <label
                        key={type}
                        className={cn(
                          'cursor-pointer rounded-xl border p-4 transition focus-within:ring-2 focus-within:ring-blue-500/40',
                          active
                            ? 'border-blue-500 bg-blue-50 text-blue-800 ring-2 ring-blue-500/15 dark:border-blue-500/60 dark:bg-blue-500/10 dark:text-blue-200'
                            : 'border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                        )}
                      >
                        <input
                          type="radio"
                          name="tipoComprobante"
                          value={type}
                          checked={active}
                          onChange={() => setNewDocumentType(type)}
                          className="sr-only"
                        />
                        <div className="flex items-center gap-2">
                          {type === 'FACTURA' ? <FileText size={17} /> : <Receipt size={17} />}
                          <span className="text-sm font-bold">{type === 'FACTURA' ? 'Factura' : 'Boleta'}</span>
                        </div>
                        <p className="mt-1.5 text-xs opacity-75">{type === 'FACTURA' ? 'Requiere RUC de 11 dígitos' : 'Admite DNI o RUC'}</p>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              {!documentIsValid && (
                <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                  {newDocumentType === 'FACTURA'
                    ? 'La factura requiere que el cliente tenga RUC de 11 dígitos. Selecciona Boleta.'
                    : 'La boleta requiere DNI de 8 dígitos o RUC de 11 dígitos.'}
                </div>
              )}
            </div>
          )}
        </Modal>
      )}

      <ConfirmDialog
        open={confirmCancel}
        title="Anular comprobante"
        message={`¿Anular ${selected?.invoiceNumber || 'este comprobante'}? Esta acción no se puede deshacer.`}
        confirmLabel="Anular"
        busy={cancelling}
        busyLabel="Anulando..."
        onCancel={() => setConfirmCancel(false)}
        onConfirm={handleCancelInvoice}
      />
    </div>
  );
}
