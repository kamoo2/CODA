package com.suresoft.analyzer.backend.exception;

import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
@AllArgsConstructor
public enum ErrorCode {

    UNAUTHORIZED("E401-01", HttpStatus.UNAUTHORIZED, "유효하지 않은 토큰입니다."),
    ACCESS_TOKEN_EXPIRED("E401-02", HttpStatus.UNAUTHORIZED, "만료된 ACCESS TOKEN 입니다."),
    REFRESH_TOKEN_EXPIRED("E401-03", HttpStatus.UNAUTHORIZED, "만료된 REFRESH TOKEN 입니다."),
    LOGIN_FAILED("E401-04", HttpStatus.UNAUTHORIZED, "아이디 또는 비밀번호가 올바르지 않습니다."),
    // 인가 : 인증이 됐지만 권한이 없는 경우 -> Forbidden, EX) 관리자 전용 API에 일반 유저가 접근 시도
    FORBIDDEN("E401-05", HttpStatus.FORBIDDEN, "접근 권한이 없습니다."),
    // 📦 자원 관련 (공통)
    RESOURCE_NOT_FOUND("E404-01", HttpStatus.NOT_FOUND, "요청한 자원을 찾을 수 없습니다."),

    // ⚠️ 비즈니스 로직 오류
    DUPLICATE_RESOURCE("E409-01", HttpStatus.CONFLICT, "이미 존재하는 리소스입니다."),
    INVAILD_STORAGE("E409-02" , HttpStatus.BAD_REQUEST, "유효하지 않은 저장소입니다."),
    FILE_IN_USE("E409-03", HttpStatus.CONFLICT, "해당 파일은 다른 곳에서 사용 중이라 삭제할 수 없습니다."),

    BAD_REQUEST("E400-01", HttpStatus.BAD_REQUEST, "잘못된 요청입니다."),

    // 💥 서버 에러
    INTERNAL_SERVER_ERROR("E500-01", HttpStatus.INTERNAL_SERVER_ERROR, "서버 오류가 발생했습니다."),
    FILE_READ_ERROR("E500-02", HttpStatus.INTERNAL_SERVER_ERROR, "파일 읽기 중 오류가 발생했습니다.");




    private final String code;
    private final HttpStatus status;
    private final String message;
}

