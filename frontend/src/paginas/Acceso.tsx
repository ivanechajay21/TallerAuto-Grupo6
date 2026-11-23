import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login, getCurrentUser } from '../servicios/autenticacionServicio';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  Wrench,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Gauge,
  CalendarCheck,
  ClipboardList,
  CheckCircle2,
  Cog,
  Settings,
} from 'lucide-react';
import { useToast } from '../componentes/interfaz/Avisos';
import ThemeToggle from '../componentes/BotonTema';
import { cn } from '../lib/utilidades';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [entering, setEntering] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [granted, setGranted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [userName, setUserName] = useState('');
  const navigate = useNavigate();
  const toast = useToast();

  // Cuenta 0 -> 100 mientras el overlay de ingreso está visible.
  useEffect(() => {
    if (!entering) return;
    setProgress(0);
    setGranted(false);
    const duration = 900;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const value = Math.min(100, Math.round(((now - start) / duration) * 100));
      setProgress(value);
      if (value < 100) {
        frame = requestAnimationFrame(tick);
      } else {
        setGranted(true);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [entering]);

  // Secuencia de salida: cierra el obturador y navega al panel.
  useEffect(() => {
    if (!entering) return;
    const closeTimer = window.setTimeout(() => setLeaving(true), 1400);
    const goTimer = window.setTimeout(() => {
      navigate('/panel');
      setEntering(false);
      setLeaving(false);
      setGranted(false);
    }, 1900);
    return () => {
      window.clearTimeout(closeTimer);
      window.clearTimeout(goTimer);
    };
  }, [entering, navigate]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(username.trim(), password, remember);
      if (result.mfaRequired && result.challengeToken) {
        sessionStorage.setItem('mfaChallenge', result.challengeToken);
        sessionStorage.setItem('mfaRemember', String(remember));
        navigate('/mfa');
        return;
      }
      if (result.mfaSetupRequired && result.setupToken) {
        sessionStorage.setItem('mfaSetup', result.setupToken);
        sessionStorage.setItem('mfaRemember', String(remember));
        navigate('/mfa');
        return;
      }
      if (!result.username) {
        setError(result.message || 'No se pudo completar el inicio de sesión.');
        return;
      }
      // Animación de ingreso: overlay "HUD" antes de entrar al panel.
      const user = getCurrentUser();
      setUserName(user?.name || user?.username || '');
      toast.success('¡Bienvenido al sistema!', 'Sesión iniciada correctamente.');
      setEntering(true);
    } catch (err: any) {
      const message =
        err?.response?.data?.message
        || (err?.response?.status === 401
          ? 'Usuario o contraseña incorrectos.'
          : 'No se pudo conectar con el servidor.');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-dvh w-full lg:grid lg:grid-cols-2 xl:grid-cols-[1.15fr_1fr] bg-slate-950 text-slate-100">
      {/* PANEL IZQUIERDO: Branding y Beneficios (Solo en pantallas grandes) */}
      <div className="relative hidden flex-col justify-between overflow-y-auto bg-gradient-to-br from-slate-950 via-[#070e24] to-[#040817] p-8 lg:flex lg:p-12 xl:p-14">
        {/* Cabecera Superior Izquierda */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25 ring-1 ring-white/30 backdrop-blur-md">
              <Wrench size={22} className="stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xl font-extrabold tracking-tight text-white">SIGTM</p>
                <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-bold text-blue-300 ring-1 ring-blue-400/30">
                  PRO
                </span>
              </div>
              <p className="text-xs font-medium text-slate-400">
                Sistema Integral de Gestión de Taller Mecánico
              </p>
            </div>
          </div>
          <ThemeToggle className="border-white/15 bg-white/5 text-slate-300 hover:border-white/30 hover:bg-white/10 hover:text-white" />
        </div>

        {/* Contenido Central Hero */}
        <div className="relative z-10 my-auto py-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3.5 py-1.5 text-xs font-semibold text-blue-300 backdrop-blur-md shadow-inner">
            <Sparkles size={13} className="text-cyan-400" />
            Sistema de gestión automotriz de nueva generación
          </div>

          <h1 className="mt-5 text-3xl font-extrabold leading-[1.15] tracking-tight text-white xl:text-5xl">
            Control total de tu taller,{' '}
            <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-300 bg-clip-text text-transparent">
              en tiempo real.
            </span>
          </h1>

          <p className="mt-4 max-w-lg text-sm leading-relaxed text-slate-300/80 sm:text-base">
            Digitaliza la recepción de unidades, gestiona órdenes de trabajo mecánicas,
            controla inventario y emite comprobantes desde una sola plataforma.
          </p>

          {/* Lista de Módulos y Beneficios Clave */}
          <div className="mt-8 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            {[
              {
                icon: Gauge,
                title: 'Recepción Digital 360°',
                desc: 'Inspección visual de daños y registro de fotos en vivo.',
                color: 'text-blue-400',
              },
              {
                icon: ClipboardList,
                title: 'Órdenes de Trabajo',
                desc: 'Seguimiento por mecánico, repuestos y diagnóstico.',
                color: 'text-indigo-400',
              },
              {
                icon: CalendarCheck,
                title: 'Agenda & Citas en Vivo',
                desc: 'Organización de bahías y citas sin solapamientos.',
                color: 'text-cyan-400',
              },
              {
                icon: ShieldCheck,
                title: 'Seguridad y Auditoría',
                desc: 'Roles administrativos y control de trazabilidad.',
                color: 'text-emerald-400',
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="group rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-md transition-all duration-300 hover:border-blue-500/40 hover:bg-white/[0.07] hover:-translate-y-0.5"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10 group-hover:bg-white/10 transition-colors">
                    <feature.icon className={cn('transition-transform duration-300 group-hover:scale-110', feature.color)} size={19} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-200">{feature.title}</p>
                    <p className="text-[11px] leading-tight text-slate-400 mt-0.5">{feature.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Garantías de confianza */}
          <div className="mt-8 flex items-center gap-6 text-xs font-medium text-slate-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={15} className="text-emerald-400" />
              <span>Plataforma 100% en la nube</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={15} className="text-emerald-400" />
              <span>Cifrado TLS 256-Bit</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={15} className="text-emerald-400" />
              <span>Copias de seguridad automáticas</span>
            </div>
          </div>
        </div>

        {/* Pie Inferior Izquierdo */}
        <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>Servidores operativos · 99,9 % de disponibilidad</span>
          </div>
          <span>© 2026 SIGTM AutoTech</span>
        </div>
      </div>

      {/* PANEL DERECHO: Formulario de Login 100% Responsive */}
      <div className="relative flex min-h-dvh w-full flex-col items-center justify-center bg-slate-50 p-4 sm:p-6 md:p-8 lg:p-12 dark:bg-[#080d1a]">
        {/* Toggle de Tema flotante superior para móvil */}
        <div className="absolute right-4 top-4 sm:right-6 sm:top-6 lg:hidden">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-md py-6 sm:py-8">
          {/* Logo y Encabezado para pantallas móviles */}
          <div className="mb-6 flex flex-col items-center text-center lg:hidden">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 ring-1 ring-white/20">
              <Wrench size={22} />
            </div>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              SIGTM AutoTech
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Sistema Integral de Gestión de Taller
            </p>
          </div>

          {/* Tarjeta de Formulario Principal */}
          <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xl shadow-slate-200/50 backdrop-blur-xl sm:p-8 md:p-9 dark:border-slate-800/80 dark:bg-slate-900/95 dark:shadow-black/60">
            {/* Título y Bienvenida */}
            <div className="mb-6">
              <div className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                <Lock size={12} /> Acceso Seguro
              </div>
              <h2 className="mt-2.5 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                Iniciar Sesión
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
                Ingresa tus credenciales para acceder al panel del taller.
              </p>
            </div>

            {/* Mensaje de Error */}
            {error && (
              <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50/90 p-3.5 text-xs text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400 animate-slide-up">
                <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-red-500" />
                <span className="flex-1 font-medium leading-relaxed">{error}</span>
              </div>
            )}

            {/* Formulario */}
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Campo Usuario */}
              <div>
                <label
                  htmlFor="username"
                  className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300"
                >
                  Usuario o Correo
                </label>
                <div className="group relative flex items-center rounded-xl border border-slate-200 bg-slate-50/50 transition-all duration-200 focus-within:border-blue-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/15 dark:border-slate-800 dark:bg-slate-800/50 dark:focus-within:border-blue-500 dark:focus-within:bg-slate-800">
                  <User
                    size={17}
                    className="ml-3.5 shrink-0 text-slate-400 transition-colors group-focus-within:text-blue-500"
                  />
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-transparent px-3 py-3 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500"
                    placeholder="Ingresa tu usuario"
                    autoComplete="username"
                    maxLength={50}
                    required
                  />
                </div>
              </div>

              {/* Campo Contraseña */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300"
                  >
                    Contraseña
                  </label>
                  <Link
                    to="/olvidar-contrasena"
                    className="text-xs font-semibold text-blue-600 transition hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    ¿Olvidaste tu clave?
                  </Link>
                </div>
                <div className="group relative flex items-center rounded-xl border border-slate-200 bg-slate-50/50 transition-all duration-200 focus-within:border-blue-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/15 dark:border-slate-800 dark:bg-slate-800/50 dark:focus-within:border-blue-500 dark:focus-within:bg-slate-800">
                  <Lock
                    size={17}
                    className="ml-3.5 shrink-0 text-slate-400 transition-colors group-focus-within:text-blue-500"
                  />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-transparent px-3 py-3 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    maxLength={72}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="mr-3 p-1.5 text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              {/* Recordar Sesión */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex cursor-pointer select-none items-center gap-2">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:focus:ring-offset-slate-900"
                  />
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    Mantener sesión iniciada
                  </span>
                </label>
              </div>

              {/* Botón Principal de Inicio de Sesión */}
              <button
                type="submit"
                disabled={loading || entering}
                className="group relative flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/30 transition-all duration-300 hover:scale-[1.01] hover:from-blue-500 hover:via-indigo-500 hover:to-blue-600 hover:shadow-blue-500/40 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>Verificando credenciales...</span>
                  </div>
                ) : (
                  <>
                    <span>Entrar al Sistema</span>
                    <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-[11px] text-slate-400 dark:text-slate-500">
              Conexión encriptada con TLS 256-Bit · SIGTM AutoTech
            </p>
          </div>
        </div>
      </div>

      {/* Overlay de ingreso: animación "HUD del taller" tras validar credenciales */}
      {entering && (
        <div
          className={cn(
            'fixed inset-0 z-[100] overflow-hidden bg-slate-950',
            leaving && 'pointer-events-none'
          )}
        >
          {/* Fondo */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-slate-900 to-slate-950" />
          <div className="absolute -left-40 -top-40 h-[30rem] w-[30rem] rounded-full bg-blue-600/20 blur-3xl animate-float" />
          <div className="absolute -bottom-32 -right-32 h-[30rem] w-[30rem] rounded-full bg-indigo-600/20 blur-3xl" />
          <div className="absolute left-1/3 top-1/3 h-72 w-72 rounded-full bg-sky-500/10 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_35%,rgba(2,6,23,0.65)_100%)]" />

          {/* Engranajes girando de fondo */}
          <Cog className="absolute left-[7%] top-[15%] h-44 w-44 text-blue-400/[0.08] animate-gear" strokeWidth={1.1} />
          <Settings className="absolute right-[9%] top-[22%] h-28 w-28 text-indigo-300/[0.09] animate-gear-rev" strokeWidth={1.1} />
          <Cog className="absolute bottom-[14%] left-[20%] h-24 w-24 text-sky-300/[0.09] animate-gear-rev" strokeWidth={1.1} />
          <Settings className="absolute bottom-[16%] right-[15%] h-36 w-36 text-blue-400/[0.08] animate-gear" strokeWidth={1.1} />

          {/* Contenido central */}
          <div
            className={cn(
              'relative flex h-full w-full flex-col items-center justify-center transition-all duration-500 ease-out',
              leaving && 'scale-110 opacity-0 blur-[3px]'
            )}
          >
            {/* Anillo de progreso + logo */}
            <div className="relative flex h-40 w-40 items-center justify-center">
              {/* pulsos */}
              <span className="absolute h-28 w-28 rounded-full bg-blue-500/20 animate-ping" />
              <span className="absolute h-28 w-28 rounded-full bg-indigo-500/20 animate-ping" style={{ animationDelay: '280ms' }} />

              {/* anillo de progreso enlazado al contador */}
              <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 120 120">
                <defs>
                  <linearGradient id="login-ring" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#818cf8" />
                  </linearGradient>
                </defs>
                <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="4" />
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke="url(#login-ring)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={339.3}
                  strokeDashoffset={339.3 * (1 - progress / 100)}
                  style={{ transition: 'stroke-dashoffset 100ms linear', filter: 'drop-shadow(0 0 6px rgba(56,189,248,0.55))' }}
                />
              </svg>

              {/* aro dentado que gira */}
              <span className="absolute h-[8.5rem] w-[8.5rem] rounded-full border border-dashed border-blue-300/20 animate-gear" />

              {/* logo con brillo metálico */}
              <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-2xl shadow-blue-600/40 ring-1 ring-white/20 animate-zoom-in">
                <Wrench className="h-9 w-9 text-white" strokeWidth={2.2} />
                <span className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-white/35 blur-[2px] animate-shine" />
              </div>

              {/* check de éxito */}
              <div
                className={cn(
                  'absolute -bottom-1 -right-1 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50',
                  granted ? 'animate-check-pop' : 'scale-0 opacity-0'
                )}
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5">
                  <path
                    d="M5 13l4 4L19 7"
                    fill="none"
                    stroke="#fff"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={granted ? 'animate-check-draw' : ''}
                  />
                </svg>
              </div>
            </div>

            {/* Marca SIGTM con letras escalonadas */}
            <div className="mt-8 flex items-end">
              {'SIGTM'.split('').map((letter, index) => (
                <span
                  key={index}
                  className="animate-letter text-3xl font-extrabold tracking-tight text-white"
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  {letter}
                </span>
              ))}
            </div>
            <p
              className="mt-1.5 animate-fade-in text-[11px] font-semibold uppercase tracking-[0.35em] text-blue-200/70"
              style={{ animationDelay: '320ms' }}
            >
              Taller Mecánico
            </p>

            {/* Estado + barra de progreso */}
            <div className="mt-9 flex w-64 flex-col items-center">
              <div className="flex w-full items-center justify-between text-[11px] font-semibold uppercase tracking-widest">
                <span className={cn('transition-colors duration-300', granted ? 'text-emerald-300' : 'text-blue-100/70')}>
                  {granted ? 'Acceso concedido' : 'Iniciando sesión'}
                </span>
                <span className="tabular-nums text-blue-100/90">{progress}%</span>
              </div>
              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-400 to-indigo-400"
                  style={{ width: `${progress}%`, transition: 'width 100ms linear' }}
                />
              </div>
              <p className="mt-4 h-5 text-center text-sm font-semibold text-blue-100/90">
                {granted
                  ? userName
                    ? `¡Bienvenido, ${userName}!`
                    : '¡Bienvenido!'
                  : 'Preparando tu espacio de trabajo…'}
              </p>
            </div>
          </div>

          {/* Cierre tipo obturador (salida hacia el panel) */}
          <div
            className={cn(
              'pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-slate-900 to-slate-950 transition-transform duration-500 ease-in-out',
              leaving ? 'translate-y-0' : '-translate-y-full'
            )}
          />
          <div
            className={cn(
              'pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-slate-900 to-slate-950 transition-transform duration-500 ease-in-out',
              leaving ? 'translate-y-0' : 'translate-y-full'
            )}
          />
          <div
            className={cn(
              'pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-sky-400 to-transparent shadow-[0_0_24px_3px_rgba(56,189,248,0.55)] transition-opacity duration-300',
              leaving ? 'opacity-100' : 'opacity-0'
            )}
          />
        </div>
      )}
    </div>
  );
}
