package com.sigtm.backend.dto;
import jakarta.validation.constraints.*; import java.math.BigDecimal; import java.time.LocalDate;
public record CrearFacturaProveedorRequest(@NotNull Long purchaseOrderId,@NotBlank String number,@NotNull LocalDate issueDate,@NotNull LocalDate dueDate,@NotNull @DecimalMin("0.01") BigDecimal total){}
