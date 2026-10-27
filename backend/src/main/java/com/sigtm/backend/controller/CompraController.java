package com.sigtm.backend.controller;

import com.sigtm.backend.dto.CrearOrdenCompraRequest;
import com.sigtm.backend.dto.RecepcionarCompraRequest;
import com.sigtm.backend.dto.DevolverCompraRequest;
import com.sigtm.backend.model.OrdenCompra;
import com.sigtm.backend.model.RecepcionCompra;
import com.sigtm.backend.service.CompraService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** API REST para órdenes de compra y recepción de mercadería. */
@RestController
@RequestMapping("/api/compras")
@RequiredArgsConstructor
public class CompraController {
    private final CompraService compraService;

    @GetMapping
    @PreAuthorize("hasAuthority('COMPRAS:VER')")
    public ResponseEntity<List<OrdenCompra>> listar() {
        return ResponseEntity.ok(compraService.listar());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('COMPRAS:VER')")
    public ResponseEntity<OrdenCompra> obtener(@PathVariable Long id) {
        return ResponseEntity.ok(compraService.obtener(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('COMPRAS:CREAR')")
    public ResponseEntity<OrdenCompra> crear(@Valid @RequestBody CrearOrdenCompraRequest request) {
        return ResponseEntity.ok(compraService.crear(request));
    }
    @PostMapping("/{id}/aprobar") @PreAuthorize("hasAuthority('COMPRAS:APROBAR')")
    public ResponseEntity<OrdenCompra> aprobar(@PathVariable Long id) { return ResponseEntity.ok(compraService.aprobar(id)); }
    @PostMapping("/{id}/devoluciones") @PreAuthorize("hasAuthority('COMPRAS:DEVOLVER')")
    public ResponseEntity<OrdenCompra> devolver(@PathVariable Long id, @Valid @RequestBody DevolverCompraRequest request) { return ResponseEntity.ok(compraService.devolver(id, request)); }

    @PostMapping("/{id}/recepciones")
    @PreAuthorize("hasAuthority('COMPRAS:RECEPCIONAR')")
    public ResponseEntity<RecepcionCompra> recepcionar(@PathVariable Long id,
                                                        @Valid @RequestBody RecepcionarCompraRequest request) {
        return ResponseEntity.ok(compraService.recepcionar(id, request));
    }

    @GetMapping("/{id}/recepciones")
    @PreAuthorize("hasAuthority('COMPRAS:VER')")
    public ResponseEntity<List<RecepcionCompra>> listarRecepciones(@PathVariable Long id) {
        return ResponseEntity.ok(compraService.listarRecepciones(id));
    }

    @PatchMapping("/{id}/anular")
    @PreAuthorize("hasAuthority('COMPRAS:ANULAR')")
    public ResponseEntity<OrdenCompra> anular(@PathVariable Long id) {
        return ResponseEntity.ok(compraService.anular(id));
    }
}
