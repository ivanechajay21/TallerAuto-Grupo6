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
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { getReporteCentro } from '../services/reportService';
import type { ReporteCentro, ReporteTipo } from '../services/reportService';
import { exportCentroPdf, exportCentroExcel, exportCentroExcelConApachePoi, usaApachePoi } from '../services/exportService';
import { usePermissions } from '../context/PermissionContext';
import { useShopSettings } from '../context/SettingsContext';
import { getCurrentUser } from '../services/authService';
import { useToast } from '../components/ui/Toast';
import usePagination from '../hooks/usePagination';
import Pagination from '../components/ui/Pagination';

const fmtCurrency = (n: number) =>
  (n || 0).toLocaleString('es-ES', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 });

const fmtNumber = (n: number) => (n || 0).toLocaleString('es-ES');

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
    desc: 'Stock y valor del almacén',
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
  const { settings } = useShopSettings();
  const canExport = hasPermission('REPORTES:EXPORTAR');

  const [activo, setActivo] = useState<ReporteTipo>('CLIENTES');
  const [data, setData] = useState<Partial<Record<ReporteTipo, ReporteCentro>>>({});
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<null | 'pdf' | 'excel'>(null);
  const [query, setQuery] = useState('');

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

  const pag = usePagination(filas, 10);

  const fmtCell = (tipo: string, v: string | number) => {
    if (tipo === 'MONEY') return fmtCurrency(Number(v ?? 0));
    if (tipo === 'NUM') return fmtNumber(Number(v ?? 0));
    return String(v ?? '');
  };

  const fmtTotal = (t: { etiqueta: string; valor: string | number; money?: boolean }) =>
    t.money ? fmtCurrency(Number(t.valor ?? 0)) : fmtNumber(Number(t.valor ?? 0));

  const handleExport = async (type: 'pdf' | 'excel') => {
    if (!centro) return;
    setExporting(type);
    try {
      if (type === 'pdf') {
        exportCentroPdf({ ...centro, filas }, settings, getCurrentUser());
      } else if (usaApachePoi) {
        await exportCentroExcelConApachePoi(centro.tipo);
      } else {
        exportCentroExcel({ ...centro, filas });
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
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Centro de Reportes</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Consulta, filtra y exporta los datos de tu taller en PDF o Excel.
          </p>
        </div>
        {canExport && (
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={loading || exporting !== null}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-slate-700 to-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:from-slate-600 hover:to-slate-800 disabled:opacity-60"
            >
              <Printer className="h-4 w-4" />
              Imprimir
            </button>
            <button
              onClick={() => handleExport('pdf')}
              disabled={loading || exporting !== null || !centro}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-red-600/25 transition hover:from-red-500 hover:to-rose-500 disabled:opacity-60"
            >
              {exporting === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              Exportar PDF
            </button>
            <button
              onClick={() => handleExport('excel')}
              disabled={loading || exporting !== null || !centro}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-600/25 transition hover:from-emerald-500 hover:to-green-500 disabled:opacity-60"
            >
              {exporting === 'excel' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
              Exportar Excel
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {CATEGORIAS.map((cat) => {
          const count = data[cat.tipo]?.filas.length ?? 0;
          const isActive = activo === cat.tipo;
          return (
            <button
              key={cat.tipo}
              onClick={() => setActivo(cat.tipo)}
              className={`flex flex-col rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-900 ${
                isActive
                  ? 'border-slate-900 ring-2 ring-slate-900/10 dark:border-blue-500 dark:ring-blue-500/20'
                  : 'border-slate-200 dark:border-slate-700'
              }`}
            >
              <div className={`mb-3 inline-flex rounded-xl p-2.5 ${cat.bg} ${cat.color}`}>
                <cat.icon size={20} />
              </div>
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{cat.nombre}</span>
              <span className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{cat.desc}</span>
              <span className="mt-2 text-lg font-bold text-slate-900 dark:text-white">
                {loading ? '…' : fmtNumber(count)}
              </span>
            </button>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col items-start justify-between gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center dark:border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{centro?.titulo ?? 'Cargando…'}</h3>
            <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
              {filas.length} de {centro?.filas.length ?? 0} registros
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar en el reporte…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-slate-500 dark:focus:bg-slate-800"
            />
          </div>
        </div>

        {loading ? (
          <div className="h-72 animate-pulse bg-slate-50 dark:bg-slate-800/50" />
        ) : !centro ? (
          <p className="py-16 text-center text-sm text-slate-400 dark:text-slate-500">No se pudieron cargar los datos.</p>
        ) : filas.length === 0 ? (
          <p className="py-16 text-center text-sm text-slate-400 dark:text-slate-500">
            {query ? 'Sin coincidencias para la búsqueda.' : 'Sin datos en este reporte.'}
          </p>
        ) : (
          <div className="max-h-[32rem] overflow-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60">
                  {centro.columnas.map((col, i) => (
                    <th
                      key={i}
                      className="sticky top-0 whitespace-nowrap bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
                {pag.pageItems.map((fila, r) => (
                  <tr key={r} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    {fila.map((cell, c) => (
                      <td
                        key={c}
                        className={`whitespace-nowrap px-4 py-2.5 text-slate-700 dark:text-slate-200 ${
                          centro.tipos[c] === 'MONEY' || centro.tipos[c] === 'NUM' ? 'text-right' : ''
                        }`}
                      >
                        {fmtCell(centro.tipos[c] ?? 'TEXT', cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {centro && centro.totales.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-slate-100 bg-slate-50 px-5 py-4 dark:border-slate-800 dark:bg-slate-800/40">
            {centro.totales.map((t, i) => (
              <div key={i}>
                <p className="text-xs font-medium text-slate-400 dark:text-slate-500">{t.etiqueta}</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">{fmtTotal(t)}</p>
              </div>
            ))}
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
    </div>
  );
}
