package com.suresoft.analyzer.backend.dto.analysis.evaluation;

import com.suresoft.analyzer.backend.entity.analysis.evaluation.EvaluationProjectEntity;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class EvaluationProjectDto {
    private String id;
    private String name;
    private LocalDateTime createdAt;
    private LocalDateTime analysisDate;
    private String owner;
    private String description;
    private boolean passEvalEnabled;
    private boolean scoreEvalEnabled;
    private boolean taggingEnabled;


    // 엔티티를 받아 생성하는 생성자
    public EvaluationProjectDto(EvaluationProjectEntity project) {
        this.id = project.getId();
        this.name = project.getName();
        this.createdAt = project.getCreatedAt();
        this.analysisDate = project.getAnalysisDate();
        this.owner = project.getOwner();
        this.description = project.getDescription();
        this.passEvalEnabled = project.isPassEvalEnabled();
        this.scoreEvalEnabled = project.isScoreEvalEnabled();
        this.taggingEnabled = project.isTaggingEnabled();
    }
}