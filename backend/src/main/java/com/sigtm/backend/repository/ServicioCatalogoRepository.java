package com.sigtm.backend.repository;

import com.sigtm.backend.model.ServicioCatalogo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Acceso a datos del catálogo de servicios ofrecidos por el taller.
 *
 * <p>Permite localizar un servicio por su código y listar los servicios activos disponibles
 * para presupuestar una orden de trabajo.</p>
 */
@Repository
public interface ServicioCatalogoRepository extends JpaRepository<ServicioCatalogo, Long> {
    /**
     * Busca un servicio del catálogo por su código.
     *
     * @param code código o SKU del servicio.
     * @return el servicio encontrado o vacío si el código no existe.
     */
    Optional<ServicioCatalogo> findByCode(String code);

    /**
     * Busca un servicio por código sin distinguir mayúsculas ni minúsculas.
     *
     * @param code código o SKU del servicio.
     * @return el servicio encontrado o vacío si el código no existe.
     */
    Optional<ServicioCatalogo> findByCodeIgnoreCase(String code);

    /**
     * Lista los servicios activos del catálogo.
     *
     * @return servicios marcados como activos.
     */
    List<ServicioCatalogo> findByActiveTrue();

    /**
     * Lista todo el catálogo, incluidos los servicios inactivos.
     *
     * @return todos los servicios ordenados por nombre.
     */
    List<ServicioCatalogo> findAllByOrderByNameAsc();
}
