package com.sigtm.backend.repository;

import com.sigtm.backend.model.OrdenCompra;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface OrdenCompraRepository extends JpaRepository<OrdenCompra, Long> {
    @EntityGraph(attributePaths = {"supplier", "items", "items.product"})
    @Query("select o from OrdenCompra o where o.id = :id")
    Optional<OrdenCompra> findDetailedById(@Param("id") Long id);

    @EntityGraph(attributePaths = {"supplier", "items", "items.product"})
    List<OrdenCompra> findAllByOrderByIssueDateDescIdDesc();
}
