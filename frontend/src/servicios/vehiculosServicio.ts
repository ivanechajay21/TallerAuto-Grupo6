import api from './api';
import type { Customer } from './clientesServicio';

export type VehicleStatusFilter = 'TODOS' | 'ACTIVOS' | 'INACTIVOS';

export interface Vehicle {
  id?: number;
  code?: string;
  plate: string;
  vin?: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  vehicleType?: string;
  fuelType?: string;
  transmission?: string;
  currentMileage?: number;
  customer: Customer;
  registrationDate?: string;
  active: boolean;
  observations?: string;
}

export interface VehicleSummary {
  total: number;
  active: number;
  inactive: number;
  withMileage: number;
}

export interface VehiclePage {
  content: Vehicle[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  summary: VehicleSummary;
}

export interface VehicleQuery {
  page?: number;
  size?: number;
  search?: string;
  status?: VehicleStatusFilter;
  sort?: 'reciente' | 'antigua' | 'placa' | 'kilometraje';
}

export const getPaginatedVehicles = async (query: VehicleQuery = {}): Promise<VehiclePage> => {
  const response = await api.get('/vehiculos/paginado', { params: query });
  return response.data;
};

export const getAllVehicles = async () => {
  const response = await api.get('/vehiculos');
  return response.data;
};

export const getVehicleById = async (id: number) => {
  const response = await api.get(`/vehiculos/${id}`);
  return response.data;
};

export const getVehiclesByCustomer = async (customerId: number) => {
  const response = await api.get(`/vehiculos/cliente/${customerId}`);
  return response.data;
};

export interface VehicleHistoryPhoto {
  id: number;
  category: string;
  photoUrl: string;
}

export interface VehicleHistoryItem {
  id: number;
  description: string;
  price: number;
  quantity: number;
  subtotal: number;
  status: string;
  mechanicName?: string;
}

export interface VehicleHistoryVisit {
  id: number;
  type: 'RECEPCION' | 'ORDEN_TRABAJO';
  code: string;
  date: string;
  mileage?: number;
  fuelLevel?: string;
  status: string;
  symptoms?: string;
  diagnosis?: string;
  observations?: string;
  receivedByName?: string;
  orderNumber?: string;
  workOrderId?: number;
  priority?: string;
  services: VehicleHistoryItem[];
  parts: VehicleHistoryItem[];
  mechanics: string[];
  total: number;
  photos: VehicleHistoryPhoto[];
}

export interface VehicleHistory {
  vehicle: {
    id: number;
    code?: string;
    plate: string;
    brand: string;
    model: string;
    year?: number;
    color?: string;
    currentMileage?: number;
  };
  visits: VehicleHistoryVisit[];
}

export const getVehicleHistory = async (id: number): Promise<VehicleHistory> => {
  const response = await api.get(`/vehiculos/${id}/historial`);
  return response.data;
};

export type VehiclePayload = Omit<Vehicle, 'customer'>;

export const createVehicle = async (customerId: number, vehicle: VehiclePayload) => {
  const response = await api.post(`/vehiculos/cliente/${customerId}`, vehicle);
  return response.data;
};

export const updateVehicle = async (id: number, vehicle: VehiclePayload) => {
  const response = await api.put(`/vehiculos/${id}`, vehicle);
  return response.data;
};

export const deleteVehicle = async (id: number) => {
  await api.delete(`/vehiculos/${id}`);
};
