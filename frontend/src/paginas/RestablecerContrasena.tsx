import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../servicios/autenticacionServicio';
import { Lock, Wrench, Eye, EyeOff, ArrowLeft, KeyRound } from 'lucide-react';
import { useToast } from '../componentes/interfaz/Avisos';
import { estiloCampo } from '../componentes/interfaz/Formulario';
import ThemeToggle from '../componentes/BotonTema';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();
  const toast = useToast();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(token, password);
      toast.success('Contraseña restablecida', 'Ya puedes iniciar sesión con tu nueva contraseña.');
      navigate('/acceso');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'El enlace es inválido o ha expirado.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 text-slate-900 dark:from-slate-950 dark:via-[#070e24] dark:to-[#040817] dark:text-slate-100">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl dark:bg-slate-900">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500 dark:bg-red-500/10">
            <KeyRound size={26} />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Enlace inválido</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            No se encontró un token de recuperación en la URL. Solicita uno nuevo.
          </p>
          <Link
            to="/olvidar-contrasena"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"
          >
            <ArrowLeft size={16} /> Solicitar nuevo enlace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 text-slate-900 dark:from-slate-950 dark:via-[#070e24] dark:to-[#040817] dark:text-slate-100">
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <ThemeToggle className="border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 dark:border-white/20 dark:bg-slate-800/70 dark:text-white dark:hover:border-white/40" />
      </div>
      <div className="w-full max-w-md animate-slide-up">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/25 ring-1 ring-blue-400/20">
            <Wrench size={26} />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">SIGTM</h1>
          <p className="text-sm text-slate-500 dark:text-blue-200">Define tu nueva contraseña</p>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-2xl sm:p-8 dark:bg-slate-900">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Nueva contraseña</h2>
          <p className="mb-6 mt-1 text-sm text-slate-500 dark:text-slate-400">
            Establece una contraseña nueva y segura para tu cuenta.
          </p>

          {error && (
            <div className="mb-5 animate-fade-in rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                Nueva contraseña
              </label>
              <div className="relative">
                <Lock size={18} className="pointer-events-none absolute inset-y-0 left-3.5 my-auto text-slate-400 dark:text-slate-500" />
                <input
                  id="password"
                  type={show ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${estiloCampo} pl-11 pr-11`}
                  placeholder="Mínimo 6 caracteres"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute inset-y-0 right-0 pr-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  aria-label="Mostrar contraseña"
                >
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirm" className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                Confirmar contraseña
              </label>
              <div className="relative">
                <Lock size={18} className="pointer-events-none absolute inset-y-0 left-3.5 my-auto text-slate-400 dark:text-slate-500" />
                <input
                  id="confirm"
                  type={show ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className={`${estiloCampo} pl-11`}
                  placeholder="Repite tu contraseña"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:from-blue-500 hover:to-indigo-500 disabled:opacity-60"
            >
              {loading ? 'Guardando...' : 'Guardar nueva contraseña'}
            </button>

            <div className="text-center">
              <Link to="/acceso" className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
                ← Volver al inicio de sesión
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}