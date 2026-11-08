package com.sigtm.backend.service;

import com.sigtm.backend.dto.ComprasResponses;
import com.sigtm.backend.exception.ResourceNotFoundException;
import com.sigtm.backend.model.PoliticaReposicion;
import com.sigtm.backend.model.Producto;
import com.sigtm.backend.model.Proveedor;
import com.sigtm.backend.repository.PoliticaReposicionRepository;
import com.sigtm.backend.repository.ProductoRepository;
import com.sigtm.backend.repository.ProveedorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Define los parámetros de reposición por producto.
 *
 * <p>Una política activa reemplaza el cálculo básico por stock mínimo: usa
 * punto de reorden, lote mínimo y stock objetivo. La respuesta se entrega como
 * DTO para no serializar las asociaciones LAZY con producto y proveedor.</p>
 */
@Service
@RequiredArgsConstructor
public class PoliticaReposicionService {

    private final PoliticaReposicionRepository policies;
    private final ProductoRepository products;
    private final ProveedorRepository suppliers;
    private final AuditoriaService audit;

    @Transactional(readOnly = true)
    public List<PoliticaReposicion> listar() {
        return policies.findByActiveTrue();
    }

    @Transactional(readOnly = true)
    public List<ComprasResponses.PoliticaReposicionResponse> listarDto() {
        return listar().stream().map(ComprasResponses.PoliticaReposicionResponse::from).toList();
    }

    @Transactional
    public PoliticaReposicion guardar(Long productId, Long supplierId, PoliticaReposicion data) {
        Producto product = products.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Producto no encontrado"));
        Proveedor supplier = supplierId == null ? null : suppliers.findById(supplierId)
                .orElseThrow(() -> new ResourceNotFoundException("Proveedor no encontrado"));
        if (data.getReorderPoint() == null || data.getReorderPoint() < 0) {
            throw new IllegalArgumentException("El punto de reorden no puede ser negativo");
        }
        if (data.getMinimumLot() == null || data.getMinimumLot() < 1) {
            throw new IllegalArgumentException("El lote mínimo debe ser mayor a cero");
        }
        if (data.getTargetStock() == null || data.getTargetStock() < 1) {
            throw new IllegalArgumentException("El stock objetivo debe ser mayor a cero");
        }
        if (data.getTargetStock() < data.getReorderPoint()) {
            throw new IllegalArgumentException("El stock objetivo no puede ser menor al punto de reorden");
        }
        if (data.getLeadTimeDays() == null || data.getLeadTimeDays() < 0) {
            throw new IllegalArgumentException("El plazo de entrega no puede ser negativo");
        }
        PoliticaReposicion policy = policies.findByProductId(productId)
                .orElse(PoliticaReposicion.builder().product(product).build());
        policy.setPreferredSupplier(supplier);
        policy.setReorderPoint(data.getReorderPoint());
        policy.setMinimumLot(data.getMinimumLot());
        policy.setTargetStock(data.getTargetStock());
        policy.setLeadTimeDays(data.getLeadTimeDays());
        policy.setActive(data.getActive() == null || data.getActive());
        PoliticaReposicion saved = policies.save(policy);
        audit.registrar("UPDATE", "POLITICA_REPOSICION", saved.getId(), "Política para " + product.getCode());
        return saved;
    }

    @Transactional
    public ComprasResponses.PoliticaReposicionResponse guardarDto(Long productId, Long supplierId,
            PoliticaReposicion data) {
        return ComprasResponses.PoliticaReposicionResponse.from(guardar(productId, supplierId, data));
    }
}
