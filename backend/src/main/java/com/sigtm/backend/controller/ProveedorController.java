package com.sigtm.backend.controller;

import com.sigtm.backend.model.Proveedor;
import com.sigtm.backend.service.ProveedorService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** API REST para administrar proveedores. */
@RestController
@RequestMapping("/api/proveedores")
@RequiredArgsConstructor
public class ProveedorController {
    private final ProveedorService proveedorService;

    @GetMapping
    @PreAuthorize("hasAuthority('PROVEEDORES:VER')")
    public ResponseEntity<List<Proveedor>> listar(@RequestParam(defaultValue = "false") boolean incluirInactivos) {
        return ResponseEntity.ok(proveedorService.listar(incluirInactivos));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('PROVEEDORES:VER')")
    public ResponseEntity<Proveedor> obtener(@PathVariable Long id) {
        return ResponseEntity.ok(proveedorService.obtener(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('PROVEEDORES:CREAR')")
    public ResponseEntity<Proveedor> crear(@Valid @RequestBody Proveedor proveedor) {
        return ResponseEntity.ok(proveedorService.crear(proveedor));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('PROVEEDORES:EDITAR')")
    public ResponseEntity<Proveedor> actualizar(@PathVariable Long id, @Valid @RequestBody Proveedor proveedor) {
        return ResponseEntity.ok(proveedorService.actualizar(id, proveedor));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('PROVEEDORES:ELIMINAR')")
    public ResponseEntity<Void> desactivar(@PathVariable Long id) {
        proveedorService.desactivar(id);
        return ResponseEntity.noContent().build();
    }
}
