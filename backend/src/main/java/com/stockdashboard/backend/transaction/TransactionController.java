package com.stockdashboard.backend.transaction;

import com.stockdashboard.backend.session.MarketSessionService;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.NoSuchElementException;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/transactions")
@CrossOrigin(origins = "*")
public class TransactionController {

  private final TransactionService transactionService;
  private final MarketSessionService marketSessionService;
  private final Clock clock;

  public TransactionController(
      TransactionService transactionService, MarketSessionService marketSessionService, Clock clock) {
    this.transactionService = transactionService;
    this.marketSessionService = marketSessionService;
    this.clock = clock;
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public TransactionRecord open(@RequestBody OpenTransactionRequest request) {
    if (request.symbol() == null || request.symbol().isBlank() || request.positionType() == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "symbol and positionType are required");
    }

    try {
      return transactionService.openPosition(request.symbol(), request.positionType(), now());
    } catch (IllegalArgumentException ex) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage(), ex);
    } catch (IllegalStateException ex) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, ex.getMessage(), ex);
    }
  }

  @PostMapping("/{transactionId}/close")
  public TransactionRecord close(@PathVariable String transactionId) {
    try {
      return transactionService.closePosition(transactionId, now());
    } catch (NoSuchElementException ex) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, ex.getMessage(), ex);
    } catch (IllegalArgumentException ex) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage(), ex);
    } catch (IllegalStateException ex) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, ex.getMessage(), ex);
    }
  }

  @GetMapping
  public List<TransactionRecord> list() {
    LocalDate sessionDate = marketSessionService.getSessionDate(now());
    return transactionService.findAll(sessionDate);
  }

  private Instant now() {
    return clock.instant();
  }

  public record OpenTransactionRequest(String symbol, PositionType positionType) {}
}
