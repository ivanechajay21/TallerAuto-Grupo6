package com.sigtm.backend.repository;
import com.sigtm.backend.model.HistorialOrdenCompra; import org.springframework.data.jpa.repository.JpaRepository; import java.util.List;
public interface HistorialOrdenCompraRepository extends JpaRepository<HistorialOrdenCompra,Long>{ List<HistorialOrdenCompra> findByPurchaseOrderIdOrderByOccurredAtDesc(Long purchaseOrderId); }
