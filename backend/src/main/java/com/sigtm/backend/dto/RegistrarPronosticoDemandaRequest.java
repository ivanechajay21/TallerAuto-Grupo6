package com.sigtm.backend.dto;

import jakarta.validation.constraints.*;

public record RegistrarPronosticoDemandaRequest(
        @NotBlank @Pattern(regexp = "\\d{4}-(0[1-9]|1[0-2])", message = "El período debe tener formato AAAA-MM") String period,
        @NotNull @Min(0) Integer forecastQuantity,
        @NotNull @Min(0) Integer safetyStock,
        @Size(max = 500) String notes) { }
