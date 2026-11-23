import { useEffect, useMemo, useState } from 'react';
import {
  Users,
  Car,
  Wrench,
  Boxes,
  CalendarClock,
  FileText,
  FileSpreadsheet,
  Loader2,
  Search,
  Printer,
  BarChart3,
  ClipboardList,
  CheckCircle2,
  X,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Wallet,
  CircleAlert,
  Inbox,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { getReporteCentro } from '../servicios/reportesServicio';
import type { ReporteCentro, ReporteTipo } from '../servicios/reportesServicio';
import { exportCentroPdf, exportCentroExcel, exportCentroExcelConApachePoi } from '../servicios/exportacionServicio';
import { usePermissions } from '../contexto/ContextoPermisos';
import { useToast } from '../componentes/interfaz/Avisos';
import { cn } from '../lib/utilidades';
import usePagination from '../hooks/usePaginacion';
import EncabezadoModulo from '../componentes/interfaz/EncabezadoModulo';
import Pagination from '../componentes/interfaz/Paginacion';
import TarjetaMetrica from '../componentes/interfaz/TarjetaMetrica';

const fmtCurrency = (n: number) =>
  `S/ ${(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtNumber = (n: number) => (n || 0).toLocaleString('es-PE');

/** Convierte valores heredados como «95 PEN» al formato de Soles. */
const normalizeCurrencyText = (value: unknown) => {
  const text = String(value ?? '');
  const replaced = text.replace(/(\d[\d.,]*)\s*PEN\b/gi, (_match, number) => {
    const parsed = Number(String(number).replace(/,/g, ''));
    return Number.isFinite(parsed) ? fmtCurrency(parsed) : `S/ ${number}`;
  });
  return replaced.replace(/\bPEN\b/gi, 'Soles');
};

const STATUS_STYLES: Record<string, string> = {
  disponible: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/15 dark:text-emerald-300',
  activo: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/15 dark:text-emerald-300',
  pagada: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/15 dark:text-emerald-300',
  finalizado: 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/15 dark:text-blue-300',
  'stock bajo': 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/15 dark:text-amber-300',
  pendiente: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/15 dark:text-amber-300',
  agotado: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/15 dark:text-red-300',
  inactivo: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/15 dark:text-red-300',
  anulada: 'bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-800 dark:text-slate-300',
};

const CATEGORIAS: {
  tipo: ReporteTipo;
  nombre: string;
  desc: string;
  icon: LucideIcon;
  color: string;
  bg: string;
}[] = [
  {
    tipo: 'CLIENTES',
    nombre: 'Clientes',
    desc: 'Datos de los clientes registrados',
    icon: Users,
    color: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-50 dark:bg-indigo-500/15',
  },
  {
    tipo: 'VEHICULOS',
    nombre: 'Vehículos',
    desc: 'Parque automotor del taller',
    icon: Car,
    color: 'text-sky-600 dark:text-sky-400',
    bg: 'bg-sky-50 dark:bg-sky-500/15',
  },
  {
    tipo: 'REPARACIONES',
    nombre: 'Reparaciones',
    desc: 'Órdenes de trabajo y montos',
    icon: Wrench,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-500/15',
  },
  {
    tipo: 'INVENTARIO',
    nombre: 'Inventario',
    desc: 'Existencias y valor del almacén',
    icon: Boxes,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-500/15',
  },
  {
    tipo: 'CITAS',
    nombre: 'Citas',
    desc: 'Agenda de atención agendada',
    icon: CalendarClock,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-500/15',
  },
];

export default function Reports() {
  const toast = useToast();
  const { hasPermission } = usePermissions();
  const canExport = hasPermission('REPORTES:EXPORTAR');

  const [activo, setActivo] = useState<ReporteTipo>('CLIENTES');
  const [data, setData] = useState<Partial<Record<ReporteTipo, ReporteCentro>>>({});
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<null | 'pdf' | 'excel'>(null);
  const [query, setQuery] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [printView, setPrintView] = useState(false);
  const [sortIndex, setSortIndex] = useState<number | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    if (!window.matchMedia) return;
    const media = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const tipos: ReporteTipo[] = ['CLIENTES', 'VEHICULOS', 'REPARACIONES', 'INVENTARIO', 'CITAS'];
        const results = await Promise.all(tipos.map((t) => getReporteCentro(t)));
        setData(Object.fromEntries(results.map((r) => [r.tipo, r])) as Partial<Record<ReporteTipo, ReporteCentro>>);
      } catch {
        toast.error('Error', 'No se pudieron cargar los reportes.');
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const centro = data[activo];

  const filas = useMemo(() => {
    if (!centro) return [];
    const q = query.trim().toLowerCase();
    if (!q) return centro.filas;
    return centro.filas.filter((fila) =>
      fila.some((cell) => String(cell ?? '').toLowerCase().includes(q))
    );
  }, [centro, query]);

  const sortedFilas = useMemo(() => {
    if (sortIndex === null || !centro) return filas;
    const tipo = centro.tipos[sortIndex];
    return [...filas].sort((a, b) => {
      const left = a[sortIndex];
      const right = b[sortIndex];
      let comparison = 0;
      if (tipo === 'MONEY' || tipo === 'NUM') {
        const leftNumber = Number(String(left ?? 0).replace(/[^\d.-]/g, ''));
        const rightNumber = Number(String(right ?? 0).replace(/[^\d.-]/g, ''));
        comparison = leftNumber - rightNumber;
      } else {
        comparison = String(left ?? '').localeCompare(String(right ?? ''), 'es', { numeric: true, sensitivity: 'base' });
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filas, centro, sortIndex, sortDirection]);

  const pag = usePagination(sortedFilas, 10);

  const toggleSort = (index: number) => {
    if (sortIndex === index) {
      setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortIndex(index);
      setSortDirection('asc');
    }
  };

  const totalRegistros = useMemo(
    () => Object.values(data).reduce((total, reporte) => total + (reporte?.filas.length ?? 0), 0),
    [data]
  );
  const activeCategory = CATEGORIAS.find((cat) => cat.tipo === activo);

  const fmtCell = (tipo: string, v: string | number) => {
    if (tipo === 'MONEY') {
      const numeric = typeof v === 'number' ? v : Number(String(v ?? '').replace(/[^\d.-]/g, ''));
      return Number.isFinite(numeric) ? fmtCurrency(numeric) : normalizeCurrencyText(v);
    }
    if (tipo === 'NUM') return fmtNumber(Number(v ?? 0));
    return normalizeCurrencyText(v);
  };

  const statusBadge = (value: string) => {
    const key = value.trim().toLowerCase();
    const styles = STATUS_STYLES[key];
    if (!styles) return null;
    return (
      <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 ring-inset', styles)}>
        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
        {value}
      </span>
    );
  };

  const fmtTotal = (t: { etiqueta: string; valor: string | number; money?: boolean }) =>
    t.money ? fmtCurrency(Number(t.valor ?? 0)) : fmtNumber(Number(t.valor ?? 0));

  const handleExport = async (type: 'pdf' | 'excel') => {
    if (!centro) return;
    setExporting(type);
    try {
      if (type === 'pdf') {
        await exportCentroPdf(centro.tipo);
      } else {
        try {
          // El Excel corporativo se genera en el backend con Apache POI.
          await exportCentroExcelConApachePoi(centro.tipo);
        } catch {
          // Fallback local si el backend no tiene habilitada la exportación POI.
          exportCentroExcel({ ...centro, filas });
        }
      }
      toast.success('Exportación', `Reporte exportado en ${type.toUpperCase()}.`);
    } catch {
      toast.error('Error', `No se pudo exportar el reporte en ${type.toUpperCase()}.`);
    } finally {
      setExporting(null);
    }
  };

  const handlePrint = () => {
    if (!centro) return;
    setPrintView(true);
    window.setTimeout(() => {
      window.print();
      setPrintView(false);
    }, 80);
  };

  return (
    <div className="space-y-6">
      <EncabezadoModulo
        eyebrow="Analítica del taller"
        title="Centro de Reportes"
        description="Explora los datos del taller, filtra registros y exporta reportes profesionales."
        icon={BarChart3}
        actions={canExport ? (
          <>
            <button
              onClick={handlePrint}
              disabled={loading || exporting !== null}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 sm:w-auto"
            >
              <Printer className="h-4 w-4" />
              Imprimir
            </button>
            <button
              onClick={() => handleExport('excel')}
              disabled={loading || exporting !== null || !centro}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 sm:w-auto"
            >
              {exporting === 'excel' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
              Excel
            </button>
            <button
              onClick={() => handleExport('pdf')}
              disabled={loading || exporting !== null || !centro}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-500 disabled:opacity-60 sm:w-auto"
            >
              {exporting === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              PDF
            </button>
          </>
        ) : undefined}
        meta={(
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
            {CATEGORIAS.length} reportes disponibles
          </span>
        )}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <TarjetaMetrica label="Reportes disponibles" value={CATEGORIAS.length} icon={ClipboardList} tone="indigo" />
        <TarjetaMetrica label="Registros totales" value={loading ? '…' : fmtNumber(totalRegistros)} icon={CheckCircle2} tone="emerald" />
        <TarjetaMetrica
          label="Reporte activo"
          value={activeCategory?.nombre ?? '—'}
          icon={activeCategory?.icon ?? FileText}
          tone="violet"
        />
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">Selecciona un reporte</h2>
          <span className="text-xs text-slate-400 dark:text-slate-500">Haz clic en una tarjeta para explorar</span>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {CATEGORIAS.map((cat) => {
            const count = data[cat.tipo]?.filas.length ?? 0;
            const isActive = activo === cat.tipo;
            return (
              <button
                key={cat.tipo}
                onClick={() => {
                  setActivo(cat.tipo);
                  setQuery('');
                  setSortIndex(null);
                  setSortDirection('asc');
                }}
                aria-pressed={isActive}
                className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-900 ${
                  isActive
                    ? 'border-blue-400 ring-2 ring-blue-500/15 dark:border-blue-500 dark:ring-blue-500/20'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                {isActive && <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />}
                <div className={`mb-3 inline-flex rounded-xl p-2.5 ${cat.bg} ${cat.color}`}>
                  <cat.icon size={20} />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{cat.nombre}</span>
                  {isActive && <CheckCircle2 size={13} className="text-blue-600 dark:text-blue-400" />}
                </div>
                <span className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{cat.desc}</span>
                <span className="mt-2 text-lg font-bold text-slate-900 dark:text-white">
                  {loading ? '…' : fmtNumber(count)}
                </span>
                <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  registros
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col items-start justify-between gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center dark:border-slate-800">
          <div className="flex items-center gap-3">
            {activeCategory && (
              <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', activeCategory.bg, activeCategory.color)}>
                <activeCategory.icon size={20} />
              </div>
            )}
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{centro?.titulo ?? 'Cargando…'}</h3>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {filas.length} de {centro?.filas.length ?? 0} registros · vista previa interactiva
                </p>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                  <Wallet size={11} /> Moneda: Soles (S/)
                </span>
              </div>
            </div>
          </div>
          <div className="relative w-full sm:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar en el reporte…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-10 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-500 dark:focus:bg-slate-800"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute inset-y-0 right-2 my-auto flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700"
                aria-label="Limpiar búsqueda"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="h-72 animate-pulse bg-slate-50 dark:bg-slate-800/50" />
        ) : !centro ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <CircleAlert size={28} className="mb-2 text-red-300 dark:text-red-500/70" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No se pudieron cargar los datos</p>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Vuelve a seleccionar el reporte o recarga la página.</p>
          </div>
        ) : filas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Inbox size={28} className="mb-2 text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
              {query ? 'Sin coincidencias para la búsqueda' : 'Sin datos en este reporte'}
            </p>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              {query ? 'Prueba con otro término o limpia el filtro.' : 'El reporte no contiene registros por el momento.'}
            </p>
            {query && (
              <button type="button" onClick={() => setQuery('')} className="mt-3 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400">
                Limpiar búsqueda
              </button>
            )}
          </div>
        ) : (
          <div className="hidden max-h-[34rem] overflow-auto md:block print-expand">
            <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800">
                  {centro.columnas.map((col, i) => {
                    const isSorted = sortIndex === i;
                    const numeric = centro.tipos[i] === 'MONEY' || centro.tipos[i] === 'NUM';
                    const moneyHeader = /(p\.|precio|costo|valor|monto|saldo|total)/i.test(col);
                    const headerLabel = moneyHeader && !/s\//i.test(col) ? `${col} (S/)` : col;
                    return (
                      <th
                        key={i}
                        scope="col"
                        aria-sort={isSorted ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                        className="sticky top-0 z-10 whitespace-nowrap bg-slate-50 px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                      >
                        <button
                          type="button"
                          onClick={() => toggleSort(i)}
                          className={cn(
                            'group inline-flex items-center gap-1.5 transition hover:text-blue-600 dark:hover:text-blue-400',
                            numeric && 'w-full justify-end',
                            isSorted && 'text-blue-600 dark:text-blue-400'
                          )}
                          title={`Ordenar por ${col}`}
                        >
                          <span>{headerLabel}</span>
                          {isSorted ? (
                            sortDirection === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                          ) : (
                            <ArrowUpDown size={11} className="opacity-30 transition group-hover:opacity-100" />
                          )}
                        </button>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
                {pag.pageItems.map((fila, r) => (
                  <tr
                    key={r}
                    className="group transition-colors odd:bg-slate-50/40 hover:bg-blue-50/50 dark:odd:bg-slate-800/20 dark:hover:bg-blue-500/10"
                  >
                    {fila.map((cell, c) => {
                      const tipo = centro.tipos[c] ?? 'TEXT';
                      const formatted = fmtCell(tipo, cell);
                      const isStatus = /estado|situación|disponibilidad/i.test(centro.columnas[c] ?? '');
                      const isPrimary = c === 0;
                      const badge = isStatus ? statusBadge(String(cell ?? '')) : null;
                      return (
                        <td
                          key={c}
                          className={cn(
                            'whitespace-nowrap px-3 py-2.5 text-xs text-slate-700 dark:text-slate-200',
                            (tipo === 'MONEY' || tipo === 'NUM') && 'text-right tabular-nums',
                            isPrimary && 'font-medium text-slate-900 dark:text-white'
                          )}
                        >
                          {badge ?? (
                            <span className={cn(isPrimary && 'font-mono text-xs font-semibold')}>{formatted}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {centro && !loading && isMobile && (
          <div className="space-y-3 p-3 md:hidden">
            {pag.pageItems.map((fila, rowIndex) => (
              <article
                key={rowIndex}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
              >
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                  {centro.columnas.map((col, colIndex) => {
                    const tipo = centro.tipos[colIndex] ?? 'TEXT';
                    const cell = fila[colIndex];
                    const isStatus = /estado|situación|disponibilidad/i.test(col);
                    return (
                      <div key={col} className={cn(colIndex === 0 && 'col-span-2')}>
                        <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          {col}
                        </dt>
                        <dd className={cn(
                          'mt-0.5 text-xs text-slate-700 dark:text-slate-200',
                          (tipo === 'MONEY' || tipo === 'NUM') && 'tabular-nums',
                          colIndex === 0 && 'font-mono text-sm font-semibold text-slate-900 dark:text-white'
                        )}>
                          {isStatus ? statusBadge(String(cell ?? '')) ?? fmtCell(tipo, cell) : fmtCell(tipo, cell)}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </article>
            ))}
          </div>
        )}

        {centro && centro.totales.length > 0 && (
          <div className="border-t border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/30">
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              {centro.totales.map((t, i) => (
                <div key={i} className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    {t.money ? <Wallet size={11} /> : <ClipboardList size={11} />} {t.etiqueta}
                  </div>
                  <p className="mt-1 truncate text-lg font-bold tabular-nums text-slate-900 dark:text-white">{fmtTotal(t)}</p>
                  {t.money && <p className="text-[10px] font-medium uppercase tracking-wide text-emerald-600/70 dark:text-emerald-400/70">Soles</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {centro && filas.length > 10 && (
          <Pagination
            page={pag.page}
            pageCount={pag.pageCount}
            onChange={pag.setPage}
            total={pag.total}
            from={pag.from}
            to={pag.to}
            itemLabel="registros"
          />
        )}
      </div>

      {centro && printView && (
        <div className="solo-impresion">
          <h1>Centro de Reportes</h1>
          <p className="reporte-print-meta">
            {activeCategory?.nombre ?? 'Reporte'} · {sortedFilas.length} registro(s) · Generado el{' '}
            {new Date().toLocaleDateString('es-PE')}
          </p>
          <table>
            <thead>
              <tr>
                {centro.columnas.map((col) => <th key={col}>{col}</th>)}
              </tr>
            </thead>
            <tbody>
              {sortedFilas.map((fila, rowIndex) => (
                <tr key={rowIndex}>
                  {fila.map((cell, colIndex) => (
                    <td key={colIndex}>{fmtCell(centro.tipos[colIndex] ?? 'TEXT', cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
