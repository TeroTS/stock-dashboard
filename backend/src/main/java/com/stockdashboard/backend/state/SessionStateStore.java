package com.stockdashboard.backend.state;

import com.stockdashboard.backend.domain.SymbolSessionState;
import java.time.LocalDate;
import java.util.Map;
import java.util.Optional;

public interface SessionStateStore {

  Optional<SymbolSessionState> find(LocalDate sessionDate, String symbol);

  Map<String, SymbolSessionState> findAll(LocalDate sessionDate);

  void save(LocalDate sessionDate, SymbolSessionState state);

  Optional<LocalDate> getCurrentSessionDate();

  void setCurrentSessionDate(LocalDate sessionDate);

  void clearAllSessions();
}
