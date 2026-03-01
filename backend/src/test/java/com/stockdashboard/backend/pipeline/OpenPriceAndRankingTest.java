package com.stockdashboard.backend.pipeline;

import static org.assertj.core.api.Assertions.assertThat;

import com.stockdashboard.backend.domain.NormalizedTick;
import com.stockdashboard.backend.ranking.RankingResult;
import com.stockdashboard.backend.ranking.RankingService;
import com.stockdashboard.backend.session.MarketSessionService;
import com.stockdashboard.backend.state.InMemorySessionStateStore;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.Set;
import org.junit.jupiter.api.Test;

class OpenPriceAndRankingTest {

  @Test
  void capturesOpenPriceOnceAndRanksByPercentChange() {
    InMemorySessionStateStore store = new InMemorySessionStateStore();
    MarketSessionService sessionService =
        new MarketSessionService(ZoneId.of("America/New_York"), LocalTime.of(9, 30), LocalTime.of(16, 0));
    TickIngestService ingestService = new TickIngestService(Set.of("AAPL", "MSFT", "NVDA"), store, sessionService);

    ingestService.process(new NormalizedTick(Instant.parse("2026-02-02T14:30:01Z"), "AAPL", new BigDecimal("100.00"), 100));
    ingestService.process(new NormalizedTick(Instant.parse("2026-02-02T14:30:10Z"), "AAPL", new BigDecimal("110.00"), 120));
    ingestService.process(new NormalizedTick(Instant.parse("2026-02-02T14:30:12Z"), "MSFT", new BigDecimal("200.00"), 140));
    ingestService.process(new NormalizedTick(Instant.parse("2026-02-02T14:30:20Z"), "MSFT", new BigDecimal("180.00"), 160));

    var aaplState = store.findBySymbol("AAPL").orElseThrow();
    assertThat(aaplState.getOpenPrice()).isEqualByComparingTo("100.00");
    assertThat(aaplState.getLatestPrice()).isEqualByComparingTo("110.00");

    RankingService rankingService = new RankingService();
    RankingResult result = rankingService.rank(store.findAll());

    assertThat(result.gainers()).hasSize(2);
    assertThat(result.losers()).hasSize(2);
    assertThat(result.gainers().getFirst().symbol()).isEqualTo("AAPL");
    assertThat(result.gainers().getFirst().percentChange()).isEqualByComparingTo("10.0000");
    assertThat(result.losers().getFirst().symbol()).isEqualTo("MSFT");
    assertThat(result.losers().getFirst().percentChange()).isEqualByComparingTo("-10.0000");

    assertThat(result.gainers().stream().map(entry -> entry.symbol())).doesNotContain("NVDA");
  }
}
