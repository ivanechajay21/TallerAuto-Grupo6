import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Copy,
  KeyRound,
  Loader2,
  QrCode,
  ShieldCheck,
} from 'lucide-react';
import { activarMfa, configurarMfa, verifyMfa } from '../servicios/autenticacionServicio';
import type { MfaSetupData } from '../servicios/autenticacionServicio';
import { useToast } from '../componentes/interfaz/Avisos';
import ThemeToggle from '../componentes/BotonTema';
import { cn } from '../lib/utilidades';

type Modo = 'verificar' | 'configurar' | 'recuperacion' | 'error';

export default function AccesoMfa() {
  const navigate = useNavigate();
  const toast = useToast();
  const iniciado = useRef(false);
  const [modo, setModo] = useState<Modo>('verificar');
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [setup, setSetup] = useState<MfaSetupData | null>(null);
  const [codigosRecuperacion, setCodigosRecuperacion] = useState<string[]>([]);
  const [copiado, setCopiado] = useState('');

  const challengeToken = sessionStorage.getItem('mfaChallenge') || '';
  const setupToken = sessionStorage.getItem('mfaSetup') || '';
  const remember = sessionStorage.getItem('mfaRemember') !== 'false';

  useEffect(() => {
    if (iniciado.current) return;
    iniciado.current = true;

    if (!challengeToken && !setupToken) {
      setModo('error');
      setError('No hay una verificación pendiente. Inicia sesión nuevamente.');
      return;
    }
    if (!setupToken) return;

    setModo('configurar');
    setCargando(true);
    configurarMfa(setupToken)
      .then((data) => setSetup(data))
      .catch((err: any) => {
        setModo('error');
        setError(err?.response?.data?.message || 'No se pudo iniciar la configuración de MFA.');
      })
      .finally(() => setCargando(false));
  }, [challengeToken, setupToken]);

  const limpiarYVolver = () => {
    sessionStorage.removeItem('mfaChallenge');
    sessionStorage.removeItem('mfaSetup');
    sessionStorage.removeItem('mfaRemember');
    navigate('/acceso');
  };

  const handleVerificar = async () => {
    if (!codigo.trim()) {
      setError('Ingresa el código de tu aplicación autenticadora.');
      return;
    }
    setError('');
    setCargando(true);
    try {
      await verifyMfa(challengeToken, codigo.trim(), remember);
      sessionStorage.removeItem('mfaChallenge');
      sessionStorage.removeItem('mfaRemember');
      toast.success('Acceso verificado', 'Segundo factor correcto.');
      navigate('/panel');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'El código no es válido o expiró.');
    } finally {
      setCargando(false);
    }
  };

  const handleActivar = async () => {
    if (!codigo.trim()) {
      setError('Ingresa el código que muestra tu aplicación.');
      return;
    }
    setError('');
    setCargando(true);
    try {
      const result = await activarMfa(setupToken, codigo.trim(), remember);
      sessionStorage.removeItem('mfaSetup');
      sessionStorage.removeItem('mfaRemember');
      setCodigosRecuperacion(result.recoveryCodes || []);
      setModo('recuperacion');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'No se pudo activar MFA. Verifica el código.');
    } finally {
      setCargando(false);
    }
  };

  const copiar = async (valor: string, etiqueta: string) => {
    try {
      await navigator.clipboard.writeText(valor);
      setCopiado(etiqueta);
      window.setTimeout(() => setCopiado(''), 1800);
    } catch {
      setError('No se pudo copiar. Selecciona el texto manualmente.');
    }
  };

  const continuar = () => {
    sessionStorage.removeItem('mfaSetup');
    sessionStorage.removeItem('mfaRemember');
    navigate('/panel');
  };

  return (
    <div className="relative flex min-h-dvh items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 px-4 py-10 text-slate-900 dark:from-slate-950 dark:via-[#070e24] dark:to-[#040817] dark:text-slate-100">
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle className="border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 dark:border-white/15 dark:bg-white/5 dark:text-slate-300 dark:hover:border-white/30 dark:hover:bg-white/10 dark:hover:text-white" />
      </div>
      <div className="w-full max-w-md">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25 ring-1 ring-white/30">
            <ShieldCheck size={22} />
          </div>
          <div>
            <p className="text-lg font-extrabold tracking-tight">SIGTM</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Verificación de seguridad</p>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 dark:border-slate-800/80 dark:bg-slate-900/95 dark:shadow-black/50 sm:p-8">
          <div className="mb-5 inline-flex items-center gap-2 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
            <KeyRound size={13} /> Segundo factor
          </div>

          {modo === 'error' && (
            <>
              <h1 className="text-2xl font-bold">No se pudo continuar</h1>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{error}</p>
              <button
                type="button"
                onClick={limpiarYVolver}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:from-blue-500 hover:to-indigo-500"
              >
                <ArrowLeft size={16} /> Volver al acceso
              </button>
            </>
          )}

          {modo === 'verificar' && (
            <>
              <h1 className="text-2xl font-bold">Verificación en dos pasos</h1>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Abre Google Authenticator, Authy o tu aplicación de códigos y escribe el código de 6 dígitos.
              </p>

              {error && <AlertaError mensaje={error} />}

              <label htmlFor="mfa-code" className="mt-5 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Código de verificación
              </label>
              <input
                id="mfa-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                maxLength={9}
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void handleVerificar();
                  }
                }}
                placeholder="123456"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-lg font-bold tracking-[0.35em] text-slate-900 outline-none transition placeholder:tracking-[0.2em] placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-slate-800/70 dark:text-white dark:placeholder:text-slate-500"
              />

              <button
                type="button"
                onClick={() => void handleVerificar()}
                disabled={cargando}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:from-blue-500 hover:to-indigo-500 disabled:opacity-60"
              >
                {cargando ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                Verificar y entrar
              </button>

              <button
                type="button"
                onClick={limpiarYVolver}
                className="mt-4 flex w-full items-center justify-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                <ArrowLeft size={13} /> Volver al inicio de sesión
              </button>
            </>
          )}

          {modo === 'configurar' && (
            <>
              <h1 className="text-2xl font-bold">Protege tu cuenta</h1>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Como administrador, necesitas configurar segundo factor antes de entrar.
              </p>

              {error && <AlertaError mensaje={error} />}

              {cargando && !setup && (
                <div className="mt-8 flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <Loader2 size={18} className="animate-spin" /> Generando configuración segura...
                </div>
              )}

              {setup && (
                <>
                  <div className="mt-5 flex justify-center rounded-2xl bg-white p-3">
                    <img src={setup.qrImage} alt="Código QR para Google Authenticator" className="h-48 w-48" />
                  </div>
                  <p className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400">
                    Escanea el QR con Google Authenticator o Authy.
                  </p>
                  <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Clave manual</p>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <code className="break-all text-xs font-semibold text-blue-700 dark:text-cyan-300">{setup.secret}</code>
                      <button
                        type="button"
                        onClick={() => void copiar(setup.secret, 'secreto')}
                        className="shrink-0 rounded-lg p-1.5 text-slate-500 dark:text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-white"
                        aria-label="Copiar clave manual"
                      >
                        {copiado === 'secreto' ? <CheckCircle2 size={15} /> : <Copy size={15} />}
                      </button>
                    </div>
                  </div>

                  <label htmlFor="mfa-setup-code" className="mt-4 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Código de 6 dígitos
                  </label>
                  <input
                    id="mfa-setup-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-lg font-bold tracking-[0.35em] text-slate-900 outline-none transition placeholder:tracking-[0.2em] placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-slate-800/70 dark:text-white dark:placeholder:text-slate-500"
                  />
                  <button
                    type="button"
                    onClick={() => void handleActivar()}
                    disabled={cargando}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:from-blue-500 hover:to-indigo-500 disabled:opacity-60"
                  >
                    {cargando ? <Loader2 size={16} className="animate-spin" /> : <QrCode size={16} />}
                    Activar MFA
                  </button>
                </>
              )}
            </>
          )}

          {modo === 'recuperacion' && (
            <>
              <div className="mb-4 inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                <CheckCircle2 size={13} /> MFA activado
              </div>
              <h1 className="text-2xl font-bold">Guarda tus códigos de recuperación</h1>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Cada código sirve una sola vez si pierdes tu aplicación autenticadora. Guárdalos en un lugar seguro.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {codigosRecuperacion.map((code) => (
                  <code key={code} className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-center text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-200">
                    {code}
                  </code>
                ))}
              </div>
              <button
                type="button"
                onClick={() => void copiar(codigosRecuperacion.join('\n'), 'codigos')}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 transition hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {copiado === 'codigos' ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                Copiar todos los códigos
              </button>
              <button
                type="button"
                onClick={continuar}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:from-blue-500 hover:to-indigo-500"
              >
                Entrar al sistema <ArrowRight size={16} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function AlertaError({ mensaje }: { mensaje: string }) {
  return (
    <div className={cn(
      'mt-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300'
    )}>
      <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-red-400" />
      <span className="flex-1 font-medium leading-relaxed">{mensaje}</span>
    </div>
  );
}

