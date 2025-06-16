package com.suresoft.analyzer.backend.entity.analysis.dataset.curation;

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
@Table(name = "CURATION_PROJECT_CRITERIA")
public class CurationProjectCriteriaEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID) // UUID 자동 생성
    private String id;

    @Column(name="created_at", nullable = false)
    private LocalDateTime createdAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name="project_id", nullable = false)
    private CurationProjectEntity project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name="criteria_id", nullable = false)
    private CriteriaEntity criteria;

    @Column(name="state", nullable = false)
    @Convert(converter = CriteriaStateConverter.class)
    private CriteriaState state;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name="prj_file_id", nullable = false)
    private ProjectFileEntity projectFile;
}