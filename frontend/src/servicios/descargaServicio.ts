import api from './api';

interface DescargaOpciones {
  params?: Record<string, unknown>;
  filename: string;
  mimeType?: string;
  autoPrint?: boolean;
}

/**
 * Descarga o abre un archivo generado por el backend.
 *
 * El endpoint se invoca con autenticación y respuesta binaria; el nombre de
 * archivo se usa como respaldo cuando el navegador no recibe Content-Disposition.
 */
export async function descargarArchivo(url: string, options: DescargaOpciones) {
  const response = await api.get(url, {
    params: options.params,
    responseType: 'blob',
  });

  const contentType = response.headers['content-type'];
  const blob = new Blob([response.data], {
    type: typeof contentType === 'string'
      ? contentType
      : options.mimeType || 'application/octet-stream',
  });
  const objectUrl = URL.createObjectURL(blob);

  if (options.autoPrint) {
    const printWindow = window.open(objectUrl, '_blank', 'noopener,noreferrer');
    if (printWindow) {
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      return;
    }
  }

  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = options.filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_200);
}
