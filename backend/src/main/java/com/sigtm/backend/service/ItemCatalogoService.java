package com.sigtm.backend.service;

import com.sigtm.backend.exception.DuplicateResourceException;
import com.sigtm.backend.exception.ResourceNotFoundException;
import com.sigtm.backend.model.ItemCatalogo;
import com.sigtm.backend.repository.ItemCatalogoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;

/**
 * Administra los catálogos de apoyo del taller: categorías, estados, prioridades y
 * unidades de medida.
 *
 * <p>Cada catálogo mantiene nombres y códigos únicos dentro de su tipo, y toda alta,
 * modificación o baja se registra en la auditoría.</p>
 */
@Service
@RequiredArgsConstructor
public class ItemCatalogoService {

    public static final String TIPO_CATEGORIA = "CATEGORIA";
    public static final String TIPO_ESTADO = "ESTADO";
    public static final String TIPO_PRIORIDAD = "PRIORIDAD";
    public static final String TIPO_UNIDAD = "UNIDAD";

    private final ItemCatalogoRepository itemCatalogoRepository;
    private final AuditoriaService auditoriaService;

    /**
     * Lista los elementos de un catálogo ordenados por su campo {@code orden}.
     *
     * <p>El tipo se normaliza a mayúsculas y se valida contra los tipos admitidos
     * ({@code CATEGORIA}, {@code ESTADO}, {@code PRIORIDAD} y {@code UNIDAD}).</p>
     *
     * @param tipo tipo de catálogo consultado
     * @return los elementos del catálogo, ordenados por {@code orden} y por identificador
     * @throws IllegalArgumentException si el tipo es nulo, vacío o no está contemplado
     */
    @Transactional(readOnly = true)
    public List<ItemCatalogo> listarPorTipo(String tipo) {
        return itemCatalogoRepository.findByTipoOrderByOrdenAscIdAsc(normalizarTipo(tipo));
    }

    /**
     * Registra un nuevo elemento en un catálogo.
     *
     * <p>El nombre es obligatorio y debe ser único dentro del tipo; si se indica un
     * código, también debe ser único. Cuando no se informa, el orden se asigna al final
     * de la lista y el elemento queda activo. El alta se registra en la auditoría.</p>
     *
     * @param tipo tipo de catálogo destino
     * @param item datos del elemento; el nombre se normaliza recortando espacios
     * @return el elemento creado
     * @throws IllegalArgumentException si el tipo no es válido, falta el nombre o ya
     *                                  existe un elemento con ese nombre o código
     */
    @Transactional
    public ItemCatalogo crear(String tipo, ItemCatalogo item) {
        if (item == null) throw new IllegalArgumentException("Los datos del catálogo son obligatorios");
        String t = normalizarTipo(tipo);
        String nombre = item.getNombre() == null ? "" : item.getNombre().trim();
        if (nombre.isEmpty()) throw new IllegalArgumentException("El nombre es obligatorio");
        if (nombre.length() > 100) throw new IllegalArgumentException("El nombre no puede superar 100 caracteres");

        asignarCodigo(item, t);
        verificarUnico(t, item);

        if (item.getOrden() == null) {
            item.setOrden(itemCatalogoRepository.findByTipoOrderByOrdenAscIdAsc(t).size() + 1);
        }
        item.setTipo(t);
        if (item.getActivo() == null) item.setActivo(true);
        ItemCatalogo guardado = itemCatalogoRepository.save(item);
        auditoriaService.registrar("CREATE", "CATALOGO_" + t, guardado.getId(), "Catálogo " + t + ": " + guardado.getNombre());
        return guardado;
    }

