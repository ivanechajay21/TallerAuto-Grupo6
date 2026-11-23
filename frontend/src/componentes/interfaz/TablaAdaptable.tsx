import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';
import { cn } from '../../lib/utilidades';
import usePagination from '../../hooks/usePaginacion';
import Pagination from './Paginacion';

export interface ResponsiveColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
  hideOnMobile?: boolean;
  hideOnDesktop?: boolean;
}

interface ResponsiveTableProps<T> {
  columns: ResponsiveColumn<T>[];
  rows: T[];
  keyField: (row: T) => string | number;
  emptyMessage?: string;
  cardTitle?: (row: T) => ReactNode;
  cardFooter?: (row: T) => ReactNode;
  mobileClassName?: string;
  /** Si es > 0, activa la paginación en el pie de la tabla. */
  pageSize?: number;
  /** Etiqueta del contador de paginación (p. ej. «productos»). */
  itemLabel?: string;
}

export default function ResponsiveTable<T>({
  columns,
  rows,
  keyField,
  emptyMessage = 'No hay registros.',
  cardTitle,
  cardFooter,
  mobileClassName,
  pageSize = 0,
  itemLabel,
}: ResponsiveTableProps<T>) {
  const desktopColumns = columns.filter((c) => !c.hideOnDesktop);
  const cardColumns = columns.filter((c) => !c.hideOnMobile);
  const titleColumn = cardColumns[0];
  const detailColumns = cardColumns
    .slice(1)
    .filter((col) => col.header.trim().length > 0);
  const actionColumns = cardColumns.filter((col) => col.header.trim().length === 0);

  const paginacion = usePagination(rows, pageSize);
  const visibles = pageSize > 0 ? paginacion.pageItems : rows;

  const renderTitle = (row: T) => (cardTitle ? cardTitle(row) : titleColumn?.render(row));

  return (
    <>
      {/* Tabla escritorio */}
      {rows.length > 0 && <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
          <thead className="bg-slate-50/80 dark:bg-slate-800/60">
            <tr>
              {desktopColumns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={cn(
                    'px-5 py-3 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400',
                    col.className
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
            {visibles.map((row) => (
              <tr
                key={keyField(row)}
                className="group transition-colors hover:bg-blue-50/40 dark:hover:bg-blue-500/[0.06]"
              >
                {desktopColumns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      'whitespace-nowrap px-5 py-3.5 align-middle text-sm',
                      col.className
                    )}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>}

      {/* Tarjetas móvil */}
      {rows.length > 0 && (
        <div className={cn('grid gap-3 p-3 sm:p-4 md:hidden', mobileClassName)}>
          {visibles.map((row) => (
            <div
              key={keyField(row)}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-500/40"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">{renderTitle(row)}</div>
                {cardFooter && <div className="shrink-0">{cardFooter(row)}</div>}
              </div>
              {detailColumns.length > 0 && (
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                  {detailColumns.map((col) => (
                    <div key={col.key} className={cn(col.className)}>
                      <dt className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500">
                        {col.header}
                      </dt>
                      <dd className="mt-1 text-sm text-slate-700 dark:text-slate-300">{col.render(row)}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {actionColumns.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center justify-end gap-1 border-t border-slate-100 pt-3 dark:border-slate-800">
                  {actionColumns.map((col) => (
                    <div key={col.key}>{col.render(row)}</div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {rows.length === 0 && (
        <div className="m-4 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-12 text-center dark:border-slate-700 dark:bg-slate-800/20">
          <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm dark:bg-slate-900 dark:text-slate-500">
            <Inbox size={22} />
          </span>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{emptyMessage}</p>
        </div>
      )}

      {pageSize > 0 && rows.length > 0 && (
        <Pagination
          page={paginacion.page}
          pageCount={paginacion.pageCount}
          onChange={paginacion.setPage}
          total={paginacion.total}
          from={paginacion.from}
          to={paginacion.to}
          itemLabel={itemLabel ?? 'registros'}
        />
      )}
    </>
  );
}
