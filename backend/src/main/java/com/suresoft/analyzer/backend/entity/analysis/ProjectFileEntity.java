package com.suresoft.analyzer.backend.entity.analysis;

import com.suresoft.analyzer.backend.entity.analysis.dataset.curation.CurationProjectEntity;
import com.suresoft.analyzer.backend.entity.analysis.evaluation.EvaluationProjectEntity;
import com.suresoft.analyzer.backend.entity.storage.UploadFileEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "PROJECT_FILE")
public class ProjectFileEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID) // UUID 자동 생성
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name="upload_file_id", nullable = false)
    private UploadFileEntity uploadFile;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name="eval_project_id", nullable = true)
    private EvaluationProjectEntity evaluationProject;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name="curation_project_id", nullable = true)
    private CurationProjectEntity curationProject;
}