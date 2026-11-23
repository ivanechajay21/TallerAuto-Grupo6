import type { ComponentType, ReactNode } from 'react';
import { Info } from 'lucide-react';
import { cn } from '../../lib/utilidades';

/** Clase única para inputs, selects y textareas de los formularios. */
export const estiloCampo =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-500 disabled:shadow-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-slate-600 dark:disabled:border-slate-800 dark:disabled:bg-slate-900/60 dark:disabled:text-slate-400';

interface CampoFormularioProps {
  label: string;
  required?: boolean;
  hint?: string;
  className?: string;
  children: ReactNode;
}

/** Campo con etiqueta, obligatoriedad y ayuda, igual en todos los módulos. */
export function CampoFormulario({
  label,
  required,
  hint,
  className,
  children,
}: CampoFormularioProps) {
  return (
    <label className={cn('block text-sm', className)}>
      <span className="mb-1.5 flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-200">
        {label}
        {required && <span className="text-red-500" aria-hidden="true">*</span>}
      </span>
      {children}
      {hint && (
        <span className="mt-1.5 block text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
          {hint}
        </span>
      )}
    </label>
  );
}

interface SeccionFormularioProps {
  title: string;
  description?: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

/** Bloque visual de formulario con icono, título y contenido agrupado. */
export function SeccionFormulario({
  title,
  description,
  icon: Icon,
  children,
  className,
  contentClassName,
}: SeccionFormularioProps) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-slate-200 bg-slate-50/40 p-4 dark:border-slate-700 dark:bg-slate-800/25',
        className,
      )}
    >
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm dark:bg-slate-900 dark:text-blue-300">
          <Icon size={16} />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">{title}</h3>
          {description && (
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              {description}
            </p>
          )}
        </div>
      </div>
      <div className={cn('grid gap-4 sm:grid-cols-2', contentClassName)}>{children}</div>
    </section>
  );
}

/** Aviso informativo común al inicio de un formulario. */
export function AvisoFormulario({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 dark:border-blue-500/20 dark:bg-blue-500/10">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm dark:bg-slate-900 dark:text-blue-300">
        <Info size={15} />
      </div>
      <p className="text-xs leading-relaxed text-blue-900/80 dark:text-blue-100/80">{children}</p>
    </div>
  );
}

/** Resumen destacado para totales o saldos. */
export function CajaResumen({
  label,
  value,
  helper,
}: {
  label: string;
  value: ReactNode;
  helper?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-950">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        {helper && <p className="mt-0.5 text-[11px] text-slate-400">{helper}</p>}
      </div>
      <p className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}
