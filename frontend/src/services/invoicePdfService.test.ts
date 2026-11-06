import { describe, expect, it } from 'vitest';
import { buildInvoicePdf } from './invoicePdfService';
import type { Invoice } from './invoiceService';

const factura: Invoice = {
  id: 1,
  invoiceNumber: 'F001-00000001',
  documentType: 'FACTURA',
  customerDocumentType: 'RUC',
  issueDate: '2026-11-06T10:00:00',
  subtotal: 100,
  taxAmount: 18,
  totalAmount: 118,
  status: 'PENDING',
  customer: 'Empresa Prueba SAC',
  documentNumber: '20123456789',
  customerPhone: '999 111 222',
  vehicle: 'ABC-123 · Toyota Corolla',
  vehicleYear: 2022,
  items: [
    { id: 1, description: 'Mantenimiento preventivo', quantity: 1, unitPrice: 70, lineTotal: 70 },
    { id: 2, description: 'Filtro de aceite', quantity: 1, unitPrice: 30, lineTotal: 30 },
  ],
  workOrder: { id: 5, orderNumber: 'OT-000005' },
};

describe('buildInvoicePdf', () => {
  it('genera una factura A4 con detalle de conceptos', () => {
    const doc = buildInvoicePdf(factura, {
      issuer: {
        name: 'Taller de Prueba',
        ruc: '20999999999',
        address: 'Av. Siempre Viva 742',
        phone: '999 000 111',
        email: 'taller@prueba.test',
      },
    });

    expect(doc.getNumberOfPages()).toBe(1);
    expect(doc.output('arraybuffer').byteLength).toBeGreaterThan(1000);
  });

  it('genera una boleta pagada sin error', () => {
    const doc = buildInvoicePdf({
      ...factura,
      invoiceNumber: 'B001-00000002',
      documentType: 'BOLETA',
      customerDocumentType: 'DNI',
      documentNumber: '74125896',
      customer: 'Ana Pérez',
      status: 'PAID',
      paymentMethod: 'CARD',
    });

    expect(doc.getNumberOfPages()).toBe(1);
  });
});
