package com.suresoft.analyzer.backend.entity.analysis.evaluation;

import com.suresoft.analyzer.backend.entity.analysis.*;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "EVAL_PROJECT_CRITERIA")
public class EvaluationProjectCriteriaEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID) // UUID 자동 생성
    private String id;

    @Column(name="created_at", nullable = false)
    private LocalDateTime createdAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name="project_id", nullable = false)
    private EvaluationProjectEntity project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name="criteria_id", nullable = false)
    private CriteriaEntity criteria;

    @Column(name="type", nullable = false)
    @Convert(converter = CriteriaTypeConverter.class)
    private CriteriaType type;

    @Column(name="state", nullable = false)
    @Convert(converter = CriteriaStateConverter.class)
    private CriteriaState state;

    @Column(name="tag_color", nullable = false)
    private String tagColor;
}