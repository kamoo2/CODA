package com.suresoft.analyzer.backend.dto.storage;

import lombok.*;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class UploadFileDto {
    private String id;
    private String name;
    private String s3Url;
    private String parserName;
    private String dbcFileName;
    private String parserId;
    private Long timestamp;
    private String dbcFileId;
}