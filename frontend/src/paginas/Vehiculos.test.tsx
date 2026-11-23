import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';
import Vehicles from './Vehiculos';
import { getPaginatedVehicles } from '../servicios/vehiculosServicio';
import { getAllCustomers } from '../servicios/clientesServicio';
import { ToastProvider } from '../componentes/interfaz/Avisos';
import type { VehicleQuery } from '../servicios/vehiculosServicio';

vi.mock('../servicios/vehiculosServicio', () => ({
  getPaginatedVehicles: vi.fn(),
  createVehicle: vi.fn(),
  updateVehicle: vi.fn(),
  getVehicleHistory: vi.fn(),
  deleteVehicle: vi.fn(),
}));
vi.mock('../servicios/clientesServicio', () => ({ getAllCustomers: vi.fn() }));

const mockVehicles = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  code: `V${i + 1}`,
  plate: `ABC-${String(i + 1).padStart(3, '0')}`,
  brand: 'Toyota',
  model: `Corolla ${i + 1}`,
  year: 2020,
  color: 'Rojo',
  customer: { id: 1, firstName: 'Ana', lastName: 'Pérez', documentNumber: '12345678' },
  currentMileage: 1000 + i,
  fuelType: 'Gasolina',
  active: true,
}));

function renderVehicles() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <Vehicles />
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('Vehicles (vehículos)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getPaginatedVehicles as Mock).mockImplementation(async (query: VehicleQuery = {}) => {
      const q = (query.search || '').toLowerCase().trim();
      let content = mockVehicles.filter((vehicle) => {
        if (query.status === 'ACTIVOS' && !vehicle.active) return false;
        if (query.status === 'INACTIVOS' && vehicle.active) return false;
        if (!q) return true;
        return (
          vehicle.plate.toLowerCase().includes(q) ||
          `${vehicle.brand} ${vehicle.model}`.toLowerCase().includes(q) ||
          `${vehicle.customer.firstName} ${vehicle.customer.lastName}`.toLowerCase().includes(q)
        );
      });
      const page = query.page ?? 0;
      const size = query.size ?? 10;
      const totalElements = content.length;
      const totalPages = Math.max(1, Math.ceil(totalElements / size));
      content = content.slice(page * size, page * size + size);
      return {
        content,
        page: page + 1,
        size,
        totalElements,
        totalPages,
        summary: {
          total: mockVehicles.length,
          active: mockVehicles.length,
          inactive: 0,
          withMileage: mockVehicles.length,
        },
      };
    });
    (getAllCustomers as Mock).mockResolvedValue([]);
  });

  it('muestra los vehículos y el contador', async () => {
    renderVehicles();

    expect(await screen.findByText('ABC-001')).toBeInTheDocument();
    expect(screen.getByText('12 vehículos')).toBeInTheDocument();
    expect(getPaginatedVehicles).toHaveBeenCalledWith(expect.objectContaining({ page: 0, size: 10 }));
  });

  it('filtra por placa con la búsqueda', async () => {
    renderVehicles();
    const user = userEvent.setup();
    await screen.findByText('ABC-001');

    await user.type(screen.getByPlaceholderText('Buscar por placa, marca o cliente...'), 'ABC-002');

    expect(await screen.findByText('ABC-002')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('1 vehículos')).toBeInTheDocument());
    expect(screen.queryByText('ABC-003')).not.toBeInTheDocument();
    expect(getPaginatedVehicles).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'ABC-002', page: 0 }));
  });

  it('pagina los vehículos (10 por página)', async () => {
    renderVehicles();
    const user = userEvent.setup();
    await screen.findByText('ABC-001');

    // Página 1: 001..010
    expect(screen.getByText('ABC-010')).toBeInTheDocument();
    expect(screen.queryByText('ABC-011')).not.toBeInTheDocument();

    // Página 2: 011..012
    const nav = screen.getByRole('navigation', { name: 'Paginación' });
    await user.click(within(nav).getByRole('button', { name: '2' }));

    expect(await screen.findByText('ABC-011')).toBeInTheDocument();
    expect(screen.queryByText('ABC-001')).not.toBeInTheDocument();
    expect(getPaginatedVehicles).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, size: 10 }));
  });

  it('abre el modal de registro de vehículo', async () => {
    renderVehicles();
    const user = userEvent.setup();
    await screen.findByText('ABC-001');

    await user.click(screen.getByRole('button', { name: /Registrar Vehículo/i }));

    expect(screen.getByRole('heading', { name: 'Registrar vehículo' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('ABC-123')).toBeInTheDocument();
  });
});
