import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import AccesoMfa from './AccesoMfa';
import { verifyMfa } from '../servicios/autenticacionServicio';
import { ToastProvider } from '../componentes/interfaz/Avisos';

vi.mock('../servicios/autenticacionServicio', () => ({
  verifyMfa: vi.fn(),
  configurarMfa: vi.fn(),
  activarMfa: vi.fn(),
}));

vi.mock('../componentes/BotonTema', () => ({ default: () => null }));

describe('AccesoMfa', () => {
  beforeEach(() => {
    sessionStorage.clear();
    sessionStorage.setItem('mfaChallenge', 'desafio-de-prueba');
    (verifyMfa as Mock).mockReset();
    (verifyMfa as Mock).mockResolvedValue({ username: 'admin' });
  });

  it('envía el código TOTP para completar el acceso', async () => {
    render(
      <MemoryRouter>
        <ToastProvider>
          <AccesoMfa />
        </ToastProvider>
      </MemoryRouter>
    );

    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText('123456'), '123456');
    await user.click(screen.getByRole('button', { name: /Verificar y entrar/i }));

    expect(verifyMfa).toHaveBeenCalledWith('desafio-de-prueba', '123456', true);
  });
});
