## Context

The current project serves a frontend-only static stock dashboard and has no backend ingestion, ranking, or live delivery path. This change introduces a new backend service that must satisfy low-latency intraday processing, preserve active-session state across restarts, and stream dashboard-ready snapshots.

Primary constraints are fixed by approved product scope: Java 21, Spring Boot 3, WebSocket delivery, Redis-backed intraday state, fixed watchlist, and regular-session handling in `America/New_York` (`09:30-16:00`).

## Goals / Non-Goals

**Goals:**
- Provide a normalized tick ingest path from a local mock stream adapter.
- Aggregate 30 rolling candles for each symbol and each range (`10s`, `60s`, `240s` buckets).
- Compute top 5 gainers and top 5 losers using percentage change from market-open price.
- Broadcast coherent snapshot payloads every second during open session.
- Preserve intraday session state through backend restart using Redis.
- Reset state at next market open and stop updates after market close.

**Non-Goals:**
- Real broker/trading execution.
- Historical persistence beyond current intraday session.
- Dynamic symbol universe discovery.
- Pre-market/after-hours processing.
- Delta-only client protocol for v1.

## Decisions

1. **Snapshot-over-delta WebSocket protocol**
   - Decision: Publish full dashboard snapshots every second.
   - Rationale: Ranking reorder events are frequent and snapshots reduce frontend merge complexity and consistency bugs.
   - Alternative considered: Delta events; rejected for v1 due to higher client state complexity.

2. **Redis-backed session state**
   - Decision: Keep symbol open price, latest price, and rolling candles in Redis as source of durable intraday state.
   - Rationale: Satisfies restart resilience without introducing full historical storage complexity.
   - Alternative considered: In-memory only; rejected because restart would lose active-session state.

3. **Session-clock authority in backend**
   - Decision: Enforce regular market session boundaries in backend using `America/New_York`.
   - Rationale: Prevents ingest and ranking drift across clients and keeps reset behavior deterministic.
   - Alternative considered: Frontend-driven timing; rejected because backend must own correctness for ingest and ranking.

4. **Normalized ingest contract**
   - Decision: Downstream pipeline accepts only normalized `timestamp, symbol, price, volume`.
   - Rationale: Allows adapter substitution from mock to real market providers without changing aggregation/ranking behavior.
   - Alternative considered: Provider-specific payload propagation; rejected due to lock-in and brittle downstream coupling.

5. **Fixed watchlist configuration**
   - Decision: Symbols are supplied by static config for v1.
   - Rationale: Meets current product scope and keeps ranking/capacity predictable.
   - Alternative considered: Universe-wide ranking; rejected due to uncontrolled throughput and broader requirements.

## Risks / Trade-offs

- [Redis latency spikes can affect snapshot cadence] -> Mitigation: keep bounded retries, track freshness metric, and surface degraded health state.
- [Clock/boundary edge behavior at session transitions] -> Mitigation: centralize time-zone aware session evaluator and add boundary-focused tests.
- [Out-of-order or duplicated ticks can distort candles] -> Mitigation: enforce deterministic bucket acceptance rules and invariants checks.
- [Snapshot payload size grows with richer card schema] -> Mitigation: keep fixed card count (10) and fixed candle count (30) per range.

## Migration Plan

1. Add backend service and run in local profile with mock stream and Redis.
2. Validate snapshot schema against frontend consumer in local environment.
3. Roll out behind environment flag for controlled adoption.
4. Rollback strategy: disable backend stream usage in frontend and revert to static seed data while preserving backend deployment artifacts.

## Open Questions

- None for v1 scope. Future work may evaluate provider-specific adapters, authenticated WebSocket access, and holiday/half-day exchange calendars.
