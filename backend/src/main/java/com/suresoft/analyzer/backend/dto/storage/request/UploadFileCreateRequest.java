package com.suresoft.analyzer.backend.dto.storage.request;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UploadFileCreateRequest {
    private String name;
    private String path;
    private String bucketId;
    private String parserId;
    private String dbcFileId;
}
