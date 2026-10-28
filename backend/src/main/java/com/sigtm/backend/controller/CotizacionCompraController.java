package com.sigtm.backend.controller;
import com.sigtm.backend.dto.CrearOrdenCompraRequest; import com.sigtm.backend.model.OrdenCompra; import com.sigtm.backend.service.CompraService; import jakarta.validation.Valid; import lombok.RequiredArgsConstructor; import org.springframework.http.ResponseEntity; import org.springframework.security.access.prepost.PreAuthorize; import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/cotizaciones-compra") @RequiredArgsConstructor
public class CotizacionCompraController {
 private final CompraService compraService;
 @PostMapping @PreAuthorize("hasAuthority('COMPRAS:CREAR')") public ResponseEntity<OrdenCompra> crear(@Valid @RequestBody CrearOrdenCompraRequest request) { return ResponseEntity.ok(compraService.crearCotizacion(request)); }
 @PostMapping("/{id}/aceptar") @PreAuthorize("hasAuthority('COMPRAS:APROBAR')") public ResponseEntity<OrdenCompra> aceptar(@PathVariable Long id) { return ResponseEntity.ok(compraService.aceptarCotizacion(id)); }
}
