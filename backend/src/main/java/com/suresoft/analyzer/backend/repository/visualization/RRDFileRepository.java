package com.suresoft.analyzer.backend.repository.visualization;

import com.suresoft.analyzer.backend.entity.visualization.RRDFileEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RRDFileRepository extends JpaRepository<RRDFileEntity, String> {

    /**
     * 특정 History에 속한 파일 리스트 조회
     */
    List<RRDFileEntity> findByVisualizationProjectId(String visualizationProjectId);
    Optional<RRDFileEntity> findByRrdUrl(String rrdUrl);

    void deleteByVisualizationProjectId(String visualizationProjectId);
}