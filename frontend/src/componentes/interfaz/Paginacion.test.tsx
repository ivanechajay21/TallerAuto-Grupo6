import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Pagination from './Paginacion';

describe('Pagination (estilo pills)', () => {
  it('no renderiza nada cuando hay una sola página', () => {
    const { container } = render(<Pagination page={1} pageCount={1} onChange={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('muestra el contador «Mostrando X–Y de Z» y los números de página', () => {
    render(
      <Pagination page={1} pageCount={3} onChange={() => {}} total={25} from={1} to={10} itemLabel="registros" />
    );
    expect(screen.getByText('1–10')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '3' })).toBeInTheDocument();
  });

  it('llama a onChange con la página seleccionada', () => {
    const onChange = vi.fn();
    render(<Pagination page={1} pageCount={5} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: '3' }));

    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('deshabilita «anterior» en la primera página y «siguiente» en la última', () => {
    const { rerender } = render(<Pagination page={1} pageCount={3} onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Página anterior' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Página siguiente' })).toBeEnabled();

    rerender(<Pagination page={3} pageCount={3} onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Página siguiente' })).toBeDisabled();
  });

  it('usa elipsis cuando hay muchas páginas', () => {
    render(<Pagination page={10} pageCount={20} onChange={() => {}} />);
    expect(screen.getAllByText('…').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: '20' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
  });
});
