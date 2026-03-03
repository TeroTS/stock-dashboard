package com.stockdashboard.backend.ws;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import org.awaitility.Awaitility;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.messaging.converter.MappingJackson2MessageConverter;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompFrameHandler;
import org.springframework.messaging.simp.stomp.StompHeaders;
import org.springframework.messaging.simp.stomp.StompSession;
import org.springframework.messaging.simp.stomp.StompSessionHandlerAdapter;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.web.socket.WebSocketHttpHeaders;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest(
    webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
    properties = {
      "market.watchlist=AAPL,MSFT,NVDA,AMZN",
      "market.mock-ingest.enabled=true",
      "market.mock-ingest.tick-interval-ms=120",
      "market.snapshot-cadence-ms=1000",
      "app.security.allowed-origins=http://allowed-client.example",
      "market.session.timezone=America/New_York",
      "market.session.open=00:00",
      "market.session.close=23:59"
    })
@Testcontainers
class WebSocketSnapshotContractIntegrationTest {

  @Container
  static final GenericContainer<?> REDIS = new GenericContainer<>("redis:7.2-alpine").withExposedPorts(6379);

  @DynamicPropertySource
  static void registerProperties(DynamicPropertyRegistry registry) {
    registry.add("spring.data.redis.host", REDIS::getHost);
    registry.add("spring.data.redis.port", () -> REDIS.getMappedPort(6379));
  }

  @LocalServerPort private int port;

  @Value("${market.snapshot-cadence-ms}")
  private long cadenceMillis;

  @Test
  void publishesSnapshotEverySecondWithRequiredCardFields() throws Exception {
    BlockingQueue<Map<String, Object>> received = new LinkedBlockingQueue<>();

    WebSocketStompClient stompClient = new WebSocketStompClient(new StandardWebSocketClient());
    stompClient.setMessageConverter(new MappingJackson2MessageConverter());

    StompSession session =
        connectWithOrigin(stompClient, "http://allowed-client.example");

    session.subscribe(
        "/topic/dashboard-snapshots",
        new StompFrameHandler() {
          @Override
          public java.lang.reflect.Type getPayloadType(StompHeaders headers) {
            return Map.class;
          }

          @Override
          public void handleFrame(StompHeaders headers, Object payload) {
            received.offer((Map<String, Object>) payload);
          }
        });

    Awaitility.await()
        .atMost(Duration.ofSeconds(8))
        .untilAsserted(
            () -> {
              Map<String, Object> first = received.peek();
              assertThat(first).isNotNull();
            });

    Map<String, Object> first = received.poll(8, TimeUnit.SECONDS);
    Map<String, Object> second = received.poll(8, TimeUnit.SECONDS);

    assertThat(first).isNotNull();
    assertThat(second).isNotNull();
    assertThat(first).containsKeys("generatedAt", "sessionState", "topGainers", "topLosers", "transactions");

    List<Map<String, Object>> gainers = (List<Map<String, Object>>) first.get("topGainers");
    List<Map<String, Object>> losers = (List<Map<String, Object>>) first.get("topLosers");
    List<Map<String, Object>> cards = gainers.isEmpty() ? losers : gainers;

    assertThat(cards).isNotEmpty();
    Map<String, Object> card = cards.getFirst();
    assertThat(card)
        .containsKeys(
            "symbol",
            "timeRanges",
            "activeRange",
            "yAxisLabels",
            "xAxisLabels",
            "buyLabel",
            "shortLabel",
            "candlesByRange");

    List<String> yAxisLabels = (List<String>) card.get("yAxisLabels");
    assertThat(yAxisLabels).allMatch(label -> label.matches("^-?\\d+\\.\\d{2}$"));

    Instant firstGeneratedAt = Instant.parse((String) first.get("generatedAt"));
    Instant secondGeneratedAt = Instant.parse((String) second.get("generatedAt"));
    long diffMillis = Duration.between(firstGeneratedAt, secondGeneratedAt).toMillis();

    assertThat(diffMillis).isGreaterThanOrEqualTo(cadenceMillis - 250);
    assertThat(diffMillis).isLessThanOrEqualTo(cadenceMillis + 750);

    session.disconnect();
  }

  @Test
  void rejectsWebSocketHandshakeForNonAllowlistedOrigin() {
    WebSocketStompClient stompClient = new WebSocketStompClient(new StandardWebSocketClient());
    stompClient.setMessageConverter(new MappingJackson2MessageConverter());

    assertThatThrownBy(() -> connectWithOrigin(stompClient, "http://evil-client.example"))
        .isInstanceOf(ExecutionException.class);
  }

  private StompSession connectWithOrigin(WebSocketStompClient stompClient, String origin)
      throws Exception {
    WebSocketHttpHeaders webSocketHeaders = new WebSocketHttpHeaders();
    webSocketHeaders.setOrigin(origin);
    return stompClient
        .connectAsync(
            "ws://localhost:" + port + "/ws/dashboard",
            webSocketHeaders,
            new StompHeaders(),
            new StompSessionHandlerAdapter() {})
        .get(5, TimeUnit.SECONDS);
  }
}
