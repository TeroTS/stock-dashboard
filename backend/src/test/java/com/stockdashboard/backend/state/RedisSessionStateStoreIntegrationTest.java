package com.stockdashboard.backend.state;

import static org.assertj.core.api.Assertions.assertThat;

import com.stockdashboard.backend.domain.SymbolSessionState;
import com.stockdashboard.backend.session.MarketSessionService;
import com.stockdashboard.backend.session.SessionLifecycleService;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest
@Testcontainers
class RedisSessionStateStoreIntegrationTest {

  @Container
  static final GenericContainer<?> REDIS = new GenericContainer<>("redis:7.2-alpine").withExposedPorts(6379);

  @DynamicPropertySource
  static void registerProperties(DynamicPropertyRegistry registry) {
    registry.add("spring.data.redis.host", REDIS::getHost);
    registry.add("spring.data.redis.port", () -> REDIS.getMappedPort(6379));
  }

  @Autowired private RedisSessionStateStore stateStore;

  @Test
  void recoversPersistedIntradayStateAfterStoreRecreation() {
    LocalDate sessionDate = LocalDate.of(2026, 2, 2);
    SymbolSessionState state = SymbolSessionState.empty("AAPL", sessionDate);
    state.setOpenPrice(new BigDecimal("100.00"));
    state.setLatestPrice(new BigDecimal("101.25"));

    stateStore.save(sessionDate, state);

    RedisSessionStateStore recreatedStore = stateStore.recreate();
    SymbolSessionState restored = recreatedStore.find(sessionDate, "AAPL").orElseThrow();

    assertThat(restored.getOpenPrice()).isEqualByComparingTo("100.00");
    assertThat(restored.getLatestPrice()).isEqualByComparingTo("101.25");
  }

  @Test
  void clearsPriorSessionStateWhenNewSessionOpens() {
    LocalDate dayOne = LocalDate.of(2026, 2, 2);
    LocalDate dayTwo = LocalDate.of(2026, 2, 3);

    SymbolSessionState state = SymbolSessionState.empty("AAPL", dayOne);
    state.setOpenPrice(new BigDecimal("100.00"));
    state.setLatestPrice(new BigDecimal("101.00"));
    stateStore.save(dayOne, state);

    MarketSessionService sessionService =
        new MarketSessionService(ZoneId.of("America/New_York"), LocalTime.of(9, 30), LocalTime.of(16, 0));
    SessionLifecycleService lifecycleService = new SessionLifecycleService(sessionService, stateStore);

    lifecycleService.ensureCurrentSession(Instant.parse("2026-02-02T14:30:00Z"));
    lifecycleService.ensureCurrentSession(Instant.parse("2026-02-03T14:30:00Z"));

    assertThat(stateStore.find(dayOne, "AAPL")).isEmpty();
    assertThat(stateStore.getCurrentSessionDate()).contains(dayTwo);
  }
}
