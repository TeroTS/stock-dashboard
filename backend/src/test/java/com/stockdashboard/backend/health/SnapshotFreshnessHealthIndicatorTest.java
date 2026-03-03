package com.stockdashboard.backend.health;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.stockdashboard.backend.config.MarketProperties;
import com.stockdashboard.backend.session.MarketSessionService;
import com.stockdashboard.backend.session.SessionState;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.Status;

class SnapshotFreshnessHealthIndicatorTest {

  private static final Instant NOW = Instant.parse("2026-03-03T14:30:00Z");

  private SnapshotFreshnessTracker tracker;
  private MarketSessionService sessionService;
  private SnapshotFreshnessHealthIndicator indicator;

  @BeforeEach
  void setUp() {
    tracker = new SnapshotFreshnessTracker();
    sessionService = mock(MarketSessionService.class);
    Clock clock = Clock.fixed(NOW, ZoneOffset.UTC);

    MarketProperties properties = new MarketProperties();
    properties.setSnapshotCadenceMs(1000);

    indicator = new SnapshotFreshnessHealthIndicator(tracker, sessionService, clock, properties);
  }

  @Test
  void reportsUpWhenSessionIsClosed() {
    when(sessionService.getSessionState(NOW)).thenReturn(SessionState.CLOSED);

    Health health = indicator.health();

    assertThat(health.getStatus()).isEqualTo(Status.UP);
    assertThat(health.getDetails()).containsEntry("publishing", "suspended_outside_session");
  }

  @Test
  void reportsDownWhenNoSnapshotWasPublished() {
    when(sessionService.getSessionState(NOW)).thenReturn(SessionState.OPEN);

    Health health = indicator.health();

    assertThat(health.getStatus()).isEqualTo(Status.DOWN);
    assertThat(health.getDetails()).containsEntry("reason", "No snapshots published yet");
  }

  @Test
  void reportsUpWhenSnapshotIsFresh() {
    when(sessionService.getSessionState(NOW)).thenReturn(SessionState.OPEN);
    tracker.markPublished(NOW.minusMillis(1500));

    Health health = indicator.health();

    assertThat(health.getStatus()).isEqualTo(Status.UP);
    assertThat(health.getDetails()).containsKey("lastPublished");
  }

  @Test
  void reportsDownWhenSnapshotIsStale() {
    when(sessionService.getSessionState(NOW)).thenReturn(SessionState.OPEN);
    tracker.markPublished(NOW.minusMillis(2500));

    Health health = indicator.health();

    assertThat(health.getStatus()).isEqualTo(Status.DOWN);
    assertThat(health.getDetails()).containsKey("lastPublished");
    assertThat(health.getDetails().get("staleMillis")).isEqualTo(2500L);
  }
}
