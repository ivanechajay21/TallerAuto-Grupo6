package com.sigtm.backend.repository;
import com.sigtm.backend.model.PresupuestoCompra; import org.springframework.data.jpa.repository.JpaRepository; import java.util.Optional;
public interface PresupuestoCompraRepository extends JpaRepository<PresupuestoCompra,Long>{ Optional<PresupuestoCompra> findByPeriod(String period); }
