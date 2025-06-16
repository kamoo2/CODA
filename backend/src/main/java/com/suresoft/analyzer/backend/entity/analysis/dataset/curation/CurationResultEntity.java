package com.suresoft.analyzer.backend.entity.analysis.dataset.curation;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "CURATION_RESULT")
public class CurationResultEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID) // UUID 자동 생성
    private String id;

    @Column(name="start_time", nullable = false)
    private LocalDateTime startTime;

    @Column(name="end_time", nullable = false)
    private LocalDateTime endTime;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name="prj_crt_id", nullable = false)
    private CurationProjectCriteriaEntity projectCriteria;
}