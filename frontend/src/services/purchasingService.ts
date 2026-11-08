import api from './api';

export interface Supplier {
  id: number;
  businessName: string;
  taxId: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  active: boolean;
}

export interface SupplierPayload {
  businessName: string;
  taxId: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  active?: boolean;
}

export interface Contract {
  id: number;
  code: string;
  supplier: Supplier;
  startsAt: string;
  endsAt: string;
  currency: string;
  discountPercentage: number;
  paymentDays: number;
  minimumPurchase: number;
  terms?: string;
  active: boolean;
}

export interface ContractPayload {
  startsAt: string;
  endsAt: string;
  currency: string;
  discountPercentage: number;
  paymentDays: number;
  minimumPurchase: number;
  terms?: string;
  active?: boolean;
}

export interface ProductSummary {
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

export interface PurchaseItem {
  id: number;
  product: ProductSummary;
  requestedQuantity: number;
  receivedQuantity: number;
  returnedQuantity: number;
  unitCost: number;
}

export interface PurchaseOrder {
  id: number;
  code: string;
  supplier: Supplier;
  status: string;
  issueDate: string;
  expectedDate?: string;
  notes?: string;
  total: number;
  items: PurchaseItem[];
}

export interface CreatePurchasePayload {
  supplierId: number;
  expectedDate?: string;
  notes?: string;
  items: Array<{ productId: number; quantity: number; unitCost: number }>;
}

export interface ApprovalLevel {
  id: number;
  level: number;
  amountFrom: number;
  amountTo?: number;
  requiredRole: string;
  requiredApprovals: number;
  active: boolean;
}

export interface ApprovalDecision {
  id: number;
  purchaseOrder: { id: number; code: string; status: string };
  level: ApprovalLevel;
  decision: string;
  decidedAt: string;
  comment?: string;
}

export interface Reception {
  id: number;
  receiptNumber: string;
  receivedAt: string;
  notes?: string;
  items: Array<{ id: number; product: ProductSummary; quantity: number; unitCost: number }>;
}

export interface Tracking {
  id: number;
  purchaseOrder: { id: number; code: string; status: string };
  status: string;
  dispatchedAt?: string;
  estimatedArrival?: string;
  actualArrival?: string;
  shippingGuide?: string;
  carrier?: string;
  notes?: string;
}

export interface ReplenishmentSuggestion {
  productId: number;
  code: string;
  name: string;
  currentStock: number;
  minStock: number;
  suggestedQuantity: number;
  policyApplied: boolean;
  reorderPoint?: number;
  targetStock?: number;
  minimumLot?: number;
  leadTimeDays?: number;
  preferredSupplierId?: number;
  preferredSupplier?: string;
}

export interface PurchaseRequest {
  id: number;
  code: string;
  requestedAt: string;
  status: string;
  notes?: string;
  items: Array<{ id: number; product: ProductSummary; quantity: number }>;
}

export interface SupplyPolicy {
  id: number;
  product: ProductSummary;
  preferredSupplier?: Supplier;
  reorderPoint: number;
  minimumLot: number;
  targetStock: number;
  leadTimeDays: number;
  active: boolean;
}

export interface SupplyPlan {
  id: number;
  code: string;
  period: string;
  status: string;
  createdAt: string;
  notes?: string;
  items: Array<{
    id: number;
    product: ProductSummary;
    suggestedQuantity: number;
    stockAtPlanning: number;
    forecastQuantity: number;
  }>;
}

export interface Forecast {
  id: number;
  period: string;
  product: ProductSummary;
  forecastQuantity: number;
  safetyStock: number;
  registeredAt: string;
  notes?: string;
}

export interface Payable {
  id: number;
  number: string;
  issueDate: string;
  dueDate: string;
  total: number;
  balance: number;
  status: string;
  purchaseOrder: { id: number; code: string; status: string; supplierName: string };
  payments: Array<{ id: number; amount: number; method: string; paidAt: string; reference?: string }>;
}

export interface SupplyDashboard {
  criticalProducts: number;
  pendingRequests: number;
  pendingOrders: number;
  delayedShipments: number;
  openDebt: number;
  topSuppliers: Array<{ supplierId: number; supplier: string; averageScore: number; evaluations: number }>;
  actions: Array<{ type: string; message: string }>;
}

export interface BudgetStatus {
  period: string;
  limitAmount: number;
  committedAmount: number;
  availableAmount: number;
  percentageUsed: number;
  status: string;
}

// Proveedores y contratos
export const getSuppliers = (includeInactive = true) =>
  api.get<Supplier[]>('/proveedores', { params: { incluirInactivos: includeInactive } }).then((r) => r.data);
export const createSupplier = (payload: SupplierPayload) =>
  api.post<Supplier>('/proveedores', payload).then((r) => r.data);
export const updateSupplier = (id: number, payload: SupplierPayload) =>
  api.put<Supplier>(`/proveedores/${id}`, payload).then((r) => r.data);
export const deactivateSupplier = (id: number) => api.delete(`/proveedores/${id}`);

export const getContracts = (supplierId: number) =>
  api.get<Contract[]>(`/proveedores/${supplierId}/contratos`).then((r) => r.data);
export const createContract = (supplierId: number, payload: ContractPayload) =>
  api.post<Contract>(`/proveedores/${supplierId}/contratos`, payload).then((r) => r.data);
export const updateContract = (supplierId: number, id: number, payload: ContractPayload) =>
  api.put<Contract>(`/proveedores/${supplierId}/contratos/${id}`, payload).then((r) => r.data);
export const deactivateContract = (supplierId: number, id: number) =>
  api.patch<Contract>(`/proveedores/${supplierId}/contratos/${id}/desactivar`).then((r) => r.data);
export const reactivateContract = (supplierId: number, id: number) =>
  api.patch<Contract>(`/proveedores/${supplierId}/contratos/${id}/reactivar`).then((r) => r.data);

// Compras
export const getPurchases = () => api.get<PurchaseOrder[]>('/compras').then((r) => r.data);
export const getPurchase = (id: number) => api.get<PurchaseOrder>(`/compras/${id}`).then((r) => r.data);
export const createPurchase = (payload: CreatePurchasePayload) =>
  api.post<PurchaseOrder>('/compras', payload).then((r) => r.data);
export const cancelPurchase = (id: number) =>
  api.patch<PurchaseOrder>(`/compras/${id}/anular`).then((r) => r.data);
export const receivePurchase = (id: number, items: Array<{ purchaseItemId: number; quantity: number }>, notes?: string) =>
  api.post<Reception>(`/compras/${id}/recepciones`, { notes, items }).then((r) => r.data);
export const getReceptions = (id: number) =>
  api.get<Reception[]>(`/compras/${id}/recepciones`).then((r) => r.data);
export const getReturns = (id: number) => api.get(`/compras/${id}/devoluciones`).then((r) => r.data);
export const getPurchaseHistory = (id: number) => api.get(`/compras/${id}/historial`).then((r) => r.data);
export const getTracking = (id: number) => api.get<Tracking>(`/compras/${id}/seguimiento`).then((r) => r.data);
export const saveTracking = (id: number, payload: Omit<Tracking, 'id' | 'purchaseOrder'>) =>
  api.put<Tracking>(`/compras/${id}/seguimiento`, payload).then((r) => r.data);

// Aprobaciones
export const getApprovalLevels = () =>
  api.get<ApprovalLevel[]>('/compras/aprobaciones/niveles').then((r) => r.data);
export const createApprovalLevel = (payload: Omit<ApprovalLevel, 'id'>) =>
  api.post<ApprovalLevel>('/compras/aprobaciones/niveles', payload).then((r) => r.data);
export const getApprovalHistory = (orderId: number) =>
  api.get<ApprovalDecision[]>(`/compras/aprobaciones/orden/${orderId}`).then((r) => r.data);
export const decideApproval = (orderId: number, levelId: number, decision: 'APROBADA' | 'RECHAZADA', comment?: string) =>
  api.post<ApprovalDecision>(`/compras/aprobaciones/orden/${orderId}/nivel/${levelId}`, null, {
    params: { decision, comment },
  }).then((r) => r.data);

// Reposición y planificación
export const getReplenishmentSuggestions = () =>
  api.get<ReplenishmentSuggestion[]>('/reposicion/sugerencias').then((r) => r.data);
export const getPurchaseRequests = () =>
  api.get<PurchaseRequest[]>('/reposicion/solicitudes').then((r) => r.data);
export const createPurchaseRequest = (payload: { notes?: string; items: Array<{ productId: number; quantity: number }> }) =>
  api.post<PurchaseRequest>('/reposicion/solicitudes', payload).then((r) => r.data);
export const changePurchaseRequestStatus = (id: number, status: string, comment?: string) =>
  api.patch<PurchaseRequest>(`/reposicion/solicitudes/${id}/estado`, { status, comment }).then((r) => r.data);
export const convertPurchaseRequest = (id: number, supplierId: number) =>
  api.post(`/reposicion/solicitudes/${id}/convertir-orden`, null, { params: { supplierId } }).then((r) => r.data);

export const getPolicies = () => api.get<SupplyPolicy[]>('/reposicion/politicas').then((r) => r.data);
export const savePolicy = (productId: number, supplierId: number | null, payload: Partial<SupplyPolicy>) =>
  api.put<SupplyPolicy>(`/reposicion/politicas/producto/${productId}`, payload, {
    params: supplierId ? { supplierId } : undefined,
  }).then((r) => r.data);

export const getPlans = () => api.get<SupplyPlan[]>('/planificacion-abastecimiento/planes').then((r) => r.data);
export const createPlan = (payload: { period: string; notes?: string; items: Array<{ productId: number; quantity: number }> }) =>
  api.post<SupplyPlan>('/planificacion-abastecimiento/planes', payload).then((r) => r.data);
export const generatePlan = (period: string, notes?: string) =>
  api.post<SupplyPlan>('/planificacion-abastecimiento/planes/generar', null, { params: { period, notes } }).then((r) => r.data);
export const convertPlan = (id: number) =>
  api.post<PurchaseRequest>(`/planificacion-abastecimiento/planes/${id}/convertir-solicitud`).then((r) => r.data);
export const getForecasts = (period: string) =>
  api.get<Forecast[]>('/planificacion-abastecimiento/pronosticos', { params: { period } }).then((r) => r.data);
export const saveForecast = (productId: number, payload: { period: string; forecastQuantity: number; safetyStock: number; notes?: string }) =>
  api.put<Forecast>(`/planificacion-abastecimiento/pronosticos/productos/${productId}`, payload).then((r) => r.data);

// Cuentas por pagar y presupuesto
export const getPayables = () => api.get<Payable[]>('/cuentas-por-pagar').then((r) => r.data);
export const createPayable = (payload: { purchaseOrderId: number; number: string; issueDate: string; dueDate: string; total: number }) =>
  api.post<Payable>('/cuentas-por-pagar', payload).then((r) => r.data);
export const payPayable = (id: number, payload: { amount: number; method: string; reference?: string }) =>
  api.post<Payable>(`/cuentas-por-pagar/${id}/pagos`, payload).then((r) => r.data);
export const cancelPayable = (id: number) =>
  api.patch<Payable>(`/cuentas-por-pagar/${id}/anular`).then((r) => r.data);

export const getBudget = (period: string) =>
  api.get<BudgetStatus>(`/presupuestos-compras/${period}`).then((r) => r.data);
export const saveBudget = (payload: { period: string; limitAmount: number; alertPercentage: number; active?: boolean }) =>
  api.post('/presupuestos-compras', payload).then((r) => r.data);

// Tablero y reportes
export const getSupplyDashboard = () =>
  api.get<SupplyDashboard>('/abastecimiento/tablero').then((r) => r.data);
export const getPurchaseReportSummary = () =>
  api.get('/reportes/compras/resumen').then((r) => r.data);
export const getPurchaseReportSuppliers = () =>
  api.get('/reportes/compras/proveedores').then((r) => r.data);
