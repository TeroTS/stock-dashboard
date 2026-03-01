package com.stockdashboard.backend.observability;

public interface PipelineObservability {

  enum TickResult {
    ACCEPTED("accepted"),
    INVALID("invalid"),
    DROPPED_SYMBOL("dropped_symbol"),
    DROPPED_SESSION("dropped_session"),
    REDIS_FAILED("redis_failed");

    private final String tagValue;

    TickResult(String tagValue) {
      this.tagValue = tagValue;
    }

    public String tagValue() {
      return tagValue;
    }
  }

  enum SnapshotResult {
    PUBLISHED("published"),
    SKIPPED("skipped"),
    ERROR("error");

    private final String tagValue;

    SnapshotResult(String tagValue) {
      this.tagValue = tagValue;
    }

    public String tagValue() {
      return tagValue;
    }
  }

  void recordTick(TickResult result, String symbol, long durationNanos);

  void recordSnapshot(SnapshotResult result, long buildDurationNanos, long publishDurationNanos);

  void recordRedisOperation(String operation, boolean success);

  static PipelineObservability noop() {
    return new PipelineObservability() {
      @Override
      public void recordTick(TickResult result, String symbol, long durationNanos) {}

      @Override
      public void recordSnapshot(SnapshotResult result, long buildDurationNanos, long publishDurationNanos) {}

      @Override
      public void recordRedisOperation(String operation, boolean success) {}
    };
  }
}
