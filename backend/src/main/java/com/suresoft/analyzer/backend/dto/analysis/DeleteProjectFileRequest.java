package com.suresoft.analyzer.backend.dto.analysis;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class DeleteProjectFileRequest {
    private String projectId;
    private String fileId;
}
