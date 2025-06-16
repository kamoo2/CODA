package com.suresoft.analyzer.backend.repository.analysis;

import com.suresoft.analyzer.backend.entity.analysis.VariableEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface VariableRepository extends JpaRepository<VariableEntity, String> {
    List<VariableEntity> findByCriteriaId(String criteriaId);

    @Modifying
    @Query("DELETE FROM VariableEntity v WHERE v.criteria.id = :criteriaId")
    void deleteByCriteriaId(@Param("criteriaId") String criteriaId);
}

