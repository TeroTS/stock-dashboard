package com.stockdashboard.backend.transaction;

import com.stockdashboard.backend.domain.SymbolSessionState;
import com.stockdashboard.backend.session.MarketSessionService;
import com.stockdashboard.backend.session.SessionLifecycleService;
import com.stockdashboard.backend.session.SessionState;
import com.stockdashboard.backend.state.SessionStateStore;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.NoSuchElementException;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

@Service
public class TransactionService {

  private static final BigDecimal TRADE_QUANTITY = BigDecimal.valueOf(100);

  private final TransactionStore transactionStore;
  private final SessionStateStore sessionStateStore;
  private final MarketSessionService marketSessionService;
  private final SessionLifecycleService sessionLifecycleService;

  public TransactionService(
      TransactionStore transactionStore,
      SessionStateStore sessionStateStore,
      MarketSessionService marketSessionService,
      SessionLifecycleService sessionLifecycleService) {
    this.transactionStore = transactionStore;
    this.sessionStateStore = sessionStateStore;
    this.marketSessionService = marketSessionService;
    this.sessionLifecycleService = sessionLifecycleService;
  }

  public TransactionRecord openPosition(String symbol, PositionType positionType, Instant now) {
    ensureOpenSession(now);
    sessionLifecycleService.ensureCurrentSession(now);

    LocalDate sessionDate = marketSessionService.getSessionDate(now);
    String normalizedSymbol = symbol.toUpperCase(Locale.ROOT);

    if (findOpenSymbols(sessionDate).contains(normalizedSymbol)) {
      throw new IllegalStateException("Symbol %s already has an OPEN transaction".formatted(normalizedSymbol));
    }

    SymbolSessionState state =
        sessionStateStore
            .find(sessionDate, normalizedSymbol)
            .orElseThrow(() -> new IllegalArgumentException("No live state found for symbol %s".formatted(normalizedSymbol)));

    if (state.getLatestPrice() == null) {
      throw new IllegalArgumentException("No latest price available for symbol %s".formatted(normalizedSymbol));
    }

    TransactionRecord transaction =
        TransactionRecord.open(
            UUID.randomUUID().toString(), normalizedSymbol, positionType, now, state.getLatestPrice());
    transactionStore.save(sessionDate, transaction);

    return transaction;
  }

  public TransactionRecord closePosition(String transactionId, Instant now) {
    ensureOpenSession(now);
    sessionLifecycleService.ensureCurrentSession(now);

    LocalDate sessionDate = marketSessionService.getSessionDate(now);
    TransactionRecord existing =
        transactionStore
            .findById(sessionDate, transactionId)
            .orElseThrow(() -> new NoSuchElementException("Transaction %s not found".formatted(transactionId)));

    if (existing.status() == TransactionStatus.CLOSED) {
      throw new IllegalStateException("Transaction %s is already CLOSED".formatted(transactionId));
    }

    SymbolSessionState state =
        sessionStateStore
            .find(sessionDate, existing.symbol())
            .orElseThrow(() -> new IllegalArgumentException("No live state found for symbol %s".formatted(existing.symbol())));
    if (state.getLatestPrice() == null) {
      throw new IllegalArgumentException("No latest price available for symbol %s".formatted(existing.symbol()));
    }

    BigDecimal exitPrice = state.getLatestPrice();
    BigDecimal profitLoss = computeProfitLoss(existing.positionType(), existing.entryPrice(), exitPrice);

    TransactionRecord closed = existing.close(now, exitPrice, profitLoss);
    transactionStore.save(sessionDate, closed);

    return closed;
  }

  public List<TransactionRecord> findAll(LocalDate sessionDate) {
    return transactionStore.findAll(sessionDate).stream()
        .sorted(
            Comparator.comparing(TransactionRecord::openTimestamp)
                .reversed()
                .thenComparing(TransactionRecord::transactionId, Comparator.reverseOrder()))
        .toList();
  }

  public Set<String> findOpenSymbols(LocalDate sessionDate) {
    return transactionStore.findAll(sessionDate).stream()
        .filter(record -> record.status() == TransactionStatus.OPEN)
        .map(TransactionRecord::symbol)
        .collect(Collectors.toSet());
  }

  private BigDecimal computeProfitLoss(PositionType positionType, BigDecimal entryPrice, BigDecimal exitPrice) {
    BigDecimal delta =
        positionType == PositionType.LONG
            ? exitPrice.subtract(entryPrice)
            : entryPrice.subtract(exitPrice);
    return delta.multiply(TRADE_QUANTITY).setScale(2, RoundingMode.HALF_UP);
  }

  private void ensureOpenSession(Instant now) {
    if (marketSessionService.getSessionState(now) != SessionState.OPEN) {
      throw new IllegalStateException("Transactions are only allowed during OPEN session");
    }
  }
}
