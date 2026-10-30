package com.houseprice.market.web;

import java.util.LinkedHashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

/** Maps service and binding errors to FastAPI-style {"detail": ...} JSON. */
@RestControllerAdvice
public class ApiExceptionHandler {

  private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

  @ExceptionHandler(ApiException.class)
  public ResponseEntity<Map<String, Object>> handleApi(ApiException exception) {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("detail", exception.getMessage());
    if (exception.errors() != null) {
      body.put("errors", exception.errors());
    }
    return ResponseEntity.status(exception.status()).body(body);
  }

  @ExceptionHandler(MethodArgumentTypeMismatchException.class)
  public ResponseEntity<Map<String, Object>> handleTypeMismatch(MethodArgumentTypeMismatchException exception) {
    return badRequest("Invalid value for query parameter '" + exception.getName() + "'.");
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<Map<String, Object>> handleNotValid(MethodArgumentNotValidException exception) {
    Map<String, String> errors = new LinkedHashMap<>();
    exception.getBindingResult().getFieldErrors().forEach(error -> errors.put(error.getField(),
        error.getCode() != null && error.getCode().contains("typeMismatch")
            ? "Invalid value for query parameter '" + error.getField() + "'."
            : error.getDefaultMessage()));
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("detail", "Validation failed.");
    body.put("errors", errors);
    return ResponseEntity.badRequest().body(body);
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<Map<String, Object>> handleUnexpected(Exception exception) {
    log.error("Unhandled error", exception);
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
        .body(Map.of("detail", "Unexpected server error."));
  }

  private static ResponseEntity<Map<String, Object>> badRequest(String detail) {
    return ResponseEntity.badRequest().body(Map.of("detail", detail));
  }
}
