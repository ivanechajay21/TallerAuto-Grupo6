package com.sigtm.backend.dto;
import java.math.BigDecimal;
public record EstadoPresupuestoCompraResponse(String period, BigDecimal limitAmount, BigDecimal committedAmount, BigDecimal availableAmount, BigDecimal percentageUsed, String status) {}
