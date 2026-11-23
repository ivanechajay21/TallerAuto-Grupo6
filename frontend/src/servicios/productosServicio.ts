import api from './api';

export interface Product {
  id: number;
  code: string;
  name: string;
  description?: string;
  brand?: string;
  category?: string;
  purchasePrice: number;
  salePrice: number;
  currentStock: number;
  minStock: number;
  active: boolean;
}

export interface InventoryTransactionInfo {
  id: number;
  type: 'IN' | 'OUT';
  quantity: number;
  unitPrice: number;
  reference?: string;
  transactionDate: string;
}

export interface ProductPayload {
  code: string;
  name: string;
  description?: string;
  brand?: string;
  category?: string;
  purchasePrice: number;
  salePrice: number;
  currentStock?: number;
  minStock: number;
  active?: boolean;
}

export type ProductStockFilter = 'TODOS' | 'BAJO' | 'AGOTADO' | 'INACTIVO';

export interface ProductSummary {
  total: number;
  lowStock: number;
  outOfStock: number;
  inactive: number;
  value: number;
}

export interface ProductPage {
  content: Product[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  summary: ProductSummary;
  categories: string[];
}

export interface ProductQuery {
  page?: number;
  size?: number;
  incluirInactivos?: boolean;
  search?: string;
  category?: string;
  stock?: ProductStockFilter;
}

export const getPaginatedProducts = async (query: ProductQuery = {}): Promise<ProductPage> => {
  const response = await api.get('/productos/paginado', { params: query });
  return response.data;
};

export const getAllProducts = async (
  params: { incluirInactivos?: boolean; search?: string } = {}
): Promise<Product[]> => {
  const response = await api.get('/productos', { params });
  return response.data;
};

export const getProductById = async (id: number): Promise<Product> => {
  const response = await api.get(`/productos/${id}`);
  return response.data;
};

export const createProduct = async (payload: ProductPayload): Promise<Product> => {
  const response = await api.post('/productos', payload);
  return response.data;
};

export const updateProduct = async (id: number, payload: ProductPayload): Promise<Product> => {
  const response = await api.put(`/productos/${id}`, payload);
  return response.data;
};

export const deleteProduct = async (id: number): Promise<void> => {
  await api.delete(`/productos/${id}`);
};

export const adjustStock = async (
  id: number,
  payload: { quantity: number; type: 'IN' | 'OUT'; reference?: string }
): Promise<Product> => {
  const response = await api.post(`/productos/${id}/existencia`, payload);
  return response.data;
};

export const getProductTransactions = async (id: number): Promise<InventoryTransactionInfo[]> => {
  const response = await api.get(`/productos/${id}/movimientos`);
  return response.data;
};