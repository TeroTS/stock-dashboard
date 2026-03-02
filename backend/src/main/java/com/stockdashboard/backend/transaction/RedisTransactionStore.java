package com.stockdashboard.backend.transaction;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.stockdashboard.backend.state.RedisRetryExecutor;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class RedisTransactionStore implements TransactionStore {

  private static final String SESSIONS_KEY = "stock-dashboard:transactions:sessions";

  private final StringRedisTemplate redisTemplate;
  private final ObjectMapper objectMapper;
  private final RedisRetryExecutor retryExecutor;

  public RedisTransactionStore(
      StringRedisTemplate redisTemplate, ObjectMapper objectMapper, RedisRetryExecutor retryExecutor) {
    this.redisTemplate = redisTemplate;
    this.objectMapper = objectMapper;
    this.retryExecutor = retryExecutor;
  }

  @Override
  public List<TransactionRecord> findAll(LocalDate sessionDate) {
    Set<String> ids =
        retryExecutor.execute(
            "list_transactions", () -> redisTemplate.opsForSet().members(sessionTransactionsKey(sessionDate)));
    if (ids == null || ids.isEmpty()) {
      return List.of();
    }

    List<TransactionRecord> transactions = new ArrayList<>();
    for (String id : ids) {
      findById(sessionDate, id).ifPresent(transactions::add);
    }
    return transactions;
  }

  @Override
  public Optional<TransactionRecord> findById(LocalDate sessionDate, String transactionId) {
    return retryExecutor.execute(
        "find_transaction",
        () -> {
          String payload = redisTemplate.opsForValue().get(transactionKey(sessionDate, transactionId));
          if (payload == null) {
            return Optional.empty();
          }

          return Optional.of(deserialize(payload));
        });
  }

  @Override
  public void save(LocalDate sessionDate, TransactionRecord transaction) {
    retryExecutor.execute(
        "save_transaction",
        () -> {
          redisTemplate
              .opsForValue()
              .set(transactionKey(sessionDate, transaction.transactionId()), serialize(transaction));
          redisTemplate.opsForSet().add(sessionTransactionsKey(sessionDate), transaction.transactionId());
          redisTemplate.opsForSet().add(SESSIONS_KEY, sessionDate.toString());
          return null;
        });
  }

  @Override
  public void clearAllSessions() {
    retryExecutor.execute(
        "clear_all_transactions",
        () -> {
          Set<String> sessionDates = redisTemplate.opsForSet().members(SESSIONS_KEY);
          if (sessionDates != null) {
            for (String rawDate : sessionDates) {
              LocalDate sessionDate = LocalDate.parse(rawDate);
              Set<String> ids = redisTemplate.opsForSet().members(sessionTransactionsKey(sessionDate));
              if (ids != null) {
                for (String id : ids) {
                  redisTemplate.delete(transactionKey(sessionDate, id));
                }
              }
              redisTemplate.delete(sessionTransactionsKey(sessionDate));
            }
          }

          redisTemplate.delete(SESSIONS_KEY);
          return null;
        });
  }

  public RedisTransactionStore recreate() {
    return new RedisTransactionStore(redisTemplate, objectMapper, retryExecutor);
  }

  private String sessionTransactionsKey(LocalDate sessionDate) {
    return "stock-dashboard:transactions:session:%s:ids".formatted(sessionDate);
  }

  private String transactionKey(LocalDate sessionDate, String transactionId) {
    return "stock-dashboard:transactions:session:%s:tx:%s".formatted(sessionDate, transactionId);
  }

  private String serialize(TransactionRecord transaction) {
    try {
      return objectMapper.writeValueAsString(transaction);
    } catch (JsonProcessingException ex) {
      throw new IllegalStateException("Could not serialize transaction", ex);
    }
  }

  private TransactionRecord deserialize(String value) {
    try {
      return objectMapper.readValue(value, TransactionRecord.class);
    } catch (JsonProcessingException ex) {
      throw new IllegalStateException("Could not deserialize transaction", ex);
    }
  }
}
