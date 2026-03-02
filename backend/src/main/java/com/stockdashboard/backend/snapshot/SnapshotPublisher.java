package com.stockdashboard.backend.snapshot;

import com.stockdashboard.backend.health.SnapshotFreshnessTracker;
import com.stockdashboard.backend.observability.PipelineObservability;
import com.stockdashboard.backend.observability.PipelineObservability.SnapshotResult;
import com.stockdashboard.backend.ranking.RankingResult;
import com.stockdashboard.backend.ranking.RankingService;
import com.stockdashboard.backend.session.MarketSessionService;
import com.stockdashboard.backend.session.SessionLifecycleService;
import com.stockdashboard.backend.session.SessionState;
import com.stockdashboard.backend.state.SessionStateStore;
import com.stockdashboard.backend.transaction.TransactionRecord;
import com.stockdashboard.backend.transaction.TransactionService;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;
import java.util.Set;
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
  private final TransactionService transactionService;
  private final SnapshotAssembler snapshotAssembler;
  private final SimpMessagingTemplate messagingTemplate;
  private final SnapshotFreshnessTracker snapshotFreshnessTracker;
  private final PipelineObservability observability;
  private final Clock clock;
  private final Counter publishCounter;

  public SnapshotPublisher(
      MarketSessionService sessionService,
      SessionLifecycleService lifecycleService,
      SessionStateStore stateStore,
      RankingService rankingService,
      TransactionService transactionService,
      SnapshotAssembler snapshotAssembler,
      SimpMessagingTemplate messagingTemplate,
      SnapshotFreshnessTracker snapshotFreshnessTracker,
      PipelineObservability observability,
      Clock clock,
      MeterRegistry meterRegistry) {
    this.sessionService = sessionService;
    this.lifecycleService = lifecycleService;
    this.stateStore = stateStore;
    this.rankingService = rankingService;
    this.transactionService = transactionService;
    this.snapshotAssembler = snapshotAssembler;
    this.messagingTemplate = messagingTemplate;
    this.snapshotFreshnessTracker = snapshotFreshnessTracker;
    this.observability = observability;
    this.clock = clock;
    this.publishCounter = Counter.builder("snapshot.published").register(meterRegistry);
  }

  @Scheduled(fixedRateString = "${market.snapshot-cadence-ms:1000}")
  public void publish() {
    Instant now = clock.instant();
    if (sessionService.getSessionState(now) != SessionState.OPEN) {
      observability.recordSnapshot(SnapshotResult.SKIPPED, 0, 0);
      return;
    }

    try {
      lifecycleService.ensureCurrentSession(now);
      LocalDate sessionDate = sessionService.getSessionDate(now);
      Map<String, com.stockdashboard.backend.domain.SymbolSessionState> states = stateStore.findAll(sessionDate);
      Set<String> openSymbols = transactionService.findOpenSymbols(sessionDate);
      RankingResult ranking =
          rankingService.rank(states.values().stream().filter(state -> !openSymbols.contains(state.getSymbol())).toList());
      java.util.List<TransactionRecord> transactions = transactionService.findAll(sessionDate);

      long buildStartedAt = System.nanoTime();
      DashboardSnapshot snapshot =
          snapshotAssembler.assemble(now, SessionState.OPEN, ranking, states, transactions);
      long buildDurationNanos = System.nanoTime() - buildStartedAt;

      long publishStartedAt = System.nanoTime();
      messagingTemplate.convertAndSend(TOPIC, snapshot);
      long publishDurationNanos = System.nanoTime() - publishStartedAt;

      snapshotFreshnessTracker.markPublished(now);
      publishCounter.increment();
      observability.recordSnapshot(SnapshotResult.PUBLISHED, buildDurationNanos, publishDurationNanos);
    } catch (RuntimeException ex) {
      observability.recordSnapshot(SnapshotResult.ERROR, 0, 0);
      LOGGER.atWarn()
          .addKeyValue("event", "snapshot_publish_failed")
          .setCause(ex)
          .log("Skipping snapshot publish due to backend state error");
    }
  }
}
