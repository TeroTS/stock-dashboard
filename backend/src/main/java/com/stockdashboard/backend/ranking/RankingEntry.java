package com.stockdashboard.backend.ranking;

import java.math.BigDecimal;

public record RankingEntry(String symbol, BigDecimal percentChange, BigDecimal latestPrice, BigDecimal openPrice) {}
