package com.sigtm.backend.repository;

import com.sigtm.backend.model.RecepcionCompra;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RecepcionCompraRepository extends JpaRepository<RecepcionCompra, Long> {
    @EntityGraph(attributePaths = {"items", "items.product"})
    List<RecepcionCompra> findByPurchaseOrderIdOrderByReceivedAtDesc(Long purchaseOrderId);
}
