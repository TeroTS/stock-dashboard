package com.stockdashboard.backend.state;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.stockdashboard.backend.domain.SymbolSessionState;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class RedisSessionStateStore implements SessionStateStore {

  private static final String CURRENT_SESSION_KEY = "stock-dashboard:session:current";
  private static final String SESSIONS_KEY = "stock-dashboard:sessions";

  private final StringRedisTemplate redisTemplate;
  private final ObjectMapper objectMapper;
  private final RedisRetryExecutor retryExecutor;
  private final RedisFailureTracker failureTracker;

  public RedisSessionStateStore(
      StringRedisTemplate redisTemplate,
      ObjectMapper objectMapper,
      RedisRetryExecutor retryExecutor,
      RedisFailureTracker failureTracker) {
    this.redisTemplate = redisTemplate;
    this.objectMapper = objectMapper;
    this.retryExecutor = retryExecutor;
    this.failureTracker = failureTracker;
  }

  @Override
  public Optional<SymbolSessionState> find(LocalDate sessionDate, String symbol) {
    String key = stateKey(sessionDate, symbol);
    return retryExecutor.execute(
        "find_symbol_state",
        () -> {
          String payload = redisTemplate.opsForValue().get(key);
          if (payload == null) {
            return Optional.empty();
          }

          return Optional.of(deserialize(payload));
        });
  }

  @Override
  public Map<String, SymbolSessionState> findAll(LocalDate sessionDate) {
    Set<String> symbols =
        retryExecutor.execute("list_session_symbols", () -> redisTemplate.opsForSet().members(sessionSymbolsKey(sessionDate)));
    if (symbols == null || symbols.isEmpty()) {
      return Map.of();
    }

    Map<String, SymbolSessionState> states = new HashMap<>();
    for (String symbol : symbols) {
      find(sessionDate, symbol).ifPresent(state -> states.put(symbol, state));
    }

    return states;
  }

  @Override
  public void save(LocalDate sessionDate, SymbolSessionState state) {
    retryExecutor.execute(
        "save_symbol_state",
        () -> {
          redisTemplate.opsForValue().set(stateKey(sessionDate, state.getSymbol()), serialize(state));
          redisTemplate.opsForSet().add(sessionSymbolsKey(sessionDate), state.getSymbol());
          redisTemplate.opsForSet().add(SESSIONS_KEY, sessionDate.toString());
          return null;
        });
  }

  @Override
  public Optional<LocalDate> getCurrentSessionDate() {
    return retryExecutor.execute(
        "get_current_session_date",
        () -> {
          String value = redisTemplate.opsForValue().get(CURRENT_SESSION_KEY);
          if (value == null) {
            return Optional.empty();
          }
          return Optional.of(LocalDate.parse(value));
        });
  }

  @Override
  public void setCurrentSessionDate(LocalDate sessionDate) {
    retryExecutor.execute(
        "set_current_session_date",
        () -> {
          redisTemplate.opsForValue().set(CURRENT_SESSION_KEY, sessionDate.toString());
          redisTemplate.opsForSet().add(SESSIONS_KEY, sessionDate.toString());
          return null;
        });
  }

  @Override
  public void clearAllSessions() {
    retryExecutor.execute(
        "clear_all_sessions",
        () -> {
          Set<String> sessionDates = redisTemplate.opsForSet().members(SESSIONS_KEY);
          if (sessionDates != null) {
            for (String sessionDate : sessionDates) {
              LocalDate date = LocalDate.parse(sessionDate);
              Set<String> symbols = redisTemplate.opsForSet().members(sessionSymbolsKey(date));
              if (symbols != null) {
                for (String symbol : symbols) {
                  redisTemplate.delete(stateKey(date, symbol));
                }
              }
              redisTemplate.delete(sessionSymbolsKey(date));
            }
          }

          redisTemplate.delete(SESSIONS_KEY);
          redisTemplate.delete(CURRENT_SESSION_KEY);
          failureTracker.markHealthy();
          return null;
        });
  }

  public RedisSessionStateStore recreate() {
    return new RedisSessionStateStore(redisTemplate, objectMapper, retryExecutor, failureTracker);
  }

  private String sessionSymbolsKey(LocalDate sessionDate) {
    return "stock-dashboard:session:%s:symbols".formatted(sessionDate);
  }

  private String stateKey(LocalDate sessionDate, String symbol) {
    return "stock-dashboard:session:%s:symbol:%s".formatted(sessionDate, symbol);
  }

  private String serialize(SymbolSessionState state) {
    try {
      return objectMapper.writeValueAsString(state);
    } catch (JsonProcessingException ex) {
      throw new IllegalStateException("Could not serialize symbol session state", ex);
    }
  }

  private SymbolSessionState deserialize(String value) {
    try {
      return objectMapper.readValue(value, SymbolSessionState.class);
    } catch (JsonProcessingException ex) {
      throw new IllegalStateException("Could not deserialize symbol session state", ex);
    }
  }
}
