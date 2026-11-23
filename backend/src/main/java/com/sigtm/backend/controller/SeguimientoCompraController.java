package com.sigtm.backend.controller;

import com.sigtm.backend.dto.ComprasResponses;
import com.sigtm.backend.model.SeguimientoCompra;
import com.sigtm.backend.service.SeguimientoCompraService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/compras/{orderId}/seguimiento")
@RequiredArgsConstructor
public class SeguimientoCompraController {
    private final SeguimientoCompraService service;

    @GetMapping
    @PreAuthorize("hasAuthority('COMPRAS:VER')")
    public ResponseEntity<ComprasResponses.SeguimientoCompraResponse> obtener(@PathVariable Long orderId) {
        return ResponseEntity.ok(service.obtenerDto(orderId));
    }

    @PutMapping
    @PreAuthorize("hasAuthority('COMPRAS:EDITAR')")
    public ResponseEntity<ComprasResponses.SeguimientoCompraResponse> actualizar(
            @PathVariable Long orderId, @RequestBody SeguimientoCompra seguimiento) {
        return ResponseEntity.ok(service.actualizarDto(orderId, seguimiento));
    }
}
