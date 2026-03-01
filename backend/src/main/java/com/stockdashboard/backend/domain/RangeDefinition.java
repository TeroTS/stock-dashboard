package com.stockdashboard.backend.domain;

import java.util.Arrays;

public enum RangeDefinition {
  FIVE_MIN("5min", 10, 30),
  THIRTY_MIN("30min", 60, 30),
  ONE_TWENTY_MIN("120min", 240, 30);

  private final String label;
  private final int bucketSeconds;
  private final int maxBuckets;

  RangeDefinition(String label, int bucketSeconds, int maxBuckets) {
    this.label = label;
    this.bucketSeconds = bucketSeconds;
    this.maxBuckets = maxBuckets;
  }

  public String getLabel() {
    return label;
  }

  public int getBucketSeconds() {
    return bucketSeconds;
  }

  public int getMaxBuckets() {
    return maxBuckets;
  }

  public static RangeDefinition fromLabel(String label) {
    return Arrays.stream(values())
        .filter(range -> range.label.equals(label))
        .findFirst()
        .orElseThrow(() -> new IllegalArgumentException("Unsupported range label: " + label));
  }
}
