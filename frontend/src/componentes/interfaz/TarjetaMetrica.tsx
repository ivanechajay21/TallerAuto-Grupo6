import type { ComponentType, ReactNode } from 'react';
import { cn } from '../../lib/utilidades';

export type TonoMetrica = 'blue' | 'indigo' | 'violet' | 'amber' | 'emerald' | 'red' | 'slate';

interface TarjetaMetricaProps {
  label: string;
  value: ReactNode;
  icon: ComponentType<{ size?: number; className?: string }>;
  tone?: TonoMetrica;
  hint?: string;
  active?: boolean;
  onClick?: () => void;
}

const tonos: Record<TonoMetrica, string> = {
  blue: 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300',
  indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300',
  violet: 'bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
  emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
  red: 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300',
  slate: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300',
};

/** Indicador compacto y consistente para los tableros de módulo. */
export default function TarjetaMetrica({
  label,
  value,
  icon: Icon,
  tone = 'blue',
  hint,
  active = false,
  onClick,
}: TarjetaMetricaProps) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl', tonos[tone])}>
          <Icon size={17} />
        </div>
        {hint && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            {hint}
          </span>
        )}
      </div>
      <p className="mt-3 truncate text-xl font-bold tracking-tight text-slate-900 dark:text-white">
        {value}
      </p>
      <p className="mt-0.5 truncate text-xs font-medium text-slate-500 dark:text-slate-400">
        {label}
      </p>
    </>
  );

  const clase = cn(
    'rounded-2xl border bg-white p-4 text-left shadow-sm transition dark:bg-slate-900',
    active
      ? 'border-blue-300 ring-2 ring-blue-500/15 dark:border-blue-500/50'
      : 'border-slate-200 dark:border-slate-700',
    onClick && 'hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md dark:hover:border-blue-500/40',
  );

  if (!onClick) {
    return <div className={clase}>{content}</div>;
  }

  return (
    <button type="button" onClick={onClick} className={clase}>
      {content}
    </button>
  );
}
