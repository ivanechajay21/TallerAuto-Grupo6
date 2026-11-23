import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { cn } from '../../lib/utilidades';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** true = botón de peligro rojo (eliminar); false = azul neutro */
  danger?: boolean;
  busy?: boolean;
  /** Texto del botón mientras se ejecuta la acción. */
  busyLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Diálogo de confirmación con animación (fade + pop), icono de advertencia con
 * pulso, cierre con Escape o clic fuera, y estado de carga en el botón principal.
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Eliminar',
  cancelLabel = 'Cancelar',
  danger = true,
  busy = false,
  busyLabel = 'Eliminando...',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const focusTimer = window.setTimeout(() => confirmRef.current?.focus(), 150);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-fade-in"
      onClick={() => !busy && onCancel()}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div
        className="w-full max-w-sm animate-dialog-in overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative px-6 pt-6">
          <button
            onClick={onCancel}
            disabled={busy}
            aria-label="Cerrar"
            className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50 dark:hover:bg-slate-800"
          >
            <X size={16} />
          </button>
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-4">
              <span
                className={cn(
                  'absolute inset-0 -m-1 rounded-full opacity-40 animate-ping',
                  danger ? 'bg-red-400 dark:bg-red-500' : 'bg-blue-400 dark:bg-blue-500'
                )}
                style={{ animationDuration: '1.6s' }}
                aria-hidden="true"
              />
              <div
                className={cn(
                  'relative flex h-14 w-14 items-center justify-center rounded-full animate-zoom-in',
                  danger
                    ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400'
                    : 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400'
                )}
              >
                <AlertTriangle size={26} />
              </div>
            </div>
            <h2
              id="confirm-dialog-title"
              className="text-lg font-bold text-slate-900 dark:text-white"
            >
              {title}
            </h2>
            {message && (
              <div className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                {message}
              </div>
            )}
          </div>
        </div>
        <div className="mt-6 flex gap-3 border-t border-slate-100 px-6 py-4 dark:border-slate-800">
          <button
            onClick={onCancel}
            disabled={busy}
            className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            disabled={busy}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
              danger
                ? 'bg-red-600 hover:bg-red-500 focus-visible:ring-red-500 dark:focus-visible:ring-offset-slate-900'
                : 'bg-blue-600 hover:bg-blue-500 focus-visible:ring-blue-500 dark:focus-visible:ring-offset-slate-900'
            )}
          >
            {busy && (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}