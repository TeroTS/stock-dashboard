package com.stockdashboard.backend.ranking;

import java.util.List;

public record RankingResult(List<RankingEntry> gainers, List<RankingEntry> losers) {}
