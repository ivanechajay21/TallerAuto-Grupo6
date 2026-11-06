import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Invoice } from './invoiceService';
import {
  DEFAULT_ISSUER,
  invoiceDate,
  invoiceDocumentLabel,
  invoiceInitials,
  invoiceKind,
  invoiceMoney,
  invoicePaymentLabel,
  invoiceStatusLabel,
} from './invoiceFormat';
import type { InvoiceIssuer } from './invoiceFormat';

type RGB = [number, number, number];

export interface InvoicePdfOptions {
  issuer?: Partial<InvoiceIssuer>;
  autoPrint?: boolean;
}

const NAVY: RGB = [15, 23, 42];
const WHITE: RGB = [255, 255, 255];
const SLATE_50: RGB = [248, 250, 252];
const SLATE_200: RGB = [226, 232, 240];
const SLATE_400: RGB = [148, 163, 184];
const SLATE_500: RGB = [100, 116, 139];
const SLATE_700: RGB = [51, 65, 85];
const SLATE_900: RGB = [15, 23, 42];
const EMERALD: RGB = [5, 150, 105];
const AMBER: RGB = [217, 119, 6];
const RED: RGB = [220, 38, 38];
const ACCENT_FACTURA: RGB = [37, 99, 235];
const ACCENT_BOLETA: RGB = [13, 148, 136];

function accent(invoice: Invoice): RGB {
  return invoice.documentType === 'BOLETA' ? ACCENT_BOLETA : ACCENT_FACTURA;
}

function statusColor(status: Invoice['status']): RGB {
  if (status === 'PAID') return EMERALD;
  if (status === 'CANCELLED') return RED;
  return AMBER;
}

function lineItems(invoice: Invoice) {
  if (invoice.items && invoice.items.length > 0) return invoice.items;
  return [
    {
      description: 'Servicios de taller',
      quantity: 1,
      unitPrice: invoice.subtotal || 0,
      lineTotal: invoice.subtotal || 0,
    },
  ];
}

function safeFilename(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, '-');
}

function page(doc: jsPDF) {
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const margin = 40;
  return { width, height, margin, contentWidth: width - margin * 2 };
}

function header(doc: jsPDF, invoice: Invoice, issuer: InvoiceIssuer) {
  const { width, margin } = page(doc);
  const color = accent(invoice);

  doc.setFillColor(...NAVY);
  doc.rect(0, 0, width, 108, 'F');
  doc.setFillColor(...color);
  doc.rect(0, 108, width, 5, 'F');

  const logoX = margin;
  const logoY = 22;
  const logoSize = 44;
  doc.setFillColor(...color);
  doc.roundedRect(logoX, logoY, logoSize, logoSize, 9, 9, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...WHITE);
  doc.text(invoiceInitials(issuer.name), logoX + logoSize / 2, logoY + 28, { align: 'center' });

  doc.setFontSize(17);
  doc.text(issuer.name, logoX + logoSize + 14, 39);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text('Servicio técnico automotriz', logoX + logoSize + 14, 54);
  if (issuer.ruc) doc.text(`RUC ${issuer.ruc}`, logoX + logoSize + 14, 70);
  if (issuer.address) doc.text(issuer.address, logoX + logoSize + 14, 82);
  doc.text([issuer.phone, issuer.email].filter(Boolean).join('  ·  '), logoX + logoSize + 14, 94);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13.5);
  doc.setTextColor(...WHITE);
  doc.text(invoiceKind(invoice), width - margin, 34, { align: 'right' });
  doc.setFontSize(11);
  doc.text(invoice.invoiceNumber, width - margin, 52, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text(`Emitido el ${invoiceDate(invoice.issueDate)}`, width - margin, 68, { align: 'right' });
  const [seriesFromNumber, correlativeFromNumber] = invoice.invoiceNumber.split('-');
  doc.text(
    `Serie ${invoice.series || seriesFromNumber || '—'}  ·  Correlativo ${invoice.correlative ?? correlativeFromNumber ?? '—'}`,
    width - margin,
    81,
    { align: 'right' }
  );

  const status = invoiceStatusLabel(invoice.status);
  const statusWidth = doc.getTextWidth(status) + 18;
  doc.setFillColor(...statusColor(invoice.status));
  doc.roundedRect(width - margin - statusWidth, 88, statusWidth, 15, 7, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...WHITE);
  doc.text(status, width - margin - statusWidth / 2, 98, { align: 'center' });
}

