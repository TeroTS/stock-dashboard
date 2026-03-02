package com.stockdashboard.backend.transaction;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface TransactionStore {

  List<TransactionRecord> findAll(LocalDate sessionDate);

  Optional<TransactionRecord> findById(LocalDate sessionDate, String transactionId);

  void save(LocalDate sessionDate, TransactionRecord transaction);

  void clearAllSessions();
}
