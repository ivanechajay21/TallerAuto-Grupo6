package com.sigtm.backend.exception;

/** Se lanza cuando se supera un límite de intentos sensible. */
public class TooManyRequestsException extends RuntimeException {
    public TooManyRequestsException(String message) {
        super(message);
    }
}
