package com.stockdashboard.backend.snapshot;

import java.math.BigDecimal;

public record CandleSnapshot(
    String bucketStart,
    BigDecimal open,
    BigDecimal high,
    BigDecimal low,
    BigDecimal close,
    long volume) {}
