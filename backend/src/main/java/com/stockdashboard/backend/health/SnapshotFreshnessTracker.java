package com.stockdashboard.backend.health;

import java.time.Instant;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import org.springframework.stereotype.Component;

@Component
public class SnapshotFreshnessTracker {

  private final AtomicReference<Instant> lastPublished = new AtomicReference<>();

  public void markPublished(Instant timestamp) {
    lastPublished.set(timestamp);
  }

  public Optional<Instant> lastPublished() {
    return Optional.ofNullable(lastPublished.get());
  }
}
