package com.sigtm.backend.dto;

import com.sigtm.backend.model.AprobacionOrdenCompra;
import com.sigtm.backend.model.ContratoProveedor;
import com.sigtm.backend.model.DetallePlanCompra;
import com.sigtm.backend.model.DetalleSolicitudCompra;
import com.sigtm.backend.model.FacturaProveedor;
import com.sigtm.backend.model.IncidenciaProveedor;
import com.sigtm.backend.model.InspeccionRecepcionCompra;
import com.sigtm.backend.model.NivelAprobacionCompra;
import com.sigtm.backend.model.PagoProveedor;
import com.sigtm.backend.model.PlanCompra;
import com.sigtm.backend.model.Producto;
import com.sigtm.backend.model.PronosticoDemanda;
import com.sigtm.backend.model.Proveedor;
import com.sigtm.backend.model.RecepcionCompra;
import com.sigtm.backend.model.SeguimientoCompra;
import com.sigtm.backend.model.SolicitudCompra;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * DTOs de respuesta del dominio de compras y abastecimiento.
 *
 * <p>Se mapean dentro de la transacción del servicio para que ninguna
 * asociación LAZY llegue al serializador JSON. Los controladores nunca deben
 * devolver entidades JPA directamente.</p>
 */
public final class ComprasResponses {

    private ComprasResponses() {
    }

    public record ProveedorResumen(Long id, String businessName, String taxId, String contactName,
                                   String email, String phone, String address, Boolean active) {
        public static ProveedorResumen from(Proveedor value) {
            if (value == null) return null;
            return new ProveedorResumen(value.getId(), value.getBusinessName(), value.getTaxId(),
                    value.getContactName(), value.getEmail(), value.getPhone(), value.getAddress(), value.getActive());
        }
    }

    public record ProductoResumen(Long id, String code, String name, String description, String brand,
                                  String category, BigDecimal purchasePrice, BigDecimal salePrice,
                                  Integer currentStock, Integer minStock, Boolean active) {
        public static ProductoResumen from(Producto value) {
            if (value == null) return null;
            return new ProductoResumen(value.getId(), value.getCode(), value.getName(), value.getDescription(),
                    value.getBrand(), value.getCategory(), value.getPurchasePrice(), value.getSalePrice(),
                    value.getCurrentStock(), value.getMinStock(), value.getActive());
        }
    }

    public record OrdenResumen(Long id, String code, String status, LocalDate issueDate,
                               LocalDate expectedDate, BigDecimal total, String supplierName) {
        public static OrdenResumen from(com.sigtm.backend.model.OrdenCompra value) {
            if (value == null) return null;
            return new OrdenResumen(value.getId(), value.getCode(), value.getStatus(), value.getIssueDate(),
                    value.getExpectedDate(), value.getTotal(),
                    value.getSupplier() == null ? null : value.getSupplier().getBusinessName());
        }
    }

    public record RecepcionResumen(Long id, String receiptNumber, LocalDateTime receivedAt,
                                   LocalDateTime createdAt, String notes) {
        public static RecepcionResumen from(RecepcionCompra value) {
            if (value == null) return null;
            return new RecepcionResumen(value.getId(), value.getReceiptNumber(), value.getReceivedAt(),
                    value.getCreatedAt(), value.getNotes());
        }
    }

    public record PagoProveedorResponse(Long id, BigDecimal amount, String method,
                                        LocalDateTime paidAt, String reference) {
        public static PagoProveedorResponse from(PagoProveedor value) {
            if (value == null) return null;
            return new PagoProveedorResponse(value.getId(), value.getAmount(), value.getMethod(),
                    value.getPaidAt(), value.getReference());
        }
    }

    public record FacturaProveedorResponse(Long id, String number, LocalDate issueDate, LocalDate dueDate,
                                           BigDecimal total, BigDecimal balance, String status,
                                           OrdenResumen purchaseOrder, List<PagoProveedorResponse> payments) {
        public static FacturaProveedorResponse from(FacturaProveedor value, List<PagoProveedor> payments) {
            if (value == null) return null;
            return new FacturaProveedorResponse(value.getId(), value.getNumber(), value.getIssueDate(),
                    value.getDueDate(), value.getTotal(), value.getBalance(), value.getStatus(),
                    OrdenResumen.from(value.getPurchaseOrder()),
                    payments == null ? List.of() : payments.stream().map(PagoProveedorResponse::from).toList());
        }
    }

