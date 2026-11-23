import { describe, expect, it, vi } from 'vitest';
import { exportInvoicePdf } from './facturaPdfServicio';
import { descargarArchivo } from './descargaServicio';
import type { Invoice } from './facturacionServicio';

vi.mock('./descargaServicio', () => ({
  descargarArchivo: vi.fn(),
}));

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

describe('exportInvoicePdf', () => {
  it('solicita al backend el PDF de una factura', async () => {
    await exportInvoicePdf(factura, { autoPrint: true });

    expect(descargarArchivo).toHaveBeenCalledWith(
      '/facturas/1/pdf',
      expect.objectContaining({
        filename: 'F001-00000001-factura.pdf',
        mimeType: 'application/pdf',
        autoPrint: true,
      })
    );
  });

  it('usa el nombre de boleta cuando corresponde', async () => {
    await exportInvoicePdf({
      ...factura,
      invoiceNumber: 'B001-00000002',
      documentType: 'BOLETA',
      customerDocumentType: 'DNI',
      documentNumber: '74125896',
      customer: 'Ana Pérez',
      status: 'PAID',
      paymentMethod: 'CARD',
    });

    expect(descargarArchivo).toHaveBeenCalledWith(
      '/facturas/1/pdf',
      expect.objectContaining({ filename: 'B001-00000002-boleta.pdf' })
    );
  });
});
