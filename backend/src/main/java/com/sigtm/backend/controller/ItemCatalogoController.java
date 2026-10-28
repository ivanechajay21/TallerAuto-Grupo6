package com.sigtm.backend.controller;

import com.sigtm.backend.model.ItemCatalogo;
import com.sigtm.backend.service.ItemCatalogoService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Endpoints de los catálogos de configuración.
 *
 * <p>Administra los valores de apoyo (estados, prioridades, categorías, unidades,
 * etc.) desde la pantalla Configuración: la lectura exige
 * {@code CONFIGURACION:VER} y la escritura {@code CONFIGURACION:EDITAR}.</p>
 */
@RestController
@RequestMapping("/api/configuracion/catalogo")
@RequiredArgsConstructor
public class ItemCatalogoController {

    private final ItemCatalogoService itemCatalogoService;

    // Catálogos de configuración (estados, prioridades, categorías, unidades): solo
    // se administran desde la pantalla Configuración (CONFIGURACION:*; ADMIN/MANAGER).
    /**
     * Lista los elementos activos de un catálogo.
     *
     * <p>Exige {@code CONFIGURACION:VER}. El tipo de catálogo es obligatorio; un
     * tipo desconocido produce 400.</p>
     *
     * @param tipo tipo de catálogo a listar (por ejemplo {@code ESTADOS} o {@code PRIORIDADES})
     * @return la lista de elementos del catálogo (200)
     */
    @GetMapping
    @PreAuthorize("hasAuthority('CONFIGURACION:VER')")
    public ResponseEntity<List<ItemCatalogo>> listar(@RequestParam String tipo) {
        return ResponseEntity.ok(itemCatalogoService.listarPorTipo(tipo));
    }

    /**
     * Crea un elemento en un catálogo de configuración.
     *
     * <p>Exige {@code CONFIGURACION:EDITAR}. El tipo es obligatorio y debe existir;
     * el nombre no puede quedar vacío ni repetirse dentro del mismo catálogo.</p>
     *
     * @param tipo tipo de catálogo al que pertenece el elemento
     * @param item datos del elemento a crear
     * @return el elemento creado (200)
     * @throws IllegalArgumentException si el tipo es inválido, el nombre está vacío o ya existe
     */
    @PostMapping
    @PreAuthorize("hasAuthority('CONFIGURACION:EDITAR')")
    public ResponseEntity<ItemCatalogo> crear(@RequestParam String tipo, @RequestBody ItemCatalogo item) {
        return ResponseEntity.ok(itemCatalogoService.crear(tipo, item));
    }

    /**
     * Actualiza un elemento de un catálogo de configuración.
     *
     * <p>Exige {@code CONFIGURACION:EDITAR}. El nombre no puede quedar vacío ni
     * repetirse dentro del mismo catálogo; un identificador inexistente produce 400.</p>
     *
     * @param id   identificador del elemento a modificar
     * @param tipo tipo de catálogo al que pertenece el elemento
     * @param item nuevos valores del elemento
     * @return el elemento ya actualizado (200)
     * @throws IllegalArgumentException si el tipo es inválido, el nombre está vacío o ya existe
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('CONFIGURACION:EDITAR')")
    public ResponseEntity<ItemCatalogo> actualizar(@PathVariable Long id, @RequestParam String tipo, @RequestBody ItemCatalogo item) {
        return ResponseEntity.ok(itemCatalogoService.actualizar(id, tipo, item));
    }

    /**
     * Elimina un elemento de un catálogo de configuración.
     *
     * <p>Exige {@code CONFIGURACION:EDITAR}. Un identificador inexistente produce
     * 400.</p>
     *
     * @param id identificador del elemento a eliminar
     * @return respuesta sin cuerpo (204)
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('CONFIGURACION:EDITAR')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        itemCatalogoService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
