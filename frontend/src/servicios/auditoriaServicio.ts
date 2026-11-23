import api from './api';

export interface AuditLog {
  id: number;
  action: string;
  actionLabel: string;
  entity: string;
  entityId?: number;
  username: string;
  details?: string;
  timestamp?: string;
}

export interface AuditActionOption {
  action: string;
  label: string;
}

export const getAuditLogs = async (action?: string, search?: string): Promise<AuditLog[]> => {
  const response = await api.get('/auditoria', {
    params: { action: action || undefined, search: search || undefined },
  });
  return response.data;
};

export const getAuditActions = async (): Promise<AuditActionOption[]> => {
  const response = await api.get('/auditoria/acciones');
  return response.data;
};