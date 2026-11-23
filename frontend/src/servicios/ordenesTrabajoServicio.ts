import api from './api';

export interface WorkOrder {
  id?: number;
  orderNumber: string;
  customer?: {
    id: number;
    firstName: string;
    lastName: string;
    documentNumber: string;
    code?: string;
    phone?: string;
  };
  vehicle?: {
    id: number;
    plate: string;
    brand: string;
    model: string;
    year?: number;
    color?: string;
  };
  receptionDate?: string;
  currentMileage?: number;
  fuelLevel?: string;
  customerSymptoms?: string;
  technicalDiagnosis?: string;
  priority: string;
  status: string;
  visualDamages?: string;
  items?: WorkOrderItem[];
  totalAmount?: number;
}

export interface ServiceCatalogInfo {
  id: number;
  code: string;
  name: string;
  description?: string;
  category?: string;
  defaultPrice?: number;
  estimatedDurationMinutes?: number;
  active?: boolean;
}

export interface WorkOrderItem {
  id: number;
  description: string;
  price?: number;
  quantity?: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  startDate?: string;
  endDate?: string;
  observations?: string;
  mechanic?: { id: number; name: string; lastName: string };
  workOrder?: { id: number; orderNumber: string };
  serviceCatalog?: { id: number; code?: string; name: string };
  product?: { id: number; code?: string; name: string };
}

export const getServicesCatalog = async (): Promise<ServiceCatalogInfo[]> => {
  const response = await api.get('/catalogo-servicios');
  return response.data;
};

export interface WorkOrderSummary {
  total: number;
  active: number;
  history: number;
  urgent: number;
  ready: number;
  estimatedValue: number;
}

export interface WorkOrderPage {
  content: WorkOrder[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  summary: WorkOrderSummary;
}

export interface WorkOrderQuery {
  page?: number;
  size?: number;
  tab?: 'activas' | 'historial';
  search?: string;
  status?: string;
  priority?: string;
  mechanicId?: number | null;
  onlyUrgent?: boolean;
  onlyUnassigned?: boolean;
  onlyNoItems?: boolean;
  onlyStale?: boolean;
  sort?: 'prioridad' | 'antigua' | 'reciente' | 'total';
}

export const getAllWorkOrders = async (): Promise<WorkOrder[]> => {
  const response = await api.get('/ordenes-trabajo');
  return response.data;
};

export const getPaginatedWorkOrders = async (query: WorkOrderQuery = {}): Promise<WorkOrderPage> => {
  const response = await api.get('/ordenes-trabajo/paginado', {
    params: {
      page: query.page ?? 0,
      size: query.size ?? 10,
      tab: query.tab ?? 'activas',
      search: query.search || undefined,
      status: query.status && query.status !== 'TODAS' ? query.status : undefined,
      priority: query.priority && query.priority !== 'TODAS' ? query.priority : undefined,
      mechanicId: query.mechanicId ?? undefined,
      onlyUrgent: query.onlyUrgent || undefined,
      onlyUnassigned: query.onlyUnassigned || undefined,
      onlyNoItems: query.onlyNoItems || undefined,
      onlyStale: query.onlyStale || undefined,
      sort: query.sort ?? 'prioridad',
    },
  });
  return response.data;
};

export const getWorkOrderById = async (id: number): Promise<WorkOrder> => {
  const response = await api.get(`/ordenes-trabajo/${id}`);
  return response.data;
};

export const getWorkOrdersByStatus = async (status: string): Promise<WorkOrder[]> => {
  const response = await api.get(`/ordenes-trabajo/estado/${status}`);
  return response.data;
};

export const updateWorkOrderStatus = async (id: number, status: string) => {
  const response = await api.patch(`/ordenes-trabajo/${id}/estado`, null, { params: { status } });
  return response.data;
};

export interface UpdateWorkOrderPayload {
  currentMileage?: number;
  fuelLevel?: string;
  customerSymptoms?: string;
  technicalDiagnosis?: string;
  priority?: string;
  visualDamages?: string;
}

export const updateWorkOrder = async (id: number, payload: UpdateWorkOrderPayload): Promise<WorkOrder> => {
  const response = await api.put(`/ordenes-trabajo/${id}`, payload);
  return response.data;
};

export const createWorkOrder = async (
  customerId: number,
  vehicleId: number,
  payload: Partial<WorkOrder> = {},
  appointmentId?: number
): Promise<WorkOrder> => {
  const response = await api.post(
    `/ordenes-trabajo/cliente/${customerId}/vehiculo/${vehicleId}`,
    payload,
    { params: appointmentId ? { appointmentId } : undefined }
  );
  return response.data;
};

export const getMyWorkItems = async (mechanicId: number): Promise<WorkOrderItem[]> => {
  const response = await api.get(`/ordenes-trabajo/mecanico/${mechanicId}/detalles`);
  return response.data;
};

export const updateItemStatus = async (itemId: number, status: string) => {
  const response = await api.patch(`/ordenes-trabajo/detalles/${itemId}/estado`, null, { params: { status } });
  return response.data;
};

export const addWorkOrderItem = async (
  workOrderId: number,
  payload: {
    description: string;
    price?: number;
    quantity?: number;
    serviceCatalogId?: number;
    productId?: number;
    mechanicId?: number;
  }
) => {
  const { serviceCatalogId, productId, mechanicId, ...item } = payload;
  const response = await api.post(`/ordenes-trabajo/${workOrderId}/detalles`, item, {
    params: { serviceCatalogId, productId, mechanicId },
  });
  return response.data;
};

export const updateWorkOrderItem = async (
  itemId: number,
  payload: {
    description: string;
    price?: number;
    quantity?: number;
    serviceCatalogId?: number;
    productId?: number;
    mechanicId?: number;
  }
) => {
  const { serviceCatalogId, productId, mechanicId, ...item } = payload;
  const response = await api.put(`/ordenes-trabajo/detalles/${itemId}`, item, {
    params: { serviceCatalogId, productId, mechanicId },
  });
  return response.data;
};

export const deleteWorkOrderItem = async (itemId: number) => {
  await api.delete(`/ordenes-trabajo/detalles/${itemId}`);
};