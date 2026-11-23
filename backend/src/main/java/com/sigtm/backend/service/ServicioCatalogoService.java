package com.sigtm.backend.service;

import com.sigtm.backend.exception.DuplicateResourceException;
import com.sigtm.backend.exception.ResourceNotFoundException;
import com.sigtm.backend.model.ServicioCatalogo;
import com.sigtm.backend.repository.ServicioCatalogoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;

/**
 * Administra el catálogo de servicios ofrecidos por el taller, con sus precios por
 * defecto y tiempos estimados de ejecución.
 */
@Service
@RequiredArgsConstructor
public class ServicioCatalogoService {

    private final ServicioCatalogoRepository servicioCatalogoRepository;

    /**
     * Lista los servicios activos que pueden ofrecerse en las órdenes de trabajo.
     *
     * @return los servicios activos
     */
    @Transactional(readOnly = true)
    public List<ServicioCatalogo> obtenerActivos() {
        return servicioCatalogoRepository.findByActiveTrue();
    }

    /**
     * Lista todo el catálogo, incluidos los servicios inactivos.
     *
     * <p>Se usa desde Configuración para poder reactivar un servicio desactivado.</p>
     *
     * @return todos los servicios ordenados por nombre
     */
    @Transactional(readOnly = true)
    public List<ServicioCatalogo> obtenerTodos() {
        return servicioCatalogoRepository.findAllByOrderByNameAsc();
    }

    /**
     * Obtiene un servicio del catálogo por su identificador.
     *
     * @param id identificador del servicio
     * @return el servicio solicitado
     * @throws ResourceNotFoundException si el servicio no existe
     */
    @Transactional(readOnly = true)
    public ServicioCatalogo obtenerPorId(Long id) {
        return servicioCatalogoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Servicio no encontrado en el catálogo"));
    }

    /**
     * Registra un nuevo servicio en el catálogo.
     *
     * <p>El código es obligatorio, se normaliza a mayúsculas y debe ser único sin
     * distinguir mayúsculas. El nombre también es obligatorio y el precio y la
     * duración no pueden ser negativos.</p>
     *
     * @param servicio datos del servicio a registrar
     * @return el servicio creado
     * @throws IllegalArgumentException si los datos no son válidos
     * @throws DuplicateResourceException si el código ya existe
     */
    @Transactional
    public ServicioCatalogo crearServicio(ServicioCatalogo servicio) {
        validar(servicio, true);
        String codigo = servicio.getCode().trim().toUpperCase(Locale.ROOT);
        if (servicioCatalogoRepository.findByCodeIgnoreCase(codigo).isPresent()) {
            throw new DuplicateResourceException("Ya existe un servicio con ese código");
        }
        servicio.setCode(codigo);
        servicio.setName(servicio.getName().trim());
        servicio.setDescription(limpiar(servicio.getDescription()));
        servicio.setCategory(limpiar(servicio.getCategory()));
        if (servicio.getActive() == null) {
            servicio.setActive(true);
        }
        return servicioCatalogoRepository.save(servicio);
    }

    /**
     * Actualiza la ficha de un servicio del catálogo.
     *
     * <p>El código no se modifica desde esta operación. Si un campo opcional llega
     * {@code null}, conserva el valor actual; un texto vacío lo limpia. Si el
     * servicio no existe se lanza {@code ResourceNotFoundException}.</p>
     *
     * @param id               identificador del servicio
     * @param detallesServicio nuevos datos del servicio
     * @return el servicio actualizado
     * @throws IllegalArgumentException si los datos no son válidos
     * @throws ResourceNotFoundException si el servicio no existe
     */
    @Transactional
    public ServicioCatalogo actualizarServicio(Long id, ServicioCatalogo detallesServicio) {
        ServicioCatalogo servicio = obtenerPorId(id);
        validar(detallesServicio, false);

        servicio.setName(detallesServicio.getName().trim());
        if (detallesServicio.getDescription() != null) {
            servicio.setDescription(limpiar(detallesServicio.getDescription()));
        }
        if (detallesServicio.getCategory() != null) {
            servicio.setCategory(limpiar(detallesServicio.getCategory()));
        }
        if (detallesServicio.getDefaultPrice() != null) {
            servicio.setDefaultPrice(detallesServicio.getDefaultPrice());
        }
        if (detallesServicio.getEstimatedDurationMinutes() != null) {
            servicio.setEstimatedDurationMinutes(detallesServicio.getEstimatedDurationMinutes());
        }
        if (detallesServicio.getActive() != null) {
            servicio.setActive(detallesServicio.getActive());
        }
        return servicioCatalogoRepository.save(servicio);
    }

    private void validar(ServicioCatalogo servicio, boolean requiereCodigo) {
        if (servicio == null) {
            throw new IllegalArgumentException("Los datos del servicio son obligatorios");
        }
        if (requiereCodigo && !StringUtils.hasText(servicio.getCode())) {
            throw new IllegalArgumentException("El código del servicio es obligatorio");
        }
        if (servicio.getCode() != null && servicio.getCode().trim().length() > 50) {
            throw new IllegalArgumentException("El código del servicio no puede superar 50 caracteres");
        }
        if (!StringUtils.hasText(servicio.getName())) {
            throw new IllegalArgumentException("El nombre del servicio es obligatorio");
        }
        if (servicio.getName().trim().length() > 100) {
            throw new IllegalArgumentException("El nombre del servicio no puede superar 100 caracteres");
        }
        if (servicio.getDefaultPrice() != null && servicio.getDefaultPrice().compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("La tarifa del servicio no puede ser negativa");
        }
        if (servicio.getEstimatedDurationMinutes() != null && servicio.getEstimatedDurationMinutes() < 0) {
            throw new IllegalArgumentException("La duración estimada no puede ser negativa");
        }
        if (servicio.getDescription() != null && servicio.getDescription().trim().length() > 255) {
            throw new IllegalArgumentException("La descripción no puede superar 255 caracteres");
        }
        if (servicio.getCategory() != null && servicio.getCategory().trim().length() > 50) {
            throw new IllegalArgumentException("La categoría no puede superar 50 caracteres");
        }
    }

    private String limpiar(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
