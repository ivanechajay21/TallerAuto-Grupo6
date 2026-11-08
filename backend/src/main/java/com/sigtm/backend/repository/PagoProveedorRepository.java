package com.sigtm.backend.repository;

import com.sigtm.backend.model.PagoProveedor;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PagoProveedorRepository extends JpaRepository<PagoProveedor, Long> {
    List<PagoProveedor> findBySupplierInvoiceIdOrderByPaidAtDesc(Long supplierInvoiceId);

    boolean existsBySupplierInvoiceId(Long supplierInvoiceId);
}
