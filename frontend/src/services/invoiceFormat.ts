import type { Invoice } from './invoiceService';

export interface InvoiceIssuer {
  name: string;
  ruc?: string;
  address?: string;
  phone?: string;
  email?: string;
}

export const DEFAULT_ISSUER: InvoiceIssuer = {
  name: 'Taller Mecánico SIGTM',
  ruc: '20123456789',
  address: 'Av. Principal 123, Ciudad',
  phone: '999 999 999',
  email: 'contacto@sigtm.pe',
};

export function invoiceKind(invoice: Invoice) {
  return invoice.documentType === 'BOLETA' ? 'BOLETA DE VENTA' : 'FACTURA ELECTRÓNICA';
}

export function invoiceStatusLabel(status: Invoice['status']) {
  if (status === 'PAID') return 'PAGADA';
  if (status === 'CANCELLED') return 'ANULADA';
  return 'PENDIENTE';
}

export function invoiceDocumentLabel(invoice: Invoice) {
  if (invoice.customerDocumentType === 'RUC') return 'RUC';
  if (invoice.customerDocumentType === 'DNI') return 'DNI';
  return (invoice.documentNumber || '').replace(/\D/g, '').length === 11 ? 'RUC' : 'DNI';
}

export function invoicePaymentLabel(method?: string) {
  if (method === 'CASH') return 'Efectivo';
  if (method === 'CARD') return 'Tarjeta';
  if (method === 'TRANSFER') return 'Transferencia';
  return '—';
}

export function invoiceMoney(value?: number) {
  return `S/ ${(value || 0).toLocaleString('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function invoiceDate(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' });
}

export function invoiceInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((word) => word[0]?.toUpperCase() ?? '').join('') || 'SG';
}
