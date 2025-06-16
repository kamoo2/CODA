package com.suresoft.analyzer.backend.dto.storage;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class DbcFileDto {
    private String id;
    private String name;
    LocalDateTime  createdAt;
}