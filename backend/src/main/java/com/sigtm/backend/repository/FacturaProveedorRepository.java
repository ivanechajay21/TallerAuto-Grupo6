package com.sigtm.backend.repository;
import com.sigtm.backend.model.FacturaProveedor; import org.springframework.data.jpa.repository.JpaRepository; import java.util.Optional;
public interface FacturaProveedorRepository extends JpaRepository<FacturaProveedor,Long>{ Optional<FacturaProveedor> findByNumber(String number); Optional<FacturaProveedor> findByPurchaseOrderId(Long purchaseOrderId); }
