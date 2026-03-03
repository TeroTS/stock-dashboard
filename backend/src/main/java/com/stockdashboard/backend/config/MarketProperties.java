package com.stockdashboard.backend.config;

import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import jakarta.annotation.PostConstruct;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "market")
public class MarketProperties {

  private List<String> watchlist =
      new ArrayList<>(List.of("AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "NVDA", "META", "NFLX", "AMD", "INTC"));

  private long snapshotCadenceMs = 1000;
  private long ingestHealthThresholdMs = 5000;
  private Session session = new Session();
  private MockIngest mockIngest = new MockIngest();
  private Redis redis = new Redis();

  public List<String> getWatchlist() {
    return watchlist;
  }

  public void setWatchlist(List<String> watchlist) {
    this.watchlist = watchlist;
  }

  public long getSnapshotCadenceMs() {
    return snapshotCadenceMs;
  }

  public void setSnapshotCadenceMs(long snapshotCadenceMs) {
    this.snapshotCadenceMs = snapshotCadenceMs;
  }

  public long getIngestHealthThresholdMs() {
    return ingestHealthThresholdMs;
  }

  public void setIngestHealthThresholdMs(long ingestHealthThresholdMs) {
    this.ingestHealthThresholdMs = ingestHealthThresholdMs;
  }

  public Session getSession() {
    return session;
  }

  public void setSession(Session session) {
    this.session = session;
  }

  public MockIngest getMockIngest() {
    return mockIngest;
  }

  public void setMockIngest(MockIngest mockIngest) {
    this.mockIngest = mockIngest;
  }

  public Redis getRedis() {
    return redis;
  }

  public void setRedis(Redis redis) {
    this.redis = redis;
  }

  public static class Session {
    private String timezone = "America/New_York";
    private LocalTime open = LocalTime.of(9, 30);
    private LocalTime close = LocalTime.of(16, 0);

    public String getTimezone() {
      return timezone;
    }

    public void setTimezone(String timezone) {
      this.timezone = timezone;
    }

    public LocalTime getOpen() {
      return open;
    }

    public void setOpen(LocalTime open) {
      this.open = open;
    }

    public LocalTime getClose() {
      return close;
    }

    public void setClose(LocalTime close) {
      this.close = close;
    }
  }

  public static class MockIngest {
    private boolean enabled = true;
    private long tickIntervalMs = 200;

    public boolean isEnabled() {
      return enabled;
    }

    public void setEnabled(boolean enabled) {
      this.enabled = enabled;
    }

    public long getTickIntervalMs() {
      return tickIntervalMs;
    }

    public void setTickIntervalMs(long tickIntervalMs) {
      this.tickIntervalMs = tickIntervalMs;
    }
  }

  public static class Redis {
    private int maxRetries = 3;

    public int getMaxRetries() {
      return maxRetries;
    }

    public void setMaxRetries(int maxRetries) {
      this.maxRetries = maxRetries;
    }
  }

  @PostConstruct
  void validate() {
    if (watchlist == null || watchlist.isEmpty()) {
      throw new IllegalStateException("market.watchlist must not be empty");
    }

    if (watchlist.stream().anyMatch(symbol -> symbol == null || symbol.isBlank())) {
      throw new IllegalStateException("market.watchlist must not contain blank symbols");
    }

    if (snapshotCadenceMs <= 0) {
      throw new IllegalStateException("market.snapshot-cadence-ms must be greater than zero");
    }

    if (ingestHealthThresholdMs <= 0) {
      throw new IllegalStateException("market.ingest-health-threshold-ms must be greater than zero");
    }

    if (session == null || session.getOpen() == null || session.getClose() == null) {
      throw new IllegalStateException("market.session.open and market.session.close are required");
    }

    if (!session.getOpen().isBefore(session.getClose())) {
      throw new IllegalStateException("market.session.open must be before market.session.close");
    }

    if (redis == null || redis.getMaxRetries() <= 0) {
      throw new IllegalStateException("market.redis.max-retries must be greater than zero");
    }
  }
}
