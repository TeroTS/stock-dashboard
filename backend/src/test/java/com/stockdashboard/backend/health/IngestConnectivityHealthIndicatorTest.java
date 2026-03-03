package com.stockdashboard.backend.health;

import static org.assertj.core.api.Assertions.assertThat;

import com.stockdashboard.backend.config.MarketProperties;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.Status;

class IngestConnectivityHealthIndicatorTest {

  private static final Instant NOW = Instant.parse("2026-03-03T14:30:00Z");

  private IngestConnectivityTracker tracker;
  private IngestConnectivityHealthIndicator indicator;

  @BeforeEach
  void setUp() {
    tracker = new IngestConnectivityTracker();

    MarketProperties properties = new MarketProperties();
    properties.setIngestHealthThresholdMs(2000);

    indicator =
        new IngestConnectivityHealthIndicator(
            tracker, Clock.fixed(NOW, ZoneOffset.UTC), properties);
  }

  @Test
  void reportsUnknownWhenNoTicksWereSeen() {
    Health health = indicator.health();

    assertThat(health.getStatus()).isEqualTo(Status.UNKNOWN);
    assertThat(health.getDetails()).containsEntry("reason", "No ticks seen yet");
  }

  @Test
  void reportsUpWhenLastSeenIsFresh() {
    tracker.markSeen(NOW.minusMillis(1000));

    Health health = indicator.health();

    assertThat(health.getStatus()).isEqualTo(Status.UP);
    assertThat(health.getDetails()).containsKey("lastSeen");
  }

  @Test
  void reportsDownWhenLastSeenIsStale() {
    tracker.markSeen(NOW.minusMillis(3000));

    Health health = indicator.health();

    assertThat(health.getStatus()).isEqualTo(Status.DOWN);
    assertThat(health.getDetails()).containsKey("lastSeen");
    assertThat(health.getDetails().get("staleMillis")).isEqualTo(3000L);
  }
}
