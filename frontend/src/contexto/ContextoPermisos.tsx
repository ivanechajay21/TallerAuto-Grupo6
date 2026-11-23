import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { getMyPermissions } from '../servicios/permisosServicio';

interface PermissionContextValue {
  permissions: string[];
  loading: boolean;
  hasPermission: (code: string) => boolean;
  hasAny: (codes: string[]) => boolean;
  refresh: () => Promise<void>;
}

const PermissionContext = createContext<PermissionContextValue>({
  permissions: [],
  loading: true,
  hasPermission: () => true,
  hasAny: () => true,
  refresh: async () => {},
});

export function PermissionProvider({ children }: { children: ReactNode }) {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const codes = await getMyPermissions();
      setPermissions(codes);
    } catch {
      // El backend sigue siendo la autoridad (403 por cada request). Si la recarga
      // falla, conservamos lo último conocido (la UI nunca AMPLÍA acceso, solo puede
      // tardar unos segundos en reflejar una quita). En el primer arranque sin datos,
      // la lista queda vacía: menú oculto y guards redirigen a /acceso (fail-closed).
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // Recarga periódica + al volver a la pestaña: así un cambio de permisos hecho
    // por el administrador se refleja en el usuario afectado sin necesidad de F5.
    const id = window.setInterval(refresh, 60000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    const onFocus = () => refresh();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const hasPermission = (code: string) => permissions.includes(code);
  const hasAny = (codes: string[]) => codes.some((c) => permissions.includes(c));

  return (
    <PermissionContext.Provider value={{ permissions, loading, hasPermission, hasAny, refresh }}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions() {
  return useContext(PermissionContext);
}
