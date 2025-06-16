package com.suresoft.analyzer.backend.entity.visualization;

import com.suresoft.analyzer.backend.dto.visualization.ERrdFileStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "RRD_FILE")
public class RRDFileEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name="name", nullable = false)
    private String name;

    @Column(name="rrd_url", nullable = false, unique = true)
    private String rrdUrl;

    @Column(name="created_at", nullable = false)
    private LocalDateTime createdAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "visualization_project_id", nullable = false)
    private VisualizationProjectEntity visualizationProject;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}