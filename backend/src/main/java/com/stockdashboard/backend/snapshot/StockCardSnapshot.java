package com.stockdashboard.backend.snapshot;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public record StockCardSnapshot(
    String symbol,
    BigDecimal percentChange,
    List<String> timeRanges,
    String activeRange,
    Map<String, List<CandleSnapshot>> candlesByRange,
    List<String> yAxisLabels,
    List<String> xAxisLabels,
    String buyLabel,
    String shortLabel) {}
