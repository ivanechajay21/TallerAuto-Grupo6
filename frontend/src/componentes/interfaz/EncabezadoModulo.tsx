import type { ComponentType, ReactNode } from 'react';
import { cn } from '../../lib/utilidades';

interface EncabezadoModuloProps {
  eyebrow?: string;
  title: string;
  description: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  actions?: ReactNode;
  meta?: ReactNode;
  className?: string;
}

/**
 * Cabecera común de los módulos comerciales y de abastecimiento.
 * Mantiene el mismo orden visual: contexto, título, descripción y acciones.
 */
export default function EncabezadoModulo({
  eyebrow,
  title,
  description,
  icon: Icon,
  actions,
  meta,
  className,
}: EncabezadoModuloProps) {
  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-200/50 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/20',
        className,
      )}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-sky-400" />
      <div className="flex flex-col gap-5 px-5 py-5 sm:px-6 sm:py-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/20 ring-1 ring-blue-400/20">
            <Icon size={23} />
          </div>
          <div className="min-w-0">
            {eyebrow && (
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">
                {eyebrow}
              </p>
            )}
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {title}
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              {description}
            </p>
            {meta && <div className="mt-3 flex flex-wrap items-center gap-2">{meta}</div>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 lg:justify-end">{actions}</div>}
      </div>
    </section>
  );
}
