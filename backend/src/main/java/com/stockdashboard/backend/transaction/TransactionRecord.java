package com.stockdashboard.backend.transaction;

import java.math.BigDecimal;
import java.time.Instant;

public record TransactionRecord(
    String transactionId,
    String symbol,
    PositionType positionType,
    Instant openTimestamp,
    Instant closeTimestamp,
    BigDecimal entryPrice,
    BigDecimal exitPrice,
    BigDecimal profitLoss,
    TransactionStatus status) {

  public static TransactionRecord open(
      String transactionId,
      String symbol,
      PositionType positionType,
      Instant openTimestamp,
      BigDecimal entryPrice) {
    return new TransactionRecord(
        transactionId,
        symbol,
        positionType,
        openTimestamp,
        null,
        entryPrice,
        null,
        null,
        TransactionStatus.OPEN);
  }

  public TransactionRecord close(Instant closeTimestamp, BigDecimal exitPrice, BigDecimal profitLoss) {
    return new TransactionRecord(
        transactionId,
        symbol,
        positionType,
        openTimestamp,
        closeTimestamp,
        entryPrice,
        exitPrice,
        profitLoss,
        TransactionStatus.CLOSED);
  }
}
