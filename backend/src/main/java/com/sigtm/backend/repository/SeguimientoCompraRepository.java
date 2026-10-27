package com.sigtm.backend.repository;
import com.sigtm.backend.model.SeguimientoCompra; import org.springframework.data.jpa.repository.JpaRepository; import java.util.Optional;
public interface SeguimientoCompraRepository extends JpaRepository<SeguimientoCompra,Long>{ Optional<SeguimientoCompra> findByPurchaseOrderId(Long purchaseOrderId); }
