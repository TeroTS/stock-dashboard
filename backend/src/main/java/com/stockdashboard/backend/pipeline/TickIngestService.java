package com.stockdashboard.backend.pipeline;

import com.stockdashboard.backend.config.MarketProperties;
import com.stockdashboard.backend.domain.NormalizedTick;
import com.stockdashboard.backend.domain.RangeDefinition;
import com.stockdashboard.backend.domain.SymbolSessionState;
import com.stockdashboard.backend.health.IngestConnectivityTracker;
import com.stockdashboard.backend.session.MarketSessionService;
import com.stockdashboard.backend.session.SessionLifecycleService;
import com.stockdashboard.backend.session.SessionState;
import com.stockdashboard.backend.state.SessionStateStore;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import java.time.LocalDate;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class TickIngestService {

  private static final Logger LOGGER = LoggerFactory.getLogger(TickIngestService.class);

  private final Set<String> watchlist;
  private final SessionStateStore sessionStateStore;
  private final MarketSessionService marketSessionService;
  private final SessionLifecycleService sessionLifecycleService;
  private final Validator validator;
  private final IngestConnectivityTracker ingestConnectivityTracker;

  private final Counter invalidTicksCounter;
  private final Counter droppedSymbolCounter;
  private final Counter outOfSessionCounter;

  @Autowired
  public TickIngestService(
      MarketProperties properties,
      SessionStateStore sessionStateStore,
      MarketSessionService marketSessionService,
      SessionLifecycleService sessionLifecycleService,
      Validator validator,
      MeterRegistry meterRegistry,
      IngestConnectivityTracker ingestConnectivityTracker) {
    this(
        properties.getWatchlist().stream().map(symbol -> symbol.toUpperCase(Locale.ROOT)).collect(Collectors.toSet()),
        sessionStateStore,
        marketSessionService,
        sessionLifecycleService,
        validator,
        meterRegistry,
        ingestConnectivityTracker);
  }

  public TickIngestService(
      Set<String> watchlist,
      SessionStateStore sessionStateStore,
      MarketSessionService marketSessionService) {
    this(
        watchlist,
        sessionStateStore,
        marketSessionService,
        new SessionLifecycleService(marketSessionService, sessionStateStore),
        Validation.buildDefaultValidatorFactory().getValidator(),
        new SimpleMeterRegistry(),
        new IngestConnectivityTracker());
  }

  private TickIngestService(
      Set<String> watchlist,
      SessionStateStore sessionStateStore,
      MarketSessionService marketSessionService,
      SessionLifecycleService sessionLifecycleService,
      Validator validator,
      MeterRegistry meterRegistry,
      IngestConnectivityTracker ingestConnectivityTracker) {
    this.watchlist = watchlist;
    this.sessionStateStore = sessionStateStore;
    this.marketSessionService = marketSessionService;
    this.sessionLifecycleService = sessionLifecycleService;
    this.validator = validator;
    this.ingestConnectivityTracker = ingestConnectivityTracker;

    this.invalidTicksCounter = Counter.builder("ticks.invalid").register(meterRegistry);
    this.droppedSymbolCounter = Counter.builder("ticks.dropped.symbol").register(meterRegistry);
    this.outOfSessionCounter = Counter.builder("ticks.dropped.session").register(meterRegistry);
  }

  public void process(NormalizedTick tick) {
    Set<ConstraintViolation<NormalizedTick>> violations = validator.validate(tick);
    if (!violations.isEmpty()) {
      invalidTicksCounter.increment();
      LOGGER.debug("Dropping invalid tick due to {} violations", violations.size());
      return;
    }

    String symbol = tick.symbol().toUpperCase(Locale.ROOT);
    if (!watchlist.contains(symbol)) {
      droppedSymbolCounter.increment();
      LOGGER.debug("Dropping tick for unknown symbol {}", symbol);
      return;
    }

    if (marketSessionService.getSessionState(tick.timestamp()) != SessionState.OPEN) {
      outOfSessionCounter.increment();
      return;
    }

    try {
      sessionLifecycleService.ensureCurrentSession(tick.timestamp());
      LocalDate sessionDate = marketSessionService.getSessionDate(tick.timestamp());

      SymbolSessionState state =
          sessionStateStore.find(sessionDate, symbol).orElseGet(() -> SymbolSessionState.empty(symbol, sessionDate));

      if (state.getOpenPrice() == null) {
        state.setOpenPrice(tick.price());
      }

      state.setLatestPrice(tick.price());
      for (RangeDefinition range : RangeDefinition.values()) {
        state.getSeries(range).applyTick(tick.timestamp(), tick.price(), tick.volume());
      }

      sessionStateStore.save(sessionDate, state);
      ingestConnectivityTracker.markSeen(tick.timestamp());
    } catch (RuntimeException ex) {
      LOGGER.warn("Failed to persist or process tick for symbol {}", symbol, ex);
    }
  }
}
