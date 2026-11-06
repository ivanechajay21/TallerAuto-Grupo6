package com.sigtm.backend.dto;

import com.sigtm.backend.model.TipoComprobante;
import jakarta.validation.constraints.NotNull;

/**
 * Datos para emitir un comprobante a partir de una orden de trabajo.
 *
 * @param tipoComprobante factura o boleta; si no se envía, se asume factura
 *                        para mantener la compatibilidad con clientes antiguos
 */
public record GenerarFacturaRequest(
        @NotNull(message = "El tipo de comprobante es obligatorio")
        TipoComprobante tipoComprobante) {
}
