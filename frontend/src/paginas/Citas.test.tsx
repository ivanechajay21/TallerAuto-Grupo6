import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import Appointments from './Citas';
import { getPaginatedAppointments, updateAppointmentStatus } from '../servicios/citasServicio';
import { getAllCustomers } from '../servicios/clientesServicio';
import { ToastProvider } from '../componentes/interfaz/Avisos';
import type { AppointmentQuery } from '../servicios/citasServicio';

vi.mock('../servicios/citasServicio', () => ({
  getPaginatedAppointments: vi.fn(),
  updateAppointmentStatus: vi.fn(),
  createAppointment: vi.fn(),
  getAppointmentsByDate: vi.fn(),
  updateAppointment: vi.fn(),
  deleteAppointment: vi.fn(),
}));
vi.mock('../servicios/clientesServicio', () => ({ getAllCustomers: vi.fn() }));
vi.mock('../servicios/vehiculosServicio', () => ({ getVehiclesByCustomer: vi.fn() }));
vi.mock('../servicios/ordenesTrabajoServicio', () => ({ createWorkOrder: vi.fn() }));

const appointments = [
  {
    id: 1,
    appointmentDate: '2026-11-08',
    appointmentTime: '09:00',
    requestedService: 'Mantenimiento preventivo',
    status: 'PENDING',
    customer: { id: 1, firstName: 'Ana', lastName: 'Pérez', documentNumber: '12345678' },
    vehicle: { id: 1, plate: 'ABC-123', brand: 'Toyota', model: 'Corolla' },
  },
  {
    id: 2,
    appointmentDate: '2026-11-09',
    appointmentTime: '11:30',
    requestedService: 'Cambio de frenos',
    status: 'CONFIRMED',
    customer: { id: 2, firstName: 'Luis', lastName: 'Ramos', documentNumber: '87654321' },
    vehicle: { id: 2, plate: 'XYZ-987', brand: 'Honda', model: 'Civic' },
  },
  {
    id: 3,
    appointmentDate: '2026-10-01',
    appointmentTime: '10:00',
    requestedService: 'Diagnóstico general',
    status: 'COMPLETED',
    customer: { id: 1, firstName: 'Ana', lastName: 'Pérez', documentNumber: '12345678' },
    vehicle: { id: 1, plate: 'ABC-123', brand: 'Toyota', model: 'Corolla' },
  },
];

function renderPage() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <Appointments />
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('Appointments (agenda)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getPaginatedAppointments as Mock).mockImplementation(async (query: AppointmentQuery = {}) => {
      const activeStatuses = ['PENDING', 'CONFIRMED', 'IN_PROCESS'];
      const tab = query.tab ?? 'proximas';
      const text = (query.search || '').toLowerCase().trim();
      let content = appointments.filter((appointment) => {
        const isActive = activeStatuses.includes(appointment.status);
        if (tab === 'proximas' ? !isActive : isActive) return false;
        if (query.status && query.status !== 'TODAS' && appointment.status !== query.status) return false;
        if (!text) return true;
        return (
          appointment.requestedService.toLowerCase().includes(text) ||
          `${appointment.customer.firstName} ${appointment.customer.lastName}`.toLowerCase().includes(text) ||
          appointment.vehicle.plate.toLowerCase().includes(text)
        );
      });
      return {
        content,
        page: 1,
        size: 10,
        totalElements: content.length,
        totalPages: 1,
        summary: {
          upcoming: appointments.filter((a) => activeStatuses.includes(a.status)).length,
          confirmed: appointments.filter((a) => a.status === 'CONFIRMED').length,
          inProcess: appointments.filter((a) => a.status === 'IN_PROCESS').length,
          completed: appointments.filter((a) => a.status === 'COMPLETED').length,
          history: appointments.filter((a) => !activeStatuses.includes(a.status)).length,
        },
      };
    });
    (getAllCustomers as Mock).mockResolvedValue([]);
    (updateAppointmentStatus as Mock).mockResolvedValue({ ...appointments[0], status: 'CONFIRMED' });
  });

  it('muestra las pestañas y separa próximas citas del historial', async () => {
    renderPage();

    expect(await screen.findByText('Mantenimiento preventivo')).toBeInTheDocument();
    expect(screen.getByText('Cambio de frenos')).toBeInTheDocument();
    expect(screen.queryByText('Diagnóstico general')).not.toBeInTheDocument();
    expect(screen.getByText('2 próximas')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Próximas citas/i })).toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole('tab', { name: /Historial/i }));

    expect(await screen.findByText('Historial de citas')).toBeInTheDocument();
    expect(await screen.findByText('Diagnóstico general')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Mantenimiento preventivo')).not.toBeInTheDocument());
  });

  it('filtra citas por texto', async () => {
    renderPage();
    const user = userEvent.setup();
    await screen.findByText('Mantenimiento preventivo');

    await user.type(screen.getByPlaceholderText('Buscar por servicio, cliente o placa...'), 'frenos');

    expect(await screen.findByText('Cambio de frenos')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Mantenimiento preventivo')).not.toBeInTheDocument());
  });

  it('abre el formulario de nueva cita', async () => {
    renderPage();
    const user = userEvent.setup();
    await screen.findByText('Mantenimiento preventivo');

    await user.click(screen.getByRole('button', { name: /Nueva cita/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Programar nueva cita' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Buscar cliente...')).toBeInTheDocument();
  });

  it('abre la edición de una cita pendiente', async () => {
    renderPage();
    const user = userEvent.setup();
    await screen.findByText('Mantenimiento preventivo');

    await user.click(screen.getByRole('button', { name: /Editar cita de Ana Pérez/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Editar cita' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Guardar cambios/i })).toBeInTheDocument();
  });
});
