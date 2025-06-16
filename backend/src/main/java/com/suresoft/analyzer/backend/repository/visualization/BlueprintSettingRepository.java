package com.suresoft.analyzer.backend.repository.visualization;

import com.suresoft.analyzer.backend.entity.visualization.BlueprintSettingEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BlueprintSettingRepository extends JpaRepository<BlueprintSettingEntity, String> {
    Optional<BlueprintSettingEntity> findByEntityNameAndViewNameAndUploadFileId(
            String entityName, String viewName, String uploadFileId);

    List<BlueprintSettingEntity> findAllByVisualizationProjectId(String visualizationProjectId);
    void deleteByVisualizationProjectId(String visualizationProjectId);

    boolean existsByUploadFile_Id(String uploadFileId);
}