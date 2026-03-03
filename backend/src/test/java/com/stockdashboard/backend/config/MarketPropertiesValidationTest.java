package com.stockdashboard.backend.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Configuration;

class MarketPropertiesValidationTest {

  private final ApplicationContextRunner contextRunner =
      new ApplicationContextRunner().withUserConfiguration(MarketPropertiesConfig.class);

  @Test
  void failsFastWhenSnapshotCadenceIsNotPositive() {
    contextRunner
        .withPropertyValues("market.snapshot-cadence-ms=0")
        .run(
            context -> {
              assertThat(context.getStartupFailure()).isNotNull();
              assertThat(context.getStartupFailure())
                  .hasRootCauseMessage("market.snapshot-cadence-ms must be greater than zero");
            });
  }

  @Test
  void failsFastWhenSessionOpenIsNotBeforeClose() {
    contextRunner
        .withPropertyValues("market.session.open=16:00", "market.session.close=09:30")
        .run(
            context -> {
              assertThat(context.getStartupFailure()).isNotNull();
              assertThat(context.getStartupFailure())
                  .hasRootCauseMessage("market.session.open must be before market.session.close");
            });
  }

  @Test
  void startsWithValidProperties() {
    contextRunner
        .withPropertyValues(
            "market.watchlist=AAPL,MSFT",
            "market.snapshot-cadence-ms=1000",
            "market.ingest-health-threshold-ms=5000",
            "market.redis.max-retries=3",
            "market.session.open=09:30",
            "market.session.close=16:00")
        .run(context -> assertThat(context.getStartupFailure()).isNull());
  }

  @Configuration(proxyBeanMethods = false)
  @EnableConfigurationProperties(MarketProperties.class)
  static class MarketPropertiesConfig {}
}
