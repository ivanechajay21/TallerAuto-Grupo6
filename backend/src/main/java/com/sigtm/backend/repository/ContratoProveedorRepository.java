package com.sigtm.backend.repository;
import com.sigtm.backend.model.ContratoProveedor; import org.springframework.data.jpa.repository.JpaRepository; import java.util.List;
public interface ContratoProveedorRepository extends JpaRepository<ContratoProveedor,Long>{ List<ContratoProveedor> findBySupplierIdOrderByStartsAtDesc(Long supplierId); }
