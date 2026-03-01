package com.stockdashboard.backend.state;

import com.stockdashboard.backend.domain.SymbolSessionState;
import java.time.LocalDate;
import java.util.Collection;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

public class InMemorySessionStateStore implements SessionStateStore {

  private final Map<LocalDate, Map<String, SymbolSessionState>> store = new HashMap<>();
  private LocalDate currentSessionDate;

  @Override
  public synchronized Optional<SymbolSessionState> find(LocalDate sessionDate, String symbol) {
    return Optional.ofNullable(store.getOrDefault(sessionDate, Map.of()).get(symbol));
  }

  public synchronized Optional<SymbolSessionState> findBySymbol(String symbol) {
    if (currentSessionDate == null) {
      return Optional.empty();
    }

    return find(currentSessionDate, symbol);
  }

  @Override
  public synchronized Map<String, SymbolSessionState> findAll(LocalDate sessionDate) {
    return new HashMap<>(store.getOrDefault(sessionDate, Map.of()));
  }

  public synchronized Collection<SymbolSessionState> findAll() {
    if (currentSessionDate == null) {
      return java.util.List.of();
    }

    return findAll(currentSessionDate).values();
  }

  @Override
  public synchronized void save(LocalDate sessionDate, SymbolSessionState state) {
    store.computeIfAbsent(sessionDate, ignored -> new HashMap<>()).put(state.getSymbol(), state);
  }

  @Override
  public synchronized Optional<LocalDate> getCurrentSessionDate() {
    return Optional.ofNullable(currentSessionDate);
  }

  @Override
  public synchronized void setCurrentSessionDate(LocalDate sessionDate) {
    this.currentSessionDate = sessionDate;
  }

  @Override
  public synchronized void clearAllSessions() {
    store.clear();
  }
}
