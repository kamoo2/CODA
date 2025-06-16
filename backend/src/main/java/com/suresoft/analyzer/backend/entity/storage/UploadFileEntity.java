package com.suresoft.analyzer.backend.entity.storage;

import com.suresoft.analyzer.backend.entity.system.ParserEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "UPLOAD_FILE")
public class UploadFileEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name="name", nullable = false)
    private String name;

    @Column(name="s3_url", nullable = false)
    private String s3Url;

    @Column(name="timestamp_micro", nullable = true)
    private Long timestampMicro;

    @Column(name="created_at", nullable = false)
    private LocalDateTime createdAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bucket_id", nullable = false)
    private BucketEntity bucket;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name="parser_id",nullable = true)
    private ParserEntity parser;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name="dbc_file_id", nullable = true)
    private DbcFileEntity dbc;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}