    public record ContratoProveedorResponse(Long id, String code, ProveedorResumen supplier,
                                            LocalDate startsAt, LocalDate endsAt, String currency,
                                            BigDecimal discountPercentage, Integer paymentDays,
                                            BigDecimal minimumPurchase, String terms, Boolean active) {
        public static ContratoProveedorResponse from(ContratoProveedor value) {
            if (value == null) return null;
            return new ContratoProveedorResponse(value.getId(), value.getCode(),
                    ProveedorResumen.from(value.getSupplier()), value.getStartsAt(), value.getEndsAt(),
                    value.getCurrency(), value.getDiscountPercentage(), value.getPaymentDays(),
                    value.getMinimumPurchase(), value.getTerms(), value.getActive());
        }
    }

    public record SolicitudCompraItemResponse(Long id, ProductoResumen product, Integer quantity) {
        public static SolicitudCompraItemResponse from(DetalleSolicitudCompra value) {
            return new SolicitudCompraItemResponse(value.getId(), ProductoResumen.from(value.getProduct()),
                    value.getQuantity());
        }
    }

    public record SolicitudCompraResponse(Long id, String code, LocalDateTime requestedAt, String status,
                                          String notes, List<SolicitudCompraItemResponse> items) {
        public static SolicitudCompraResponse from(SolicitudCompra value) {
            if (value == null) return null;
            return new SolicitudCompraResponse(value.getId(), value.getCode(), value.getRequestedAt(),
                    value.getStatus(), value.getNotes(), value.getItems() == null ? List.of()
                            : value.getItems().stream().map(SolicitudCompraItemResponse::from).toList());
        }
    }

    public record PronosticoDemandaResponse(Long id, String period, ProductoResumen product,
                                            Integer forecastQuantity, Integer safetyStock,
                                            LocalDateTime registeredAt, String notes) {
        public static PronosticoDemandaResponse from(PronosticoDemanda value) {
            if (value == null) return null;
            return new PronosticoDemandaResponse(value.getId(), value.getPeriod(),
                    ProductoResumen.from(value.getProduct()), value.getForecastQuantity(),
                    value.getSafetyStock(), value.getRegisteredAt(), value.getNotes());
        }
    }

    public record PlanCompraItemResponse(Long id, ProductoResumen product, Integer suggestedQuantity,
                                         Integer stockAtPlanning, Integer forecastQuantity) {
        public static PlanCompraItemResponse from(DetallePlanCompra value) {
            return new PlanCompraItemResponse(value.getId(), ProductoResumen.from(value.getProduct()),
                    value.getSuggestedQuantity(), value.getStockAtPlanning(), value.getForecastQuantity());
        }
    }

    public record PlanCompraResponse(Long id, String code, String period, String status,
                                     LocalDateTime createdAt, String notes, List<PlanCompraItemResponse> items) {
        public static PlanCompraResponse from(PlanCompra value) {
            if (value == null) return null;
            return new PlanCompraResponse(value.getId(), value.getCode(), value.getPeriod(), value.getStatus(),
                    value.getCreatedAt(), value.getNotes(), value.getItems() == null ? List.of()
                            : value.getItems().stream().map(PlanCompraItemResponse::from).toList());
        }
    }

    public record IncidenciaProveedorResponse(Long id, ProveedorResumen supplier, OrdenResumen purchaseOrder,
                                              String category, String priority, String status, String description,
                                              LocalDateTime reportedAt, LocalDateTime resolvedAt, String resolution) {
        public static IncidenciaProveedorResponse from(IncidenciaProveedor value) {
            if (value == null) return null;
            return new IncidenciaProveedorResponse(value.getId(), ProveedorResumen.from(value.getSupplier()),
                    OrdenResumen.from(value.getPurchaseOrder()), value.getCategory(), value.getPriority(),
                    value.getStatus(), value.getDescription(), value.getReportedAt(), value.getResolvedAt(),
                    value.getResolution());
        }
    }

