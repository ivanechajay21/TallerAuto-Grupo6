package com.sigtm.backend.repository;

import com.sigtm.backend.model.PlanCompra;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;

public interface PlanCompraRepository extends JpaRepository<PlanCompra, Long> {
    List<PlanCompra> findAllByOrderByCreatedAtDesc();
}
