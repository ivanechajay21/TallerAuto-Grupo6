package com.sigtm.backend.service;

import com.sigtm.backend.exception.ResourceNotFoundException;
import com.sigtm.backend.model.*;
import com.sigtm.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ProveedorAnaliticaService {
    private final PrecioProveedorRepository prices;
    private final EvaluacionProveedorRepository evaluations;
    private final ProveedorRepository suppliers;
    private final ProductoRepository products;
    private final AuditoriaService audit;

    @Transactional
    public PrecioProveedor guardarPrecio(Long supplierId, Long productId, PrecioProveedor data) {
        Proveedor supplier = suppliers.findById(supplierId).orElseThrow(() -> new ResourceNotFoundException("Proveedor no encontrado"));
        Producto product = products.findById(productId).orElseThrow(() -> new ResourceNotFoundException("Producto no encontrado"));
        PrecioProveedor price = prices.findBySupplierIdAndProductId(supplierId, productId)
                .orElse(PrecioProveedor.builder().supplier(supplier).product(product).build());
        price.setUnitPrice(data.getUnitPrice()); price.setMinimumQuantity(data.getMinimumQuantity());
        price.setLeadTimeDays(data.getLeadTimeDays()); price.setValidFrom(data.getValidFrom() == null ? LocalDate.now() : data.getValidFrom());
        price.setValidUntil(data.getValidUntil()); price.setActive(data.getActive() == null || data.getActive());
        price = prices.save(price); audit.registrar("UPDATE", "PRECIO_PROVEEDOR", price.getId(), "Precio de " + product.getCode()); return price;
    }

    @Transactional(readOnly = true) public List<PrecioProveedor> ofertas(Long productId) { return prices.findByProductIdAndActiveTrueOrderByUnitPriceAsc(productId); }

    @Transactional public EvaluacionProveedor evaluar(Long supplierId, EvaluacionProveedor data) {
        data.setSupplier(suppliers.findById(supplierId).orElseThrow(() -> new ResourceNotFoundException("Proveedor no encontrado")));
        if (data.getEvaluationDate() == null) data.setEvaluationDate(LocalDate.now());
        EvaluacionProveedor saved = evaluations.save(data); audit.registrar("CREATE", "EVALUACION_PROVEEDOR", saved.getId(), "Evaluación de proveedor"); return saved;
    }
    @Transactional(readOnly = true) public List<EvaluacionProveedor> evaluaciones(Long supplierId) { return evaluations.findBySupplierIdOrderByEvaluationDateDesc(supplierId); }
}
