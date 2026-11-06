import api from './api';

export type DocumentType = 'FACTURA' | 'BOLETA';
export type CustomerDocumentType = 'DNI' | 'RUC' | 'OTRO';

export interface InvoiceItem {
  id?: number;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Invoice {
  id: number;
  invoiceNumber: string;
  documentType?: DocumentType;
  documentTypeLabel?: string;
  series?: string;
  correlative?: number;
  customerDocumentType?: CustomerDocumentType;
  issueDate: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  status: 'PENDING' | 'PAID' | 'CANCELLED';
  paymentMethod?: string;
  customer?: string;
  documentNumber?: string;
  customerPhone?: string;
  vehicle?: string;
  vehiclePlate?: string;
  vehicleBrand?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  items?: InvoiceItem[];
  workOrder?: { id: number; orderNumber: string };
}

export const getAllInvoices = async (): Promise<Invoice[]> => {
  const response = await api.get('/facturas');
  return response.data;
};

export const getInvoiceById = async (id: number): Promise<Invoice> => {
  const response = await api.get(`/facturas/${id}`);
  return response.data;
};

export const generateInvoice = async (
  workOrderId: number,
  documentType: DocumentType = 'FACTURA'
): Promise<Invoice> => {
  const response = await api.post(`/facturas/orden-trabajo/${workOrderId}`, {
    tipoComprobante: documentType,
  });
  return response.data;
};

export const payInvoice = async (id: number, paymentMethod: string): Promise<Invoice> => {
  const response = await api.patch(`/facturas/${id}/pagar`, null, { params: { paymentMethod } });
  return response.data;
};