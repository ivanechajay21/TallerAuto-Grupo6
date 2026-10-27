package com.sigtm.backend.repository;

import com.sigtm.backend.model.Proveedor;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProveedorRepository extends JpaRepository<Proveedor, Long> {
    Optional<Proveedor> findByTaxIdIgnoreCase(String taxId);
    List<Proveedor> findByActiveTrueOrderByBusinessNameAsc();
}
