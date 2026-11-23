import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';
import Login from './Acceso';
import { login, getCurrentUser } from '../servicios/autenticacionServicio';
import { ToastProvider } from '../componentes/interfaz/Avisos';

vi.mock('../servicios/autenticacionServicio', () => ({
  login: vi.fn(),
  getCurrentUser: vi.fn(),
}));

vi.mock('../componentes/BotonTema', () => ({ default: () => null }));

function renderLogin() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <Login />
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('Login', () => {
  beforeEach(() => {
    (login as Mock).mockReset();
    (getCurrentUser as Mock).mockReturnValue({
      name: 'Ana',
      lastName: 'Pérez',
      username: 'ana',
      roleName: 'ROLE_ADMIN',
    });
  });

  it('renderiza el formulario de acceso', () => {
    renderLogin();

    expect(screen.getByRole('heading', { name: 'Iniciar Sesión' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Usuario o Correo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Contraseña/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Entrar al Sistema/i })).toBeInTheDocument();
  });

  it('muestra un error cuando las credenciales son incorrectas (401)', async () => {
    (login as Mock).mockRejectedValue({ response: { status: 401 } });
    renderLogin();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/Usuario o Correo/i), 'admin');
    await user.type(screen.getByLabelText(/^Contraseña/i), 'incorrecta');
    await user.click(screen.getByRole('button', { name: /Entrar al Sistema/i }));

    expect(await screen.findByText('Usuario o contraseña incorrectos.')).toBeInTheDocument();
  });

  it('muestra cuántos intentos quedan después de un fallo (401)', async () => {
    (login as Mock).mockRejectedValue({
      response: {
        status: 401,
        data: { message: 'Usuario o contraseña incorrectos. Te quedan 4 intentos.' },
      },
    });
    renderLogin();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/Usuario o Correo/i), 'admin');
    await user.type(screen.getByPlaceholderText('••••••••'), 'incorrecta');
    await user.click(screen.getByRole('button', { name: /Entrar al Sistema/i }));

    expect(await screen.findByText(/Te quedan 4 intentos/i)).toBeInTheDocument();
  });

  it('muestra los minutos restantes cuando el login está bloqueado (429)', async () => {
    (login as Mock).mockRejectedValue({
      response: {
        status: 429,
        data: { message: 'Demasiados intentos. Espera 15 minutos antes de volver a intentar.' },
      },
    });
    renderLogin();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/Usuario o Correo/i), 'admin');
    await user.type(screen.getByPlaceholderText('••••••••'), 'incorrecta');
    await user.click(screen.getByRole('button', { name: /Entrar al Sistema/i }));

    expect(await screen.findByText(/Espera 15 minutos antes de volver a intentar/i)).toBeInTheDocument();
  });

  it('tras un login correcto muestra la animación de ingreso', async () => {
    (login as Mock).mockResolvedValue({
      username: 'admin',
      name: 'Ana',
      lastName: 'Pérez',
      roles: ['ROLE_ADMIN'],
      roleName: 'ROLE_ADMIN',
    });
    renderLogin();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/Usuario o Correo/i), 'admin');
    await user.type(screen.getByLabelText(/^Contraseña/i), 'admin123');
    await user.click(screen.getByRole('button', { name: /Entrar al Sistema/i }));

    expect(await screen.findByText('Iniciando sesión')).toBeInTheDocument();
    expect(login).toHaveBeenCalledWith('admin', 'admin123', true);
  });
});
