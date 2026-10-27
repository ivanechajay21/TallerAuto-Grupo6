import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import api from './api';
import type { DashboardMetrics, MonthlyRevenueRow, TopService, ReporteCentro, ReporteTipo } from './reportService';
import type { Settings } from './settingsService';

/** Se evalúa al construir el frontend; en Docker se pasa como build arg. */
export const usaApachePoi = import.meta.env.VITE_USE_APACHE_POI === 'true';

/* =========================================================================
   Diseño profesional y ordenado para los PDF del módulo de Reportes.
   Estructura de cada página:
     1. Banda de marca (navy) con monograma, nombre del taller y contacto.
     2. Bloque de título del reporte + línea de metadatos + regla.
     3. Tabla principal: cabecera en color de acento, filas intercaladas,
        anchos de columna calculados (nada de columnas apretadas) y estados
        coloreados.
     4. Resumen de totales en tarjetas.
     5. Cierre «Fin del reporte» y pie de página numerado.
   La orientación se elige automáticamente: horizontal (landscape) para los
   reportes anchos (7+ columnas) como Inventario o Vehículos.
   ========================================================================= */

type RGB = [number, number, number];

/** Datos del taller que se usan para personalizar el encabezado del PDF. */
export type TallerReporte = Pick<
  Settings,
  'tallerNombre' | 'tallerRuc' | 'tallerDireccion' | 'tallerTelefono' | 'tallerCorreo'
>;

/** Paleta base (escala slate + tinta + semánticos). */
const C = {
  navy: [23, 37, 84] as RGB, // indigo-950
  slate900: [15, 23, 42] as RGB,
  slate700: [51, 65, 85] as RGB,
  slate500: [100, 116, 139] as RGB,
  slate400: [148, 163, 184] as RGB,
  slate300: [203, 213, 225] as RGB,
  slate200: [226, 232, 240] as RGB,
  slate100: [241, 245, 249] as RGB,
  zebra: [248, 250, 252] as RGB, // slate-50
  white: [255, 255, 255] as RGB,
  green: [16, 185, 129] as RGB, // emerald-500
  red: [220, 38, 38] as RGB, // red-600
  amber: [217, 119, 6] as RGB, // amber-600
  emerald: [5, 150, 105] as RGB, // emerald-600
};

/** Color de acento por tipo de reporte (coincide con las tarjetas de la página). */
const ACCENTES: Record<string, RGB> = {
  CLIENTES: [79, 70, 229], // indigo-600
  VEHICULOS: [2, 132, 199], // sky-600
  REPARACIONES: [37, 99, 235], // blue-600
  INVENTARIO: [217, 119, 6], // amber-600
  CITAS: [5, 150, 105], // emerald-600
};

const ACCENTE_DEFECTO: RGB = C.green;

const MARGIN = 40;
const BAND_H = 78;
const BAND_RULE = 3;

const fmtCurrency = (n: number) =>
  (n || 0).toLocaleString('es-ES', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 });

const fmtNumber = (n: number) => (n || 0).toLocaleString('es-ES');

const fmtCell = (tipo: string, v: string | number) => {
  if (tipo === 'MONEY') return fmtCurrency(Number(v ?? 0));
  if (tipo === 'NUM') return fmtNumber(Number(v ?? 0));
  return String(v ?? '');
};

const fmtTotal = (t: { etiqueta: string; valor: string | number; money?: boolean }) =>
  t.money ? fmtCurrency(Number(t.valor ?? 0)) : fmtNumber(Number(t.valor ?? 0));

const todayLabel = () =>
  new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });

const nowLabel = () =>
  new Date().toLocaleString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

