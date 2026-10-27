package com.sigtm.backend.repository;

import com.sigtm.backend.model.PronosticoDemanda;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;

public interface PronosticoDemandaRepository extends JpaRepository<PronosticoDemanda, Long> {
    Optional<PronosticoDemanda> findByProductIdAndPeriod(Long productId, String period);
    List<PronosticoDemanda> findByPeriodOrderByProductNameAsc(String period);
}
