package com.stockdashboard.backend.health;

import com.stockdashboard.backend.config.MarketProperties;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;

@Component
public class IngestConnectivityHealthIndicator implements HealthIndicator {

  private final IngestConnectivityTracker tracker;
  private final Clock clock;
  private final long thresholdMillis;

  public IngestConnectivityHealthIndicator(
      IngestConnectivityTracker tracker, Clock clock, MarketProperties properties) {
    this.tracker = tracker;
    this.clock = clock;
    this.thresholdMillis = properties.getIngestHealthThresholdMs();
  }

  @Override
  public Health health() {
    Instant now = clock.instant();
    return tracker
        .lastSeen()
        .map(
            lastSeen -> {
              long age = Duration.between(lastSeen, now).toMillis();
              if (age <= thresholdMillis) {
                return Health.up().withDetail("lastSeen", lastSeen).build();
              }

              return Health.down().withDetail("lastSeen", lastSeen).withDetail("staleMillis", age).build();
            })
        .orElseGet(() -> Health.unknown().withDetail("reason", "No ticks seen yet").build());
  }
}
