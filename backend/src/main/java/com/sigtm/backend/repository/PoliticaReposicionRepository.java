package com.sigtm.backend.repository;

import com.sigtm.backend.model.PoliticaReposicion;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface PoliticaReposicionRepository extends JpaRepository<PoliticaReposicion, Long> {
    Optional<PoliticaReposicion> findByProductId(Long productId);
    List<PoliticaReposicion> findByActiveTrue();
}
