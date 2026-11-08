import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import TopProgressBar from './components/TopProgressBar';
import SplashScreen from './components/SplashScreen';
import RouteLoading from './components/RouteLoading';
import { RequirePermission, HomeRedirect } from './components/RouteGuard';

const Login = lazy(() => import('./pages/Login'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Customers = lazy(() => import('./pages/Customers'));
const Vehicles = lazy(() => import('./pages/Vehicles'));
const Appointments = lazy(() => import('./pages/Appointments'));
const WorkOrders = lazy(() => import('./pages/WorkOrders'));
const Reception = lazy(() => import('./pages/Reception'));
const MyWork = lazy(() => import('./pages/MyWork'));
const Inventory = lazy(() => import('./pages/Inventory'));
const Billing = lazy(() => import('./pages/Billing'));
const Suppliers = lazy(() => import('./pages/Suppliers'));
const Purchases = lazy(() => import('./pages/Purchases'));
const Supply = lazy(() => import('./pages/Supply'));
const Reports = lazy(() => import('./pages/Reports'));
const Audit = lazy(() => import('./pages/Audit'));
const Users = lazy(() => import('./pages/Users'));
const Roles = lazy(() => import('./pages/Roles'));
const Configuracion = lazy(() => import('./pages/Configuracion'));

const PublicRoute = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<RouteLoading fullscreen />}>{children}</Suspense>
);

function App() {
  const [splashHiding, setSplashHiding] = useState(false);
  const [splashGone, setSplashGone] = useState(false);

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