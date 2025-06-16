package com.suresoft.analyzer.backend.dto.analysis.dataset.curation;
import com.suresoft.analyzer.backend.entity.analysis.CriteriaState;
import com.suresoft.analyzer.backend.entity.analysis.dataset.curation.CurationProjectCriteriaEntity;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
public class CurationProjectCriteriaDto {
    private String id;
    private LocalDateTime createdAt;
    private String projectId;
    private String criteriaId;
    private String criteriaName;
    private CriteriaState state;
    private String projectFileId;
    private String uploadFileName;
    private String uploadFileExtension;

    public CurationProjectCriteriaDto(CurationProjectCriteriaEntity entity){
        setId(entity.getId());
        setCreatedAt(entity.getCreatedAt());
        setProjectId(entity.getProject().getId());
        setCriteriaId(entity.getCriteria().getId());
        setCriteriaName(entity.getCriteria().getName());
        setState((entity.getState()));
        setProjectFileId((entity.getProjectFile().getUploadFile().getId()));
        setUploadFileName(entity.getProjectFile().getUploadFile().getName().split("\\.")[0]);
        setUploadFileExtension(entity.getProjectFile().getUploadFile().getName().split("\\.")[1]);
    }
}