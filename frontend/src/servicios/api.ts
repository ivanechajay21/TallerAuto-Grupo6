import axios from 'axios';
import { logout } from './autenticacionServicio';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
});

let csrfReady: Promise<void> | null = null;

/**
 * Garantiza que exista la cookie CSRF antes de un POST autenticado.
 */
export const ensureCsrf = async (): Promise<void> => {
  if (!csrfReady) {
    csrfReady = api.get('/autenticacion/csrf')
      .then(() => undefined)
      .catch(() => {
        csrfReady = null;
      });
  }
  return csrfReady;
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 403
      && error.config
      && !error.config._csrfRetry
      && String(error.response?.data?.message || '').includes('CSRF')) {
      error.config._csrfRetry = true;
      csrfReady = null;
      await ensureCsrf();
      return api.request(error.config);
    }
    if (error.response && error.response.status === 401) {
      logout();
      if (!window.location.pathname.startsWith('/acceso')) {
        window.location.href = '/acceso';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
