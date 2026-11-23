import * as XLSX from 'xlsx';
import type { ReporteCentro, ReporteTipo } from './reportesServicio';
import { descargarArchivo } from './descargaServicio';

/** Se evalúa al construir el frontend; en Docker se pasa como build arg. */
export const usaApachePoi = import.meta.env.VITE_USE_APACHE_POI === 'true';

const normalizarMoneda = (value: unknown) => {
  const text = String(value ?? '');
  const replaced = text.replace(/(\d[\d.,]*)\s*PEN\b/gi, (_match, number) => {
    const parsed = Number(String(number).replace(/,/g, ''));
    return Number.isFinite(parsed)
      ? `S/ ${parsed.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : `S/ ${number}`;
  });
  return replaced.replace(/\bPEN\b/gi, 'Soles');
};

const todayLabel = () =>
  new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });

function nombreArchivo(name: string, ext: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${base || 'reporte'}.${ext}`;
}

function aNumero(valor: string | number | null | undefined): number {
  if (typeof valor === 'number') return valor;
  const limpio = normalizarMoneda(valor).replace(/S\//g, '').replace(/,/g, '').trim();
  const numero = Number(limpio);
  return Number.isFinite(numero) ? numero : NaN;
}

function etiquetaColumna(columna: string, tipo: string): string {
  const limpia = normalizarMoneda(columna);
  const monetaria = tipo === 'MONEY' || /(p\.|precio|costo|valor|monto|saldo|total)/i.test(limpia);
  return monetaria && !/s\//i.test(limpia) ? `${limpia} (S/)` : limpia;
}

/** Descarga el PDF corporativo generado y autorizado por el backend. */
export async function exportCentroPdf(tipo: ReporteTipo) {
  await descargarArchivo('/reportes/centro/pdf', {
    params: { tipo },
    filename: nombreArchivo(`reporte-${tipo}`, 'pdf'),
    mimeType: 'application/pdf',
  });
}

/**
 * Alternativa local para el Excel cuando el backend con Apache POI no está
 * disponible. Mantiene la estructura corporativa (portada, datos, filtros y
 * moneda explícita), aunque los estilos avanzados los aporta Apache POI.
 */
export function exportCentroExcel(centro: ReporteCentro) {
  const wb = XLSX.utils.book_new();
  const titulo = normalizarMoneda(centro.titulo);
  const columnas = centro.columnas.map((c) => normalizarMoneda(c));
  const meta = `Generado el ${todayLabel()} · Moneda: Soles (S/) · ${centro.filas.length} registros`;
  wb.Props = {
    Title: `SIGTM · ${titulo}`,
    Subject: 'Reporte corporativo · Moneda: Soles (S/)',
    Author: 'SIGTM · Sistema Integral de Gestión de Taller',
    Company: 'SIGTM',
    Comments: 'Documento generado automáticamente por SIGTM.',
  };

  const resumen: Array<Array<string | number>> = [
    ['SIGTM · CENTRO DE REPORTES'],
    [],
    [titulo],
    [meta],
    [],
    ['Registros', centro.filas.length, 'Columnas', centro.columnas.length],
    ['Moneda', 'Soles (S/)', 'Tipo', centro.tipo],
    [],
    ['Indicador', 'Valor'],
    ...centro.totales.map((t) => [
      normalizarMoneda(t.etiqueta),
      t.money ? aNumero(t.valor) : Number(t.valor ?? 0),
    ]),
  ];
  const wsResumen = XLSX.utils.aoa_to_sheet(resumen);
  wsResumen['!cols'] = [{ wch: 32 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
  wsResumen['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 3 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 3 } },
  ];
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

  const encabezados = columnas.map((columna, i) =>
    etiquetaColumna(columna, centro.tipos[i] ?? 'TEXT')
  );
  const filas = centro.filas.map((fila) =>
    fila.map((cell, i) => {
      const tipo = centro.tipos[i] ?? 'TEXT';
      if (tipo === 'MONEY' || tipo === 'NUM') {
        const numero = aNumero(cell);
        return Number.isFinite(numero) ? numero : normalizarMoneda(cell);
      }
      return normalizarMoneda(cell);
    })
  );
  const datos: Array<Array<string | number>> = [
    [titulo],
    [meta],
    [],
    encabezados,
    ...filas,
  ];
  if (centro.totales.length > 0) {
    datos.push([]);
    centro.totales.forEach((t) => {
      datos.push([normalizarMoneda(t.etiqueta), t.money ? aNumero(t.valor) : Number(t.valor ?? 0)]);
    });
  }
  const ws = XLSX.utils.aoa_to_sheet(datos);
  ws['!cols'] = encabezados.map((columna, i) => ({
    wch: Math.max(14, Math.min(46, Math.max(columna.length, ...filas.map((f) => String(f[i] ?? '').length)) + 3)),
  }));
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: Math.max(0, encabezados.length - 1) } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: Math.max(0, encabezados.length - 1) } },
  ];
  if (filas.length > 0) {
    ws['!autofilter'] = {
      ref: `A4:${XLSX.utils.encode_cell({ r: 3 + filas.length, c: Math.max(0, encabezados.length - 1) })}`,
    };
  }
  XLSX.utils.book_append_sheet(wb, ws, 'Datos');

  XLSX.writeFile(wb, nombreArchivo(titulo, 'xlsx'));
}

/** Descarga el XLSX generado y autorizado por el backend con Apache POI. */
export async function exportCentroExcelConApachePoi(tipo: ReporteTipo) {
  await descargarArchivo('/reportes/centro/excel', {
    params: { tipo },
    filename: nombreArchivo(`reporte-${tipo}`, 'xlsx'),
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
