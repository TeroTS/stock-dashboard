package com.stockdashboard.backend.domain;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.time.Instant;

public record NormalizedTick(
    @NotNull Instant timestamp,
    @NotBlank String symbol,
    @NotNull @DecimalMin(value = "0.0001", inclusive = true) BigDecimal price,
    @Positive long volume) {}
