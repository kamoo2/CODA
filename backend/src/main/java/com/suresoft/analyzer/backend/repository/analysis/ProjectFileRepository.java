package com.suresoft.analyzer.backend.repository.analysis;

import com.suresoft.analyzer.backend.entity.analysis.ProjectFileEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProjectFileRepository extends JpaRepository<ProjectFileEntity, String> {
    /**
     * 특정 프로젝트에 속한 RRD 파일 리스트 조회
     */
    @EntityGraph(attributePaths = {"uploadFile", "evaluationProject"}) // file과 project를 즉시 로드
    List<ProjectFileEntity> findByEvaluationProjectId(String projectId);

    @EntityGraph(attributePaths = {"uploadFile", "curationProject"}) // file과 project를 즉시 로드
    List<ProjectFileEntity> findByCurationProjectId(String projectId);

    void deleteByEvaluationProjectId(String projectId);
    void deleteByCurationProjectId(String projectId);

    boolean existsByUploadFile_Id(String uploadFileId);
}