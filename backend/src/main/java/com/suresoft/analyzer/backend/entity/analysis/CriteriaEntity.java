package com.suresoft.analyzer.backend.entity.analysis;

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
@Table(name = "CRITERIA")
public class CriteriaEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name="name", nullable = false)
    private String name;

    @Column(name="created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name="script_path", nullable = false)
    private String script_path;

    @Column(name="type", nullable = false)
    private String type;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name="user_id", nullable = false)
    private UserEntity user;
}