package com.sigtm.backend.repository;
import com.sigtm.backend.model.IncidenciaProveedor; import org.springframework.data.jpa.repository.JpaRepository; import java.util.List;
public interface IncidenciaProveedorRepository extends JpaRepository<IncidenciaProveedor,Long>{ List<IncidenciaProveedor> findBySupplierIdOrderByReportedAtDesc(Long supplierId); List<IncidenciaProveedor> findByStatusOrderByPriorityDescReportedAtAsc(String status); }
