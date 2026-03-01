package com.stockdashboard.backend.state;

import com.stockdashboard.backend.config.MarketProperties;
import com.stockdashboard.backend.observability.PipelineObservability;
import java.util.function.Supplier;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class RedisRetryExecutor {

  private static final Logger LOGGER = LoggerFactory.getLogger(RedisRetryExecutor.class);

  private final int maxRetries;
  private final RedisFailureTracker failureTracker;
  private final PipelineObservability observability;

  public RedisRetryExecutor(
      MarketProperties properties, RedisFailureTracker failureTracker, PipelineObservability observability) {
    this.maxRetries = Math.max(properties.getRedis().getMaxRetries(), 1);
    this.failureTracker = failureTracker;
    this.observability = observability;
  }

  public <T> T execute(Supplier<T> operation) {
    return execute("unknown", operation);
  }

  public <T> T execute(String operationName, Supplier<T> operation) {
    RuntimeException lastFailure = null;

    for (int attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        T result = operation.get();
        failureTracker.markHealthy();
        observability.recordRedisOperation(operationName, true);
        if (attempt > 1) {
          LOGGER.atInfo()
              .addKeyValue("event", "redis_operation_recovered")
              .addKeyValue("operation", operationName)
              .addKeyValue("attempt", attempt)
              .log("Redis operation recovered after retry");
        }
        return result;
      } catch (RuntimeException ex) {
        lastFailure = ex;
        observability.recordRedisOperation(operationName, false);
        if (attempt < maxRetries) {
          LOGGER.atWarn()
              .addKeyValue("event", "redis_operation_retry")
              .addKeyValue("operation", operationName)
              .addKeyValue("attempt", attempt)
              .addKeyValue("maxRetries", maxRetries)
              .setCause(ex)
              .log("Retrying redis operation");
        }
      }
    }

    failureTracker.markFailure();
    LOGGER.atError()
        .addKeyValue("event", "redis_operation_failed")
        .addKeyValue("operation", operationName)
        .addKeyValue("maxRetries", maxRetries)
        .setCause(lastFailure)
        .log("Redis operation failed after retries");
    throw lastFailure == null ? new IllegalStateException("Redis operation failed") : lastFailure;
  }
}