function informationBoxes(doc: jsPDF, invoice: Invoice, startY: number) {
  const { width, margin } = page(doc);
  const gap = 12;
  const leftWidth = (width - margin * 2 - gap) * 0.58;
  const rightWidth = width - margin * 2 - gap - leftWidth;
  const boxHeight = 86;

  doc.setFillColor(...SLATE_50);
  doc.roundedRect(margin, startY, leftWidth, boxHeight, 7, 7, 'F');
  doc.roundedRect(margin + leftWidth + gap, startY, rightWidth, boxHeight, 7, 7, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(...SLATE_400);
  doc.text('CLIENTE', margin + 12, startY + 17);
  doc.text('REFERENCIA', margin + leftWidth + gap + 12, startY + 17);

  doc.setTextColor(...SLATE_900);
  doc.setFontSize(10.5);
  const customer = invoice.customer || 'Cliente no registrado';
  doc.text(doc.splitTextToSize(customer, leftWidth - 24), margin + 12, startY + 33);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...SLATE_700);
  doc.text(`${invoiceDocumentLabel(invoice)}: ${invoice.documentNumber || '—'}`, margin + 12, startY + 50);
  if (invoice.customerPhone) doc.text(`Teléfono: ${invoice.customerPhone}`, margin + 12, startY + 64);

  const referenceX = margin + leftWidth + gap + 12;
  const reference: string[] = [];
  reference.push(`Orden: ${invoice.workOrder?.orderNumber || '—'}`);
  reference.push(`Vehículo: ${invoice.vehicle || '—'}`);
  if (invoice.vehicleYear) reference.push(`Año: ${invoice.vehicleYear}`);
  reference.push(`Emisión: ${invoiceDate(invoice.issueDate)}`);
  reference.push(`Pago: ${invoicePaymentLabel(invoice.paymentMethod)}`);
  doc.setFontSize(8.5);
  doc.setTextColor(...SLATE_700);
  doc.text(reference.slice(0, 5), referenceX, startY + 34);
}

function totals(doc: jsPDF, invoice: Invoice, startY: number) {
  const { width, margin, contentWidth } = page(doc);
  const boxWidth = 235;
  const boxX = width - margin - boxWidth;
  const boxTop = startY + 18;

  const infoWidth = contentWidth - boxWidth - 16;
  doc.setFillColor(...SLATE_50);
  doc.roundedRect(margin, boxTop, infoWidth, 94, 7, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(...SLATE_400);
  doc.text('INFORMACIÓN DE PAGO', margin + 14, boxTop + 20);
  doc.setFontSize(9);
  doc.setTextColor(...statusColor(invoice.status));
  doc.text(`Estado: ${invoiceStatusLabel(invoice.status)}`, margin + 14, boxTop + 39);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.3);
  doc.setTextColor(...SLATE_700);
  doc.text(`Forma de pago: ${invoicePaymentLabel(invoice.paymentMethod)}`, margin + 14, boxTop + 55);
  doc.text('Moneda: Soles (PEN)', margin + 14, boxTop + 70);
  doc.setFontSize(7.2);
  doc.setTextColor(...SLATE_400);
  doc.text('Conserve este documento como constancia de su operación.', margin + 14, boxTop + 84);

  doc.setFillColor(...SLATE_50);
  doc.roundedRect(boxX, boxTop, boxWidth, 94, 7, 7, 'F');

  const labelX = boxX + 14;
  const valueX = boxX + boxWidth - 14;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.7);
  doc.setTextColor(...SLATE_500);
  doc.text('Subtotal', labelX, boxTop + 20);
  doc.setTextColor(...SLATE_700);
  doc.text(invoiceMoney(invoice.subtotal), valueX, boxTop + 20, { align: 'right' });
  doc.text('IGV (18%)', labelX, boxTop + 37);
  doc.text(invoiceMoney(invoice.taxAmount), valueX, boxTop + 37, { align: 'right' });

  doc.setDrawColor(...SLATE_200);
  doc.line(labelX, boxTop + 48, valueX, boxTop + 48);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(...SLATE_900);
  doc.text('TOTAL', labelX, boxTop + 70);
  doc.setTextColor(...accent(invoice));
  doc.setFontSize(14);
  doc.text(invoiceMoney(invoice.totalAmount), valueX, boxTop + 70, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...SLATE_400);
  doc.text('Importe total en soles', labelX, boxTop + 84);
}

