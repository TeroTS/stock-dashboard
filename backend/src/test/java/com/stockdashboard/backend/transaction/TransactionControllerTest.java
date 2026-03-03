package com.stockdashboard.backend.transaction;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.stockdashboard.backend.session.MarketSessionService;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.NoSuchElementException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(TransactionController.class)
@TestPropertySource(properties = "app.security.allowed-origins=http://allowed-client.example")
class TransactionControllerTest {

  private static final Instant NOW = Instant.parse("2026-03-03T14:30:00Z");

  @Autowired private MockMvc mockMvc;

  @MockBean private TransactionService transactionService;
  @MockBean private MarketSessionService marketSessionService;
  @MockBean private Clock clock;

  @BeforeEach
  void setUp() {
    when(clock.instant()).thenReturn(NOW);
  }

  @Test
  void opensTransactionAndReturnsCreated() throws Exception {
    TransactionRecord opened =
        TransactionRecord.open(
            "tx-open", "AAPL", PositionType.LONG, NOW, new BigDecimal("125.50"));
    when(transactionService.openPosition("AAPL", PositionType.LONG, NOW)).thenReturn(opened);

    mockMvc
        .perform(
            post("/api/transactions")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"symbol":"AAPL","positionType":"LONG"}
                    """))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.transactionId").value("tx-open"))
        .andExpect(jsonPath("$.symbol").value("AAPL"))
        .andExpect(jsonPath("$.positionType").value("LONG"))
        .andExpect(jsonPath("$.status").value("OPEN"));
  }

  @Test
  void rejectsOpenWhenSymbolIsBlank() throws Exception {
    mockMvc
        .perform(
            post("/api/transactions")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"symbol":" ","positionType":"LONG"}
                    """))
        .andExpect(status().isBadRequest());
  }

  @Test
  void rejectsOpenWhenPositionTypeIsMissing() throws Exception {
    mockMvc
        .perform(
            post("/api/transactions")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"symbol":"AAPL","positionType":null}
                    """))
        .andExpect(status().isBadRequest());
  }

  @Test
  void mapsIllegalArgumentOnOpenToBadRequest() throws Exception {
    when(transactionService.openPosition("AAPL", PositionType.LONG, NOW))
        .thenThrow(new IllegalArgumentException("No live state found"));

    mockMvc
        .perform(
            post("/api/transactions")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"symbol":"AAPL","positionType":"LONG"}
                    """))
        .andExpect(status().isBadRequest());
  }

  @Test
  void mapsIllegalStateOnOpenToConflict() throws Exception {
    when(transactionService.openPosition("AAPL", PositionType.LONG, NOW))
        .thenThrow(new IllegalStateException("Already open"));

    mockMvc
        .perform(
            post("/api/transactions")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"symbol":"AAPL","positionType":"LONG"}
                    """))
        .andExpect(status().isConflict());
  }

  @Test
  void closesTransaction() throws Exception {
    TransactionRecord closed =
        TransactionRecord.open(
                "tx-close", "AAPL", PositionType.LONG, NOW.minusSeconds(30), new BigDecimal("100.00"))
            .close(NOW, new BigDecimal("101.50"), new BigDecimal("150.00"));
    when(transactionService.closePosition("tx-close", NOW)).thenReturn(closed);

    mockMvc
        .perform(post("/api/transactions/tx-close/close"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.transactionId").value("tx-close"))
        .andExpect(jsonPath("$.status").value("CLOSED"));
  }

  @Test
  void mapsNotFoundOnClose() throws Exception {
    when(transactionService.closePosition("tx-missing", NOW))
        .thenThrow(new NoSuchElementException("Transaction not found"));

    mockMvc.perform(post("/api/transactions/tx-missing/close")).andExpect(status().isNotFound());
  }

  @Test
  void mapsIllegalArgumentOnCloseToBadRequest() throws Exception {
    when(transactionService.closePosition("tx-1", NOW))
        .thenThrow(new IllegalArgumentException("No latest price"));

    mockMvc.perform(post("/api/transactions/tx-1/close")).andExpect(status().isBadRequest());
  }

  @Test
  void mapsIllegalStateOnCloseToConflict() throws Exception {
    when(transactionService.closePosition("tx-1", NOW))
        .thenThrow(new IllegalStateException("Already closed"));

    mockMvc.perform(post("/api/transactions/tx-1/close")).andExpect(status().isConflict());
  }

  @Test
  void listsTransactionsForCurrentSessionDate() throws Exception {
    LocalDate sessionDate = LocalDate.of(2026, 3, 3);
    TransactionRecord opened =
        TransactionRecord.open(
            "tx-list", "MSFT", PositionType.SHORT, NOW.minusSeconds(10), new BigDecimal("220.10"));

    when(marketSessionService.getSessionDate(NOW)).thenReturn(sessionDate);
    when(transactionService.findAll(sessionDate)).thenReturn(List.of(opened));

    mockMvc
        .perform(get("/api/transactions"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].transactionId").value("tx-list"))
        .andExpect(jsonPath("$[0].symbol").value("MSFT"));

    verify(marketSessionService).getSessionDate(eq(NOW));
    verify(transactionService).findAll(any(LocalDate.class));
  }

  @Test
  void allowsPreflightForConfiguredOrigin() throws Exception {
    mockMvc
        .perform(
            options("/api/transactions")
                .header("Origin", "http://allowed-client.example")
                .header("Access-Control-Request-Method", "POST"))
        .andExpect(status().isOk())
        .andExpect(header().string("Access-Control-Allow-Origin", "http://allowed-client.example"));
  }

  @Test
  void rejectsPreflightForNonAllowlistedOrigin() throws Exception {
    mockMvc
        .perform(
            options("/api/transactions")
                .header("Origin", "http://evil-client.example")
                .header("Access-Control-Request-Method", "POST"))
        .andExpect(status().isForbidden());
  }
}
