package com.stockdashboard.backend.session;

import com.stockdashboard.backend.state.SessionStateStore;
import java.time.Instant;
import java.time.LocalDate;
import org.springframework.stereotype.Service;

@Service
public class SessionLifecycleService {

  private final MarketSessionService marketSessionService;
  private final SessionStateStore sessionStateStore;

  public SessionLifecycleService(MarketSessionService marketSessionService, SessionStateStore sessionStateStore) {
    this.marketSessionService = marketSessionService;
    this.sessionStateStore = sessionStateStore;
  }

  public void ensureCurrentSession(Instant now) {
    if (marketSessionService.getSessionState(now) != SessionState.OPEN) {
      return;
    }

    LocalDate currentDate = marketSessionService.getSessionDate(now);
    if (sessionStateStore.getCurrentSessionDate().isEmpty()) {
      sessionStateStore.clearAllSessions();
      sessionStateStore.setCurrentSessionDate(currentDate);
      return;
    }

    LocalDate storedDate = sessionStateStore.getCurrentSessionDate().orElseThrow();
    if (!storedDate.equals(currentDate)) {
      sessionStateStore.clearAllSessions();
      sessionStateStore.setCurrentSessionDate(currentDate);
    }
  }
}
