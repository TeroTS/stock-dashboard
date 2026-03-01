package com.stockdashboard.backend.state;

import com.stockdashboard.backend.config.MarketProperties;
import java.util.function.Supplier;
import org.springframework.stereotype.Component;

@Component
public class RedisRetryExecutor {

  private final int maxRetries;
  private final RedisFailureTracker failureTracker;

  public RedisRetryExecutor(MarketProperties properties, RedisFailureTracker failureTracker) {
    this.maxRetries = Math.max(properties.getRedis().getMaxRetries(), 1);
    this.failureTracker = failureTracker;
  }

  public <T> T execute(Supplier<T> operation) {
    RuntimeException lastFailure = null;

    for (int attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        T result = operation.get();
        failureTracker.markHealthy();
        return result;
      } catch (RuntimeException ex) {
        lastFailure = ex;
      }
    }

    failureTracker.markFailure();
    throw lastFailure == null ? new IllegalStateException("Redis operation failed") : lastFailure;
  }
}
