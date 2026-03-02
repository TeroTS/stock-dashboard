package com.stockdashboard.backend.transaction;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest
@Testcontainers
class RedisTransactionStoreIntegrationTest {

  @Container
  static final GenericContainer<?> REDIS = new GenericContainer<>("redis:7.2-alpine").withExposedPorts(6379);

  @DynamicPropertySource
  static void registerProperties(DynamicPropertyRegistry registry) {
    registry.add("spring.data.redis.host", REDIS::getHost);
    registry.add("spring.data.redis.port", () -> REDIS.getMappedPort(6379));
  }

  @Autowired private RedisTransactionStore transactionStore;

  @Test
  void persistsAndRestoresTransactionsAcrossStoreRecreation() {
    LocalDate sessionDate = LocalDate.of(2026, 3, 2);

    TransactionRecord opened =
        TransactionRecord.open(
            "tx-1",
            "AAPL",
            PositionType.LONG,
            Instant.parse("2026-03-02T14:31:00Z"),
            new BigDecimal("25.00"));
    transactionStore.save(sessionDate, opened);

    TransactionRecord closed =
        opened.close(
            Instant.parse("2026-03-02T14:35:00Z"),
            new BigDecimal("28.00"),
            new BigDecimal("300.00"));
    transactionStore.save(sessionDate, closed);

    RedisTransactionStore recreated = transactionStore.recreate();
    TransactionRecord restored = recreated.findById(sessionDate, "tx-1").orElseThrow();

    assertThat(restored.status()).isEqualTo(TransactionStatus.CLOSED);
    assertThat(restored.entryPrice()).isEqualByComparingTo("25.00");
    assertThat(restored.exitPrice()).isEqualByComparingTo("28.00");
    assertThat(restored.profitLoss()).isEqualByComparingTo("300.00");
  }
}
