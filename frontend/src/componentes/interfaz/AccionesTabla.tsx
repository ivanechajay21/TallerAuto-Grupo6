import type { ComponentType } from 'react';
import { cn } from '../../lib/utilidades';

export type TonoAccion = 'neutral' | 'primary' | 'success' | 'danger';

export interface AccionTabla {
  label: string;
  icon?: ComponentType<{ size?: number; className?: string }>;
  onClick: () => void;
  tone?: TonoAccion;
  title?: string;
  disabled?: boolean;
}

interface AccionesTablaProps {
  acciones: AccionTabla[];
  className?: string;
}

const tonos: Record<TonoAccion, string> = {
  neutral:
    'text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm dark:text-slate-300 dark:hover:bg-slate-700/70 dark:hover:text-white',
  primary:
    'bg-blue-600 text-white shadow-sm shadow-blue-600/20 hover:bg-blue-500 hover:shadow-md',
  success:
    'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20 hover:bg-emerald-500 hover:shadow-md',
  danger:
    'text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/10 dark:hover:text-red-300',
};

/**
 * Grupo compacto de acciones de tabla. Mantiene la jerarquía visual y añade
 * una entrada escalonada con movimiento reducido para usuarios que lo prefieran.
 */
export default function AccionesTabla({ acciones, className }: AccionesTablaProps) {
  if (acciones.length === 0) return null;

  return (
    <div
      role="group"
      aria-label="Acciones de la fila"
      className={cn(
        'grupo-acciones inline-flex max-w-full flex-wrap items-center justify-end gap-1 rounded-xl border border-slate-200/80 bg-slate-50/80 p-1 dark:border-slate-700 dark:bg-slate-800/40',
        className,
      )}
    >
      {acciones.map((accion, index) => {
        const Icon = accion.icon;
        return (
          <button
            key={`${accion.label}-${index}`}
            type="button"
            onClick={accion.onClick}
            disabled={accion.disabled}
            title={accion.title ?? accion.label}
            style={{ animationDelay: `${index * 45}ms` }}
            className={cn(
              'accion-tabla inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45 dark:focus-visible:ring-offset-slate-900',
              tonos[accion.tone ?? 'neutral'],
            )}
          >
            {Icon && <Icon size={13} aria-hidden="true" />}
            {accion.label}
          </button>
        );
      })}
    </div>
  );
}
