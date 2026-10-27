package com.sigtm.backend.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

/** Productos y cantidades efectivamente recibidos para una orden de compra. */
public record RecepcionarCompraRequest(
        String notes,
        @NotEmpty(message = "Debe recibirse al menos una línea") @Valid List<Item> items) {
    public record Item(
            @NotNull(message = "El detalle de orden es obligatorio") Long purchaseItemId,
            @NotNull @Min(value = 1, message = "La cantidad debe ser mayor a cero") Integer quantity) {}
}
