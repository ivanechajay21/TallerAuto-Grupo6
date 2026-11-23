package com.sigtm.backend.controller;

import com.sigtm.backend.dto.ComprasResponses;
import com.sigtm.backend.model.InspeccionRecepcionCompra;
import com.sigtm.backend.service.InspeccionRecepcionCompraService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/recepciones/{receiptId}/inspecciones")
@RequiredArgsConstructor
public class InspeccionRecepcionCompraController {
    private final InspeccionRecepcionCompraService service;

    @GetMapping
    @PreAuthorize("hasAuthority('COMPRAS:VER')")
    public ResponseEntity<List<ComprasResponses.InspeccionRecepcionCompraResponse>> listar(
            @PathVariable Long receiptId) {
        return ResponseEntity.ok(service.listarDto(receiptId));
    }

    @PostMapping("/producto/{productId}")
    @PreAuthorize("hasAuthority('COMPRAS:RECEPCIONAR')")
    public ResponseEntity<ComprasResponses.InspeccionRecepcionCompraResponse> registrar(
            @PathVariable Long receiptId, @PathVariable Long productId,
            @Valid @RequestBody InspeccionRecepcionCompra data) {
        return ResponseEntity.ok(service.registrarDto(receiptId, productId, data));
    }
}
