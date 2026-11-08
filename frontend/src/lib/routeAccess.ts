// Mapeo ruta → permiso requerido para abrir cada página de la app.
// Debe mantenerse sincronizado con las rutas de App.tsx y el Sidebar.
export const ROUTE_PERMISSIONS: Record<string, string> = {
  '/panel': 'DASHBOARD:VER',
  '/recepcion': 'RECEPCION:VER',
  '/recepcion/nueva': 'RECEPCION:CREAR',
  '/ordenes-trabajo': 'ORDENES:VER',
  '/mi-trabajo': 'MI_TRABAJO:VER',
  '/clientes': 'CLIENTES:VER',
  '/vehiculos': 'VEHICULOS:VER',
  '/citas': 'CITAS:VER',
  '/inventario': 'PRODUCTOS:VER',
  '/facturacion': 'FACTURAS:VER',
  '/proveedores': 'PROVEEDORES:VER',
  '/compras': 'COMPRAS:VER',
  '/abastecimiento': 'COMPRAS:VER',
  '/reportes': 'REPORTES:VER',
  '/usuarios': 'USUARIOS:VER',
  '/roles': 'ROLES:VER',
  '/auditoria': 'AUDITORIA:VER',
  '/configuracion': 'CONFIGURACION:VER',
};

// Orden de prioridad para elegir la página de inicio de cada rol
// (el rol aterriza en la primera ruta que tenga permitida).
export const HOME_ROUTES: { path: string; permission: string }[] = [
  { path: '/panel', permission: 'DASHBOARD:VER' },
  { path: '/ordenes-trabajo', permission: 'ORDENES:VER' },
  { path: '/mi-trabajo', permission: 'MI_TRABAJO:VER' },
  { path: '/clientes', permission: 'CLIENTES:VER' },
  { path: '/vehiculos', permission: 'VEHICULOS:VER' },
  { path: '/citas', permission: 'CITAS:VER' },
  { path: '/inventario', permission: 'PRODUCTOS:VER' },
  { path: '/recepcion', permission: 'RECEPCION:VER' },
  { path: '/facturacion', permission: 'FACTURAS:VER' },
  { path: '/proveedores', permission: 'PROVEEDORES:VER' },
  { path: '/compras', permission: 'COMPRAS:VER' },
  { path: '/abastecimiento', permission: 'COMPRAS:VER' },
  { path: '/reportes', permission: 'REPORTES:VER' },
  { path: '/usuarios', permission: 'USUARIOS:VER' },
  { path: '/roles', permission: 'ROLES:VER' },
  { path: '/auditoria', permission: 'AUDITORIA:VER' },
  { path: '/configuracion', permission: 'CONFIGURACION:VER' },
];

// Devuelve la primera ruta permitida según los permisos del usuario; si no tiene
// ninguna, cae al login.
export function getFirstAllowedRoute(permissions: string[]): string {
  const found = HOME_ROUTES.find((r) => permissions.includes(r.permission));
  return found ? found.path : '/acceso';
}