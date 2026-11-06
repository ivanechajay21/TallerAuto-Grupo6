import { useEffect, useMemo, useState } from 'react';
import { FileText, Search, CreditCard, Printer, Download, CheckCircle, Plus, X, Loader2 } from 'lucide-react';
import { getAllInvoices, generateInvoice, payInvoice } from '../services/invoiceService';
import type { DocumentType, Invoice } from '../services/invoiceService';
import { getAllWorkOrders } from '../services/workOrderService';
import type { WorkOrder } from '../services/workOrderService';
import { cn } from '../lib/utils';
import { useToast } from '../components/ui/Toast';
import { usePermissions } from '../context/PermissionContext';
import usePagination from '../hooks/usePagination';
import Pagination from '../components/ui/Pagination';

const fmt = (n: number) =>
  (n || 0).toLocaleString('es-ES', { style: 'currency', currency: 'PEN' });

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Efectivo' },
  { value: 'CARD', label: 'Tarjeta' },
  { value: 'TRANSFER', label: 'Transferencia' },
];

function documentLabel(invoice: Invoice) {
  if (invoice.customerDocumentType === 'RUC') return 'RUC';
  if (invoice.customerDocumentType === 'DNI') return 'DNI';
  return (invoice.documentNumber || '').replace(/\D/g, '').length === 11 ? 'RUC' : 'DNI';
}

function invoiceTitle(invoice: Invoice) {
  return invoice.documentType === 'BOLETA' ? 'BOLETA DE VENTA' : 'FACTURA';
}

function statusLabel(status: Invoice['status']) {
  if (status === 'PAID') return 'PAGADA';
  if (status === 'CANCELLED') return 'ANULADA';
  return 'PENDIENTE';
}

function statusClasses(status: Invoice['status']) {
  if (status === 'PAID') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300';
  if (status === 'CANCELLED') return 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300';
  return 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300';
}

