import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './componentes/Disposicion';
import TopProgressBar from './componentes/BarraProgresoSuperior';
import SplashScreen from './componentes/PantallaBienvenida';
import RouteLoading from './componentes/CargandoRuta';
import { RequirePermission, HomeRedirect } from './componentes/GuardiaRuta';
import { ensureCsrf } from './servicios/api';

const Login = lazy(() => import('./paginas/Acceso'));
const MfaAccess = lazy(() => import('./paginas/AccesoMfa'));
const ForgotPassword = lazy(() => import('./paginas/RecuperarContrasena'));
const ResetPassword = lazy(() => import('./paginas/RestablecerContrasena'));
const Dashboard = lazy(() => import('./paginas/Panel'));
const Customers = lazy(() => import('./paginas/Clientes'));
const Vehicles = lazy(() => import('./paginas/Vehiculos'));
const Appointments = lazy(() => import('./paginas/Citas'));
const WorkOrders = lazy(() => import('./paginas/OrdenesTrabajo'));
const Reception = lazy(() => import('./paginas/Recepcion'));
const MyWork = lazy(() => import('./paginas/MisTrabajos'));
const Inventory = lazy(() => import('./paginas/Inventario'));
const Billing = lazy(() => import('./paginas/Facturacion'));
const Suppliers = lazy(() => import('./paginas/Proveedores'));
const Purchases = lazy(() => import('./paginas/Compras'));
const Supply = lazy(() => import('./paginas/Abastecimiento'));
const Reports = lazy(() => import('./paginas/Reportes'));
const Audit = lazy(() => import('./paginas/Auditoria'));
const Users = lazy(() => import('./paginas/Usuarios'));
const Roles = lazy(() => import('./paginas/Roles'));
const Configuracion = lazy(() => import('./paginas/Configuracion'));

const PublicRoute = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<RouteLoading fullscreen />}>{children}</Suspense>
);

function App() {
  const [splashHiding, setSplashHiding] = useState(false);
  const [splashGone, setSplashGone] = useState(false);

  useEffect(() => {
    void ensureCsrf();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let minTimer: number;
    let goneTimer: number;
    const minDelay = new Promise<void>((resolve) => {
      minTimer = window.setTimeout(resolve, 1200);
    });
    Promise.all([minDelay, document.fonts ? document.fonts.ready : Promise.resolve()]).then(() => {
      if (cancelled) return;
      setSplashHiding(true);
      goneTimer = window.setTimeout(() => {
        if (!cancelled) setSplashGone(true);
      }, 700);
    });
    return () => {
      cancelled = true;
      window.clearTimeout(minTimer);
      window.clearTimeout(goneTimer);
    };
  }, []);

  return (
    <BrowserRouter>
      <TopProgressBar />
      {!splashGone && <SplashScreen hiding={splashHiding} />}
      <Routes>
        <Route
          path="/acceso"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/mfa"
          element={
            <PublicRoute>
              <MfaAccess />
            </PublicRoute>
          }
        />
        <Route
          path="/olvidar-contrasena"
          element={
            <PublicRoute>
              <ForgotPassword />
            </PublicRoute>
          }
        />
        <Route
          path="/restablecer-contrasena"
          element={
            <PublicRoute>
              <ResetPassword />
            </PublicRoute>
          }
        />

        {/* Protected Routes */}
        <Route path="/" element={<Layout />}>
          <Route index element={<HomeRedirect />} />
          <Route path="panel" element={<RequirePermission permission="DASHBOARD:VER"><Dashboard /></RequirePermission>} />
          <Route path="clientes" element={<RequirePermission permission="CLIENTES:VER"><Customers /></RequirePermission>} />
          <Route path="vehiculos" element={<RequirePermission permission="VEHICULOS:VER"><Vehicles /></RequirePermission>} />
          <Route path="citas" element={<RequirePermission permission="CITAS:VER"><Appointments /></RequirePermission>} />
          <Route path="ordenes-trabajo" element={<RequirePermission permission="ORDENES:VER"><WorkOrders /></RequirePermission>} />
          <Route path="recepcion" element={<RequirePermission permission="RECEPCION:VER"><Reception /></RequirePermission>} />
          <Route path="recepcion/nueva" element={<RequirePermission permission="RECEPCION:CREAR"><Reception /></RequirePermission>} />
          <Route path="mi-trabajo" element={<RequirePermission permission="MI_TRABAJO:VER"><MyWork /></RequirePermission>} />
          <Route path="inventario" element={<RequirePermission permission="PRODUCTOS:VER"><Inventory /></RequirePermission>} />
          <Route path="facturacion" element={<RequirePermission permission="FACTURAS:VER"><Billing /></RequirePermission>} />
          <Route path="proveedores" element={<RequirePermission permission="PROVEEDORES:VER"><Suppliers /></RequirePermission>} />
          <Route path="compras" element={<RequirePermission permission="COMPRAS:VER"><Purchases /></RequirePermission>} />
          <Route path="abastecimiento" element={<RequirePermission permission="COMPRAS:VER"><Supply /></RequirePermission>} />
          <Route path="reportes" element={<RequirePermission permission="REPORTES:VER"><Reports /></RequirePermission>} />
          <Route path="auditoria" element={<RequirePermission permission="AUDITORIA:VER"><Audit /></RequirePermission>} />
          <Route path="usuarios" element={<RequirePermission permission="USUARIOS:VER"><Users /></RequirePermission>} />
          <Route path="roles" element={<RequirePermission permission="ROLES:VER"><Roles /></RequirePermission>} />
          <Route path="configuracion" element={<RequirePermission permission="CONFIGURACION:VER"><Configuracion /></RequirePermission>} />
          <Route path="*" element={<HomeRedirect />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;