function safeFileName(name: string, ext: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${base || 'reporte'}.${ext}`;
}

function getAccent(tipo?: string): RGB {
  return (tipo && ACCENTES[tipo]) || ACCENTE_DEFECTO;
}

/** Iniciales del taller para el monograma (p. ej. «Mi Taller Mecánico» → MT). */
function monograma(nombre?: string): string {
  const limpio = (nombre || '').trim();
  const palabras = limpio.split(/\s+/).filter(Boolean);
  const iniciales = palabras
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
  return iniciales || 'SG';
}

interface PageInfo {
  width: number;
  height: number;
  margin: number;
  contentW: number;
}

/** Dimensiones reales de la página activa (portrait/landscape). */
function page(doc: jsPDF): PageInfo {
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  return { width, height, margin: MARGIN, contentW: width - MARGIN * 2 };
}

/* -------------------------------------------------------------------------
   Encabezado de marca (banda navy + monograma + contacto)
   ------------------------------------------------------------------------- */
function dibujarEncabezado(doc: jsPDF, opts: { taller?: TallerReporte | null; etiqueta: string; accent: RGB }) {
  const { width, margin } = page(doc);
  const maxX = width - margin;
  const nombre = opts.taller?.tallerNombre || 'Mi Taller Mecánico';

  // Banda navy + regleta de acento
  doc.setFillColor(...C.navy);
  doc.rect(0, 0, width, BAND_H, 'F');
  doc.setFillColor(...opts.accent);
  doc.rect(0, BAND_H, width, BAND_RULE, 'F');

  // Monograma (cuadro de acento con iniciales)
  const logoX = margin;
  const logoY = 15;
  const logoSize = 28;
  doc.setFillColor(...opts.accent);
  doc.roundedRect(logoX, logoY, logoSize, logoSize, 6, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.5);
  doc.setTextColor(...C.white);
  doc.text(monograma(nombre), logoX + logoSize / 2, logoY + logoSize / 2 + 4.5, { align: 'center' });

  // Nombre del taller + etiqueta de sección
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...C.white);
  doc.text(nombre, logoX + logoSize + 12, 30);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...C.slate300);
  doc.text(opts.etiqueta, logoX + logoSize + 12, 45);

  // Contacto (bloque derecho, alineado y compacto)
  const contacto: string[] = [];
  if (opts.taller?.tallerRuc) contacto.push(`RUC ${opts.taller.tallerRuc}`);
  if (opts.taller?.tallerDireccion) contacto.push(opts.taller.tallerDireccion);
  const telCorreo = [opts.taller?.tallerTelefono, opts.taller?.tallerCorreo].filter(Boolean).join(' · ');
  if (telCorreo) contacto.push(telCorreo);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...C.slate300);
  let ly = 26;
  contacto.slice(0, 3).forEach((linea) => {
    doc.text(linea, maxX, ly, { align: 'right' });
    ly += 12;
  });
}

/* -------------------------------------------------------------------------
   Bloque de título del reporte (título + metadatos + regla)
   ------------------------------------------------------------------------- */
function dibujarTituloReporte(doc: jsPDF, opts: { titulo: string; meta: string; accent: RGB }): number {
  const { margin, contentW } = page(doc);
  const maxX = margin + contentW;
  const tx = margin + 14;
  const anchoMeta = maxX - tx;

  // Tick de acento junto al título
  doc.setFillColor(...opts.accent);
  doc.roundedRect(margin, 96, 4, 17, 2, 2, 'F');

  // Título
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...C.slate900);
  doc.text(opts.titulo, tx, 110);

  // Línea de metadatos (puede ocupar 2 líneas sin chocar con la regla)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...C.slate500);
  const lineasMeta = doc.splitTextToSize(opts.meta, anchoMeta);
  doc.text(lineasMeta, tx, 125);

  // Regla separadora
  const ruleY = 125 + (lineasMeta.length - 1) * 10 + 9;
  doc.setDrawColor(...C.slate200);
  doc.setLineWidth(0.8);
  doc.line(margin, ruleY, maxX, ruleY);

  return ruleY + 13;
}

/* -------------------------------------------------------------------------
   Coloreado semántico de columnas de estado/prioridad
   ------------------------------------------------------------------------- */
const ESTADO_ROJO = ['agotado', 'cancelad', 'alta', 'vencid', 'rechazad', 'anulad'];
const ESTADO_AMBAR = ['stock bajo', 'pendient', 'media', 'en proceso', 'en diagnostico', 'en diagnóstico', 'espera'];
const ESTADO_VERDE = ['disponible', 'completad', 'confirmad', 'baja', 'finalizad', 'entregad', 'activ', 'pagad'];

function estadoColor(header: string, value: string): RGB | null {
  const h = header.toLowerCase();
  if (!['estado', 'prioridad'].includes(h)) return null;
  const v = value.toLowerCase();
  if (ESTADO_ROJO.some((k) => v.includes(k))) return C.red;
  if (ESTADO_AMBAR.some((k) => v.includes(k))) return C.amber;
  if (ESTADO_VERDE.some((k) => v.includes(k))) return C.emerald;
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function estadoHook(headers: string[]) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data: any) => {
    if (data.section !== 'body') return;
    const color = estadoColor(headers[data.column.index] ?? '', String(data.cell.raw ?? ''));
    if (color) {
      data.cell.styles.textColor = color;
      data.cell.styles.fontStyle = 'bold';
    }
  };
}

/* -------------------------------------------------------------------------
   Anchos de columna: se calculan según el contenido real y se escalan para
   ocupar exactamente el ancho disponible. Evita columnas apretadas/desorden.
   ------------------------------------------------------------------------- */
function computeColumnWidths(
  headers: string[],
  tipos: string[],
  filas: Array<Array<string | number>>,
  contentW: number
): number[] {
  const MIN = 42;
  const naturals = headers.map((header, i) => {
    let sample = 0;
    for (let r = 0; r < Math.min(filas.length, 30); r++) {
      sample = Math.max(sample, String(filas[r]?.[i] ?? '').length);
    }
    const cap = tipos[i] === 'TEXT' ? 34 : 14;
    return Math.max(header.length, Math.min(Math.max(sample, 4), cap));
  });

  const totalNat = naturals.reduce((a, b) => a + b, 0) || 1;
  let widths = naturals.map((n) => Math.max(MIN, (n / totalNat) * contentW));
  const sum = widths.reduce((a, b) => a + b, 0);
  widths = widths.map((w) => (w / sum) * contentW);

  // Corrige el residuo de redondeo repartiéndolo en la última columna.
  const ajustado = widths.reduce((a, b) => a + b, 0);
  widths[widths.length - 1] += contentW - ajustado;
  return widths;
}

/* -------------------------------------------------------------------------
   Estilos comunes de tabla (cabecera en color de acento)
   ------------------------------------------------------------------------- */
type OpcionesTabla = NonNullable<Parameters<typeof autoTable>[1]>;

function tablaEstilos(accent: RGB): Partial<OpcionesTabla> {
  return {
    theme: 'grid',
    margin: { left: MARGIN, right: MARGIN, bottom: 54 },
    headStyles: {
      fillColor: accent,
      textColor: C.white,
      fontStyle: 'bold',
      fontSize: 7.6,
      cellPadding: { top: 5.5, bottom: 5.5, left: 5, right: 5 },
    },
    bodyStyles: {
      fontSize: 8,
      textColor: C.slate700,
      cellPadding: { top: 4.5, bottom: 4.5, left: 5, right: 5 },
      lineColor: C.slate200,
      lineWidth: 0.4,
    },
    alternateRowStyles: { fillColor: C.zebra },
    styles: { overflow: 'linebreak' },
    rowPageBreak: 'avoid',
  };
}

/* -------------------------------------------------------------------------
   Pie de página con numeración
   ------------------------------------------------------------------------- */
function dibujarPie(doc: jsPDF, nota: string) {
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    const { width, height, margin } = page(doc);
    const y = height - 26;
    doc.setDrawColor(...C.slate200);
    doc.setLineWidth(0.6);
    doc.line(margin, y - 10, width - margin, y - 10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...C.slate400);
    doc.text(`Página ${i} de ${total}`, margin, y);
    doc.text(nota, width - margin, y, { align: 'right' });
  }
}

/* -------------------------------------------------------------------------
   Cierre del reporte («Fin del reporte») cuando queda espacio en la página
   ------------------------------------------------------------------------- */
function dibujarFinReporte(doc: jsPDF, finalY: number) {
  const { width, height, margin } = page(doc);
  const maxX = width - margin;
  const espacio = height - 58 - finalY;
  if (espacio < 50) return;

  const y = finalY + 22;
  doc.setDrawColor(...C.slate300);
  doc.setLineWidth(0.5);
  doc.line(margin, y, width / 2 - 64, y);
  doc.line(width / 2 + 64, y, maxX, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...C.slate400);
  doc.text('FIN DEL REPORTE', width / 2, y + 13, { align: 'center' });
}

/* -------------------------------------------------------------------------
   Resumen de totales en tarjetas
   ------------------------------------------------------------------------- */
function dibujarResumen(
  doc: jsPDF,
  y: number,
  totales: Array<{ etiqueta: string; valor: string | number; money?: boolean }>,
  accent: RGB
): number {
  const { margin, contentW, height } = page(doc);
  const gap = 10;
  const perRow = Math.min(Math.max(totales.length, 1), 4);
  const rows = Math.ceil(totales.length / perRow);
  const cardW = (contentW - gap * (perRow - 1)) / perRow;
  const cardH = 46;
  const needed = rows * cardH + (rows - 1) * gap;

  // Si no cabe al pie de la página, pasa el resumen a una página nueva.
  if (y + needed > height - 58) {
    doc.addPage();
    y = MARGIN + 24;
  }

  totales.forEach((t, i) => {
    const row = Math.floor(i / perRow);
    const col = i % perRow;
    const x = margin + col * (cardW + gap);
    const cy = y + row * (cardH + gap);

    doc.setFillColor(...C.zebra);
    doc.setDrawColor(...C.slate200);
    doc.setLineWidth(0.6);
    doc.roundedRect(x, cy, cardW, cardH, 6, 6, 'FD');
    doc.setFillColor(...accent);
    doc.rect(x, cy, 3, cardH, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...C.slate900);
    doc.text(fmtTotal(t), x + 12, cy + 22);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...C.slate500);
    doc.text(t.etiqueta, x + 12, cy + 36);
  });

  return y + rows * cardH + (rows - 1) * gap;
}

/* =========================================================================
   EXPORTACIÓN: Centro de Reportes (módulo Reportes)
   ========================================================================= */
export function exportCentroPdf(
  centro: ReporteCentro,
  taller?: TallerReporte | null,
  usuario?: { name?: string; lastName?: string } | null
) {
  // Los reportes anchos (7+ columnas) se emiten en horizontal.
  const landscape = centro.columnas.length >= 7;
  const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: landscape ? 'landscape' : 'portrait' });
  const accent = getAccent(centro.tipo);
  const usuarioNombre = [usuario?.name, usuario?.lastName].filter(Boolean).join(' ') || '—';
  const regs = centro.filas.length === 1 ? '1 registro' : `${centro.filas.length} registros`;

  dibujarEncabezado(doc, { taller, etiqueta: 'Centro de Reportes', accent });

  const y0 = dibujarTituloReporte(doc, {
    titulo: centro.titulo,
    meta: `Emitido el ${nowLabel()} · Generado por ${usuarioNombre} · ${regs}`,
    accent,
  });

  const widths = computeColumnWidths(centro.columnas, centro.tipos, centro.filas, page(doc).contentW);
  const columnStyles: Record<number, { cellWidth: number; halign: 'left' | 'right' | 'center' }> = {};
  centro.tipos.forEach((tipo, i) => {
    columnStyles[i] = {
      cellWidth: widths[i],
      halign: tipo === 'MONEY' || tipo === 'NUM' ? 'right' : 'left',
    };
  });

  const body =
    centro.filas.length > 0
      ? centro.filas.map((fila) => fila.map((cell, i) => fmtCell(centro.tipos[i] ?? 'TEXT', cell)))
      : [centro.columnas.map((_, i) => (i === 0 ? 'Sin datos para este reporte' : ''))];

  autoTable(doc, {
    startY: y0,
    head: [centro.columnas.map((c) => c.toUpperCase())],
    body,
    columnStyles,
    showHead: 'everyPage',
    didParseCell: estadoHook(centro.columnas),
    ...tablaEstilos(accent),
  });

  let finalY = (doc as any).lastAutoTable?.finalY ?? y0 + 20;

  if (centro.totales.length > 0) {
    finalY = dibujarResumen(doc, finalY + 20, centro.totales, accent);
  }

  dibujarFinReporte(doc, finalY);
  dibujarPie(doc, `SIGTM · Sistema Integral de Gestión de Taller · ${todayLabel()}`);
  doc.save(safeFileName('reporte-' + centro.titulo, 'pdf'));
}

/* =========================================================================
   EXPORTACIÓN: Reporte de Rendimiento (panel / dashboard)
   ========================================================================= */
export function exportReportPdf(
  metrics: DashboardMetrics,
  revenueData: MonthlyRevenueRow[],
  serviceData: TopService[],
  period = 'Últimos 12 meses',
  taller?: TallerReporte | null,
  usuario?: { name?: string; lastName?: string } | null
) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const accent = C.green;
  const usuarioNombre = [usuario?.name, usuario?.lastName].filter(Boolean).join(' ') || '—';

  dibujarEncabezado(doc, { taller, etiqueta: 'Reporte de Rendimiento', accent });

  let y = dibujarTituloReporte(doc, {
    titulo: 'Reporte de Rendimiento',
    meta: `Periodo: ${period} · Emitido el ${nowLabel()} · Generado por ${usuarioNombre}`,
    accent,
  });

  y = dibujarResumen(doc, y, [
    { etiqueta: 'Ingresos registrados', valor: metrics?.totalRevenue ?? 0, money: true },
    { etiqueta: 'Órdenes de trabajo', valor: metrics?.totalWorkOrders ?? 0 },
    { etiqueta: 'Clientes registrados', valor: metrics?.totalCustomers ?? 0 },
    { etiqueta: 'Citas pendientes', valor: metrics?.pendingAppointments ?? 0 },
  ], accent);

  const { contentW } = page(doc);
  autoTable(doc, {
    startY: y + 6,
    head: [['MES', 'MANO DE OBRA', 'REPUESTOS', 'TOTAL']],
    body: revenueData.map((r) => [
      r.name,
      fmtCurrency(r.servicios ?? 0),
      fmtCurrency(r.repuestos ?? 0),
      fmtCurrency((r.servicios ?? 0) + (r.repuestos ?? 0)),
    ]),
    foot: [
      [
        'TOTAL',
        fmtCurrency(revenueData.reduce((a, r) => a + (r.servicios ?? 0), 0)),
        fmtCurrency(revenueData.reduce((a, r) => a + (r.repuestos ?? 0), 0)),
        fmtCurrency(revenueData.reduce((a, r) => a + (r.servicios ?? 0) + (r.repuestos ?? 0), 0)),
      ],
    ],
    columnStyles: {
      0: { cellWidth: contentW - 118 * 3, halign: 'left' },
      1: { cellWidth: 118, halign: 'right' },
      2: { cellWidth: 118, halign: 'right' },
      3: { cellWidth: 118, halign: 'right' },
    },
    footStyles: { fillColor: C.slate100, textColor: C.slate900, fontStyle: 'bold', fontSize: 8.5 },
    showHead: 'everyPage',
    ...tablaEstilos(accent),
  });

  const tableEnd = (doc as any).lastAutoTable?.finalY ?? y + 20;

  autoTable(doc, {
    startY: tableEnd + 16,
    head: [['SERVICIO MÁS SOLICITADO', 'CANTIDAD']],
    body: (serviceData.length > 0 ? serviceData : [{ name: 'Sin datos', value: 0 }]).map((s) => [
      s.name,
      fmtNumber(s.value),
    ]),
    columnStyles: {
      0: { cellWidth: contentW - 90, halign: 'left' },
      1: { cellWidth: 90, halign: 'right' },
    },
    showHead: 'everyPage',
    ...tablaEstilos(accent),
  });

  const finalY = (doc as any).lastAutoTable?.finalY ?? tableEnd + 30;

  dibujarFinReporte(doc, finalY);
  dibujarPie(doc, `SIGTM · Sistema Integral de Gestión de Taller · ${todayLabel()}`);
  doc.save(safeFileName('reporte-rendimiento', 'pdf'));
}

/* =========================================================================
   EXPORTACIÓN EXCEL
   ========================================================================= */
export function exportReportExcel(
  metrics: DashboardMetrics,
  revenueData: MonthlyRevenueRow[],
  serviceData: TopService[],
  period = 'Últimos 12 meses'
) {
  const wb = XLSX.utils.book_new();

  const resumen = [
    ['SIGTM · Reporte de Rendimiento'],
    [`Generado el ${todayLabel()}`],
    [`Periodo: ${period}`],
    [],
    ['Indicador', 'Valor'],
    ['Ingresos Registrados', metrics?.totalRevenue ?? 0],
    ['Órdenes de Trabajo', metrics?.totalWorkOrders ?? 0],
    ['Clientes Registrados', metrics?.totalCustomers ?? 0],
    ['Citas Pendientes', metrics?.pendingAppointments ?? 0],
  ];
  const wsResumen = XLSX.utils.aoa_to_sheet(resumen);
  wsResumen['!cols'] = [{ wch: 28 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

  const ingresos = [
    ['Mes', 'Mano de Obra', 'Repuestos', 'Total'],
    ...revenueData.map((r) => [
      r.name,
      r.servicios ?? 0,
      r.repuestos ?? 0,
      (r.servicios ?? 0) + (r.repuestos ?? 0),
    ]),
  ];
  const wsIngresos = XLSX.utils.aoa_to_sheet(ingresos);
  wsIngresos['!cols'] = [{ wch: 14 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsIngresos, 'Ingresos Mensuales');

  const servicios = [
    ['Servicio más solicitado', 'Cantidad'],
    ...(serviceData.length > 0 ? serviceData.map((s) => [s.name, s.value]) : [['Sin datos', 0]]),
  ];
  const wsServicios = XLSX.utils.aoa_to_sheet(servicios);
  wsServicios['!cols'] = [{ wch: 40 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, wsServicios, 'Servicios');

  XLSX.writeFile(wb, safeFileName('reporte-rendimiento', 'xlsx'));
}

export function exportCentroExcel(centro: ReporteCentro) {
  const wb = XLSX.utils.book_new();

  const header = [['SIGTM — Centro de Reportes'], [centro.titulo], [`Generado el ${todayLabel()}`]];
  const aoa = [
    ...header,
    [],
    centro.columnas,
    ...centro.filas.map((fila) =>
      fila.map((cell, i) => {
        const tipo = centro.tipos[i] ?? 'TEXT';
        if (tipo === 'MONEY' || tipo === 'NUM') return Number(cell ?? 0);
        return cell;
      })
    ),
  ];
  if (centro.totales.length > 0) {
    aoa.push([]);
    centro.totales.forEach((t) => {
      aoa.push([t.etiqueta, t.money ? Number(t.valor ?? 0) : Number(t.valor ?? 0)]);
    });
  }
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = centro.columnas.map((_, i) => ({
    wch: Math.max(14, Math.min(46, (centro.columnas[i]?.length ?? 8) + 6)),
  }));
  XLSX.utils.book_append_sheet(wb, ws, centro.titulo.replace(/[^\w\s-]/g, '').slice(0, 28) || 'Reporte');

  XLSX.writeFile(wb, safeFileName('reporte-' + centro.titulo, 'xlsx'));
}

/** Descarga el XLSX generado y autorizado por el backend con Apache POI. */
export async function exportCentroExcelConApachePoi(tipo: ReporteTipo) {
  const respuesta = await api.get('/reportes/centro/excel', {
    params: { tipo },
    responseType: 'blob',
  });
  const contentType = respuesta.headers['content-type'];
  const archivo = new Blob([respuesta.data], {
    type: typeof contentType === 'string'
      ? contentType
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const enlace = document.createElement('a');
  enlace.href = URL.createObjectURL(archivo);
  enlace.download = `reporte-${tipo.toLowerCase()}.xlsx`;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(enlace.href);
}
