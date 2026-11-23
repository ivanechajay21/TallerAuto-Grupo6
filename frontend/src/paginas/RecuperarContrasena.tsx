import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../servicios/autenticacionServicio';
import { Mail, Wrench, ArrowLeft, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useToast } from '../componentes/interfaz/Avisos';
import { estiloCampo } from '../componentes/interfaz/Formulario';
import ThemeToggle from '../componentes/BotonTema';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      toast.error('Error', 'No se pudo procesar la solicitud. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 text-slate-900 dark:from-slate-950 dark:via-[#070e24] dark:to-[#040817] dark:text-slate-100">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <ThemeToggle className="border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 dark:border-white/20 dark:bg-slate-800/70 dark:text-white dark:hover:border-white/40" />
      </div>

      <div className="relative w-full max-w-md animate-slide-up">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/25 ring-1 ring-blue-400/20">
            <Wrench size={26} />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">SIGTM</h1>
          <p className="text-sm text-slate-500 dark:text-blue-200">Recupera el acceso a tu cuenta</p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white p-6 shadow-2xl sm:p-8 dark:border-slate-800 dark:bg-slate-900">
          {sent ? (
            <div className="text-center animate-fade-in">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                <CheckCircle2 size={32} />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Revisa tu correo</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                Si <span className="font-semibold text-slate-700 dark:text-slate-200">{email}</span> está registrado,
                te enviamos un enlace para restablecer tu contraseña. El enlace es válido por 30 minutos.
              </p>
              <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                <ShieldCheck size={14} /> Revisa también la carpeta de spam.
              </p>
              <div className="mt-6">
                <Link
                  to="/acceso"
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
                >
                  <ArrowLeft size={16} /> Volver al inicio de sesión
                </Link>
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">¿Olvidaste tu contraseña?</h2>
              <p className="mt-1 mb-6 text-sm text-slate-500 dark:text-slate-400">
                Ingresa el correo de tu cuenta y te enviaremos las instrucciones.
              </p>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Correo electrónico
                  </label>
                  <div className="relative">
                    <Mail size={18} className="pointer-events-none absolute inset-y-0 left-3.5 my-auto text-slate-400 dark:text-slate-500" />
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`${estiloCampo} pl-11`}
                      placeholder="tu@correo.com"
                    />
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-400 dark:text-slate-500">
                    Usa el correo real registrado en tu cuenta. Si es una cuenta Gmail, revisa también la carpeta de spam.
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:from-blue-500 hover:to-indigo-500 disabled:opacity-60"
                >
                  {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
                </button>
                <div className="text-center">
                  <Link to="/acceso" className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
                    ← Volver al inicio de sesión
                  </Link>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}