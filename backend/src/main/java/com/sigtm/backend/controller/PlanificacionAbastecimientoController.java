package com.sigtm.backend.controller;

import com.sigtm.backend.dto.ComprasResponses;
import com.sigtm.backend.dto.CrearPlanCompraRequest;
import com.sigtm.backend.dto.RegistrarPronosticoDemandaRequest;
import com.sigtm.backend.model.*;
import com.sigtm.backend.service.PlanificacionAbastecimientoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

/** API de planificación; las solicitudes generadas aún requieren aprobación en el flujo normal. */
@RestController
@RequestMapping("/api/planificacion-abastecimiento")
@RequiredArgsConstructor
public class PlanificacionAbastecimientoController {
    private final PlanificacionAbastecimientoService service;

    @PutMapping("/pronosticos/productos/{productId}") @PreAuthorize("hasAuthority('COMPRAS:EDITAR')")
    public ResponseEntity<ComprasResponses.PronosticoDemandaResponse> registrar(@PathVariable Long productId, @Valid @RequestBody RegistrarPronosticoDemandaRequest request) {
        return ResponseEntity.ok(service.registrarPronosticoDto(productId, request));
    }
    @GetMapping("/pronosticos") @PreAuthorize("hasAuthority('COMPRAS:VER')")
    public ResponseEntity<List<ComprasResponses.PronosticoDemandaResponse>> pronosticos(@RequestParam String period) { return ResponseEntity.ok(service.listarPronosticosDto(period)); }
    @PostMapping("/planes/generar") @PreAuthorize("hasAuthority('COMPRAS:EDITAR')")
    public ResponseEntity<ComprasResponses.PlanCompraResponse> generar(@RequestParam String period, @RequestParam(required = false) String notes) { return ResponseEntity.ok(service.generarDesdePronosticosDto(period, notes)); }
    @PostMapping("/planes") @PreAuthorize("hasAuthority('COMPRAS:EDITAR')")
    public ResponseEntity<ComprasResponses.PlanCompraResponse> crear(@Valid @RequestBody CrearPlanCompraRequest request) { return ResponseEntity.ok(service.crearPlanDto(request)); }
    @GetMapping("/planes") @PreAuthorize("hasAuthority('COMPRAS:VER')")
    public ResponseEntity<List<ComprasResponses.PlanCompraResponse>> listar() { return ResponseEntity.ok(service.listarPlanesDto()); }
    @GetMapping("/planes/{id}") @PreAuthorize("hasAuthority('COMPRAS:VER')")
    public ResponseEntity<ComprasResponses.PlanCompraResponse> obtener(@PathVariable Long id) { return ResponseEntity.ok(service.obtenerPlanDto(id)); }
    @PostMapping("/planes/{id}/convertir-solicitud") @PreAuthorize("hasAuthority('COMPRAS:APROBAR')")
    public ResponseEntity<ComprasResponses.SolicitudCompraResponse> convertir(@PathVariable Long id) { return ResponseEntity.ok(service.convertirEnSolicitudDto(id)); }
}
