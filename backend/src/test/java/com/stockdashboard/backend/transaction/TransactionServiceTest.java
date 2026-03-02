package com.stockdashboard.backend.transaction;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.stockdashboard.backend.domain.SymbolSessionState;
import com.stockdashboard.backend.session.MarketSessionService;
import com.stockdashboard.backend.session.SessionLifecycleService;
import com.stockdashboard.backend.state.InMemorySessionStateStore;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class TransactionServiceTest {

  private static final ZoneId NEW_YORK = ZoneId.of("America/New_York");

  private InMemorySessionStateStore sessionStateStore;
  private InMemoryTransactionStore transactionStore;
  private MarketSessionService marketSessionService;
  private SessionLifecycleService sessionLifecycleService;
  private TransactionService transactionService;

  @BeforeEach
  void setUp() {
    sessionStateStore = new InMemorySessionStateStore();
    transactionStore = new InMemoryTransactionStore();
    marketSessionService = new MarketSessionService(NEW_YORK, LocalTime.of(9, 30), LocalTime.of(16, 0));
    sessionLifecycleService = new SessionLifecycleService(marketSessionService, sessionStateStore, transactionStore);
    transactionService =
        new TransactionService(transactionStore, sessionStateStore, marketSessionService, sessionLifecycleService);
  }

  @Test
  void opensLongTransactionAtLatestPriceAndPersistsIt() {
    Instant now = Instant.parse("2026-03-02T14:31:00Z");
    LocalDate sessionDate = marketSessionService.getSessionDate(now);
    putSymbolState(sessionDate, "AAPL", "25.00");

    TransactionRecord opened = transactionService.openPosition("AAPL", PositionType.LONG, now);

    assertThat(opened.status()).isEqualTo(TransactionStatus.OPEN);
    assertThat(opened.positionType()).isEqualTo(PositionType.LONG);
    assertThat(opened.entryPrice()).isEqualByComparingTo("25.00");
    assertThat(opened.closeTimestamp()).isNull();
    assertThat(opened.exitPrice()).isNull();
    assertThat(opened.profitLoss()).isNull();

    List<TransactionRecord> all = transactionService.findAll(sessionDate);
    assertThat(all).hasSize(1);
    assertThat(all.getFirst().transactionId()).isEqualTo(opened.transactionId());
  }

  @Test
  void closesLongTransactionUsingFixedHundredShareQuantity() {
    Instant openTime = Instant.parse("2026-03-02T14:31:00Z");
    LocalDate sessionDate = marketSessionService.getSessionDate(openTime);
    putSymbolState(sessionDate, "AAPL", "25.00");

    TransactionRecord opened = transactionService.openPosition("AAPL", PositionType.LONG, openTime);
    putSymbolState(sessionDate, "AAPL", "28.00");

    TransactionRecord closed = transactionService.closePosition(opened.transactionId(), Instant.parse("2026-03-02T14:35:00Z"));

    assertThat(closed.status()).isEqualTo(TransactionStatus.CLOSED);
    assertThat(closed.exitPrice()).isEqualByComparingTo("28.00");
    assertThat(closed.profitLoss()).isEqualByComparingTo("300.00");
  }

  @Test
  void closesShortTransactionUsingFixedHundredShareQuantity() {
    Instant openTime = Instant.parse("2026-03-02T14:31:00Z");
    LocalDate sessionDate = marketSessionService.getSessionDate(openTime);
    putSymbolState(sessionDate, "TSLA", "25.00");

    TransactionRecord opened = transactionService.openPosition("TSLA", PositionType.SHORT, openTime);
    putSymbolState(sessionDate, "TSLA", "22.00");

    TransactionRecord closed = transactionService.closePosition(opened.transactionId(), Instant.parse("2026-03-02T14:33:00Z"));

    assertThat(closed.status()).isEqualTo(TransactionStatus.CLOSED);
    assertThat(closed.exitPrice()).isEqualByComparingTo("22.00");
    assertThat(closed.profitLoss()).isEqualByComparingTo("300.00");
  }

  @Test
  void excludesSymbolsWithOpenTransactionsAndReenablesAfterClose() {
    Instant openTime = Instant.parse("2026-03-02T14:31:00Z");
    LocalDate sessionDate = marketSessionService.getSessionDate(openTime);
    putSymbolState(sessionDate, "MSFT", "100.00");

    TransactionRecord opened = transactionService.openPosition("MSFT", PositionType.LONG, openTime);

    assertThat(transactionService.findOpenSymbols(sessionDate)).containsExactly("MSFT");

    putSymbolState(sessionDate, "MSFT", "101.00");
    transactionService.closePosition(opened.transactionId(), Instant.parse("2026-03-02T14:34:00Z"));

    assertThat(transactionService.findOpenSymbols(sessionDate)).isEmpty();
  }

  @Test
  void rejectsSecondOpenTransactionForSameSymbol() {
    Instant firstOpen = Instant.parse("2026-03-02T14:31:00Z");
    LocalDate sessionDate = marketSessionService.getSessionDate(firstOpen);
    putSymbolState(sessionDate, "NVDA", "150.00");

    transactionService.openPosition("NVDA", PositionType.LONG, firstOpen);

    assertThatThrownBy(() -> transactionService.openPosition("NVDA", PositionType.SHORT, Instant.parse("2026-03-02T14:32:00Z")))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("already has an OPEN transaction");
  }

  @Test
  void keepsClosedTransactionFrozenAndOrdersNewestFirst() {
    Instant openFirst = Instant.parse("2026-03-02T14:31:00Z");
    LocalDate sessionDate = marketSessionService.getSessionDate(openFirst);
    putSymbolState(sessionDate, "AAPL", "25.00");
    putSymbolState(sessionDate, "AMD", "10.00");

    TransactionRecord first = transactionService.openPosition("AAPL", PositionType.LONG, openFirst);
    putSymbolState(sessionDate, "AAPL", "28.00");
    TransactionRecord closed = transactionService.closePosition(first.transactionId(), Instant.parse("2026-03-02T14:33:00Z"));

    putSymbolState(sessionDate, "AAPL", "35.00");

    TransactionRecord second =
        transactionService.openPosition("AMD", PositionType.SHORT, Instant.parse("2026-03-02T14:34:00Z"));

    List<TransactionRecord> ordered = transactionService.findAll(sessionDate);
    assertThat(ordered).extracting(TransactionRecord::transactionId).containsExactly(second.transactionId(), first.transactionId());

    TransactionRecord persistedClosed = ordered.get(1);
    assertThat(persistedClosed.status()).isEqualTo(TransactionStatus.CLOSED);
    assertThat(persistedClosed.profitLoss()).isEqualByComparingTo(closed.profitLoss());
    assertThat(persistedClosed.exitPrice()).isEqualByComparingTo("28.00");
  }

  @Test
  void doesNotAllowClosingTransactionTwice() {
    Instant openTime = Instant.parse("2026-03-02T14:31:00Z");
    LocalDate sessionDate = marketSessionService.getSessionDate(openTime);
    putSymbolState(sessionDate, "META", "80.00");

    TransactionRecord opened = transactionService.openPosition("META", PositionType.LONG, openTime);
    putSymbolState(sessionDate, "META", "81.00");
    transactionService.closePosition(opened.transactionId(), Instant.parse("2026-03-02T14:35:00Z"));

    assertThatThrownBy(() -> transactionService.closePosition(opened.transactionId(), Instant.parse("2026-03-02T14:36:00Z")))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("already CLOSED");
  }

  private void putSymbolState(LocalDate sessionDate, String symbol, String latestPrice) {
    SymbolSessionState state =
        sessionStateStore.find(sessionDate, symbol).orElseGet(() -> SymbolSessionState.empty(symbol, sessionDate));
    state.setLatestPrice(new BigDecimal(latestPrice));
    if (state.getOpenPrice() == null) {
      state.setOpenPrice(new BigDecimal(latestPrice));
    }
    sessionStateStore.save(sessionDate, state);
    sessionStateStore.setCurrentSessionDate(sessionDate);
  }
}
