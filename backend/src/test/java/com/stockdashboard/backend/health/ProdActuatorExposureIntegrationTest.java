package com.stockdashboard.backend.health;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.ResponseEntity;

@SpringBootTest(
    webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
    properties = {
      "spring.profiles.active=prod",
      "market.watchlist=AAPL,MSFT,NVDA",
      "market.mock-ingest.enabled=false",
      "spring.task.scheduling.enabled=false"
    })
class ProdActuatorExposureIntegrationTest {

  @Autowired private TestRestTemplate restTemplate;

  @LocalServerPort private int port;

  @Test
  void exposesHealthWithoutComponentDetails() {
    ResponseEntity<String> response =
        restTemplate.getForEntity("http://localhost:" + port + "/actuator/health", String.class);

    assertThat(response.getBody()).contains("\"status\"");
    assertThat(response.getBody()).doesNotContain("components");
  }

  @Test
  void doesNotExposePrometheusOnApplicationPortInProd() {
    ResponseEntity<String> response =
        restTemplate.getForEntity("http://localhost:" + port + "/actuator/prometheus", String.class);

    assertThat(response.getStatusCode().is4xxClientError()).isTrue();
  }
}
