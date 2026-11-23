package com.sigtm.backend.controller;

import com.sigtm.backend.dto.ComprasResponses;
import com.sigtm.backend.model.ContratoProveedor;
import com.sigtm.backend.service.ContratoProveedorService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/proveedores/{supplierId}/contratos")
@RequiredArgsConstructor
public class ContratoProveedorController {

    private final ContratoProveedorService service;

    @GetMapping
    @PreAuthorize("hasAuthority('COMPRAS:VER')")
    public ResponseEntity<List<ComprasResponses.ContratoProveedorResponse>> listar(@PathVariable Long supplierId) {
        return ResponseEntity.ok(service.listarDto(supplierId));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('COMPRAS:VER')")
    public ResponseEntity<ComprasResponses.ContratoProveedorResponse> obtener(@PathVariable Long supplierId,
                                                                               @PathVariable Long id) {
        return ResponseEntity.ok(service.obtenerDto(supplierId, id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('COMPRAS:APROBAR')")
    public ResponseEntity<ComprasResponses.ContratoProveedorResponse> crear(
            @PathVariable Long supplierId, @Valid @RequestBody ContratoProveedor contract) {
        return ResponseEntity.ok(service.crearDto(supplierId, contract));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('COMPRAS:APROBAR')")
    public ResponseEntity<ComprasResponses.ContratoProveedorResponse> actualizar(
            @PathVariable Long supplierId, @PathVariable Long id,
            @Valid @RequestBody ContratoProveedor contract) {
        return ResponseEntity.ok(service.actualizarDto(supplierId, id, contract));
    }

    @PatchMapping("/{id}/desactivar")
    @PreAuthorize("hasAuthority('COMPRAS:APROBAR')")
    public ResponseEntity<ComprasResponses.ContratoProveedorResponse> desactivar(@PathVariable Long supplierId,
                                                                                  @PathVariable Long id) {
        return ResponseEntity.ok(service.desactivarDto(supplierId, id));
    }

    @PatchMapping("/{id}/reactivar")
    @PreAuthorize("hasAuthority('COMPRAS:APROBAR')")
    public ResponseEntity<ComprasResponses.ContratoProveedorResponse> reactivar(@PathVariable Long supplierId,
                                                                                 @PathVariable Long id) {
        return ResponseEntity.ok(service.reactivarDto(supplierId, id));
    }
}
