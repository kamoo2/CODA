package com.suresoft.analyzer.backend.entity.analysis;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "VARIABLE")
public class VariableEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "criteria_id", nullable = false)
    private CriteriaEntity criteria;

    @Column(name="name", nullable = false)
    private String name;

    //TODO 변수 파일 연결 테이블로 교체
    @Column(name="path", nullable = false)
    private String path;
}
