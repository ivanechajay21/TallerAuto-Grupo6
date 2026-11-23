import { Suspense, useEffect, useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from './BarraLateral';
import Header from './Encabezado';
import RouteLoading from './CargandoRuta';
import { PermissionProvider } from '../contexto/ContextoPermisos';
import { SettingsProvider } from '../contexto/ContextoConfiguracion';
import { getCurrentUser } from '../servicios/autenticacionServicio';
import { sendPresencePing } from '../servicios/usuariosServicio';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const user = getCurrentUser();

  // Latido de presencia: mantiene actualizado el indicador «En línea» del
  // módulo Usuarios sin depender de que el usuario abra esa pantalla.
  useEffect(() => {
    if (!getCurrentUser()) return;
    const ping = () => {
      if (document.visibilityState !== 'visible') return;
      sendPresencePing().catch(() => {
        /* La presencia no debe bloquear la navegación. */
      });
    };
    ping();
    const interval = window.setInterval(ping, 25000);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') ping();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  if (!user) {
    return <Navigate to="/acceso" replace />;
  }

  return (
    <PermissionProvider>
      <SettingsProvider>
        <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
          <Sidebar
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            collapsed={collapsed}
            onToggleCollapse={() => setCollapsed((v) => !v)}
          />
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <Header onToggleSidebar={() => setSidebarOpen((v) => !v)} />
            <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
              <Suspense fallback={<RouteLoading />}>
                <Outlet />
              </Suspense>
            </main>
          </div>
        </div>
      </SettingsProvider>
    </PermissionProvider>
  );
}