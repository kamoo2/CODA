package com.suresoft.analyzer.backend.dto.common;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ApiResponse<T> {
    private boolean success;
    private String message;
    private T result;
    private String errorCode; // ✅ 오류가 발생했을 때만 포함 (null 가능)

    // ✅ 성공 응답 생성 메서드
    public static <T> ApiResponse<T> success(String message, T result) {
        return new ApiResponse<>(true, message, result, null);
    }

    // ✅ 실패 응답 생성 메서드
    public static <T> ApiResponse<T> failure(String message, String errorCode) {
        return new ApiResponse<>(false, message, null, errorCode);
    }


    public static <T> ApiResponse<T> partialSuccess(String message, T result) {
        return new ApiResponse<>(false, message, result, null);
    }

}
