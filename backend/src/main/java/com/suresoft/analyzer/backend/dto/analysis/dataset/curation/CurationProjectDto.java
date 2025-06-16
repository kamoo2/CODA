package com.suresoft.analyzer.backend.dto.analysis.dataset.curation;

import com.suresoft.analyzer.backend.entity.analysis.dataset.curation.CurationProjectEntity;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CurationProjectDto {
    private String id;
    private String name;
    private LocalDateTime createdAt;
    private LocalDateTime analysisDate;
    private String owner;
    private String description;


    // 엔티티를 받아 생성하는 생성자
    public CurationProjectDto(CurationProjectEntity project) {
        this.id = project.getId();
        this.name = project.getName();
        this.createdAt = project.getCreatedAt();
        this.analysisDate = project.getAnalysisDate();
        this.owner = project.getOwner();
        this.description = project.getDescription();
    }
}