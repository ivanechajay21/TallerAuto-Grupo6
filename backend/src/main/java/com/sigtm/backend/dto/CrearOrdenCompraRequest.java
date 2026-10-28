package com.sigtm.backend.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** Datos para emitir una orden de compra a un proveedor. */
public record CrearOrdenCompraRequest(
        @NotNull(message = "El proveedor es obligatorio") Long supplierId,
        LocalDate expectedDate,
        String notes,
        @NotEmpty(message = "La orden debe tener al menos un producto") @Valid List<Item> items) {
    public record Item(
            @NotNull(message = "El producto es obligatorio") Long productId,
            @NotNull @Min(value = 1, message = "La cantidad debe ser mayor a cero") Integer quantity,
            @NotNull @DecimalMin(value = "0.0", inclusive = true, message = "El costo no puede ser negativo") BigDecimal unitCost) {}
}
