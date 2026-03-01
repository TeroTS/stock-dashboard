package com.stockdashboard.backend.snapshot;

import com.stockdashboard.backend.domain.CandleBucket;
import com.stockdashboard.backend.domain.RangeDefinition;
import com.stockdashboard.backend.domain.SymbolSessionState;
import com.stockdashboard.backend.ranking.RankingEntry;
import com.stockdashboard.backend.ranking.RankingResult;
import com.stockdashboard.backend.session.SessionState;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class SnapshotAssembler {

  private static final DateTimeFormatter LABEL_TIME = DateTimeFormatter.ofPattern("HH:mm");

  private final ZoneId zoneId;

  public SnapshotAssembler() {
    this(ZoneId.of("America/New_York"));
  }

  public SnapshotAssembler(ZoneId zoneId) {
    this.zoneId = zoneId;
  }

  public DashboardSnapshot assemble(
      Instant generatedAt,
      SessionState sessionState,
      RankingResult ranking,
      Map<String, SymbolSessionState> states) {
    List<StockCardSnapshot> gainers = ranking.gainers().stream().map(entry -> toCard(entry, states)).toList();
    List<StockCardSnapshot> losers = ranking.losers().stream().map(entry -> toCard(entry, states)).toList();

    return new DashboardSnapshot(generatedAt, sessionState.name(), gainers, losers);
  }

  private StockCardSnapshot toCard(RankingEntry entry, Map<String, SymbolSessionState> states) {
    SymbolSessionState state = states.get(entry.symbol());

    Map<String, List<CandleSnapshot>> candlesByRange = new LinkedHashMap<>();
    for (RangeDefinition range : RangeDefinition.values()) {
      List<CandleSnapshot> candles =
          state.getSeries(range).asList().stream()
              .map(this::toSnapshot)
              .sorted(Comparator.comparing(CandleSnapshot::bucketStart))
              .toList();
      candlesByRange.put(range.getLabel(), candles);
    }

    List<CandleBucket> activeCandles = state.getSeries(RangeDefinition.FIVE_MIN).asList();
    return new StockCardSnapshot(
        entry.symbol(),
        entry.percentChange(),
        List.of("5min", "30min", "120min"),
        "5min",
        candlesByRange,
        buildYAxisLabels(activeCandles, state),
        buildXAxisLabels(activeCandles),
        "Buy",
        "Short");
  }

  private CandleSnapshot toSnapshot(CandleBucket bucket) {
    return new CandleSnapshot(
        bucket.getBucketStart().toString(),
        bucket.getOpen(),
        bucket.getHigh(),
        bucket.getLow(),
        bucket.getClose(),
        bucket.getVolume());
  }

  private List<String> buildYAxisLabels(List<CandleBucket> candles, SymbolSessionState state) {
    if (candles.isEmpty()) {
      BigDecimal baseline = state.getLatestPrice() != null ? state.getLatestPrice() : BigDecimal.ZERO;
      return List.of(formatPrice(baseline.add(BigDecimal.ONE)), formatPrice(baseline), formatPrice(baseline.subtract(BigDecimal.ONE)));
    }

    BigDecimal high =
        candles.stream().map(CandleBucket::getHigh).max(BigDecimal::compareTo).orElse(BigDecimal.ZERO);
    BigDecimal low = candles.stream().map(CandleBucket::getLow).min(BigDecimal::compareTo).orElse(BigDecimal.ZERO);
    BigDecimal middle = high.add(low).divide(BigDecimal.valueOf(2), 2, RoundingMode.HALF_UP);

    return List.of(formatPrice(high), formatPrice(middle), formatPrice(low));
  }

  private List<String> buildXAxisLabels(List<CandleBucket> candles) {
    if (candles.isEmpty()) {
      return List.of();
    }

    int size = candles.size();
    int[] indices = new int[] {0, size / 3, (size * 2) / 3, size - 1};
    LinkedHashSet<String> labels = new LinkedHashSet<>();

    for (int index : indices) {
      CandleBucket bucket = candles.get(Math.min(index, size - 1));
      labels.add(LABEL_TIME.format(bucket.getBucketStart().atZone(zoneId)));
    }

    return new ArrayList<>(labels);
  }

  private String formatPrice(BigDecimal value) {
    return String.format(Locale.US, "%.2f", value);
  }
}
