import api from './api';

export interface DashboardMetrics {
  totalCustomers: number;
  totalWorkOrders: number;
  totalRevenue: number;
  pendingAppointments: number;
}

export const getDashboardMetrics = async (): Promise<DashboardMetrics> => {
  const response = await api.get('/reportes/panel-indicadores');
  return response.data;
};

export type ReporteTipo = 'CLIENTES' | 'VEHICULOS' | 'REPARACIONES' | 'INVENTARIO' | 'CITAS';

export interface ReporteTotal {
  etiqueta: string;
  valor: string | number;
  money?: boolean;
}

export interface ReporteCentro {
  tipo: ReporteTipo;
  titulo: string;
  columnas: string[];
  tipos: Array<'TEXT' | 'NUM' | 'MONEY'>;
  filas: Array<Array<string | number>>;
  totales: ReporteTotal[];
}

export const getReporteCentro = async (tipo: ReporteTipo): Promise<ReporteCentro> => {
  const response = await api.get('/reportes/centro', { params: { tipo } });
  return response.data;
};

export interface MonthlyRevenueRow {
  name: string;
  servicios: number;
  repuestos: number;
}

export interface TopService {
  name: string;
  value: number;
}

export const getMonthlyRevenue = async (): Promise<MonthlyRevenueRow[]> => {
  const response = await api.get('/reportes/ingresos-mensuales');
  return response.data;
};

export const getTopServices = async (): Promise<TopService[]> => {
  const response = await api.get('/reportes/servicios-mas-solicitados');
  return response.data;
};

export type DashboardPeriod = 'HOY' | '7' | '30' | 'YEAR';

export interface DashboardSummary {
  clientesRegistrados: number;
  vehiculosRegistrados: number;
  citasDelDia: number;
  ordenesPendientes: number;
  ordenesEnProceso: number;
  vehiculosListos: number;
  reparacionesFinalizadas: number;
  ingresos: number;
  valorInventario: number;
  stockBajo: number;
  productosAgotados: number;
}

export interface DashboardLineRow {
  name: string;
  citas: number;
  reparaciones: number;
  ingresos: number;
  vehiculos: number;
}

export interface DashboardDonutRow {
  name: string;
  value: number;
}

export interface DashboardBars {
  servicios: TopService[];
  repuestos: TopService[];
  reparacionesPorPeriodo: TopService[];
  trabajosPorMecanico: TopService[];
}

export const getDashboardSummary = async (periodo: DashboardPeriod): Promise<DashboardSummary> => {
  const response = await api.get('/reportes/panel-resumen', { params: { periodo } });
  return response.data;
};

export const getDashboardLine = async (periodo: DashboardPeriod): Promise<DashboardLineRow[]> => {
  const response = await api.get('/reportes/panel-linea', { params: { periodo } });
  return response.data;
};

export const getDashboardDonut = async (): Promise<DashboardDonutRow[]> => {
  const response = await api.get('/reportes/panel-dona');
  return response.data;
};

export const getDashboardBars = async (periodo: DashboardPeriod): Promise<DashboardBars> => {
  const response = await api.get('/reportes/panel-barras', { params: { periodo } });
  return response.data;
};