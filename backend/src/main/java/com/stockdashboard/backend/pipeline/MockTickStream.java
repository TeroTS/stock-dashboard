package com.stockdashboard.backend.pipeline;

import com.stockdashboard.backend.config.MarketProperties;
import com.stockdashboard.backend.domain.NormalizedTick;
import com.stockdashboard.backend.health.IngestConnectivityTracker;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.atomic.AtomicInteger;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class MockTickStream {

  private static final Logger LOGGER = LoggerFactory.getLogger(MockTickStream.class);

  private final List<String> symbols;
  private final boolean enabled;
  private final TickIngestService tickIngestService;
  private final Clock clock;
  private final IngestConnectivityTracker ingestConnectivityTracker;
  private final AtomicInteger index = new AtomicInteger();
  private final Map<String, BigDecimal> prices = new HashMap<>();

  public MockTickStream(
      MarketProperties properties,
      TickIngestService tickIngestService,
      Clock clock,
      IngestConnectivityTracker ingestConnectivityTracker) {
    this.symbols = properties.getWatchlist();
    this.enabled = properties.getMockIngest().isEnabled();
    this.tickIngestService = tickIngestService;
    this.clock = clock;
    this.ingestConnectivityTracker = ingestConnectivityTracker;

    ThreadLocalRandom random = ThreadLocalRandom.current();
    for (String symbol : symbols) {
      prices.put(symbol, BigDecimal.valueOf(random.nextDouble(80.0, 280.0)).setScale(2, RoundingMode.HALF_UP));
    }
  }

  @Scheduled(fixedDelayString = "${market.mock-ingest.tick-interval-ms:200}")
  public void emitTick() {
    if (!enabled || symbols.isEmpty()) {
      return;
    }

    String symbol = symbols.get(Math.floorMod(index.getAndIncrement(), symbols.size()));
    BigDecimal nextPrice = nextPrice(symbol);
    long volume = ThreadLocalRandom.current().nextLong(10, 400);
    Instant now = clock.instant();

    try {
      tickIngestService.process(new NormalizedTick(now, symbol, nextPrice, volume));
      ingestConnectivityTracker.markSeen(now);
    } catch (RuntimeException ex) {
      LOGGER.warn("Mock ingest failed for symbol {}", symbol, ex);
    }
  }

  private BigDecimal nextPrice(String symbol) {
    BigDecimal current = prices.get(symbol);
    double delta = ThreadLocalRandom.current().nextDouble(-1.2, 1.2);
    BigDecimal next = current.add(BigDecimal.valueOf(delta));
    if (next.compareTo(BigDecimal.valueOf(1)) < 0) {
      next = BigDecimal.ONE;
    }

    next = next.setScale(2, RoundingMode.HALF_UP);
    prices.put(symbol, next);
    return next;
  }
}
