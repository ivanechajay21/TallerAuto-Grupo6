import { createContext, useCallback, useContext, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import { cn } from '../../lib/utilidades';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: number;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextValue {
  toast: (type: ToastType, title: string, message?: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_STYLES: Record<ToastType, { icon: ReactNode; ring: string; bar: string }> = {
  success: { icon: <CheckCircle2 size={20} />, ring: 'border-emerald-200 dark:border-emerald-500/40', bar: 'bg-emerald-500' },
  error: { icon: <XCircle size={20} />, ring: 'border-red-200 dark:border-red-500/40', bar: 'bg-red-500' },
  info: { icon: <Info size={20} />, ring: 'border-blue-200 dark:border-blue-500/40', bar: 'bg-blue-500' },
  warning: { icon: <Info size={20} />, ring: 'border-amber-200 dark:border-amber-500/40', bar: 'bg-amber-500' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((type: ToastType, title: string, message?: string) => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    window.setTimeout(() => dismiss(id), 5000);
  }, [dismiss]);

  const value: ToastContextValue = {
    toast: push,
    success: (title, message) => push('success', title, message),
    error: (title, message) => push('error', title, message),
    info: (title, message) => push('info', title, message),
    warning: (title, message) => push('warning', title, message),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-3 px-4 sm:px-0">
        {toasts.map((t) => {
          const style = TOAST_STYLES[t.type];
          return (
            <div
              key={t.id}
              className={cn(
                'relative overflow-hidden rounded-xl border bg-white shadow-lg animate-[toast-in_0.25s_ease-out] dark:bg-slate-900',
                style.ring
              )}
            >
              <span className={cn('absolute inset-y-0 left-0 w-1', style.bar)} />
              <div className="flex items-start gap-3 py-3 pl-4 pr-3">
                <span className="mt-0.5 shrink-0 text-slate-700 dark:text-slate-300">{style.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{t.title}</p>
                  {t.message && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t.message}</p>}
                </div>
                <button
                  onClick={() => dismiss(t.id)}
                  className="shrink-0 text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200"
                  aria-label="Cerrar"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast debe usarse dentro de <ToastProvider>');
  }
  return ctx;
}
