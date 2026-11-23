import { useEffect, useId } from 'react';
import type { ComponentType, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../lib/utilidades';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

interface ModalProps {
  title: string;
  description?: string;
  icon?: ComponentType<{ size?: number; className?: string }>;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  size?: ModalSize;
  closeOnBackdrop?: boolean;
}

const sizeClass: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

/**
 * Modal común del sistema: centrado en todos los tamaños, con cabecera fija,
 * cuerpo desplazable y pie opcional. Cierra con Escape o clic en el fondo.
 */
export default function Modal({
  title,
  description,
  icon: Icon,
  children,
  footer,
  onClose,
  size = 'lg',
  closeOnBackdrop = true,
}: ModalProps) {
  const titleId = useId();

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-fade-in"
      onMouseDown={() => closeOnBackdrop && onClose()}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          'flex max-h-[90vh] w-full animate-dialog-in flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900',
          sizeClass[size]
        )}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex items-start gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
          {Icon && (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
              <Icon size={20} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-lg font-bold text-slate-900 dark:text-white">
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>

        {footer && (
          <footer className="flex flex-col-reverse gap-2 border-t border-slate-100 px-5 py-4 dark:border-slate-800 sm:flex-row sm:justify-end sm:px-6">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body
  );
}