function footer(doc: jsPDF, invoice: Invoice, issuer: InvoiceIssuer) {
  const totalPages = doc.getNumberOfPages();
  const { width, height, margin } = page(doc);
  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
    doc.setPage(pageNumber);
    const y = height - 46;
    doc.setDrawColor(...SLATE_200);
    doc.setLineWidth(0.6);
    doc.line(margin, y - 12, width - margin, y - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.4);
    doc.setTextColor(...SLATE_400);
    doc.text(`Gracias por confiar en ${issuer.name}.`, margin, y);
    doc.text(
      `Representación impresa de la ${invoice.documentType === 'BOLETA' ? 'boleta' : 'factura'} electrónica.`,
      margin,
      y + 10
    );
    doc.text(`Página ${pageNumber} de ${totalPages}`, width - margin, y, { align: 'right' });
    doc.text('Generado por SIGTM', width - margin, y + 10, { align: 'right' });
  }
}

function cancelledWatermark(doc: jsPDF, invoice: Invoice) {
  if (invoice.status !== 'CANCELLED') return;
  const { width, height } = page(doc);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(70);
  doc.setTextColor(254, 202, 202);
  doc.text('ANULADA', width / 2, height / 2, { align: 'center', angle: 35 });
}

/**
 * Construye el PDF A4 del comprobante. Se expone por separado para poder
 * previsualizarlo o probarlo sin descargar el archivo.
 */
export function buildInvoicePdf(invoice: Invoice, options: InvoicePdfOptions = {}) {
  const issuer: InvoiceIssuer = { ...DEFAULT_ISSUER, ...options.issuer };
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const color = accent(invoice);
  const { margin, contentWidth } = page(doc);

  header(doc, invoice, issuer);
  informationBoxes(doc, invoice, 130);

  autoTable(doc, {
    startY: 234,
    margin: { left: margin, right: margin, bottom: 70 },
    head: [['DESCRIPCIÓN', 'CANT.', 'P. UNIT.', 'IMPORTE']],
    body: lineItems(invoice).map((item) => [
      item.description,
      String(item.quantity),
      invoiceMoney(item.unitPrice),
      invoiceMoney(item.lineTotal),
    ]),
    theme: 'grid',
    headStyles: {
      fillColor: color,
      textColor: WHITE,
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: { top: 9, bottom: 9, left: 8, right: 8 },
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: SLATE_700,
      cellPadding: { top: 9, bottom: 9, left: 8, right: 8 },
      lineColor: SLATE_200,
      lineWidth: 0.5,
    },
    alternateRowStyles: { fillColor: [251, 252, 254] },
    columnStyles: {
      0: { cellWidth: contentWidth - 220 },
      1: { halign: 'center', cellWidth: 45 },
      2: { halign: 'right', cellWidth: 85 },
      3: { halign: 'right', cellWidth: 90 },
    },
    styles: { overflow: 'linebreak', font: 'helvetica' },
    rowPageBreak: 'avoid',
  });

  const tableEnd = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 250;
  const { height } = page(doc);
  if (tableEnd > height - 190) {
    doc.addPage();
    totals(doc, invoice, 34);
  } else {
    totals(doc, invoice, tableEnd);
  }
  cancelledWatermark(doc, invoice);
  footer(doc, invoice, issuer);
  return doc;
}

/**
 * Descarga o envía a impresión un comprobante con diseño profesional.
 */
export function exportInvoicePdf(invoice: Invoice, options: InvoicePdfOptions = {}) {
  const doc = buildInvoicePdf(invoice, options);

  if (options.autoPrint) {
    doc.autoPrint();
    const url = doc.output('bloburl');
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }

  doc.save(`${safeFilename(`${invoice.invoiceNumber}-${invoice.documentType === 'BOLETA' ? 'boleta' : 'factura'}`)}.pdf`);
}
