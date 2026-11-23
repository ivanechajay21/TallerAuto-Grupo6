import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import WorkOrders from './OrdenesTrabajo';
import {
  getPaginatedWorkOrders,
  getServicesCatalog,
  getWorkOrderById,
  updateWorkOrderStatus,
} from '../servicios/ordenesTrabajoServicio';
import type { WorkOrder } from '../servicios/ordenesTrabajoServicio';
import { getMechanics } from '../servicios/usuariosServicio';
import { getAllProducts } from '../servicios/productosServicio';
import { ToastProvider } from '../componentes/interfaz/Avisos';

vi.mock('../servicios/ordenesTrabajoServicio', () => ({
  getPaginatedWorkOrders: vi.fn(),
  getWorkOrderById: vi.fn(),
  updateWorkOrderStatus: vi.fn(),
  updateWorkOrder: vi.fn(),
  addWorkOrderItem: vi.fn(),
  updateWorkOrderItem: vi.fn(),
  deleteWorkOrderItem: vi.fn(),
  updateItemStatus: vi.fn(),
  getServicesCatalog: vi.fn(),
}));
vi.mock('../servicios/usuariosServicio', () => ({ getMechanics: vi.fn() }));
vi.mock('../servicios/productosServicio', () => ({ getAllProducts: vi.fn() }));

const received: WorkOrder = {
  id: 1,
  orderNumber: 'OT-000001',
  status: 'RECIBIDO',
  priority: 'URGENTE',
  receptionDate: '2026-11-01T10:00:00',
  currentMileage: 1500,
  fuelLevel: '1/2',
  customer: {
    id: 1,
    firstName: 'Ana',
    lastName: 'Pérez',
    documentNumber: '12345678',
    phone: '999888777',
  },
  vehicle: { id: 1, plate: 'ABC-123', brand: 'Toyota', model: 'Corolla', color: 'Rojo' },
  items: [],
  totalAmount: 120,
};

const diagnostic: WorkOrder = {
  id: 2,
  orderNumber: 'OT-000002',
  status: 'EN_DIAGNOSTICO',
  priority: 'NORMAL',
  receptionDate: '2026-11-02T10:00:00',
  currentMileage: 2200,
  customer: {
    id: 2,
    firstName: 'Luis',
    lastName: 'Ramos',
    documentNumber: '87654321',
  },
  vehicle: { id: 2, plate: 'XYZ-987', brand: 'Honda', model: 'Civic' },
  items: [],
  totalAmount: 0,
};

function renderPage() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <WorkOrders />
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('WorkOrders (tablero)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getPaginatedWorkOrders as Mock).mockImplementation(async (query: {
      tab?: string;
      priority?: string;
    } = {}) => {
      let content = [received, diagnostic];
      if (query.tab === 'historial') content = [];
      if (query.priority && query.priority !== 'TODAS') {
        content = content.filter((order) => order.priority === query.priority);
      }
      return {
        content,
        page: 1,
        size: 10,
        totalElements: content.length,
        totalPages: 1,
        summary: {
          total: 2,
          active: 2,
          history: 0,
          urgent: 1,
          ready: 0,
          estimatedValue: 120,
        },
      };
    });
    (getWorkOrderById as Mock).mockResolvedValue(received);
    (updateWorkOrderStatus as Mock).mockResolvedValue({ ...received, status: 'EN_DIAGNOSTICO' });
    (getServicesCatalog as Mock).mockResolvedValue([]);
    (getMechanics as Mock).mockResolvedValue([]);
    (getAllProducts as Mock).mockResolvedValue([]);
  });

  it('muestra indicadores, columnas y tarjetas', async () => {
    renderPage();

    expect(await screen.findByText('OT-000001')).toBeInTheDocument();
    expect(screen.getByText('OT-000002')).toBeInTheDocument();
    expect(screen.getByText('2 activas')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Recepción' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Diagnóstico' })).toBeInTheDocument();
  });

  it('filtra por prioridad', async () => {
    renderPage();
    await screen.findByText('OT-000001');

    fireEvent.change(screen.getByLabelText('Filtrar por prioridad'), { target: { value: 'NORMAL' } });

    expect(await screen.findByText('OT-000002')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('OT-000001')).not.toBeInTheDocument());
  });

  it('abre el detalle en un modal', async () => {
    renderPage();
    const card = (await screen.findByText('OT-000001')).closest('article');
    fireEvent.click(card!);

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Detalles y diagnóstico')).toBeInTheDocument();
  });

  it('permite cambiar a vista lista y al historial', async () => {
    renderPage();
    await screen.findByText('OT-000001');

    fireEvent.click(screen.getByRole('button', { name: /Lista/i }));
    expect(screen.getByText('Cliente / Vehículo')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /Historial/i }));
    expect(await screen.findByText('Aún no hay órdenes finalizadas')).toBeInTheDocument();
  });

  it('permite mover una orden a otra etapa arrastrando', async () => {
    renderPage();
    await screen.findByText('OT-000001');
    const card = screen.getByText('OT-000001').closest('article')!;
    const diagnosticColumn = screen.getByRole('heading', { name: 'Diagnóstico' }).closest('section')!;

    fireEvent.dragStart(card);
    fireEvent.dragOver(diagnosticColumn);
    fireEvent.drop(diagnosticColumn);

    await waitFor(() => expect(updateWorkOrderStatus).toHaveBeenCalledWith(1, 'EN_DIAGNOSTICO'));
  });
});
