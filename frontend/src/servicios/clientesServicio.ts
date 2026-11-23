import api from './api';

export interface Customer {
  id?: number;
  code?: string;
  documentNumber: string;
  firstName: string;
  lastName: string;
  phone: string;
  whatsapp?: string;
  email: string;
  address?: string;
  registrationDate?: string;
  active: boolean;
  observations?: string;
}

export type CustomerStatusFilter = 'TODOS' | 'ACTIVOS' | 'INACTIVOS';

export interface CustomerSummary {
  total: number;
  active: number;
  inactive: number;
  whatsapp: number;
}

export interface CustomerPage {
  content: Customer[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  summary: CustomerSummary;
}

export interface CustomerQuery {
  page?: number;
  size?: number;
  search?: string;
  status?: CustomerStatusFilter;
  sort?: 'reciente' | 'antigua' | 'nombre' | 'codigo';
}

export const getPaginatedCustomers = async (query: CustomerQuery = {}): Promise<CustomerPage> => {
  const response = await api.get('/clientes/paginado', { params: query });
  return response.data;
};

export const getAllCustomers = async () => {
  const response = await api.get('/clientes');
  return response.data;
};

export const getCustomerById = async (id: number) => {
  const response = await api.get(`/clientes/${id}`);
  return response.data;
};

export const createCustomer = async (customer: Customer) => {
  const response = await api.post('/clientes', customer);
  return response.data;
};

export const updateCustomer = async (id: number, customer: Customer) => {
  const response = await api.put(`/clientes/${id}`, customer);
  return response.data;
};

export const deleteCustomer = async (id: number) => {
  await api.delete(`/clientes/${id}`);
};
