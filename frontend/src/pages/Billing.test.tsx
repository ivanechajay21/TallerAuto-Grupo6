import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';
import Billing from './Billing';
import { getAllInvoices, generateInvoice } from '../services/invoiceService';
import { getAllWorkOrders } from '../services/workOrderService';
import { ToastProvider } from '../components/ui/Toast';

vi.mock('../services/invoiceService', () => ({
  getAllInvoices: vi.fn(),
  getInvoiceById: vi.fn(),
  generateInvoice: vi.fn(),
  payInvoice: vi.fn(),
}));

vi.mock('../services/workOrderService', () => ({
  getAllWorkOrders: vi.fn(),
}));

const factura: Awaited<ReturnType<typeof getAllInvoices>>[number] = {
  id: 1,
  invoiceNumber: 'F001-00000001',
  documentType: 'FACTURA',
  customerDocumentType: 'RUC',
  issueDate: '2026-11-01T10:00:00',
  subtotal: 100,
  taxAmount: 18,
  totalAmount: 118,
  status: 'PENDING',
  customer: 'Empresa Prueba SAC',
  documentNumber: '20123456789',
  customerPhone: '999 111 222',
  vehicle: 'ABC-123 · Toyota Corolla',
  items: [
    { id: 1, description: 'Mantenimiento preventivo', quantity: 1, unitPrice: 100, lineTotal: 100 },
  ],
  workOrder: { id: 5, orderNumber: 'OT-0005' },
};

const boleta: Awaited<ReturnType<typeof getAllInvoices>>[number] = {
  ...factura,
  id: 2,
  invoiceNumber: 'B001-00000002',
  documentType: 'BOLETA',
  customerDocumentType: 'DNI',
  status: 'CANCELLED',
  customer: 'Ana Pérez',
  documentNumber: '74125896',
};

const orden: Awaited<ReturnType<typeof getAllWorkOrders>>[number] = {
  id: 5,
  orderNumber: 'OT-0005',
  priority: 'NORMAL',
  status: 'FINALIZADO',
  customer: {
    id: 3,
    firstName: 'Empresa',
    lastName: 'Prueba SAC',
    documentNumber: '20123456789',
  },
  vehicle: { id: 4, plate: 'ABC-123', brand: 'Toyota', model: 'Corolla' },
};

function renderBilling() {
  return render(
    <ToastProvider>
      <Billing />
    </ToastProvider>
  );
}

describe('Billing (facturación)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getAllInvoices as Mock).mockResolvedValue([]);
    (getAllWorkOrders as Mock).mockResolvedValue([]);
  });

  it('muestra boleta y estado anulado sin tratarlos como factura pendiente', async () => {
    (getAllInvoices as Mock).mockResolvedValue([boleta]);
    renderBilling();

    expect(await screen.findByText('BOLETA DE VENTA')).toBeInTheDocument();
    expect(screen.getAllByText('ANULADA').length).toBeGreaterThan(0);
    expect(screen.getByText(/DNI: 74125896/)).toBeInTheDocument();
    expect(screen.getAllByText('B001-00000002').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Mantenimiento preventivo').length).toBeGreaterThan(0);
  });

  it('emite una factura con RUC para una orden finalizada', async () => {
    (getAllWorkOrders as Mock).mockResolvedValue([orden]);
    (generateInvoice as Mock).mockResolvedValue({
      ...factura,
      id: 10,
      invoiceNumber: 'F001-00000010',
    });
    renderBilling();
    const user = userEvent.setup();

    await screen.findByText(/Emite un comprobante/i);
    await user.click(screen.getByRole('button', { name: /Nuevo comprobante/i }));
    expect(await screen.findByRole('heading', { name: 'Emitir comprobante' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^Emitir$/ }));

    expect(generateInvoice).toHaveBeenCalledWith(5, 'FACTURA');
    expect((await screen.findAllByText(/F001-00000010/)).length).toBeGreaterThan(0);
  });

  it('bloquea la factura si el cliente no tiene RUC y permite elegir boleta', async () => {
    (getAllWorkOrders as Mock).mockResolvedValue([
      {
        ...orden,
        id: 6,
        orderNumber: 'OT-0006',
        customer: { id: 7, firstName: 'Ana', lastName: 'Pérez', documentNumber: '74125896' },
      },
    ]);
    renderBilling();
    const user = userEvent.setup();

    await screen.findByText(/Emite un comprobante/i);
    await user.click(screen.getByRole('button', { name: /Nuevo comprobante/i }));
    await screen.findByRole('heading', { name: 'Emitir comprobante' });

    await user.click(screen.getByRole('radio', { name: /Factura/i }));

    expect(screen.getByText(/La factura requiere que el cliente tenga RUC/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Emitir$/ })).toBeDisabled();

    await user.click(screen.getByRole('radio', { name: /Boleta/i }));
    expect(screen.getByRole('button', { name: /^Emitir$/ })).toBeEnabled();
  });
});
