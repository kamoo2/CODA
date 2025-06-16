package com.suresoft.analyzer.backend.entity.analysis.evaluation;

import com.suresoft.analyzer.backend.entity.analysis.CriteriaEntity;
import com.suresoft.analyzer.backend.entity.analysis.CriteriaType;
import com.suresoft.analyzer.backend.entity.analysis.CriteriaTypeConverter;
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
@Table(name = "PASS_EVAL_RESULT")
public class PassEvaluationResultEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID) // UUID 자동 생성
    private String id;

    @Column(name="fail_start_time", nullable = false)
    private LocalDateTime failStartTime;

    @Column(name="fail_end_time", nullable = false)
    private LocalDateTime failEndTime;

    @Column(name="message", nullable = false)
    private String message;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name="prj_crt_id", nullable = false)
    private EvaluationProjectCriteriaEntity evaluationProjectCriteria;
}