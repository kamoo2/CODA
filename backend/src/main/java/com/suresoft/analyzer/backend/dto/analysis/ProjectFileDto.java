package com.suresoft.analyzer.backend.dto.analysis;

import com.suresoft.analyzer.backend.entity.analysis.ProjectFileEntity;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class ProjectFileDto {
    private String id;
    private String projectId;
    private String uploadFileId;
    private String uploadFileName;
    private String uploadFilePath;

    public ProjectFileDto(ProjectFileEntity entity){
        setId(entity.getId());
        if(entity.getEvaluationProject() != null){
            setProjectId(entity.getEvaluationProject().getId());
        } else if(entity.getCurationProject() != null){
            setProjectId(entity.getCurationProject().getId());
        }
        setUploadFileName(entity.getUploadFile().getName());
        setUploadFilePath(entity.getUploadFile().getS3Url());
        setUploadFileId(entity.getUploadFile().getId());
    }
}
