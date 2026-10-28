package com.sigtm.backend.repository;
import com.sigtm.backend.model.PrecioProveedor; import org.springframework.data.jpa.repository.JpaRepository; import java.util.*;
public interface PrecioProveedorRepository extends JpaRepository<PrecioProveedor,Long>{ Optional<PrecioProveedor> findBySupplierIdAndProductId(Long supplierId,Long productId); List<PrecioProveedor> findByProductIdAndActiveTrueOrderByUnitPriceAsc(Long productId); }
