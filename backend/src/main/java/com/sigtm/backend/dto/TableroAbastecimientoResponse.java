package com.sigtm.backend.dto;
import java.math.BigDecimal; import java.util.List; import java.util.Map;
public record TableroAbastecimientoResponse(long criticalProducts,long pendingRequests,long pendingOrders,long delayedShipments,BigDecimal openDebt,List<Map<String,Object>> topSuppliers,List<Map<String,Object>> actions) {}
