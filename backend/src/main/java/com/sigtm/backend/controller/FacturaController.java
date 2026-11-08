package com.sigtm.backend.controller;

import com.sigtm.backend.dto.GenerarFacturaRequest;
import com.sigtm.backend.model.TipoComprobante;
import com.sigtm.backend.service.FacturaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Endpoints de emisión y cobro de comprobantes.
 *
 * <p>Los comprobantes se generan a partir de una orden de trabajo ya finalizada y solo
 * existe uno por orden. El acceso se controla con los permisos del módulo
 * {@code FACTURAS} ({@code FACTURAS:VER}, {@code FACTURAS:CREAR} y
 * {@code FACTURAS:APROBAR} para el cobro).</p>
 */
@RestController
@RequestMapping("/api/facturas")
@RequiredArgsConstructor
public class FacturaController {

    private final FacturaService facturaService;

    // Acceso por permiso del módulo FACTURAS.
    /**
     * Lista todas las facturas emitidas.
     *
     * <p>Exige {@code FACTURAS:VER}. Cada elemento incluye importes, estado y los
     * datos de la orden de trabajo, el cliente y el vehículo de origen.</p>
     *
     * @return la lista de facturas (200)
     */
    @GetMapping
    @PreAuthorize("hasAuthority('FACTURAS:VER')")
    public ResponseEntity<List<Map<String, Object>>> obtenerTodas() {
        return ResponseEntity.ok(facturaService.obtenerTodas());
    }

    /**
     * Devuelve el detalle de una factura.
     *
     * <p>Exige {@code FACTURAS:VER}. Un identificador inexistente se traduce en 404
     * con el mensaje de recurso no encontrado.</p>
     *
     * @param id identificador de la factura
     * @return el mapa con los datos de la factura, su orden, cliente y vehículo (200)
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('FACTURAS:VER')")
    public ResponseEntity<Map<String, Object>> obtenerPorId(@PathVariable Long id) {
        return ResponseEntity.ok(facturaService.obtenerPorId(id));
    }

    /**
     * Genera una factura o una boleta a partir de una orden de trabajo.
     *
     * <p>Exige {@code FACTURAS:CREAR}. La orden debe existir y estar en estado
     * {@code FINALIZADO} o {@code ENTREGADO}, tener al menos un ítem y admitir un
     * solo comprobante. La factura exige RUC del cliente; la boleta admite DNI o
     * RUC. El importe se calcula sumando los ítems y aplicando un IGV del 18 %.</p>
     *
     * @param workOrderId identificador de la orden de trabajo a facturar
     * @param request     tipo de comprobante; si no se envía, se asume factura
     * @return el comprobante emitido (200)
     */
    @PostMapping("/orden-trabajo/{workOrderId}")
    @PreAuthorize("hasAuthority('FACTURAS:CREAR')")
    public ResponseEntity<Map<String, Object>> generarFactura(
            @PathVariable Long workOrderId,
            @Valid @RequestBody(required = false) GenerarFacturaRequest request) {
        TipoComprobante tipo = request != null && request.tipoComprobante() != null
                ? request.tipoComprobante()
                : TipoComprobante.FACTURA;
        return ResponseEntity.ok(facturaService.generarFactura(workOrderId, tipo));
    }

    /**
     * Registra el pago de una factura.
     *
     * <p>Exige {@code FACTURAS:APROBAR}. El medio de pago es obligatorio y debe ser
     * {@code CASH}, {@code CARD} o {@code TRANSFER}; solo se puede pagar un comprobante
     * en estado {@code PENDING} y el cobro queda auditado. Un identificador inexistente
     * se traduce en 404 y un parámetro faltante en 400.</p>
     *
     * @param id            identificador de la factura
     * @param paymentMethod medio de pago utilizado
     * @return la factura con el pago registrado (200)
     */
    @PatchMapping("/{id}/pagar")
    @PreAuthorize("hasAuthority('FACTURAS:APROBAR')")
    public ResponseEntity<Map<String, Object>> pagarFactura(
            @PathVariable Long id,
            @RequestParam String paymentMethod) {
        return ResponseEntity.ok(facturaService.pagarFactura(id, paymentMethod));
    }

    @PatchMapping("/{id}/anular")
    @PreAuthorize("hasAuthority('FACTURAS:ELIMINAR')")
    public ResponseEntity<Map<String, Object>> anularFactura(@PathVariable Long id) {
        return ResponseEntity.ok(facturaService.anularFactura(id));
    }
}
