package com.stockdashboard.backend.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class RollingCandleSeriesTest {

  @Test
  void updatesOhlcvWhenTickFallsInsideExistingBucket() {
    RollingCandleSeries series = new RollingCandleSeries(10, 30);
    Instant bucketTime = Instant.parse("2026-02-02T14:30:05Z");

    series.applyTick(bucketTime, new BigDecimal("100.00"), 100);
    series.applyTick(bucketTime.plusSeconds(2), new BigDecimal("103.50"), 50);
    series.applyTick(bucketTime.plusSeconds(4), new BigDecimal("98.25"), 70);

    assertThat(series.getBuckets()).hasSize(1);
    CandleBucket bucket = series.getBuckets().getFirst();
    assertThat(bucket.getOpen()).isEqualByComparingTo("100.00");
    assertThat(bucket.getHigh()).isEqualByComparingTo("103.50");
    assertThat(bucket.getLow()).isEqualByComparingTo("98.25");
    assertThat(bucket.getClose()).isEqualByComparingTo("98.25");
    assertThat(bucket.getVolume()).isEqualTo(220);
  }

  @Test
  void evictsOldestBucketWhenRollingWindowExceedsThirty() {
    RollingCandleSeries series = new RollingCandleSeries(10, 30);
    Instant start = Instant.parse("2026-02-02T14:30:00Z");

    for (int i = 0; i < 31; i++) {
      series.applyTick(start.plusSeconds((long) i * 10), new BigDecimal(100 + i), 10);
    }

    assertThat(series.getBuckets()).hasSize(30);
    assertThat(series.getBuckets().getFirst().getBucketStart())
        .isEqualTo(start.plusSeconds(10));
    assertThat(series.getBuckets().getLast().getBucketStart())
        .isEqualTo(start.plusSeconds(300));
  }
}
