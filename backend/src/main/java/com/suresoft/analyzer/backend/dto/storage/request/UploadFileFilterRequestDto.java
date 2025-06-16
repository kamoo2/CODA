package com.suresoft.analyzer.backend.dto.storage.request;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class UploadFileFilterRequestDto {
    private String keyword;
    private List<String> extensionIds;
    private List<String> parserIds;
}


