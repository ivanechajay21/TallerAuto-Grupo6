import { useEffect, useMemo, useState } from 'react';

export interface Paginacion<T> {
  /** Página actual (1-based). */
  page: number;
  setPage: (page: number) => void;
  /** Total de páginas (mínimo 1). */
  pageCount: number;
  /** Elementos de la página actual. */
  pageItems: T[];
  /** Posición inicial mostrada (1-based) o 0 si no hay elementos. */
  from: number;
  /** Posición final mostrada (1-based) o 0 si no hay elementos. */
  to: number;
  /** Total de elementos. */
  total: number;
  pageSize: number;
}

/**
 * Divide una lista en páginas. Con `pageSize <= 0` devuelve todos los elementos
 * en una única página (sin paginar).
 */
export default function usePagination<T>(items: T[], pageSize = 10): Paginacion<T> {
  const size = pageSize > 0 ? pageSize : Math.max(items.length, 1);
  const pageCount = Math.max(1, Math.ceil(items.length / size));
  const [page, setPage] = useState(1);

  // Si cambia el tamaño de la lista (búsqueda, filtros) y la página queda fuera
  // de rango, vuelve a la primera.
  useEffect(() => {
    if (page > pageCount) setPage(1);
  }, [page, pageCount]);

  const pageItems = useMemo(
    () => items.slice((page - 1) * size, page * size),
    [items, page, size]
  );

  const from = items.length === 0 ? 0 : (page - 1) * size + 1;
  const to = Math.min(items.length, page * size);

  return { page, setPage, pageCount, pageItems, from, to, total: items.length, pageSize: size };
}
