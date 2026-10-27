package com.sigtm.backend.dto;
import jakarta.validation.Valid; import jakarta.validation.constraints.*; import java.util.List;
public record DevolverCompraRequest(String reason, @NotEmpty @Valid List<Item> items) {
 public record Item(@NotNull Long purchaseItemId, @NotNull @Min(1) Integer quantity) {}
}
