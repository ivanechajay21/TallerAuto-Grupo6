package com.sigtm.backend.dto;

import java.math.BigDecimal;

/** Resultado explicable de comparar una oferta de proveedor para un producto. */
public record ComparacionOfertaResponse(
        Long supplierId,
        String supplierName,
        BigDecimal unitPrice,
        Integer minimumQuantity,
        Integer leadTimeDays,
        BigDecimal averageRating,
        BigDecimal score,
        String recommendation) {}
