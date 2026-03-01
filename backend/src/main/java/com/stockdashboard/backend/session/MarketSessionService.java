package com.stockdashboard.backend.session;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
public class MarketSessionService {

  private final ZoneId zoneId;
  private final LocalTime open;
  private final LocalTime close;

  public MarketSessionService(ZoneId zoneId, LocalTime open, LocalTime close) {
    this.zoneId = zoneId;
    this.open = open;
    this.close = close;
  }

  public SessionState getSessionState(Instant timestamp) {
    LocalTime localTime = ZonedDateTime.ofInstant(timestamp, zoneId).toLocalTime();
    boolean isOpen = !localTime.isBefore(open) && localTime.isBefore(close);
    return isOpen ? SessionState.OPEN : SessionState.CLOSED;
  }

  public LocalDate getSessionDate(Instant timestamp) {
    return ZonedDateTime.ofInstant(timestamp, zoneId).toLocalDate();
  }

  public ZoneId getZoneId() {
    return zoneId;
  }

  public LocalTime getOpen() {
    return open;
  }

  public LocalTime getClose() {
    return close;
  }
}
