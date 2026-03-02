package com.stockdashboard.backend.transaction;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

public class InMemoryTransactionStore implements TransactionStore {

  private final Map<LocalDate, Map<String, TransactionRecord>> store = new HashMap<>();

  @Override
  public synchronized List<TransactionRecord> findAll(LocalDate sessionDate) {
    Map<String, TransactionRecord> transactions = store.getOrDefault(sessionDate, Map.of());
    return new ArrayList<>(transactions.values());
  }

  @Override
  public synchronized Optional<TransactionRecord> findById(LocalDate sessionDate, String transactionId) {
    return Optional.ofNullable(store.getOrDefault(sessionDate, Map.of()).get(transactionId));
  }

  @Override
  public synchronized void save(LocalDate sessionDate, TransactionRecord transaction) {
    store.computeIfAbsent(sessionDate, ignored -> new HashMap<>()).put(transaction.transactionId(), transaction);
  }

  @Override
  public synchronized void clearAllSessions() {
    store.clear();
  }
}
