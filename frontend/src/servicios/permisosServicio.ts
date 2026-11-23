import api from './api';

export interface Permission {
  id: number;
  code: string;
  module: string;
  submodule: string;
  action: string;
  name: string;
}

export const getMyPermissions = async (): Promise<string[]> => {
  const response = await api.get('/usuarios/actual/permisos');
  return response.data;
};

export const getAllPermissions = async (): Promise<Permission[]> => {
  const response = await api.get('/permisos');
  return response.data;
};