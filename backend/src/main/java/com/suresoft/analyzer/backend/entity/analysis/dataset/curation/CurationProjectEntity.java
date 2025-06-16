package com.suresoft.analyzer.backend.entity.analysis.dataset.curation;

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
@Table(name = "CURATION_PROJECT")
public class CurationProjectEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID) // UUID 자동 생성
    private String id;

    @Column(name="name", nullable = false)
    private String name;

    @Column(name="created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name="analysis_date", nullable = false)
    private LocalDateTime analysisDate;

    @Column(name="owner", nullable = false)
    private String owner;

    @Column(name="description", nullable = true)
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name="user_id", nullable = false)
    private UserEntity user;
}