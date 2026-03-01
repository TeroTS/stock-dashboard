package com.stockdashboard.backend.session;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneId;
import org.junit.jupiter.api.Test;

class MarketSessionServiceTest {

  private final MarketSessionService service =
      new MarketSessionService(ZoneId.of("America/New_York"), LocalTime.of(9, 30), LocalTime.of(16, 0));

  @Test
  void returnsOpenAtSessionStartInclusive() {
    Instant atOpen = Instant.parse("2026-02-02T14:30:00Z");

    assertThat(service.getSessionState(atOpen)).isEqualTo(SessionState.OPEN);
  }

  @Test
  void returnsClosedAtSessionEndExclusive() {
    Instant atClose = Instant.parse("2026-02-02T21:00:00Z");

    assertThat(service.getSessionState(atClose)).isEqualTo(SessionState.CLOSED);
  }

  @Test
  void returnsClosedBeforeSessionStart() {
    Instant beforeOpen = Instant.parse("2026-02-02T14:29:59Z");

    assertThat(service.getSessionState(beforeOpen)).isEqualTo(SessionState.CLOSED);
  }
}
