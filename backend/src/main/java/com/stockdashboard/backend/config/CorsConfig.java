package com.stockdashboard.backend.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@EnableConfigurationProperties(AppSecurityProperties.class)
public class CorsConfig implements WebMvcConfigurer {

  private final AppSecurityProperties securityProperties;

  public CorsConfig(AppSecurityProperties securityProperties) {
    this.securityProperties = securityProperties;
  }

  @Override
  public void addCorsMappings(CorsRegistry registry) {
    if (!securityProperties.hasAllowedOrigins()) {
      return;
    }

    registry
        .addMapping("/api/**")
        .allowedOrigins(securityProperties.getAllowedOrigins().toArray(String[]::new))
        .allowedMethods("GET", "POST", "OPTIONS")
        .maxAge(1800);
  }
}
