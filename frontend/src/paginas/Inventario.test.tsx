import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';
import Inventory from './Inventario';
import { getPaginatedProducts } from '../servicios/productosServicio';
import { ToastProvider } from '../componentes/interfaz/Avisos';
import type { ProductQuery } from '../servicios/productosServicio';

vi.mock('../servicios/productosServicio', () => ({
  getPaginatedProducts: vi.fn(),
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  deleteProduct: vi.fn(),
  adjustStock: vi.fn(),
  getProductTransactions: vi.fn(),
}));

const productos = [
  {
    id: 1, code: 'P1', name: 'Filtro de aire', brand: 'Mann', category: 'Filtros',
    currentStock: 5, minStock: 2, purchasePrice: 10, salePrice: 15, active: true,
  },
  {
    id: 2, code: 'P2', name: 'Aceite 5W-30', brand: 'Castrol', category: 'Aceites',
    currentStock: 3, minStock: 5, purchasePrice: 20, salePrice: 35, active: true,
  },
];

function renderInventory() {
  return render(
    <ToastProvider>
      <Inventory />
    </ToastProvider>
  );
}

describe('Inventory (inventario)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getPaginatedProducts as Mock).mockImplementation(async (query: ProductQuery = {}) => {
      const text = (query.search || '').toLowerCase().trim();
      let content = productos.filter((product) => {
        if (query.category && query.category !== 'TODAS' && product.category !== query.category) return false;
        if (query.stock === 'BAJO' && !(product.currentStock > 0 && product.currentStock <= product.minStock)) return false;
        if (query.stock === 'AGOTADO' && product.currentStock > 0) return false;
        if (query.stock === 'INACTIVO' && product.active) return false;
        if (!text) return true;
        return (
          product.name.toLowerCase().includes(text) ||
          product.code.toLowerCase().includes(text) ||
          (product.brand || '').toLowerCase().includes(text)
        );
      });
      return {
        content,
        page: 1,
        size: 10,
        totalElements: content.length,
        totalPages: 1,
        summary: {
          total: productos.length,
          lowStock: 1,
          outOfStock: 0,
          inactive: 0,
          value: 120,
        },
        categories: ['Aceites', 'Filtros'],
      };
    });
  });

  it('muestra los productos en la tabla', async () => {
    renderInventory();
    expect((await screen.findAllByText('Filtro de aire')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Aceite 5W-30').length).toBeGreaterThan(0);
  });

  it('pide confirmación antes de descartar los datos del modal', async () => {
    renderInventory();
    const user = userEvent.setup();
    await screen.findAllByText('Filtro de aire');

    // Abrir el modal de "Nuevo Producto" y escribir un dato.
    await user.click(screen.getByRole('button', { name: /Nuevo Producto/i }));
    await user.type(screen.getByLabelText('Nombre'), 'Producto de prueba');

    // Intentar cerrar con "Cancelar": debe pedir confirmación, no cerrar de golpe.
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(await screen.findByText('¿Descartar cambios?')).toBeInTheDocument();

    // "Seguir editando": el modal conserva lo escrito.
    await user.click(screen.getByRole('button', { name: 'Seguir editando' }));
    expect(screen.getByLabelText('Nombre')).toHaveValue('Producto de prueba');

    // "Descartar": ahora sí cierra el modal.
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    await user.click(await screen.findByRole('button', { name: 'Descartar' }));
    expect(screen.queryByRole('heading', { name: 'Nuevo Producto' })).not.toBeInTheDocument();
  });

  it('cierra sin preguntar cuando no hay cambios', async () => {
    renderInventory();
    const user = userEvent.setup();
    await screen.findAllByText('Filtro de aire');

    await user.click(screen.getByRole('button', { name: /Nuevo Producto/i }));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByText('¿Descartar cambios?')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Nuevo Producto' })).not.toBeInTheDocument();
  });
});