    /**
     * Actualiza un elemento del catálogo.
     *
     * <p>El nombre es obligatorio y debe seguir siendo único dentro del tipo; el tipo de
     * un elemento existente no se modifica. El cambio se registra en la auditoría. Si el
     * elemento no existe se lanza {@code RuntimeException}.</p>
     *
     * @param id         identificador del elemento
     * @param tipo       tipo de catálogo solicitado (no altera el del elemento)
     * @param actualizar datos a actualizar
     * @return el elemento actualizado
     * @throws IllegalArgumentException si falta el nombre o ya existe otro con ese nombre
     */
    @Transactional
    public ItemCatalogo actualizar(Long id, String tipo, ItemCatalogo actualizar) {
        if (actualizar == null) throw new IllegalArgumentException("Los datos del catálogo son obligatorios");
        ItemCatalogo item = itemCatalogoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Elemento de catálogo no encontrado"));
        String t = normalizarTipo(tipo);
        if (!t.equals(item.getTipo())) {
            throw new IllegalArgumentException("El elemento no pertenece al catálogo indicado");
        }
        String nombre = actualizar.getNombre() == null ? "" : actualizar.getNombre().trim();
        if (nombre.isEmpty()) throw new IllegalArgumentException("El nombre es obligatorio");
        if (nombre.length() > 100) throw new IllegalArgumentException("El nombre no puede superar 100 caracteres");

        String nombreAnterior = item.getNombre();
        ItemCatalogo duplicado = itemCatalogoRepository.findByTipoAndNombreIgnoreCase(t, nombre).orElse(null);
        if (duplicado != null && !duplicado.getId().equals(id)) {
            throw new IllegalArgumentException("Ya existe un elemento llamado \"" + nombre + "\"");
        }
        item.setNombre(nombre);
        if (StringUtils.hasText(actualizar.getCode())) {
            String codigo = actualizar.getCode().trim();
            if (codigo.length() > 30) throw new IllegalArgumentException("El código no puede superar 30 caracteres");
            ItemCatalogo codigoDuplicado = itemCatalogoRepository.findByTipoAndCode(t, codigo).orElse(null);
            if (codigoDuplicado != null && !codigoDuplicado.getId().equals(id)) {
                throw new DuplicateResourceException("Ya existe el código \"" + codigo + "\" en este catálogo");
            }
            item.setCode(codigo);
        }
        if (actualizar.getOrden() != null) item.setOrden(actualizar.getOrden());
        if (actualizar.getActivo() != null) item.setActivo(actualizar.getActivo());

        ItemCatalogo guardado = itemCatalogoRepository.save(item);
        auditoriaService.registrar("UPDATE", "CATALOGO_" + t, guardado.getId(), "Catálogo " + t + ": " + nombreAnterior + " → " + guardado.getNombre());
        return guardado;
    }

    /**
     * Elimina un elemento del catálogo.
     *
     * <p>El borrado es físico y queda registrado en la auditoría con la acción
     * {@code DELETE}. Si el elemento no existe se lanza {@code RuntimeException}.</p>
     *
     * @param id identificador del elemento
     */
    @Transactional
    public void delete(Long id) {
        ItemCatalogo item = itemCatalogoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Elemento de catálogo no encontrado"));
        auditoriaService.registrar("DELETE", "CATALOGO_" + item.getTipo(), id, "Catálogo " + item.getTipo() + ": " + item.getNombre());
        itemCatalogoRepository.delete(item);
    }

    private void asignarCodigo(ItemCatalogo item, String t) {
        if (StringUtils.hasText(item.getCode())) {
            String codigo = item.getCode().trim();
            if (codigo.length() > 30) throw new IllegalArgumentException("El código no puede superar 30 caracteres");
            if (itemCatalogoRepository.findByTipoAndCode(t, codigo).isPresent()) {
                throw new DuplicateResourceException("Ya existe el código \"" + codigo + "\" en este catálogo");
            }
            item.setCode(codigo);
        }
    }

    private void verificarUnico(String t, ItemCatalogo item) {
        if (StringUtils.hasText(item.getNombre())
                && itemCatalogoRepository.findByTipoAndNombreIgnoreCase(t, item.getNombre().trim()).isPresent()) {
            throw new IllegalArgumentException("Ya existe un elemento llamado \"" + item.getNombre().trim() + "\"");
        }
    }

    private String normalizarTipo(String tipo) {
        if (tipo == null || tipo.isBlank()) throw new IllegalArgumentException("Tipo de catálogo requerido");
        String t = tipo.trim().toUpperCase();
        if (!List.of(TIPO_CATEGORIA, TIPO_ESTADO, TIPO_PRIORIDAD, TIPO_UNIDAD).contains(t)) {
            throw new IllegalArgumentException("Tipo de catálogo inválido: " + tipo);
        }
        return t;
    }
}