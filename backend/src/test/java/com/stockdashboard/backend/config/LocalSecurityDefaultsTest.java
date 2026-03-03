package com.stockdashboard.backend.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(
    webEnvironment = SpringBootTest.WebEnvironment.NONE,
    properties = {"spring.task.scheduling.enabled=false", "market.mock-ingest.enabled=false"})
class LocalSecurityDefaultsTest {

  @Autowired private AppSecurityProperties securityProperties;

  @Test
  void localProfileAllowsBrowserOriginsUsedInLocalDevelopment() {
    assertThat(securityProperties.getAllowedOrigins())
        .contains("http://localhost:5173", "http://127.0.0.1:5173");
  }
}
