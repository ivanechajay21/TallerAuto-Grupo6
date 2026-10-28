package com.sigtm.backend.repository;
import com.sigtm.backend.model.NivelAprobacionCompra; import org.springframework.data.jpa.repository.JpaRepository; import java.util.List;
public interface NivelAprobacionCompraRepository extends JpaRepository<NivelAprobacionCompra,Long>{ List<NivelAprobacionCompra> findByActiveTrueOrderByLevelAsc(); }
