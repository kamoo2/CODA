package com.suresoft.analyzer.backend.dto.storage;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@AllArgsConstructor
@NoArgsConstructor
public class UploadFileUsageDto {
    private String uploadFileId;
    private String fileName;
    private boolean used;
    private List<String> usedIn;
}

