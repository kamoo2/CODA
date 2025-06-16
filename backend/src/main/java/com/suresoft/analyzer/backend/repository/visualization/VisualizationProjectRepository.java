package com.suresoft.analyzer.backend.repository.visualization;

import com.suresoft.analyzer.backend.entity.visualization.VisualizationProjectEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface VisualizationProjectRepository extends JpaRepository<VisualizationProjectEntity, String> {
    // 특정 userId가 소유한 모든 시각화 프로젝트 조회
    @Query("SELECT v FROM VisualizationProjectEntity v WHERE v.user.id = :userId")
    List<VisualizationProjectEntity> findVisualizationProjectsByUserId(@Param("userId") String userId);

    @Query("SELECT p FROM VisualizationProjectEntity p " +
            "WHERE p.user.id = :userId AND p.blueprintSignature = :signature")
    Optional<VisualizationProjectEntity> findByUserIdAndBlueprintSignature(
            @Param("userId") String userId,
            @Param("signature") String signature);

}