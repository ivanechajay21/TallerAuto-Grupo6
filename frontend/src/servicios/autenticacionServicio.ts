import api, { ensureCsrf } from './api';

export interface CurrentUser {
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

export interface MfaSetupData {
  secret: string;
  otpauthUri: string;
  qrImage: string;
}

export interface LoginResult {
  id?: number;
  username?: string;
  email?: string;
  roles?: string[];
  name?: string;
  lastName?: string;
  roleName?: string;
  avatarUrl?: string;
  lastLogin?: string;
  type?: string;
  mfaRequired?: boolean;
  challengeToken?: string;
  mfaSetupRequired?: boolean;
  setupToken?: string;
  message?: string;
  recoveryCodes?: string[];
}

const persistUser = (data: LoginResult, remember: boolean) => {
  if (!data.username) return;
  const user: CurrentUser = {
    id: data.id ?? 0,
    username: data.username,
    email: data.email ?? '',
    roles: data.roles ?? [],
    name: data.name ?? '',
    lastName: data.lastName ?? '',
    roleName: data.roleName ?? '',
    avatarUrl: data.avatarUrl,
    lastLogin: data.lastLogin,
    type: data.type ?? 'Bearer',
  };
  if (remember) {
    localStorage.setItem('user', JSON.stringify(user));
  } else {
    sessionStorage.setItem('user', JSON.stringify(user));
  }
};

export const login = async (
  username: string,
  password: string,
  remember: boolean = true
): Promise<LoginResult> => {
  await ensureCsrf();
  const response = await api.post('/autenticacion/ingresar', { username, password, remember });
  const data = response.data as LoginResult;
  if (!data.mfaRequired && !data.mfaSetupRequired) {
    persistUser(data, remember);
  }
  return data;
};

export const verifyMfa = async (
  challengeToken: string,
  code: string,
  remember: boolean = true
): Promise<LoginResult> => {
  await ensureCsrf();
  const response = await api.post('/autenticacion/mfa/verificar', {
    challengeToken,
    code,
    remember,
  });
  const data = response.data as LoginResult;
  persistUser(data, remember);
  return data;
};

export const configurarMfa = async (setupToken: string): Promise<MfaSetupData> => {
  await ensureCsrf();
  const response = await api.post('/autenticacion/mfa/configurar', { setupToken });
  return response.data as MfaSetupData;
};

export const activarMfa = async (
  setupToken: string,
  code: string,
  remember: boolean = true
): Promise<LoginResult> => {
  await ensureCsrf();
  const response = await api.post('/autenticacion/mfa/activar', {
    setupToken,
    code,
    remember,
  });
  const data = response.data as LoginResult;
  persistUser(data, remember);
  return data;
};

export const getMfaStatus = async () => {
  const response = await api.get('/autenticacion/mfa/estado');
  return response.data as { enabled: boolean; requiredForAdmin: boolean };
};

export const disableMfa = async (password: string, code: string) => {
  const response = await api.post('/autenticacion/mfa/desactivar', { password, code });
  return response.data;
};

export const logout = () => {
  localStorage.removeItem('user');
  sessionStorage.removeItem('user');
};

export const cerrarSesion = async () => {
  try {
    await ensureCsrf();
    await api.post('/autenticacion/salir');
  } catch {
    // La sesión local se limpia aunque el servidor no responda.
  } finally {
    logout();
  }
};

/**
 * Normaliza nombres heredados de la siembra antigua para que una sesión ya
 * guardada en el navegador no siga mostrando datos en inglés.
 */
function normalizeLegacyUser(user: CurrentUser): CurrentUser {
  const esAdminAntiguo =
    (user.name === 'Admin' && user.lastName === 'System') || user.name === 'Admin System';
  if (!esAdminAntiguo) return user;
  return { ...user, name: 'Administrador', lastName: 'del Sistema' };
}

export const getCurrentUser = (): CurrentUser | null => {
  const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
  if (userStr) {
    try {
      const parsed = JSON.parse(userStr) as CurrentUser & { token?: string };
      // Limpiar JWT heredado de versiones que usaban localStorage.
      const teniaToken = Boolean(parsed.token);
      if (teniaToken) delete parsed.token;
      const normalized = normalizeLegacyUser(parsed);
      if (normalized !== parsed || teniaToken) {
        const serialized = JSON.stringify(normalized);
        if (localStorage.getItem('user')) localStorage.setItem('user', serialized);
        if (sessionStorage.getItem('user')) sessionStorage.setItem('user', serialized);
      }
      return normalized;
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
  await ensureCsrf();
  const response = await api.post('/autenticacion/olvidar-contrasena', { email });
  return response.data;
};

export const resetPassword = async (token: string, newPassword: string) => {
  await ensureCsrf();
  const response = await api.post('/autenticacion/restablecer-contrasena', { token, newPassword });
  return response.data;
};

export const getMe = async () => {
  const response = await api.get('/autenticacion/perfil');
  return response.data;
};
