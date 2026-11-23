package com.sigtm.backend.service;

import com.sigtm.backend.dto.ComprasResponses;
import com.sigtm.backend.exception.ResourceNotFoundException;
import com.sigtm.backend.model.DetalleRecepcionCompra;
import com.sigtm.backend.model.InspeccionRecepcionCompra;
import com.sigtm.backend.model.Producto;
import com.sigtm.backend.model.RecepcionCompra;
import com.sigtm.backend.repository.InspeccionRecepcionCompraRepository;
import com.sigtm.backend.repository.ProductoRepository;
import com.sigtm.backend.repository.RecepcionCompraRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

/**
 * Registra la inspección de una recepción de compra.
 *
 * <p>Valida cantidades y que el producto pertenezca a la recepción antes de
 * persistir. Las respuestas se mapean a DTOs dentro de la transacción.</p>
 */
@Service
@RequiredArgsConstructor
public class InspeccionRecepcionCompraService {

    private static final Set<String> RESULTADOS = Set.of("ACEPTADA", "OBSERVADA", "RECHAZADA");

    private final InspeccionRecepcionCompraRepository inspections;
    private final RecepcionCompraRepository receipts;
    private final ProductoRepository products;
    private final AuditoriaService audit;

    @Transactional
    public InspeccionRecepcionCompra registrar(Long receiptId, Long productId, InspeccionRecepcionCompra data) {
        RecepcionCompra receipt = receipts.findById(receiptId)
                .orElseThrow(() -> new ResourceNotFoundException("Recepción no encontrada"));
        Producto product = products.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Producto no encontrado"));
        if (data.getResult() == null || !RESULTADOS.contains(data.getResult())) {
            throw new IllegalArgumentException("Resultado inválido");
        }
        if (data.getAcceptedQuantity() == null || data.getRejectedQuantity() == null
                || data.getAcceptedQuantity() < 0 || data.getRejectedQuantity() < 0
                || data.getAcceptedQuantity() + data.getRejectedQuantity() < 1) {
            throw new IllegalArgumentException("Cantidad inspeccionada inválida");
        }
        int recibido = receipt.getItems().stream()
                .filter(item -> item.getProduct() != null && productId.equals(item.getProduct().getId()))
                .mapToInt(DetalleRecepcionCompra::getQuantity)
                .sum();
        if (recibido == 0) {
            throw new IllegalArgumentException("El producto no pertenece a la recepción");
        }
        if (data.getAcceptedQuantity() + data.getRejectedQuantity() > recibido) {
            throw new IllegalArgumentException("La cantidad inspeccionada supera la recibida");
        }
        data.setReceipt(receipt);
        data.setProduct(product);
        data.setInspectedAt(LocalDateTime.now());
        InspeccionRecepcionCompra saved = inspections.save(data);
        audit.registrar("CREATE", "INSPECCION_RECEPCION_COMPRA", saved.getId(),
                "Inspección de " + product.getCode() + " en " + receipt.getReceiptNumber());
        return saved;
    }

    @Transactional(readOnly = true)
    public List<InspeccionRecepcionCompra> listar(Long receiptId) {
        return inspections.findByReceiptIdOrderByInspectedAtDesc(receiptId);
    }

    @Transactional
    public ComprasResponses.InspeccionRecepcionCompraResponse registrarDto(Long receiptId, Long productId,
            InspeccionRecepcionCompra data) {
        return ComprasResponses.InspeccionRecepcionCompraResponse.from(registrar(receiptId, productId, data));
    }

    @Transactional(readOnly = true)
    public List<ComprasResponses.InspeccionRecepcionCompraResponse> listarDto(Long receiptId) {
        return listar(receiptId).stream().map(ComprasResponses.InspeccionRecepcionCompraResponse::from).toList();
    }
}
