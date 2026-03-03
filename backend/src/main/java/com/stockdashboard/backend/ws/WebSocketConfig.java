package com.stockdashboard.backend.ws;

import com.stockdashboard.backend.config.AppSecurityProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

  private final AppSecurityProperties securityProperties;

  public WebSocketConfig(AppSecurityProperties securityProperties) {
    this.securityProperties = securityProperties;
  }

  @Override
  public void configureMessageBroker(MessageBrokerRegistry registry) {
    registry.enableSimpleBroker("/topic");
    registry.setApplicationDestinationPrefixes("/app");
  }

  @Override
  public void registerStompEndpoints(StompEndpointRegistry registry) {
    var endpointRegistration = registry.addEndpoint("/ws/dashboard");
    if (securityProperties.hasAllowedOrigins()) {
      endpointRegistration.setAllowedOrigins(securityProperties.getAllowedOrigins().toArray(String[]::new));
    }
  }
}
