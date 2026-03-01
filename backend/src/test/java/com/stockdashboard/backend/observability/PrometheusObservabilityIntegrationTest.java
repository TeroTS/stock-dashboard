package com.stockdashboard.backend.observability;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

@SpringBootTest(
    webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
    properties = {
      "market.watchlist=AAPL,MSFT,NVDA",
      "market.mock-ingest.enabled=false",
      "market.session.open=00:00",
      "market.session.close=23:59",
      "management.endpoints.web.exposure.include=health,metrics,info,prometheus",
      "management.prometheus.metrics.export.enabled=true",
      "management.simple.metrics.export.enabled=false",
      "spring.task.scheduling.enabled=false"
    })
class PrometheusObservabilityIntegrationTest {

  @Autowired private TestRestTemplate restTemplate;

  @Test
  void exposesPrometheusMetricsWithPipelineSeries() {
    ResponseEntity<String> response = restTemplate.getForEntity("/actuator/prometheus", String.class);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(response.getBody())
        .contains("pipeline_ticks_total")
        .contains("pipeline_tick_process_duration_seconds")
        .contains("pipeline_snapshots_total")
        .contains("pipeline_snapshot_build_duration_seconds")
        .contains("pipeline_snapshot_publish_duration_seconds")
        .contains("pipeline_ingest_last_seen_age_seconds")
        .contains("pipeline_snapshot_last_published_age_seconds")
        .contains("pipeline_watchlist_size")
        .contains("pipeline_redis_degraded")
        .contains("pipeline_redis_ops_total");
  }
}
