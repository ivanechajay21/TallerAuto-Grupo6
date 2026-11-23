import api from './api';

export interface Settings {
  id: number;
  tallerNombre: string;
  tallerLogo: string;
  tallerRuc: string;
  tallerDireccion: string;
  tallerTelefono: string;
  tallerCorreo: string;
  tallerHorario: string;
  correoTipo: string;
  correoRemitente: string;
  smtpHost: string;
  smtpPuerto: number;
  smtpSeguridad: string;
  notifConfirmacionCita: boolean;
  notifRecordatorio: boolean;
  notifVehiculoListo: boolean;
  notifAlertasInventario: boolean;
}

export type CatalogTipo = 'CATEGORIA' | 'ESTADO' | 'PRIORIDAD' | 'UNIDAD';

export const CATALOG_TIPOS: { tipo: CatalogTipo; label: string }[] = [
  { tipo: 'CATEGORIA', label: 'Categorías' },
  { tipo: 'ESTADO', label: 'Estados' },
  { tipo: 'PRIORIDAD', label: 'Prioridades' },
  { tipo: 'UNIDAD', label: 'Unidades' },
];

export interface CatalogItem {
  id: number;
  tipo: string;
  code?: string;
  nombre: string;
  orden?: number;
  activo: boolean;
}

export interface ServiceCatalog {
  id: number;
  code: string;
  name: string;
  description?: string;
  category?: string;
  defaultPrice: number;
  estimatedDurationMinutes?: number;
  active: boolean;
}

export const getSettings = async (): Promise<Settings> => {
  const response = await api.get('/configuracion');
  return response.data;
};

export const updateSettings = async (settings: Partial<Settings>): Promise<Settings> => {
  const response = await api.put('/configuracion', settings);
  return response.data;
};

export const testEmailConfiguration = async (): Promise<{ message: string }> => {
  const response = await api.post('/configuracion/correo/probar');
  return response.data;
};

export const getCatalog = async (tipo: CatalogTipo): Promise<CatalogItem[]> => {
  const response = await api.get('/configuracion/catalogo', { params: { tipo } });
  return response.data;
};

export const createCatalogItem = async (tipo: CatalogTipo, item: Partial<CatalogItem>): Promise<CatalogItem> => {
  const response = await api.post('/configuracion/catalogo', item, { params: { tipo } });
  return response.data;
};

export const updateCatalogItem = async (id: number, tipo: CatalogTipo, item: Partial<CatalogItem>): Promise<CatalogItem> => {
  const response = await api.put(`/configuracion/catalogo/${id}`, item, { params: { tipo } });
  return response.data;
};

export const deleteCatalogItem = async (id: number): Promise<void> => {
  await api.delete(`/configuracion/catalogo/${id}`);
};

export const getAllServicesCatalog = async (incluirInactivos = false): Promise<ServiceCatalog[]> => {
  const response = await api.get('/catalogo-servicios', { params: { incluirInactivos } });
  return response.data;
};

export const createServiceCatalog = async (service: Partial<ServiceCatalog>): Promise<ServiceCatalog> => {
  const response = await api.post('/catalogo-servicios', service);
  return response.data;
};

export const updateServiceCatalog = async (id: number, service: Partial<ServiceCatalog>): Promise<ServiceCatalog> => {
  const response = await api.put(`/catalogo-servicios/${id}`, service);
  return response.data;
};