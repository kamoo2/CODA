package com.suresoft.analyzer.backend.entity.visualization;

import com.suresoft.analyzer.backend.entity.storage.UploadFileEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "BLUEPRINT_SETTING")
public class BlueprintSettingEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private String viewName;
    private String entityName;
    private LocalDateTime createdAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "upload_file_id", nullable = false)
    private UploadFileEntity uploadFile;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name="visualization_project_id", nullable = false)
    private VisualizationProjectEntity visualizationProject;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
