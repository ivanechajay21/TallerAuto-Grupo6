import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utilidades';

interface PaginationProps {
  /** Página actual (1-based). */
  page: number;
  /** Total de páginas. */
  pageCount: number;
  onChange: (page: number) => void;
  /** Total de elementos (para el contador «Mostrando X–Y de Z»). */
  total?: number;
  from?: number;
  to?: number;
  /** Etiqueta del contador (p. ej. «registros», «productos»). */
  itemLabel?: string;
  className?: string;
}

/** Construye la ventana de páginas con elipsis (1 … 4 5 6 … 20). */
function ventana(page: number, pageCount: number): Array<number | 'gap'> {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }
  const out: Array<number | 'gap'> = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(pageCount - 1, page + 1);
  if (start > 2) out.push('gap');
  for (let i = start; i <= end; i++) out.push(i);
  if (end < pageCount - 1) out.push('gap');
  out.push(pageCount);
  return out;
}

/**
 * Paginación estilo «pills»: botones redondeados, página activa en degradado
 * azul y contador de registros. Consistente en tema claro y oscuro.
 */
export default function Pagination({
  page,
  pageCount,
  onChange,
  total,
  from,
  to,
  itemLabel = 'registros',
  className,
}: PaginationProps) {
  if (pageCount <= 1) return null;

  const mostrando =
    typeof total === 'number' && typeof from === 'number' && typeof to === 'number';

  const baseBtn =
    'inline-flex h-9 min-w-9 items-center justify-center rounded-full px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row dark:border-slate-800',
        className
      )}
    >
      {mostrando && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Mostrando{' '}
          <span className="font-semibold text-slate-700 dark:text-slate-200">
            {from}–{to}
          </span>{' '}
          de <span className="font-semibold text-slate-700 dark:text-slate-200">{total}</span> {itemLabel}
        </p>
      )}

      <nav className="flex flex-wrap items-center gap-1" aria-label="Paginación">
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          aria-label="Página anterior"
          className={cn(
            baseBtn,
            'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {ventana(page, pageCount).map((p, i) =>
          p === 'gap' ? (
            <span
              key={`gap-${i}`}
              className="inline-flex h-9 min-w-9 items-center justify-center px-1 text-sm text-slate-400 dark:text-slate-600"
            >
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p)}
              aria-current={p === page ? 'page' : undefined}
              className={cn(
                baseBtn,
                p === page
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm shadow-blue-600/30'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
              )}
            >
              {p}
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={page >= pageCount}
          aria-label="Página siguiente"
          className={cn(
            baseBtn,
            'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
          )}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </nav>
    </div>
  );
}
