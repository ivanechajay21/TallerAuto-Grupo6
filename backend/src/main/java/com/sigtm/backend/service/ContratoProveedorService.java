package com.sigtm.backend.service;

import com.sigtm.backend.dto.ComprasResponses;
import com.sigtm.backend.exception.ResourceNotFoundException;
import com.sigtm.backend.model.ContratoProveedor;
import com.sigtm.backend.model.Proveedor;
import com.sigtm.backend.repository.ContratoProveedorRepository;
import com.sigtm.backend.repository.ProveedorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Administra las condiciones comerciales pactadas con proveedores.
 *
 * <p>Las respuestas se entregan como DTOs para evitar exponer la asociación
 * LAZY con el proveedor y para separar el modelo de persistencia del contrato
 * de la API.</p>
 */
@Service
@RequiredArgsConstructor
public class ContratoProveedorService {

    private final ContratoProveedorRepository contracts;
    private final ProveedorRepository suppliers;
    private final AuditoriaService audit;

    @Transactional(readOnly = true)
    public List<ContratoProveedor> listar(Long supplierId) {
        return contracts.findBySupplierIdOrderByStartsAtDesc(supplierId);
    }

    @Transactional(readOnly = true)
    public List<ComprasResponses.ContratoProveedorResponse> listarDto(Long supplierId) {
        return contracts.findBySupplierIdOrderByStartsAtDesc(supplierId).stream()
                .map(ComprasResponses.ContratoProveedorResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public ComprasResponses.ContratoProveedorResponse obtenerDto(Long id) {
        return ComprasResponses.ContratoProveedorResponse.from(contracts.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Contrato no encontrado")));
    }

    @Transactional(readOnly = true)
    public ComprasResponses.ContratoProveedorResponse obtenerDto(Long supplierId, Long id) {
        ContratoProveedor contract = contracts.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Contrato no encontrado"));
        validarProveedor(contract, supplierId);
        return ComprasResponses.ContratoProveedorResponse.from(contract);
    }

    @Transactional(readOnly = true)
    public Optional<ContratoProveedor> vigente(Long supplierId, LocalDate date) {
        return contracts.findBySupplierIdOrderByStartsAtDesc(supplierId).stream()
                .filter(contract -> Boolean.TRUE.equals(contract.getActive()))
                .filter(contract -> contract.getStartsAt() != null && contract.getEndsAt() != null)
                .filter(contract -> !date.isBefore(contract.getStartsAt()) && !date.isAfter(contract.getEndsAt()))
                .findFirst();
    }

    @Transactional
    public ContratoProveedor crear(Long supplierId, ContratoProveedor data) {
        return crearEntity(supplierId, data);
    }

    @Transactional
    public ComprasResponses.ContratoProveedorResponse crearDto(Long supplierId, ContratoProveedor data) {
        return ComprasResponses.ContratoProveedorResponse.from(crearEntity(supplierId, data));
    }

    @Transactional
    public ComprasResponses.ContratoProveedorResponse actualizarDto(Long supplierId, Long id,
            ContratoProveedor data) {
        return ComprasResponses.ContratoProveedorResponse.from(actualizarEntity(supplierId, id, data));
    }

    @Transactional
    public ComprasResponses.ContratoProveedorResponse reactivarDto(Long supplierId, Long id) {
        return ComprasResponses.ContratoProveedorResponse.from(reactivarEntity(supplierId, id));
    }

    @Transactional
    public ContratoProveedor desactivar(Long id) {
        return desactivarEntity(id);
    }

    @Transactional
    public ComprasResponses.ContratoProveedorResponse desactivarDto(Long id) {
        return ComprasResponses.ContratoProveedorResponse.from(desactivarEntity(id));
    }

    @Transactional
    public ComprasResponses.ContratoProveedorResponse desactivarDto(Long supplierId, Long id) {
        ContratoProveedor contract = contracts.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Contrato no encontrado"));
        validarProveedor(contract, supplierId);
        contract.setActive(false);
        ContratoProveedor saved = contracts.save(contract);
        audit.registrar("UPDATE", "CONTRATO_PROVEEDOR", saved.getId(),
                "Contrato desactivado " + saved.getCode());
        return ComprasResponses.ContratoProveedorResponse.from(saved);
    }

    private void validarProveedor(ContratoProveedor contract, Long supplierId) {
        if (contract.getSupplier() == null || supplierId == null
                || !supplierId.equals(contract.getSupplier().getId())) {
            throw new ResourceNotFoundException("El contrato no pertenece al proveedor indicado");
        }
    }

    private ContratoProveedor actualizarEntity(Long supplierId, Long id, ContratoProveedor data) {
        ContratoProveedor contract = contracts.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Contrato no encontrado"));
        if (contract.getSupplier() == null || !supplierId.equals(contract.getSupplier().getId())) {
            throw new ResourceNotFoundException("El contrato no pertenece al proveedor indicado");
        }
        validar(data);
        contract.setStartsAt(data.getStartsAt());
        contract.setEndsAt(data.getEndsAt());
        contract.setCurrency(data.getCurrency());
        contract.setDiscountPercentage(data.getDiscountPercentage());
        contract.setPaymentDays(data.getPaymentDays());
        contract.setMinimumPurchase(data.getMinimumPurchase());
        contract.setTerms(data.getTerms());
        if (data.getActive() != null) contract.setActive(data.getActive());
        ContratoProveedor saved = contracts.save(contract);
        audit.registrar("UPDATE", "CONTRATO_PROVEEDOR", saved.getId(), "Contrato actualizado " + saved.getCode());
        return saved;
    }

    private ContratoProveedor reactivarEntity(Long supplierId, Long id) {
        ContratoProveedor contract = contracts.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Contrato no encontrado"));
        if (contract.getSupplier() == null || !supplierId.equals(contract.getSupplier().getId())) {
            throw new ResourceNotFoundException("El contrato no pertenece al proveedor indicado");
        }
        contract.setActive(true);
        ContratoProveedor saved = contracts.save(contract);
        audit.registrar("UPDATE", "CONTRATO_PROVEEDOR", saved.getId(), "Contrato reactivado " + saved.getCode());
        return saved;
    }

    private void validar(ContratoProveedor data) {
        if (data.getStartsAt() == null || data.getEndsAt() == null) {
            throw new IllegalArgumentException("Las fechas de inicio y fin son obligatorias");
        }
        if (data.getEndsAt().isBefore(data.getStartsAt())) {
            throw new IllegalArgumentException("La vigencia del contrato no es válida");
        }
        if (data.getCurrency() == null || data.getCurrency().isBlank()) {
            throw new IllegalArgumentException("La moneda es obligatoria");
        }
        if (data.getDiscountPercentage() == null) data.setDiscountPercentage(BigDecimal.ZERO);
        if (data.getPaymentDays() == null) data.setPaymentDays(0);
        if (data.getMinimumPurchase() == null) data.setMinimumPurchase(BigDecimal.ZERO);
    }

    private ContratoProveedor crearEntity(Long supplierId, ContratoProveedor data) {
        Proveedor supplier = suppliers.findById(supplierId)
                .orElseThrow(() -> new ResourceNotFoundException("Proveedor no encontrado"));
        validar(data);
        data.setSupplier(supplier);
        data.setCode("CP-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        if (data.getActive() == null) data.setActive(true);
        ContratoProveedor saved = contracts.save(data);
        audit.registrar("CREATE", "CONTRATO_PROVEEDOR", saved.getId(), "Contrato " + saved.getCode());
        return saved;
    }

    private ContratoProveedor desactivarEntity(Long id) {
        ContratoProveedor contract = contracts.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Contrato no encontrado"));
        contract.setActive(false);
        audit.registrar("UPDATE", "CONTRATO_PROVEEDOR", id, "Contrato desactivado");
        return contracts.save(contract);
    }
}
