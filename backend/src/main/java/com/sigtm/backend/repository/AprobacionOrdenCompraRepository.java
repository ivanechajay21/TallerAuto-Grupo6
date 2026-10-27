package com.sigtm.backend.repository;
import com.sigtm.backend.model.AprobacionOrdenCompra; import org.springframework.data.jpa.repository.JpaRepository; import java.util.List;
public interface AprobacionOrdenCompraRepository extends JpaRepository<AprobacionOrdenCompra,Long>{ List<AprobacionOrdenCompra> findByPurchaseOrderIdOrderByDecidedAtDesc(Long purchaseOrderId); long countByPurchaseOrderIdAndLevelIdAndDecision(Long orderId,Long levelId,String decision); }
