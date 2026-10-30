package com.houseprice.market.web;

import java.util.Map;

import org.springframework.http.HttpStatus;

/** Error carrying an HTTP status, a FastAPI-style `detail`, and optional per-field errors. */
public class ApiException extends RuntimeException {

  private final HttpStatus status;
  private final Map<String, String> errors;

  public ApiException(HttpStatus status, String detail) {
    this(status, detail, null);
  }

  public ApiException(HttpStatus status, String detail, Map<String, String> errors) {
    super(detail);
    this.status = status;
    this.errors = errors;
  }

  public HttpStatus status() {
    return status;
  }

  public Map<String, String> errors() {
    return errors;
  }
}
