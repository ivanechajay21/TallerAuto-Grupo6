package com.sigtm.backend.controller;

import com.sigtm.backend.dto.ComprasResponses;
import com.sigtm.backend.model.PoliticaReposicion;
import com.sigtm.backend.service.PoliticaReposicionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reposicion/politicas")
@RequiredArgsConstructor
public class PoliticaReposicionController {

    private final PoliticaReposicionService service;

    @GetMapping
    @PreAuthorize("hasAuthority('COMPRAS:VER')")
    public ResponseEntity<List<ComprasResponses.PoliticaReposicionResponse>> listar() {
        return ResponseEntity.ok(service.listarDto());
    }

    @PutMapping("/producto/{productId}")
    @PreAuthorize("hasAuthority('COMPRAS:EDITAR')")
    public ResponseEntity<ComprasResponses.PoliticaReposicionResponse> guardar(
            @PathVariable Long productId,
            @RequestParam(required = false) Long supplierId,
            @Valid @RequestBody PoliticaReposicion data) {
        return ResponseEntity.ok(service.guardarDto(productId, supplierId, data));
    }
}
