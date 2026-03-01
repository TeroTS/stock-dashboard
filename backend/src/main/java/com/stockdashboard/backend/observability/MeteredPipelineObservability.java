package com.stockdashboard.backend.observability;

import com.stockdashboard.backend.config.MarketProperties;
import com.stockdashboard.backend.health.IngestConnectivityTracker;
import com.stockdashboard.backend.health.SnapshotFreshnessTracker;
import com.stockdashboard.backend.state.RedisFailureTracker;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

@Component
public class MeteredPipelineObservability implements PipelineObservability {

  private static final String UNKNOWN_SYMBOL = "UNKNOWN";

  private final MeterRegistry meterRegistry;
  private final IngestConnectivityTracker ingestConnectivityTracker;
  private final SnapshotFreshnessTracker snapshotFreshnessTracker;
  private final RedisFailureTracker redisFailureTracker;
  private final Clock clock;
  private final Set<String> watchlist;

  public MeteredPipelineObservability(
      MeterRegistry meterRegistry,
      IngestConnectivityTracker ingestConnectivityTracker,
      SnapshotFreshnessTracker snapshotFreshnessTracker,
      RedisFailureTracker redisFailureTracker,
      MarketProperties properties,
      Clock clock) {
    this.meterRegistry = meterRegistry;
    this.ingestConnectivityTracker = ingestConnectivityTracker;
    this.snapshotFreshnessTracker = snapshotFreshnessTracker;
    this.redisFailureTracker = redisFailureTracker;
    this.clock = clock;
    this.watchlist =
        properties.getWatchlist().stream()
            .map(symbol -> symbol.toUpperCase(Locale.ROOT))
            .collect(Collectors.toSet());

    preRegisterMeters(properties.getWatchlist().size());
  }

  @Override
  public void recordTick(TickResult result, String symbol, long durationNanos) {
    String boundedSymbol = boundedSymbol(symbol);
    meterRegistry.counter("pipeline.ticks", "symbol", boundedSymbol, "result", result.tagValue()).increment();
    meterRegistry
        .timer("pipeline.tick.process.duration", "result", result.tagValue())
        .record(durationNanos, TimeUnit.NANOSECONDS);
  }

  @Override
  public void recordSnapshot(SnapshotResult result, long buildDurationNanos, long publishDurationNanos) {
    meterRegistry.counter("pipeline.snapshots", "result", result.tagValue()).increment();

    if (buildDurationNanos > 0) {
      meterRegistry
          .timer("pipeline.snapshot.build.duration")
          .record(buildDurationNanos, TimeUnit.NANOSECONDS);
    }

    if (publishDurationNanos > 0) {
      meterRegistry
          .timer("pipeline.snapshot.publish.duration")
          .record(publishDurationNanos, TimeUnit.NANOSECONDS);
    }
  }

  @Override
  public void recordRedisOperation(String operation, boolean success) {
    String result = success ? "success" : "failure";
    String operationTag = (operation == null || operation.isBlank()) ? "unknown" : operation;
    meterRegistry.counter("pipeline.redis.ops", "operation", operationTag, "result", result).increment();
  }

  private void preRegisterMeters(int watchlistSize) {
    for (TickResult result : TickResult.values()) {
      meterRegistry.counter("pipeline.ticks", "symbol", UNKNOWN_SYMBOL, "result", result.tagValue());
      Timer.builder("pipeline.tick.process.duration")
          .tag("result", result.tagValue())
          .register(meterRegistry);
    }

    for (SnapshotResult result : SnapshotResult.values()) {
      meterRegistry.counter("pipeline.snapshots", "result", result.tagValue());
    }

    Timer.builder("pipeline.snapshot.build.duration").register(meterRegistry);
    Timer.builder("pipeline.snapshot.publish.duration").register(meterRegistry);

    meterRegistry.counter("pipeline.redis.ops", "operation", "unknown", "result", "success");
    meterRegistry.counter("pipeline.redis.ops", "operation", "unknown", "result", "failure");

    Gauge.builder("pipeline.ingest.last.seen.age.seconds", this, MeteredPipelineObservability::ingestAgeSeconds)
        .register(meterRegistry);
    Gauge.builder(
            "pipeline.snapshot.last.published.age.seconds",
            this,
            MeteredPipelineObservability::snapshotAgeSeconds)
        .register(meterRegistry);
    Gauge.builder("pipeline.watchlist.size", () -> watchlistSize).register(meterRegistry);
    Gauge.builder("pipeline.redis.degraded", redisFailureTracker, tracker -> tracker.isDegraded() ? 1 : 0)
        .register(meterRegistry);
  }

  private double ingestAgeSeconds() {
    return ingestConnectivityTracker.lastSeen().map(this::ageSeconds).orElse(-1d);
  }

  private double snapshotAgeSeconds() {
    return snapshotFreshnessTracker.lastPublished().map(this::ageSeconds).orElse(-1d);
  }

  private double ageSeconds(Instant instant) {
    Duration age = Duration.between(instant, clock.instant());
    return Math.max(0, age.toMillis() / 1000d);
  }

  private String boundedSymbol(String symbol) {
    if (symbol == null || symbol.isBlank()) {
      return UNKNOWN_SYMBOL;
    }

    String uppercase = symbol.toUpperCase(Locale.ROOT);
    if (watchlist.contains(uppercase)) {
      return uppercase;
    }

    return UNKNOWN_SYMBOL;
  }
}
