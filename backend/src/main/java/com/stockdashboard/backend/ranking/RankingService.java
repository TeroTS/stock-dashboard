package com.stockdashboard.backend.ranking;

import com.stockdashboard.backend.domain.SymbolSessionState;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Comparator;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class RankingService {

  public RankingResult rank(Iterable<SymbolSessionState> states) {
    List<RankingEntry> entries =
        toStream(states)
            .filter(state -> state.getOpenPrice() != null)
            .filter(state -> state.getLatestPrice() != null)
            .filter(state -> state.getOpenPrice().compareTo(BigDecimal.ZERO) > 0)
            .map(
                state ->
                    new RankingEntry(
                        state.getSymbol(),
                        percentChange(state.getOpenPrice(), state.getLatestPrice()),
                        state.getLatestPrice(),
                        state.getOpenPrice()))
            .toList();

    List<RankingEntry> gainers =
        entries.stream().sorted(Comparator.comparing(RankingEntry::percentChange).reversed()).limit(5).toList();

    List<RankingEntry> losers =
        entries.stream().sorted(Comparator.comparing(RankingEntry::percentChange)).limit(5).toList();

    return new RankingResult(gainers, losers);
  }

  private BigDecimal percentChange(BigDecimal openPrice, BigDecimal lastPrice) {
    return lastPrice
        .subtract(openPrice)
        .divide(openPrice, 8, RoundingMode.HALF_UP)
        .multiply(BigDecimal.valueOf(100))
        .setScale(4, RoundingMode.HALF_UP);
  }

  private java.util.stream.Stream<SymbolSessionState> toStream(Iterable<SymbolSessionState> states) {
    return java.util.stream.StreamSupport.stream(states.spliterator(), false);
  }
}
