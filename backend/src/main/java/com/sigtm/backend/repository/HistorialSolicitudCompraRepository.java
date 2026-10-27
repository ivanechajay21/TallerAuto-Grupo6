package com.sigtm.backend.repository;
import com.sigtm.backend.model.HistorialSolicitudCompra; import org.springframework.data.jpa.repository.JpaRepository; import java.util.List;
public interface HistorialSolicitudCompraRepository extends JpaRepository<HistorialSolicitudCompra,Long>{ List<HistorialSolicitudCompra> findByRequestIdOrderByChangedAtDesc(Long requestId); }
