package com.suresoft.analyzer.backend.utils;

import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

public class TimeUtil {

    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm:ss");

    /**
     * 마이크로초 단위 timestamp를 HH:mm:ss 형식으로 포맷
     */
    public static String formatMicrosToTime(Long timestampMicro) {
        long millis = timestampMicro / 1000;

        Instant instant = Instant.ofEpochMilli(millis);
        LocalTime time = instant.atZone(ZoneId.of("Asia/Seoul")).toLocalTime(); // ✅ 원하는 시간대로 명확히

        return time.format(TIME_FORMATTER);
    }

    /**
     * 밀리초 timestamp → HH:mm:ss.SSS 포맷
     */
    public static String formatMillisToTimeWithMillis(long millis) {
        Instant instant = Instant.ofEpochMilli(millis);
        LocalTime time = instant.atZone(ZoneId.of("Asia/Seoul")).toLocalTime();
        return time.format(DateTimeFormatter.ofPattern("HH:mm:ss.SSS"));
    }

    // 기타 필요한 시간 관련 메서드들 추가 가능
}
