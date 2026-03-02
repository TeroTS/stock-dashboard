package com.stockdashboard.backend.snapshot;

import static org.assertj.core.api.Assertions.assertThat;

import com.stockdashboard.backend.domain.SymbolSessionState;
import com.stockdashboard.backend.domain.RangeDefinition;
import com.stockdashboard.backend.ranking.RankingResult;
import com.stockdashboard.backend.session.SessionState;
import com.stockdashboard.backend.transaction.PositionType;
import com.stockdashboard.backend.transaction.TransactionRecord;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class SnapshotAssemblerTransactionsTest {

  @Test
  void mapsOpenAndClosedTransactionsWithCorrectCloseActionLabel() {
    SnapshotAssembler assembler = new SnapshotAssembler();

    SymbolSessionState aapl = SymbolSessionState.empty("AAPL", LocalDate.of(2026, 3, 2));
    aapl.setOpenPrice(new BigDecimal("25.00"));
    aapl.setLatestPrice(new BigDecimal("25.00"));
    aapl.getSeries(RangeDefinition.FIVE_MIN)
        .applyTick(Instant.parse("2026-03-02T14:31:00Z"), new BigDecimal("25.00"), 100);

    TransactionRecord open =
        TransactionRecord.open(
            "tx-open",
            "AAPL",
            PositionType.LONG,
            Instant.parse("2026-03-02T14:31:00Z"),
            new BigDecimal("25.00"));
    TransactionRecord closed =
        TransactionRecord
            .open(
                "tx-closed",
                "TSLA",
                PositionType.SHORT,
                Instant.parse("2026-03-02T14:30:00Z"),
                new BigDecimal("30.00"))
            .close(
                Instant.parse("2026-03-02T14:34:00Z"),
                new BigDecimal("28.00"),
                new BigDecimal("200.00"));

    DashboardSnapshot snapshot =
        assembler.assemble(
            Instant.parse("2026-03-02T14:35:00Z"),
            SessionState.OPEN,
            new RankingResult(List.of(), List.of()),
            Map.of("AAPL", aapl),
            List.of(open, closed));

    assertThat(snapshot.transactions()).hasSize(2);
    TransactionCardSnapshot openCard = snapshot.transactions().get(0);
    TransactionCardSnapshot closedCard = snapshot.transactions().get(1);

    assertThat(openCard.transactionId()).isEqualTo("tx-open");
    assertThat(openCard.status()).isEqualTo("OPEN");
    assertThat(openCard.closeActionLabel()).isEqualTo("Sell");
    assertThat(openCard.timeRanges()).containsExactly("5min", "30min", "120min");
    assertThat(openCard.candlesByRange().get("5min")).isNotEmpty();

    assertThat(closedCard.transactionId()).isEqualTo("tx-closed");
    assertThat(closedCard.status()).isEqualTo("CLOSED");
    assertThat(closedCard.closeActionLabel()).isNull();
    assertThat(closedCard.timeRanges()).containsExactly("5min", "30min", "120min");
  }
}