export default function Billing() {
  const toast = useToast();
  const { hasPermission } = usePermissions();
  const canApprove = hasPermission('FACTURAS:APROBAR');
  const canCreate = hasPermission('FACTURAS:CREAR');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [paying, setPaying] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('CASH');

  const [generatingOpen, setGeneratingOpen] = useState(false);
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [newOrderId, setNewOrderId] = useState<number | null>(null);
  const [newDocumentType, setNewDocumentType] = useState<DocumentType>('BOLETA');
  const [generating, setGenerating] = useState(false);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const data = await getAllInvoices();
      setInvoices(data);
      setSelectedId((cur) => cur ?? data[0]?.id ?? null);
    } catch {
      toast.error('Error', 'No se pudieron cargar las facturas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return invoices;
    return invoices.filter(
      (inv) =>
        inv.invoiceNumber.toLowerCase().includes(q) ||
        (inv.workOrder?.orderNumber || '').toLowerCase().includes(q) ||
        (inv.customer || '').toLowerCase().includes(q)
    );
  }, [invoices, search]);

  const pag = usePagination(filtered, 10);

  const selected = invoices.find((inv) => inv.id === selectedId) || null;
  const selectedOrder = orders.find((order) => order.id === newOrderId) || null;
  const selectedDocument = (selectedOrder?.customer?.documentNumber || '').replace(/\D/g, '');
  const selectedDocumentLabel =
    selectedDocument.length === 11 ? 'RUC' : selectedDocument.length === 8 ? 'DNI' : 'Documento no válido';
  const documentIsValid =
    newDocumentType === 'FACTURA' ? selectedDocument.length === 11 : [8, 11].includes(selectedDocument.length);
  const canGenerate = Boolean(selectedOrder) && documentIsValid && !generating;

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
      setInvoices((prev) => prev.map((inv) => (inv.id === selected.id ? updated : inv)));
      toast.success('Pago registrado', `${updated.invoiceNumber} quedó pagada.`);
    } catch (err: any) {
      toast.error('Error', err?.response?.data?.message || 'No se pudo registrar el pago.');
    } finally {
      setPaying(false);
    }
  };

  const downloadPdf = async () => {
    if (!selected) return;
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const title = invoiceTitle(selected);

    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, 595, 78, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text('Taller Mecánico SIGTM', 40, 34);
    doc.setFontSize(9);
    doc.text('RUC: 20123456789 · Av. Principal 123, Ciudad', 40, 52);
    doc.text('Comprobante de pago electrónico', 40, 65);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(17);
    doc.text(title, 40, 116);
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(`Número: ${selected.invoiceNumber}`, 40, 136);
    doc.text(
      `Emisión: ${selected.issueDate ? new Date(selected.issueDate).toLocaleDateString('es-ES') : '—'}`,
      40,
      150
    );

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(11);
    doc.text('Cliente', 40, 186);
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(selected.customer || '—', 40, 202);
    doc.text(`${documentLabel(selected)}: ${selected.documentNumber || '—'}`, 40, 216);
    doc.text(`Orden: ${selected.workOrder?.orderNumber || '—'}`, 40, 230);
    doc.text(`Vehículo: ${selected.vehicle || '—'}`, 40, 244);

    doc.setDrawColor(226, 232, 240);
    doc.line(40, 270, 555, 270);
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10);
    doc.text('Subtotal', 390, 300);
    doc.text(fmt(selected.subtotal), 555, 300, { align: 'right' });
    doc.text('IGV (18%)', 390, 318);
    doc.text(fmt(selected.taxAmount), 555, 318, { align: 'right' });
    doc.setFontSize(12);
    doc.text('Total', 390, 344);
    doc.text(fmt(selected.totalAmount), 555, 344, { align: 'right' });

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Estado: ${statusLabel(selected.status)}`, 40, 344);
    doc.text('Gracias por confiar en Taller Mecánico SIGTM.', 40, 780);

    doc.save(`${selected.invoiceNumber}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Facturación y Cobros</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Emite facturas o boletas y registra el pago de los servicios.
          </p>
        </div>
        {canCreate && (
          <button
            onClick={openGenerate}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
          >
            <Plus size={18} />
            Nuevo comprobante
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="space-y-4 md:col-span-1">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="relative mb-4">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="block w-full rounded-lg border border-slate-300 py-2 pl-10 text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                placeholder="Buscar comprobante..."
              />
            </div>

            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-20 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {pag.pageItems.map((inv) => (
                  <button
                    key={inv.id}
                    onClick={() => setSelectedId(inv.id)}
                    className={cn(
                      'w-full rounded-lg border p-3 text-left transition',
                      selectedId === inv.id
                        ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/20 dark:bg-blue-500/10'
                        : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/40'
                    )}
                  >
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">{inv.invoiceNumber}</span>
                      <span className={cn('rounded px-2 py-0.5 text-[10px] font-bold', statusClasses(inv.status))}>
                        {statusLabel(inv.status)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{inv.customer || '—'}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        {inv.issueDate ? new Date(inv.issueDate).toLocaleDateString('es-ES') : ''}
                      </span>
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{fmt(inv.totalAmount)}</span>
                    </div>
                  </button>
                ))}
                {filtered.length === 0 && (
                  <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">Sin comprobantes.</p>
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
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <FileText className="text-slate-400 dark:text-slate-500" />
                <h3 className="font-semibold text-slate-800 dark:text-slate-100">Detalle del comprobante</h3>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  disabled={!selected}
                  className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-200 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-700"
                  title="Imprimir"
                  aria-label="Imprimir comprobante"
                >
                  <Printer size={18} />
                </button>
                <button
                  onClick={() => void downloadPdf()}
                  disabled={!selected}
                  className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-200 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-700"
                  title="Descargar PDF"
                  aria-label="Descargar comprobante"
                >
                  <Download size={18} />
                </button>
              </div>
            </div>

            {!selected ? (
              <div className="p-12 text-center text-sm text-slate-400 dark:text-slate-500">
                {loading ? 'Cargando...' : 'Emite un comprobante desde una orden finalizada.'}
              </div>
            ) : (
              <div className="p-6 sm:p-8">
                <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-6 dark:border-slate-700">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                      {invoiceTitle(selected)}
                    </h2>
                    <p className="mt-1 font-mono text-slate-500 dark:text-slate-400">{selected.invoiceNumber}</p>
                  </div>
                  <div className="text-right">
                    <div className="mb-2 inline-flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10 text-blue-600">
                        <CheckCircle size={16} />
                      </div>
                      <span className="font-bold text-slate-700 dark:text-slate-200">Taller Mecánico SIGTM</span>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">RUC: 20123456789</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Av. Principal 123, Ciudad</p>
                  </div>
                </div>

                <div className="mb-8 grid grid-cols-2 gap-8">
                  <div>
                    <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Cliente
                    </h4>
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{selected.customer || '—'}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      {documentLabel(selected)}: {selected.documentNumber || '—'}
                    </p>
                  </div>
                  <div>
                    <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Referencia
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      <span className="font-semibold text-slate-700 dark:text-slate-200">Orden:</span>{' '}
                      {selected.workOrder?.orderNumber || '—'}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      <span className="font-semibold text-slate-700 dark:text-slate-200">Vehículo:</span>{' '}
                      {selected.vehicle || '—'}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      <span className="font-semibold text-slate-700 dark:text-slate-200">Emisión:</span>{' '}
                      {selected.issueDate ? new Date(selected.issueDate).toLocaleDateString('es-ES') : '—'}
                    </p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <div className="w-64 space-y-3">
                    <div className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
                      <span>Subtotal:</span>
                      <span>{fmt(selected.subtotal)}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-3 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
                      <span>IGV (18%):</span>
                      <span>{fmt(selected.taxAmount)}</span>
                    </div>
                    <div className="flex justify-between pt-1 text-lg font-bold text-slate-900 dark:text-white">
                      <span>Total:</span>
                      <span>{fmt(selected.totalAmount)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>Estado:</span>
                      <span
                        className={cn(
                          'font-bold',
                          selected.status === 'PAID'
                            ? 'text-emerald-600'
                            : selected.status === 'CANCELLED'
                              ? 'text-red-600'
                              : 'text-amber-600'
                        )}
                      >
                        {statusLabel(selected.status)}
                      </span>
                    </div>
                  </div>
                </div>

                {selected.status === 'PENDING' && canApprove && (
                  <div className="mt-8 flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 pt-6 dark:border-slate-700">
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handlePay}
                      disabled={paying}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
                    >
                      <CreditCard size={18} />
                      {paying ? 'Registrando...' : 'Registrar Pago'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {generatingOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 backdrop-blur-sm sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="generate-invoice-title"
          onClick={closeGenerate}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 id="generate-invoice-title" className="text-lg font-bold text-slate-900 dark:text-white">
                  Emitir comprobante
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Elige una orden finalizada y el tipo de comprobante.
                </p>
              </div>
              <button
                onClick={closeGenerate}
                disabled={generating}
                className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            {loadingOrders ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500 dark:text-slate-400">
                <Loader2 size={18} className="animate-spin" />
                Cargando órdenes...
              </div>
            ) : orders.length === 0 ? (
              <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                No hay órdenes finalizadas pendientes de comprobante.
              </p>
            ) : (
              <div className="space-y-5">
                <div>
                  <label htmlFor="invoice-order" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                    Orden de trabajo
                  </label>
                  <select
                    id="invoice-order"
                    value={newOrderId ?? ''}
                    onChange={(e) => setNewOrderId(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                  >
                    {orders.map((order) => (
                      <option key={order.id} value={order.id}>
                        {order.orderNumber} · {order.customer?.firstName} {order.customer?.lastName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                    {selectedOrder?.customer?.firstName} {selectedOrder?.customer?.lastName}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {selectedDocumentLabel}: {selectedOrder?.customer?.documentNumber || '—'}
                  </p>
                </div>

                <fieldset>
                  <legend className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                    Tipo de comprobante
                  </legend>
                  <div className="grid grid-cols-2 gap-3">
                    {(['FACTURA', 'BOLETA'] as const).map((type) => (
                      <label
                        key={type}
                        className={cn(
                          'cursor-pointer rounded-xl border p-3 text-sm transition',
                          newDocumentType === type
                            ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200'
                            : 'border-slate-200 text-slate-600 hover:border-blue-300 dark:border-slate-700 dark:text-slate-300'
                        )}
                      >
                        <input
                          type="radio"
                          name="tipoComprobante"
                          value={type}
                          checked={newDocumentType === type}
                          onChange={() => setNewDocumentType(type)}
                          className="sr-only"
                        />
                        <span className="block font-semibold">{type === 'FACTURA' ? 'Factura' : 'Boleta'}</span>
                        <span className="mt-0.5 block text-xs opacity-80">
                          {type === 'FACTURA' ? 'Requiere RUC' : 'DNI o RUC'}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                {!documentIsValid && (
                  <p role="alert" className="rounded-lg bg-amber-50 p-3 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                    {newDocumentType === 'FACTURA'
                      ? 'La factura requiere que el cliente tenga RUC de 11 dígitos. Selecciona Boleta.'
                      : 'La boleta requiere DNI de 8 dígitos o RUC de 11 dígitos.'}
                  </p>
                )}

                <div className="flex justify-end gap-3 pt-1">
                  <button
                    onClick={closeGenerate}
                    disabled={generating}
                    className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleGenerate}
                    disabled={!canGenerate}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {generating && <Loader2 size={16} className="animate-spin" />}
                    {generating ? 'Emitiendo...' : 'Emitir'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
