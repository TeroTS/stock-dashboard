package com.stockdashboard.backend.domain;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.LinkedList;
import java.util.List;

public class RollingCandleSeries {

  private int bucketSeconds;
  private int maxBuckets;
  private LinkedList<CandleBucket> buckets = new LinkedList<>();

  public RollingCandleSeries() {}

  public RollingCandleSeries(int bucketSeconds, int maxBuckets) {
    this.bucketSeconds = bucketSeconds;
    this.maxBuckets = maxBuckets;
  }

  public void applyTick(Instant timestamp, BigDecimal price, long volume) {
    Instant bucketStart = bucketStart(timestamp);
    CandleBucket last = buckets.peekLast();

    if (last != null) {
      if (bucketStart.isBefore(last.getBucketStart())) {
        return;
      }

      if (bucketStart.equals(last.getBucketStart())) {
        last.apply(price, volume);
        return;
      }
    }

    CandleBucket next = new CandleBucket(bucketStart, null, null, null, null, 0);
    next.apply(price, volume);
    buckets.add(next);

    while (buckets.size() > maxBuckets) {
      buckets.removeFirst();
    }
  }

  private Instant bucketStart(Instant timestamp) {
    long epoch = timestamp.getEpochSecond();
    long start = epoch - (epoch % bucketSeconds);
    return Instant.ofEpochSecond(start);
  }

  public int getBucketSeconds() {
    return bucketSeconds;
  }

  public void setBucketSeconds(int bucketSeconds) {
    this.bucketSeconds = bucketSeconds;
  }

  public int getMaxBuckets() {
    return maxBuckets;
  }

  public void setMaxBuckets(int maxBuckets) {
    this.maxBuckets = maxBuckets;
  }

  public LinkedList<CandleBucket> getBuckets() {
    return buckets;
  }

  public void setBuckets(LinkedList<CandleBucket> buckets) {
    this.buckets = buckets;
  }

  public List<CandleBucket> asList() {
    return List.copyOf(buckets);
  }
}
