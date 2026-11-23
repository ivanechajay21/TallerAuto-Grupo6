package com.sigtm.backend.repository;

import com.sigtm.backend.model.Producto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import jakarta.persistence.LockModeType;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

/**
 * Acceso a datos de productos.
 *
 * <p>Incluye la consulta con bloqueo pesimista que evita la sobreventa de stock
 * en operaciones concurrentes.</p>
 */
@Repository
public interface ProductoRepository extends JpaRepository<Producto, Long>, JpaSpecificationExecutor<Producto> {
    /**
     * Busca un producto por su código.
     *
     * @param code código o SKU del producto.
     * @return el producto encontrado o vacío si el código no existe.
     */
    Optional<Producto> findByCode(String code);

    /**
     * Busca un producto por su código ignorando mayúsculas y minúsculas.
     *
     * @param code código o SKU del producto.
     * @return el producto encontrado o vacío si el código no existe.
     */
    Optional<Producto> findByCodeIgnoreCase(String code);

    /**
     * Lista los productos activos del inventario.
     *
     * @return productos marcados como activos.
     */
    List<Producto> findByActiveTrue();

    /**
     * Lista los productos activos cuyo stock ha alcanzado o superado el umbral indicado.
     *
     * <p>Es la consulta que alimenta las alertas de stock bajo del inventario.</p>
     *
     * @param currentStock umbral de stock a comparar con el stock actual del producto.
     * @return productos activos que cumplen el criterio.
     */
    List<Producto> findByCurrentStockLessThanEqualAndActiveTrue(Integer currentStock);

    /** Busca con bloqueo pesimista de escritura para evitar sobreventa en operaciones concurrentes. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Producto p where p.id = :id")
    Optional<Producto> findWithLockingById(@Param("id") Long id);

    long countByActiveTrue();

    long countByActiveFalse();

    @Query("select count(p) from Producto p where p.currentStock > 0 and p.currentStock <= p.minStock")
    long countLowStock();

    @Query("select count(p) from Producto p where p.currentStock <= 0")
    long countOutOfStock();

    @Query("select coalesce(sum(p.salePrice * p.currentStock), 0) from Producto p")
    BigDecimal sumInventoryValue();

    @Query("select distinct p.category from Producto p where p.category is not null and p.category <> '' order by p.category")
    List<String> findCategorias();
}