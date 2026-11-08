package com.sigtm.backend.repository;

import com.sigtm.backend.model.FacturaProveedor;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface FacturaProveedorRepository extends JpaRepository<FacturaProveedor, Long> {
    Optional<FacturaProveedor> findByNumber(String number);

    Optional<FacturaProveedor> findByPurchaseOrderId(Long purchaseOrderId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select f from FacturaProveedor f where f.id = :id")
    Optional<FacturaProveedor> findByIdForUpdate(@Param("id") Long id);
}
