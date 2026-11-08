package com.sigtm.backend.controller;

import com.sigtm.backend.dto.ComprasResponses;
import com.sigtm.backend.dto.CrearFacturaProveedorRequest;
import com.sigtm.backend.dto.RegistrarPagoProveedorRequest;
import com.sigtm.backend.service.CuentaPorPagarService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/cuentas-por-pagar")
@RequiredArgsConstructor
public class CuentaPorPagarController {
    private final CuentaPorPagarService service;

    @GetMapping
    @PreAuthorize("hasAuthority('COMPRAS:VER')")
    public ResponseEntity<List<ComprasResponses.FacturaProveedorResponse>> listar() {
        return ResponseEntity.ok(service.listarDto());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('COMPRAS:VER')")
    public ResponseEntity<ComprasResponses.FacturaProveedorResponse> obtener(@PathVariable Long id) {
        return ResponseEntity.ok(service.obtenerDto(id));
    }

    @GetMapping("/{id}/pagos")
    @PreAuthorize("hasAuthority('COMPRAS:VER')")
    public ResponseEntity<List<ComprasResponses.PagoProveedorResponse>> pagos(@PathVariable Long id) {
        return ResponseEntity.ok(service.pagos(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('COMPRAS:CREAR')")
    public ResponseEntity<ComprasResponses.FacturaProveedorResponse> crear(
            @Valid @RequestBody CrearFacturaProveedorRequest r) {
        return ResponseEntity.ok(service.crearDto(r));
    }

    @PostMapping("/{id}/pagos")
    @PreAuthorize("hasAuthority('COMPRAS:APROBAR')")
    public ResponseEntity<ComprasResponses.FacturaProveedorResponse> pagar(@PathVariable Long id,
            @Valid @RequestBody RegistrarPagoProveedorRequest r) {
        return ResponseEntity.ok(service.pagarDto(id, r));
    }

    @PatchMapping("/{id}/anular")
    @PreAuthorize("hasAuthority('COMPRAS:ANULAR')")
    public ResponseEntity<ComprasResponses.FacturaProveedorResponse> anular(@PathVariable Long id) {
        return ResponseEntity.ok(service.anularDto(id));
    }
}
