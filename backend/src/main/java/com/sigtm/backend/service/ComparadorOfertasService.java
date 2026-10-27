package com.sigtm.backend.service;

import com.sigtm.backend.dto.ComparacionOfertaResponse;
import com.sigtm.backend.model.EvaluacionProveedor;
import com.sigtm.backend.model.PrecioProveedor;
import com.sigtm.backend.repository.EvaluacionProveedorRepository;
import com.sigtm.backend.repository.PrecioProveedorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Comparator;
import java.util.List;

/**
 * Compara ofertas vigentes. El puntaje pondera precio (55 %), plazo (25 %) y
 * evaluación histórica (20 %), de modo que la oferta más barata no siempre gana.
 */
@Service
@RequiredArgsConstructor
public class ComparadorOfertasService {
    private final PrecioProveedorRepository prices;
    private final EvaluacionProveedorRepository evaluations;

    @Transactional(readOnly = true)
    public List<ComparacionOfertaResponse> comparar(Long productId) {
        List<PrecioProveedor> offers = prices.findByProductIdAndActiveTrueOrderByUnitPriceAsc(productId);
        if (offers.isEmpty()) return List.of();
        BigDecimal lowestPrice = offers.stream().map(PrecioProveedor::getUnitPrice).min(BigDecimal::compareTo).orElse(BigDecimal.ONE);
        int fastestDelivery = offers.stream().map(PrecioProveedor::getLeadTimeDays).min(Integer::compareTo).orElse(0);
        List<ComparacionOfertaResponse> result = offers.stream().map(offer -> response(offer, lowestPrice, fastestDelivery)).sorted(Comparator.comparing(ComparacionOfertaResponse::score).reversed()).toList();
        return result.stream().map(item -> new ComparacionOfertaResponse(item.supplierId(), item.supplierName(), item.unitPrice(), item.minimumQuantity(), item.leadTimeDays(), item.averageRating(), item.score(), item.equals(result.getFirst()) ? "RECOMENDADA" : "ALTERNATIVA")).toList();
    }

    private ComparacionOfertaResponse response(PrecioProveedor offer, BigDecimal lowestPrice, int fastestDelivery) {
        BigDecimal rating = averageRating(offer.getSupplier().getId());
        BigDecimal priceScore = lowestPrice.divide(offer.getUnitPrice(), 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(55));
        BigDecimal deliveryScore = BigDecimal.valueOf(fastestDelivery + 1).divide(BigDecimal.valueOf(offer.getLeadTimeDays() + 1), 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(25));
        BigDecimal qualityScore = rating.divide(BigDecimal.valueOf(5), 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(20));
        BigDecimal score = priceScore.add(deliveryScore).add(qualityScore).setScale(2, RoundingMode.HALF_UP);
        return new ComparacionOfertaResponse(offer.getSupplier().getId(), offer.getSupplier().getBusinessName(), offer.getUnitPrice(), offer.getMinimumQuantity(), offer.getLeadTimeDays(), rating, score, "ALTERNATIVA");
    }

    private BigDecimal averageRating(Long supplierId) {
        List<EvaluacionProveedor> values = evaluations.findBySupplierIdOrderByEvaluationDateDesc(supplierId);
        if (values.isEmpty()) return BigDecimal.valueOf(3);
        return values.stream().map(value -> BigDecimal.valueOf(value.getQualityScore() + value.getDeliveryScore() + value.getServiceScore()).divide(BigDecimal.valueOf(3), 2, RoundingMode.HALF_UP)).reduce(BigDecimal.ZERO, BigDecimal::add).divide(BigDecimal.valueOf(values.size()), 2, RoundingMode.HALF_UP);
    }
}
