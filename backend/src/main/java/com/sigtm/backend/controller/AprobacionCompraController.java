package com.sigtm.backend.controller;

import com.sigtm.backend.dto.ComprasResponses;
import com.sigtm.backend.model.*;
import com.sigtm.backend.service.AprobacionCompraService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/compras/aprobaciones")
@RequiredArgsConstructor
public class AprobacionCompraController {
    private final AprobacionCompraService service;

    @GetMapping("/niveles")
    @PreAuthorize("hasAuthority('COMPRAS:VER')")
    public ResponseEntity<List<ComprasResponses.NivelAprobacionCompraResponse>> niveles() {
        return ResponseEntity.ok(service.nivelesDto());
    }

    @PostMapping("/niveles")
    @PreAuthorize("hasAuthority('COMPRAS:APROBAR')")
    public ResponseEntity<ComprasResponses.NivelAprobacionCompraResponse> nivel(
            @Valid @RequestBody NivelAprobacionCompra n) {
        return ResponseEntity.ok(service.guardarNivelDto(n));
    }

    @PostMapping("/orden/{orderId}/nivel/{levelId}")
    @PreAuthorize("hasAuthority('COMPRAS:APROBAR')")
    public ResponseEntity<ComprasResponses.AprobacionOrdenCompraResponse> decidir(
            @PathVariable Long orderId, @PathVariable Long levelId,
            @RequestParam String decision, @RequestParam(required = false) String comment) {
        return ResponseEntity.ok(service.decidirDto(orderId, levelId, decision.toUpperCase(), comment));
    }

    @GetMapping("/orden/{orderId}")
    @PreAuthorize("hasAuthority('COMPRAS:VER')")
    public ResponseEntity<List<ComprasResponses.AprobacionOrdenCompraResponse>> historial(
            @PathVariable Long orderId) {
        return ResponseEntity.ok(service.historialDto(orderId));
    }
}
