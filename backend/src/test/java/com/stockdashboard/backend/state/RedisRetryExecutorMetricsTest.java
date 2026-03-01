package com.stockdashboard.backend.state;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.stockdashboard.backend.config.MarketProperties;
import com.stockdashboard.backend.health.IngestConnectivityTracker;
import com.stockdashboard.backend.health.SnapshotFreshnessTracker;
import com.stockdashboard.backend.observability.MeteredPipelineObservability;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;

class RedisRetryExecutorMetricsTest {

  @Test
  void recordsRedisOperationSuccessAndFailureCounters() {
    SimpleMeterRegistry meterRegistry = new SimpleMeterRegistry();
    RedisFailureTracker failureTracker = new RedisFailureTracker(meterRegistry);
    MarketProperties properties = new MarketProperties();
    properties.getRedis().setMaxRetries(2);

    MeteredPipelineObservability observability =
        new MeteredPipelineObservability(
            meterRegistry,
            new IngestConnectivityTracker(),
            new SnapshotFreshnessTracker(),
            failureTracker,
            properties,
            Clock.fixed(Instant.parse("2026-03-01T00:00:00Z"), ZoneOffset.UTC));

    RedisRetryExecutor executor = new RedisRetryExecutor(properties, failureTracker, observability);
    AtomicInteger attempts = new AtomicInteger();

    String result =
        executor.execute(
            "save_symbol_state",
            () -> {
              if (attempts.incrementAndGet() == 1) {
                throw new IllegalStateException("redis down");
              }
              return "ok";
            });

    assertThat(result).isEqualTo("ok");
    assertThat(attempts.get()).isEqualTo(2);
    assertThat(
            meterRegistry
                .get("pipeline.redis.ops")
                .tag("operation", "save_symbol_state")
                .tag("result", "failure")
                .counter()
                .count())
        .isEqualTo(1d);
    assertThat(
            meterRegistry
                .get("pipeline.redis.ops")
                .tag("operation", "save_symbol_state")
                .tag("result", "success")
                .counter()
                .count())
        .isEqualTo(1d);
    assertThat(failureTracker.isDegraded()).isFalse();
  }

  @Test
  void marksDegradedWhenAllRetriesFail() {
    SimpleMeterRegistry meterRegistry = new SimpleMeterRegistry();
    RedisFailureTracker failureTracker = new RedisFailureTracker(meterRegistry);
    MarketProperties properties = new MarketProperties();
    properties.getRedis().setMaxRetries(2);

    MeteredPipelineObservability observability =
        new MeteredPipelineObservability(
            meterRegistry,
            new IngestConnectivityTracker(),
            new SnapshotFreshnessTracker(),
            failureTracker,
            properties,
            Clock.fixed(Instant.parse("2026-03-01T00:00:00Z"), ZoneOffset.UTC));

    RedisRetryExecutor executor = new RedisRetryExecutor(properties, failureTracker, observability);

    assertThatThrownBy(() -> executor.execute("find_symbol_state", () -> {
      throw new IllegalStateException("redis down");
    })).isInstanceOf(IllegalStateException.class);

    assertThat(failureTracker.isDegraded()).isTrue();
    assertThat(
            meterRegistry
                .get("pipeline.redis.ops")
                .tag("operation", "find_symbol_state")
                .tag("result", "failure")
                .counter()
                .count())
        .isEqualTo(2d);
  }
}
