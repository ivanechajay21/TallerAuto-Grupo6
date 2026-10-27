package com.sigtm.backend.controller;

import com.sigtm.backend.dto.ComparacionOfertaResponse;
import com.sigtm.backend.service.ComparadorOfertasService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/abastecimiento/productos")
@RequiredArgsConstructor
public class ComparadorOfertasController {
    private final ComparadorOfertasService service;
    @GetMapping("/{productId}/comparacion-ofertas")
    @PreAuthorize("hasAuthority('COMPRAS:VER')")
    public ResponseEntity<List<ComparacionOfertaResponse>> comparar(@PathVariable Long productId) {
        return ResponseEntity.ok(service.comparar(productId));
    }
}
