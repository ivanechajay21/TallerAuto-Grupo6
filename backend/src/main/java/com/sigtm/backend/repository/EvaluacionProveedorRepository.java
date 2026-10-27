package com.sigtm.backend.repository;
import com.sigtm.backend.model.EvaluacionProveedor; import org.springframework.data.jpa.repository.JpaRepository; import java.util.List;
public interface EvaluacionProveedorRepository extends JpaRepository<EvaluacionProveedor,Long>{ List<EvaluacionProveedor> findBySupplierIdOrderByEvaluationDateDesc(Long supplierId); }
