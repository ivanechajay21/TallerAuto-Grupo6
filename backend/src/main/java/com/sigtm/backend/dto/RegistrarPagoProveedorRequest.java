package com.sigtm.backend.dto;
import jakarta.validation.constraints.*; import java.math.BigDecimal;
public record RegistrarPagoProveedorRequest(@NotNull @DecimalMin("0.01") BigDecimal amount,@NotBlank String method,String reference){}
