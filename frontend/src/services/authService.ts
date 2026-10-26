import api from './api';

export interface CurrentUser {
  token: string;
  id: number;
  username: string;
  email: string;
  roles: string[];
  name: string;
  lastName: string;
  roleName: string;
  avatarUrl?: string;
  lastLogin?: string;
  type: string;
}

export const login = async (
  username: string,
  password: string,
  remember: boolean = true
): Promise<CurrentUser> => {
  const response = await api.post('/autenticacion/ingresar', { username, password });
  const data = response.data as CurrentUser;
  if (remember) {
    localStorage.setItem('user', JSON.stringify(data));
  } else {
    sessionStorage.setItem('user', JSON.stringify(data));
  }
  return data;
};

export const logout = () => {
  localStorage.removeItem('user');
  sessionStorage.removeItem('user');
};

export const getCurrentUser = (): CurrentUser | null => {
  const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
  if (userStr) {
    try {
      return JSON.parse(userStr) as CurrentUser;
    } catch {
      return null;
    }
  }
  return null;
};

export const getUserId = (): number | null => {
  return getCurrentUser()?.id ?? null;
};

export const isRole = (...roles: string[]): boolean => {
  const user = getCurrentUser();
  if (!user) return false;
  const normalized = roles.map((r) => (r.startsWith('ROLE_') ? r : `ROLE_${r}`));
  return user.roles.some((r) => normalized.includes(r));
};

export const forgotPassword = async (email: string) => {
  const response = await api.post('/autenticacion/olvidar-contrasena', { email });
  return response.data;
};

export const resetPassword = async (token: string, newPassword: string) => {
  const response = await api.post('/autenticacion/restablecer-contrasena', { token, newPassword });
  return response.data;
};

export const getMe = async () => {
  const response = await api.get('/autenticacion/perfil');
  return response.data;
};
