package com.houseprice.market.ml;

/**
 * Raised by the RestClient status handler when the ML container answers an
 * unexpected status (anything but the predict endpoint's 200/207/400).
 */
public class MlUpstreamException extends RuntimeException {

  public MlUpstreamException(String message) {
    super(message);
  }
}
