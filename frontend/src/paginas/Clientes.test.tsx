import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';
import Customers from './Clientes';
import { getPaginatedCustomers } from '../servicios/clientesServicio';
import { ToastProvider } from '../componentes/interfaz/Avisos';
import type { CustomerQuery } from '../servicios/clientesServicio';

vi.mock('../servicios/clientesServicio', () => ({
  getPaginatedCustomers: vi.fn(),
  createCustomer: vi.fn(),
  updateCustomer: vi.fn(),
  deleteCustomer: vi.fn(),
}));

const mockCustomers = Array.from({ length: 10 }, (_, i) => ({
  id: i + 1,
  code: `CLI-${String(i + 1).padStart(6, '0')}`,
  documentNumber: `7000000${i}`,
  firstName: `Cliente ${i + 1}`,
  lastName: 'Prueba',
  phone: `99900000${i}`,
  whatsapp: `99900000${i}`,
  email: `cliente${i + 1}@test.pe`,
  active: true,
}));

function renderCustomers() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <Customers />
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('Customers (clientes)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getPaginatedCustomers as Mock).mockImplementation(async (query: CustomerQuery = {}) => {
      const q = (query.search || '').toLowerCase().trim();
      let content = mockCustomers.filter((customer) => {
        if (query.status === 'ACTIVOS' && !customer.active) return false;
        if (query.status === 'INACTIVOS' && customer.active) return false;
        if (!q) return true;
        return (
          `${customer.firstName} ${customer.lastName}`.toLowerCase().includes(q) ||
          customer.documentNumber.includes(q)
        );
      });
      const page = query.page ?? 0;
      const size = query.size ?? 9;
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
          total: mockCustomers.length,
          active: mockCustomers.length,
          inactive: 0,
          whatsapp: mockCustomers.length,
        },
      };
    });
  });

  it('muestra los clientes y el resumen', async () => {
    renderCustomers();

    expect((await screen.findAllByText('Cliente 1 Prueba')).length).toBeGreaterThan(0);
    expect(screen.getByText('10 clientes')).toBeInTheDocument();
    expect(getPaginatedCustomers).toHaveBeenCalledWith(expect.objectContaining({ page: 0, size: 9 }));
  });

  it('busca clientes en el servidor', async () => {
    renderCustomers();
    const user = userEvent.setup();
    await screen.findAllByText('Cliente 1 Prueba');

    await user.type(screen.getByPlaceholderText('Buscar por nombre, documento, teléfono o correo...'), 'Cliente 10');

    expect((await screen.findAllByText('Cliente 10 Prueba')).length).toBeGreaterThan(0);
    expect(screen.getByText('1 cliente')).toBeInTheDocument();
    expect(getPaginatedCustomers).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: 'Cliente 10', page: 0 })
    );
  });

  it('pagina los clientes desde el servidor', async () => {
    renderCustomers();
    const user = userEvent.setup();
    await screen.findAllByText('Cliente 1 Prueba');

    const nav = screen.getByRole('navigation', { name: 'Paginación' });
    await user.click(within(nav).getByRole('button', { name: '2' }));

    expect((await screen.findAllByText('Cliente 10 Prueba')).length).toBeGreaterThan(0);
    expect(getPaginatedCustomers).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, size: 9 }));
  });
});
