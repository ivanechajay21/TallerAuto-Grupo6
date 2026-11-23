import api from './api';

export interface Role {
  id: number;
  name: string;
  description: string;
  system: boolean;
  permissions: string[];
  usersCount: number;
}

export const getRoles = async (): Promise<Role[]> => {
  const response = await api.get('/roles');
  return response.data;
};

export const createRole = async (name: string, description?: string): Promise<Role> => {
  const response = await api.post('/roles', { name, description });
  return response.data;
};

export const updateRole = async (id: number, name: string, description?: string): Promise<Role> => {
  const response = await api.put(`/roles/${id}`, { name, description });
  return response.data;
};

export const deleteRole = async (id: number): Promise<void> => {
  await api.delete(`/roles/${id}`);
};

export const setRolePermissions = async (id: number, codes: string[]): Promise<Role> => {
  const response = await api.put(`/roles/${id}/permisos`, codes);
  return response.data;
};