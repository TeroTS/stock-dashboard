package com.stockdashboard.backend.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import java.math.BigDecimal;
import java.time.Instant;

public class CandleBucket {

  private Instant bucketStart;
  private BigDecimal open;
  private BigDecimal high;
  private BigDecimal low;
  private BigDecimal close;
  private long volume;

  public CandleBucket() {}

  public CandleBucket(Instant bucketStart, BigDecimal open, BigDecimal high, BigDecimal low, BigDecimal close, long volume) {
    this.bucketStart = bucketStart;
    this.open = open;
    this.high = high;
    this.low = low;
    this.close = close;
    this.volume = volume;
  }

  public void apply(BigDecimal price, long tradeVolume) {
    if (open == null) {
      open = price;
      high = price;
      low = price;
      close = price;
      volume = tradeVolume;
      return;
    }

    if (price.compareTo(high) > 0) {
      high = price;
    }

    if (price.compareTo(low) < 0) {
      low = price;
    }

    close = price;
    volume += tradeVolume;
  }

  public Instant getBucketStart() {
    return bucketStart;
  }

  public void setBucketStart(Instant bucketStart) {
    this.bucketStart = bucketStart;
  }

  public BigDecimal getOpen() {
    return open;
  }

  public void setOpen(BigDecimal open) {
    this.open = open;
  }

  public BigDecimal getHigh() {
    return high;
  }

  public void setHigh(BigDecimal high) {
    this.high = high;
  }

  public BigDecimal getLow() {
    return low;
  }

  public void setLow(BigDecimal low) {
    this.low = low;
  }

  public BigDecimal getClose() {
    return close;
  }

  public void setClose(BigDecimal close) {
    this.close = close;
  }

  public long getVolume() {
    return volume;
  }

  public void setVolume(long volume) {
    this.volume = volume;
  }

  @JsonIgnore
  public boolean initialized() {
    return open != null;
  }
}
