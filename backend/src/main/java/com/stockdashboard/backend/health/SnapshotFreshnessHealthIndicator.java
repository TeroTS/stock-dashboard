package com.stockdashboard.backend.health;

import com.stockdashboard.backend.config.MarketProperties;
import com.stockdashboard.backend.session.MarketSessionService;
import com.stockdashboard.backend.session.SessionState;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;

@Component
public class SnapshotFreshnessHealthIndicator implements HealthIndicator {

  private final SnapshotFreshnessTracker tracker;
  private final MarketSessionService sessionService;
  private final Clock clock;
  private final long staleThresholdMs;

  public SnapshotFreshnessHealthIndicator(
      SnapshotFreshnessTracker tracker,
      MarketSessionService sessionService,
      Clock clock,
      MarketProperties properties) {
    this.tracker = tracker;
    this.sessionService = sessionService;
    this.clock = clock;
    this.staleThresholdMs = Math.max(properties.getSnapshotCadenceMs() * 2, 1000);
  }

  @Override
  public Health health() {
    Instant now = clock.instant();
    if (sessionService.getSessionState(now) == SessionState.CLOSED) {
      return Health.up().withDetail("publishing", "suspended_outside_session").build();
    }

    return tracker
        .lastPublished()
        .map(
            lastPublished -> {
              long age = Duration.between(lastPublished, now).toMillis();
              if (age <= staleThresholdMs) {
                return Health.up().withDetail("lastPublished", lastPublished).build();
              }

              return Health.down().withDetail("lastPublished", lastPublished).withDetail("staleMillis", age).build();
            })
        .orElseGet(() -> Health.down().withDetail("reason", "No snapshots published yet").build());
  }
}
