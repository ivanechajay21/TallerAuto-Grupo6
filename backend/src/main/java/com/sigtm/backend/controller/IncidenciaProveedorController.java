package com.sigtm.backend.controller;

import com.sigtm.backend.dto.ComprasResponses;
import com.sigtm.backend.model.IncidenciaProveedor;
import com.sigtm.backend.service.IncidenciaProveedorService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/incidencias-proveedor")
@RequiredArgsConstructor
public class IncidenciaProveedorController {
    private final IncidenciaProveedorService service;

    @GetMapping
    @PreAuthorize("hasAuthority('COMPRAS:VER')")
    public ResponseEntity<List<ComprasResponses.IncidenciaProveedorResponse>> abiertas() {
        return ResponseEntity.ok(service.abiertasDto());
    }

    @PostMapping("/proveedor/{supplierId}")
    @PreAuthorize("hasAuthority('COMPRAS:EDITAR')")
    public ResponseEntity<ComprasResponses.IncidenciaProveedorResponse> crear(@PathVariable Long supplierId,
            @RequestParam(required = false) Long orderId, @jakarta.validation.Valid @RequestBody IncidenciaProveedor data) {
        return ResponseEntity.ok(service.crearDto(supplierId, orderId, data));
    }

    @PatchMapping("/{id}/resolver")
    @PreAuthorize("hasAuthority('COMPRAS:EDITAR')")
    public ResponseEntity<ComprasResponses.IncidenciaProveedorResponse> resolver(@PathVariable Long id, @RequestParam String resolution) {
        return ResponseEntity.ok(service.resolverDto(id, resolution));
    }
}
