package com.sigtm.backend.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;

public record CrearPlanCompraRequest(
        @NotBlank @Pattern(regexp = "\\d{4}-(0[1-9]|1[0-2])", message = "El período debe tener formato AAAA-MM") String period,
        @Size(max = 500) String notes,
        @NotEmpty @Valid List<Item> items) {
    public record Item(@NotNull Long productId, @NotNull @Min(1) Integer quantity) { }
}
