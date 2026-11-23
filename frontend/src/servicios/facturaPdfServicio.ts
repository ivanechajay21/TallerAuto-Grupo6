import type { Invoice } from './facturacionServicio';
import { descargarArchivo } from './descargaServicio';

export interface InvoicePdfOptions {
  autoPrint?: boolean;
}

/**
 * Descarga el PDF del comprobante generado por el backend.
 *
 * La emisión del documento ya no ocurre en el navegador: el frontend solo
 * solicita el archivo al endpoint autenticado de facturas.
 */
export async function exportInvoicePdf(invoice: Invoice, options: InvoicePdfOptions = {}) {
  if (!invoice?.id) {
    throw new Error('El comprobante no tiene identificador');
  }

  const tipo = invoice.documentType === 'BOLETA' ? 'boleta' : 'factura';
  const base = invoice.invoiceNumber || `comprobante-${invoice.id}`;
  const filename = `${base}-${tipo}.pdf`.replace(/[\\/:*?"<>|]/g, '-');

  await descargarArchivo(`/facturas/${invoice.id}/pdf`, {
    // Evita que el navegador reutilice un PDF antiguo tras un rediseño.
    params: { v: Date.now() },
    filename,
    mimeType: 'application/pdf',
    autoPrint: options.autoPrint,
  });
}
