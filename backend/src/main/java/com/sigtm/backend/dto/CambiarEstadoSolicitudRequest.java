package com.sigtm.backend.dto;
import jakarta.validation.constraints.NotBlank;
public record CambiarEstadoSolicitudRequest(@NotBlank String status, String comment) {}
