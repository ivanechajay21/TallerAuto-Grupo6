import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { usePermissions } from '../contexto/ContextoPermisos';
import { getFirstAllowedRoute } from '../lib/accesoRutas';
import RouteLoading from './CargandoRuta';

interface RequirePermissionProps {
  permission: string;
  children: ReactNode;
}

/**
 * Bloquea una ruta según el permiso del usuario. Funciona igual que el Sidebar:
 * mientras los permisos cargan muestra el esqueleto de carga; si el usuario no
 * tiene el permiso (o no se le pudo verificar ninguno, fail-closed), redirige a
 * su primera ruta permitida — o al login si ya no tiene ningún módulo — en lugar
 * de montar la página.
 */
export function RequirePermission({ permission, children }: RequirePermissionProps) {
  const { permissions, loading } = usePermissions();

  if (loading) return <RouteLoading />;
  if (permissions.includes(permission)) return <>{children}</>;
  return <Navigate to={getFirstAllowedRoute(permissions)} replace />;
}

/**
 * Redirige a la ruta de inicio permitida para el rol actual (index y catch-all).
 */
export function HomeRedirect() {
  const { permissions, loading } = usePermissions();

  if (loading) return <RouteLoading />;
  return <Navigate to={getFirstAllowedRoute(permissions)} replace />;
}