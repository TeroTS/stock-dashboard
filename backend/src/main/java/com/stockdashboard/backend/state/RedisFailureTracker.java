package com.stockdashboard.backend.state;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import java.util.concurrent.atomic.AtomicBoolean;
import org.springframework.stereotype.Component;

@Component
public class RedisFailureTracker {

  private final AtomicBoolean degraded = new AtomicBoolean(false);
  private final Counter failureCounter;

  public RedisFailureTracker(MeterRegistry meterRegistry) {
    this.failureCounter = Counter.builder("redis.operations.failed").register(meterRegistry);
  }

  public void markFailure() {
    degraded.set(true);
    failureCounter.increment();
  }

  public void markHealthy() {
    degraded.set(false);
  }

  public boolean isDegraded() {
    return degraded.get();
  }
}
