import type { ComponentType } from 'react';
import { cn } from '../../lib/utilidades';

export interface PestanaModulo {
  value: string;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  count?: number;
}

interface PestanasModuloProps {
  items: PestanaModulo[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

/** Navegación por pestañas uniforme para los módulos. */
export default function PestanasModulo({
  items,
  value,
  onChange,
  className,
}: PestanasModuloProps) {
  return (
    <div
      role="tablist"
      aria-label="Secciones del módulo"
      className={cn(
        'flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-900',
        className,
      )}
    >
      {items.map((item) => {
        const active = value === item.value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={cn(
              'inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition',
              active
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
            )}
          >
            <item.icon size={16} />
            {item.label}
            {item.count != null && (
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[10px] font-bold',
                  active
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
