package com.suresoft.analyzer.backend.entity.visualization;

import com.suresoft.analyzer.backend.dto.visualization.EVisualizationProcessStatus;
import com.suresoft.analyzer.backend.entity.auth.UserEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "VISUALIZATION_PROJECT")
public class VisualizationProjectEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    @Column(name="name", nullable = false)
    private String name;
    @Column(name="created_at", nullable = false)
    private LocalDateTime createdAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private UserEntity user;

    @Enumerated(EnumType.STRING) // 가독성 좋게 STRING 으로 저장
    @Column(name = "status", nullable = false)
    private EVisualizationProcessStatus status = EVisualizationProcessStatus.NOT_STARTED;

    @Column(name="blueprint_signature",length = 100, nullable = false)
    private String blueprintSignature;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    // ✅ 시각화 가능 여부
    public boolean isVisualizationAvailable() {
        return status == EVisualizationProcessStatus.PROCESSING || status == EVisualizationProcessStatus.COMPLETE;
    }
}