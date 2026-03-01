package com.stockdashboard.backend.domain;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.EnumMap;
import java.util.Map;

public class SymbolSessionState {

  private String symbol;
  private LocalDate sessionDate;
  private BigDecimal openPrice;
  private BigDecimal latestPrice;
  private Map<RangeDefinition, RollingCandleSeries> candlesByRange = new EnumMap<>(RangeDefinition.class);

  public SymbolSessionState() {}

  public static SymbolSessionState empty(String symbol, LocalDate sessionDate) {
    SymbolSessionState state = new SymbolSessionState();
    state.symbol = symbol;
    state.sessionDate = sessionDate;

    for (RangeDefinition range : RangeDefinition.values()) {
      state.candlesByRange.put(range, new RollingCandleSeries(range.getBucketSeconds(), range.getMaxBuckets()));
    }

    return state;
  }

  public RollingCandleSeries getSeries(RangeDefinition range) {
    candlesByRange.computeIfAbsent(range, key -> new RollingCandleSeries(key.getBucketSeconds(), key.getMaxBuckets()));
    return candlesByRange.get(range);
  }

  public String getSymbol() {
    return symbol;
  }

  public void setSymbol(String symbol) {
    this.symbol = symbol;
  }

  public LocalDate getSessionDate() {
    return sessionDate;
  }

  public void setSessionDate(LocalDate sessionDate) {
    this.sessionDate = sessionDate;
  }

  public BigDecimal getOpenPrice() {
    return openPrice;
  }

  public void setOpenPrice(BigDecimal openPrice) {
    this.openPrice = openPrice;
  }

  public BigDecimal getLatestPrice() {
    return latestPrice;
  }

  public void setLatestPrice(BigDecimal latestPrice) {
    this.latestPrice = latestPrice;
  }

  public Map<RangeDefinition, RollingCandleSeries> getCandlesByRange() {
    return candlesByRange;
  }

  public void setCandlesByRange(Map<RangeDefinition, RollingCandleSeries> candlesByRange) {
    this.candlesByRange = candlesByRange;
  }
}