    public record SeguimientoCompraResponse(Long id, OrdenResumen purchaseOrder, String status,
                                            LocalDate dispatchedAt, LocalDate estimatedArrival,
                                            LocalDate actualArrival, String shippingGuide, String carrier,
                                            String notes) {
        public static SeguimientoCompraResponse from(SeguimientoCompra value) {
            if (value == null) return null;
            return new SeguimientoCompraResponse(value.getId(), OrdenResumen.from(value.getPurchaseOrder()),
                    value.getStatus(), value.getDispatchedAt(), value.getEstimatedArrival(),
                    value.getActualArrival(), value.getShippingGuide(), value.getCarrier(), value.getNotes());
        }
    }

    public record DevolucionItemResponse(Long id, ProductoResumen product, Integer quantity, BigDecimal unitCost) {
        public static DevolucionItemResponse from(com.sigtm.backend.model.DetalleDevolucionCompra value) {
            return new DevolucionItemResponse(value.getId(), ProductoResumen.from(value.getProduct()),
                    value.getQuantity(), value.getUnitCost());
        }
    }

    public record DevolucionCompraResponse(Long id, String number, OrdenResumen purchaseOrder,
                                           LocalDateTime returnedAt, String reason,
                                           List<DevolucionItemResponse> items) {
        public static DevolucionCompraResponse from(com.sigtm.backend.model.DevolucionCompra value) {
            if (value == null) return null;
            return new DevolucionCompraResponse(value.getId(), value.getNumber(),
                    OrdenResumen.from(value.getPurchaseOrder()), value.getReturnedAt(), value.getReason(),
                    value.getItems() == null ? List.of()
                            : value.getItems().stream().map(DevolucionItemResponse::from).toList());
        }
    }

    public record InspeccionRecepcionCompraResponse(Long id, RecepcionResumen receipt, ProductoResumen product,
                                                    String result, Integer acceptedQuantity, Integer rejectedQuantity,
                                                    LocalDateTime inspectedAt, String observations) {
        public static InspeccionRecepcionCompraResponse from(InspeccionRecepcionCompra value) {
            if (value == null) return null;
            return new InspeccionRecepcionCompraResponse(value.getId(), RecepcionResumen.from(value.getReceipt()),
                    ProductoResumen.from(value.getProduct()), value.getResult(), value.getAcceptedQuantity(),
                    value.getRejectedQuantity(), value.getInspectedAt(), value.getObservations());
        }
    }

    public record PoliticaReposicionResponse(Long id, ProductoResumen product,
                                             ProveedorResumen preferredSupplier, Integer reorderPoint,
                                             Integer minimumLot, Integer targetStock, Integer leadTimeDays,
                                             Boolean active) {
        public static PoliticaReposicionResponse from(com.sigtm.backend.model.PoliticaReposicion value) {
            if (value == null) return null;
            return new PoliticaReposicionResponse(value.getId(), ProductoResumen.from(value.getProduct()),
                    ProveedorResumen.from(value.getPreferredSupplier()), value.getReorderPoint(),
                    value.getMinimumLot(), value.getTargetStock(), value.getLeadTimeDays(), value.getActive());
        }
    }

    public record NivelAprobacionCompraResponse(Long id, Integer level, BigDecimal amountFrom,
                                                BigDecimal amountTo, String requiredRole,
                                                Integer requiredApprovals, Boolean active) {
        public static NivelAprobacionCompraResponse from(NivelAprobacionCompra value) {
            if (value == null) return null;
            return new NivelAprobacionCompraResponse(value.getId(), value.getLevel(), value.getAmountFrom(),
                    value.getAmountTo(), value.getRequiredRole(), value.getRequiredApprovals(), value.getActive());
        }
    }

    public record AprobacionOrdenCompraResponse(Long id, OrdenResumen purchaseOrder,
                                                NivelAprobacionCompraResponse level, String decision,
                                                LocalDateTime decidedAt, String comment) {
        public static AprobacionOrdenCompraResponse from(AprobacionOrdenCompra value) {
            if (value == null) return null;
            return new AprobacionOrdenCompraResponse(value.getId(), OrdenResumen.from(value.getPurchaseOrder()),
                    NivelAprobacionCompraResponse.from(value.getLevel()), value.getDecision(),
                    value.getDecidedAt(), value.getComment());
        }
    }
}
