import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Modal from './Modal';

describe('Modal común', () => {
  it('renderiza título, descripción y pie centrado', () => {
    render(
      <Modal
        title="Nuevo proveedor"
        description="Datos fiscales y de contacto"
        onClose={() => {}}
        footer={<button>Guardar</button>}
      >
        <p>Contenido</p>
      </Modal>
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('Nuevo proveedor')).toBeInTheDocument();
    expect(screen.getByText('Datos fiscales y de contacto')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeInTheDocument();
  });

  it('cierra con el botón, con Escape y bloquea el scroll de la página', () => {
    const onClose = vi.fn();
    const { unmount } = render(
      <Modal title="Editar contrato" onClose={onClose}>
        <p>Formulario</p>
      </Modal>
    );

    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);

    unmount();
    expect(document.body.style.overflow).toBe('');
  });
});
