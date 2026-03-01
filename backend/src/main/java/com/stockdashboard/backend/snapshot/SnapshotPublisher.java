package com.stockdashboard.backend.snapshot;

import com.stockdashboard.backend.health.SnapshotFreshnessTracker;
import com.stockdashboard.backend.ranking.RankingResult;
import com.stockdashboard.backend.ranking.RankingService;
import com.stockdashboard.backend.session.MarketSessionService;
import com.stockdashboard.backend.session.SessionLifecycleService;
import com.stockdashboard.backend.session.SessionState;
import com.stockdashboard.backend.state.SessionStateStore;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class SnapshotPublisher {

  private static final String TOPIC = "/topic/dashboard-snapshots";
  private static final Logger LOGGER = LoggerFactory.getLogger(SnapshotPublisher.class);

  private final MarketSessionService sessionService;
  private final SessionLifecycleService lifecycleService;
  private final SessionStateStore stateStore;
  private final RankingService rankingService;
  private final SnapshotAssembler snapshotAssembler;
  private final SimpMessagingTemplate messagingTemplate;
  private final SnapshotFreshnessTracker snapshotFreshnessTracker;
  private final Clock clock;
  private final Counter publishCounter;

  public SnapshotPublisher(
      MarketSessionService sessionService,
      SessionLifecycleService lifecycleService,
      SessionStateStore stateStore,
      RankingService rankingService,
      SnapshotAssembler snapshotAssembler,
      SimpMessagingTemplate messagingTemplate,
      SnapshotFreshnessTracker snapshotFreshnessTracker,
      Clock clock,
      MeterRegistry meterRegistry) {
    this.sessionService = sessionService;
    this.lifecycleService = lifecycleService;
    this.stateStore = stateStore;
    this.rankingService = rankingService;
    this.snapshotAssembler = snapshotAssembler;
    this.messagingTemplate = messagingTemplate;
    this.snapshotFreshnessTracker = snapshotFreshnessTracker;
    this.clock = clock;
    this.publishCounter = Counter.builder("snapshot.published").register(meterRegistry);
  }

  @Scheduled(fixedRateString = "${market.snapshot-cadence-ms:1000}")
  public void publish() {
    Instant now = clock.instant();
    if (sessionService.getSessionState(now) != SessionState.OPEN) {
      return;
    }

    try {
      lifecycleService.ensureCurrentSession(now);
      LocalDate sessionDate = sessionService.getSessionDate(now);
      Map<String, com.stockdashboard.backend.domain.SymbolSessionState> states = stateStore.findAll(sessionDate);
      RankingResult ranking = rankingService.rank(states.values());

      DashboardSnapshot snapshot = snapshotAssembler.assemble(now, SessionState.OPEN, ranking, states);
      messagingTemplate.convertAndSend(TOPIC, snapshot);
      snapshotFreshnessTracker.markPublished(now);
      publishCounter.increment();
    } catch (RuntimeException ex) {
      LOGGER.warn("Skipping snapshot publish due to backend state error", ex);
    }
  }
}
