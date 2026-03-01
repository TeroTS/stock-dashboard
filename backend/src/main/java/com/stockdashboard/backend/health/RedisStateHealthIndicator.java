package com.stockdashboard.backend.health;

import com.stockdashboard.backend.state.RedisFailureTracker;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.boot.actuate.health.Status;
import org.springframework.stereotype.Component;

@Component
public class RedisStateHealthIndicator implements HealthIndicator {

  private static final Status DEGRADED = new Status("DEGRADED");

  private final RedisFailureTracker failureTracker;

  public RedisStateHealthIndicator(RedisFailureTracker failureTracker) {
    this.failureTracker = failureTracker;
  }

  @Override
  public Health health() {
    if (failureTracker.isDegraded()) {
      return Health.status(DEGRADED).withDetail("reason", "Redis retries exceeded").build();
    }

    return Health.up().build();
  }
}
