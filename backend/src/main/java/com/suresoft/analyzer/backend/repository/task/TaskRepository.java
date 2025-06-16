package com.suresoft.analyzer.backend.repository.task;

import com.suresoft.analyzer.backend.entity.analysis.CriteriaEntity;
import com.suresoft.analyzer.backend.entity.task.TaskEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TaskRepository extends JpaRepository<TaskEntity, String> {
}

