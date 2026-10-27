package com.sigtm.backend.controller;

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
    public ResponseEntity<PronosticoDemanda> registrar(@PathVariable Long productId, @Valid @RequestBody RegistrarPronosticoDemandaRequest request) {
        return ResponseEntity.ok(service.registrarPronostico(productId, request));
    }
    @GetMapping("/pronosticos") @PreAuthorize("hasAuthority('COMPRAS:VER')")
    public ResponseEntity<List<PronosticoDemanda>> pronosticos(@RequestParam String period) { return ResponseEntity.ok(service.listarPronosticos(period)); }
    @PostMapping("/planes/generar") @PreAuthorize("hasAuthority('COMPRAS:EDITAR')")
    public ResponseEntity<PlanCompra> generar(@RequestParam String period, @RequestParam(required = false) String notes) { return ResponseEntity.ok(service.generarDesdePronosticos(period, notes)); }
    @PostMapping("/planes") @PreAuthorize("hasAuthority('COMPRAS:EDITAR')")
    public ResponseEntity<PlanCompra> crear(@Valid @RequestBody CrearPlanCompraRequest request) { return ResponseEntity.ok(service.crearPlan(request)); }
    @GetMapping("/planes") @PreAuthorize("hasAuthority('COMPRAS:VER')")
    public ResponseEntity<List<PlanCompra>> listar() { return ResponseEntity.ok(service.listarPlanes()); }
    @GetMapping("/planes/{id}") @PreAuthorize("hasAuthority('COMPRAS:VER')")
    public ResponseEntity<PlanCompra> obtener(@PathVariable Long id) { return ResponseEntity.ok(service.obtenerPlan(id)); }
    @PostMapping("/planes/{id}/convertir-solicitud") @PreAuthorize("hasAuthority('COMPRAS:APROBAR')")
    public ResponseEntity<SolicitudCompra> convertir(@PathVariable Long id) { return ResponseEntity.ok(service.convertirEnSolicitud(id)); }
}
