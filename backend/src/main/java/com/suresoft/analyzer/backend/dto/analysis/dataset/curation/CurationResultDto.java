package com.suresoft.analyzer.backend.dto.analysis.dataset.curation;

import com.suresoft.analyzer.backend.entity.analysis.dataset.curation.CurationResultEntity;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CurationResultDto {
    private String id;
    private String projectCriteriaId;
    private String criteriaName;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private String uploadFileName;
    private String uploadFileExtension;


    // 엔티티를 받아 생성하는 생성자
    public CurationResultDto(CurationResultEntity entity) {
        setId(entity.getId());
        setProjectCriteriaId(entity.getProjectCriteria().getId());
        setCriteriaName(entity.getProjectCriteria().getCriteria().getName());
        setStartTime(entity.getStartTime());
        setEndTime(entity.getEndTime());
        setUploadFileName(entity.getProjectCriteria().getProjectFile().getUploadFile().getName().split("\\.")[0]);
        setUploadFileExtension(entity.getProjectCriteria().getProjectFile().getUploadFile().getName().split("\\.")[1]);
    }
}