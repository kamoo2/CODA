package com.suresoft.analyzer.backend.exception;

import lombok.Getter;

@Getter
public class ApiException extends RuntimeException{
    private final ErrorCode errorCode;
    private final String customMessage;

    public ApiException(ErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
        this.customMessage = errorCode.getMessage();
    }

    public ApiException(ErrorCode errorCode, String customMessage) {
        super(customMessage);
        this.errorCode = errorCode;
        this.customMessage = customMessage;
    }
}
