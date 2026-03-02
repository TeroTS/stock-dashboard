package com.stockdashboard.backend.snapshot;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;

public record TransactionCardSnapshot(
    String transactionId,
    String symbol,
    List<String> timeRanges,
    String activeRange,
    Map<String, List<CandleSnapshot>> candlesByRange,
    List<String> yAxisLabels,
    List<String> xAxisLabels,
    String positionType,
    String status,
    Instant openTimestamp,
    Instant closeTimestamp,
    BigDecimal entryPrice,
    BigDecimal exitPrice,
    BigDecimal profitLoss,
    String closeActionLabel) {}
