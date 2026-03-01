package com.stockdashboard.backend.health;

import java.time.Instant;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import org.springframework.stereotype.Component;

@Component
public class IngestConnectivityTracker {

  private final AtomicReference<Instant> lastSeen = new AtomicReference<>();

  public void markSeen(Instant instant) {
    lastSeen.set(instant);
  }

  public Optional<Instant> lastSeen() {
    return Optional.ofNullable(lastSeen.get());
  }
}
