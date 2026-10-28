package com.sigtm.backend.dto;
import jakarta.validation.Valid; import jakarta.validation.constraints.*; import java.util.List;
public record CrearSolicitudCompraRequest(String notes,@NotEmpty @Valid List<Item> items){public record Item(@NotNull Long productId,@NotNull @Min(1) Integer quantity){}}
