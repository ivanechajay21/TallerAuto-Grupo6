import api from './api';

export interface Appointment {
  id?: number;
  appointmentDate: string;
  appointmentTime: string;
  requestedService: string;
  estimatedDurationMinutes?: number;
  priority?: string;
  status: string;
  observations?: string;
  customer?: {
    id: number;
    firstName: string;
    lastName: string;
    documentNumber: string;
  };
  vehicle?: {
    id: number;
    plate: string;
    brand: string;
    model: string;
  };
}

export type AppointmentTab = 'proximas' | 'historial';

export interface AppointmentSummary {
  upcoming: number;
  confirmed: number;
  inProcess: number;
  completed: number;
  history: number;
}

export interface AppointmentPage {
  content: Appointment[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  summary: AppointmentSummary;
}

export interface AppointmentQuery {
  page?: number;
  size?: number;
  tab?: AppointmentTab;
  search?: string;
  status?: string;
}

export const getPaginatedAppointments = async (
  query: AppointmentQuery = {}
): Promise<AppointmentPage> => {
  const response = await api.get('/citas/paginado', { params: query });
  return response.data;
};

export const getAllAppointments = async (): Promise<Appointment[]> => {
  const response = await api.get('/citas');
  return response.data;
};

export const getAppointmentsByDate = async (date: string): Promise<Appointment[]> => {
  const response = await api.get(`/citas/fecha/${date}`);
  return response.data;
};

export const createAppointment = async (
  customerId: number,
  vehicleId: number,
  appointment: Partial<Appointment>
) => {
  const response = await api.post(`/citas/cliente/${customerId}/vehiculo/${vehicleId}`, appointment);
  return response.data;
};

export const updateAppointmentStatus = async (id: number, status: string) => {
  const response = await api.patch(`/citas/${id}/estado`, null, { params: { status } });
  return response.data;
};

export const updateAppointment = async (id: number, appointment: Partial<Appointment>) => {
  const response = await api.put(`/citas/${id}`, appointment);
  return response.data;
};

export const deleteAppointment = async (id: number) => {
  await api.delete(`/citas/${id}`);
};