package com.stockdashboard.backend.config;

import java.util.ArrayList;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.security")
public class AppSecurityProperties {

  private List<String> allowedOrigins = new ArrayList<>();

  public List<String> getAllowedOrigins() {
    return allowedOrigins;
  }

  public void setAllowedOrigins(List<String> allowedOrigins) {
    if (allowedOrigins == null) {
      this.allowedOrigins = new ArrayList<>();
      return;
    }

    this.allowedOrigins =
        allowedOrigins.stream().filter(origin -> origin != null && !origin.isBlank()).toList();
  }

  public boolean hasAllowedOrigins() {
    return allowedOrigins != null && !allowedOrigins.isEmpty();
  }
}
