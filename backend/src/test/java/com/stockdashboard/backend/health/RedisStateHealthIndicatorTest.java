package com.stockdashboard.backend.health;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.stockdashboard.backend.state.RedisFailureTracker;
import org.junit.jupiter.api.Test;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.Status;

class RedisStateHealthIndicatorTest {

  @Test
  void reportsUpWhenRedisIsHealthy() {
    RedisFailureTracker tracker = mock(RedisFailureTracker.class);
    when(tracker.isDegraded()).thenReturn(false);
    RedisStateHealthIndicator indicator = new RedisStateHealthIndicator(tracker);

    Health health = indicator.health();

    assertThat(health.getStatus()).isEqualTo(Status.UP);
  }

  @Test
  void reportsDegradedWhenRedisRetriesExceeded() {
    RedisFailureTracker tracker = mock(RedisFailureTracker.class);
    when(tracker.isDegraded()).thenReturn(true);
    RedisStateHealthIndicator indicator = new RedisStateHealthIndicator(tracker);

    Health health = indicator.health();

    assertThat(health.getStatus().getCode()).isEqualTo("DEGRADED");
    assertThat(health.getDetails()).containsEntry("reason", "Redis retries exceeded");
  }
}
