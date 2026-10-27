package com.sigtm.backend.dto;
import java.math.BigDecimal;
import java.time.LocalDate;
public record AlertaCuentaPorPagarResponse(Long invoiceId, String invoiceNumber, String supplierName, LocalDate dueDate, BigDecimal balance, String severity) {}
