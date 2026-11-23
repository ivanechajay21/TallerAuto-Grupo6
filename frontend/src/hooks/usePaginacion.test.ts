import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import usePagination from './usePaginacion';

const items = Array.from({ length: 25 }, (_, i) => i + 1);

describe('usePagination', () => {
  it('divide la lista en páginas del tamaño indicado', () => {
    const { result } = renderHook(() => usePagination(items, 10));

    expect(result.current.pageCount).toBe(3);
    expect(result.current.pageItems).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(result.current.from).toBe(1);
    expect(result.current.to).toBe(10);
    expect(result.current.total).toBe(25);
  });

  it('cambia de página y devuelve el tramo correcto', () => {
    const { result } = renderHook(() => usePagination(items, 10));

    act(() => result.current.setPage(3));

    expect(result.current.pageItems).toEqual([21, 22, 23, 24, 25]);
    expect(result.current.from).toBe(21);
    expect(result.current.to).toBe(25);
  });

  it('con pageSize 0 devuelve todo en una sola página', () => {
    const { result } = renderHook(() => usePagination([1, 2, 3], 0));

    expect(result.current.pageCount).toBe(1);
    expect(result.current.pageItems).toEqual([1, 2, 3]);
  });

  it('vuelve a la página 1 si la lista se reduce', () => {
    const { result, rerender } = renderHook(({ list }) => usePagination(list, 10), {
      initialProps: { list: items },
    });

    act(() => result.current.setPage(3));
    expect(result.current.page).toBe(3);

    rerender({ list: [1, 2, 3] });

    expect(result.current.page).toBe(1);
  });
});
