package com.qawi.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class AppException extends RuntimeException {
    private final HttpStatus status;
    private final String messageAr;

    public AppException(String message, String messageAr, HttpStatus status) {
        super(message);
        this.messageAr = messageAr;
        this.status = status;
    }
}
