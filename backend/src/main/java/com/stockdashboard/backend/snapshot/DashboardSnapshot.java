package com.stockdashboard.backend.snapshot;

import java.time.Instant;
import java.util.List;

public record DashboardSnapshot(
    Instant generatedAt,
    String sessionState,
    List<StockCardSnapshot> topGainers,
    List<StockCardSnapshot> topLosers) {}
