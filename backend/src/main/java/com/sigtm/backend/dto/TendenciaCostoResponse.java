package com.sigtm.backend.dto;
import java.math.BigDecimal;
public record TendenciaCostoResponse(Long productId, String productCode, String productName, BigDecimal currentCost, BigDecimal lowestOffer, BigDecimal differencePercent, String signal) {}
