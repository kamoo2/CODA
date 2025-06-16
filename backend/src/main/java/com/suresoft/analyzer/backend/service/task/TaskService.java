package com.suresoft.analyzer.backend.service.task;

import com.suresoft.analyzer.backend.dto.analysis.ProjectFileDto;
import com.suresoft.analyzer.backend.dto.analysis.dataset.curation.CurationProjectCriteriaDto;
import com.suresoft.analyzer.backend.dto.analysis.dataset.curation.CurationProjectDto;
import com.suresoft.analyzer.backend.dto.analysis.dataset.curation.CurationResultDto;
import com.suresoft.analyzer.backend.dto.common.TreeFolderNodeDto;
import com.suresoft.analyzer.backend.dto.task.TaskDto;
import com.suresoft.analyzer.backend.entity.analysis.CriteriaState;
import com.suresoft.analyzer.backend.entity.analysis.ProjectFileEntity;
import com.suresoft.analyzer.backend.entity.analysis.dataset.curation.CurationProjectCriteriaEntity;
import com.suresoft.analyzer.backend.entity.analysis.dataset.curation.CurationProjectEntity;
import com.suresoft.analyzer.backend.entity.analysis.dataset.curation.CurationResultEntity;
import com.suresoft.analyzer.backend.entity.auth.UserEntity;
import com.suresoft.analyzer.backend.entity.task.TaskEntity;
import com.suresoft.analyzer.backend.exception.ApiException;
import com.suresoft.analyzer.backend.exception.ErrorCode;
import com.suresoft.analyzer.backend.repository.analysis.CriteriaRepository;
import com.suresoft.analyzer.backend.repository.analysis.ProjectFileRepository;
import com.suresoft.analyzer.backend.repository.analysis.dataset.curation.CurationProjectCriteriaRepository;
import com.suresoft.analyzer.backend.repository.analysis.dataset.curation.CurationProjectRepository;
import com.suresoft.analyzer.backend.repository.analysis.dataset.curation.CurationResultRepository;
import com.suresoft.analyzer.backend.repository.auth.UserRepository;
import com.suresoft.analyzer.backend.repository.storage.UploadFileRepository;
import com.suresoft.analyzer.backend.repository.task.TaskRepository;
import com.suresoft.analyzer.backend.service.analysis.CurationWebSocketHandler;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.jetbrains.annotations.NotNull;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TaskService {
    private final UserRepository userRepository;
    private final TaskRepository taskRepository;

    public List<TaskDto> getTasks() {
        return taskRepository.findAll().stream()
                .map(entity -> {
                    TaskDto dto = new TaskDto();
                    dto.setId(entity.getId());
                    dto.setName(entity.getName());
                    dto.setStatus(entity.getStatus());
                    dto.setStartDate(entity.getStartDate());
                    dto.setEndDate(entity.getEndDate());
                    dto.setUserName(entity.getUser().getName());
                    dto.setUserTeam(entity.getUser().getTeam().getName());
                    return dto;
                })
                .collect(Collectors.toList());
    }

    public TaskDto saveTask(String userId, TaskDto taskDto) {
        UserEntity user = userRepository.findById(userId).orElseThrow(() ->  new ApiException(ErrorCode.RESOURCE_NOT_FOUND, "User Not Found"));
        TaskEntity entity = new TaskEntity();
        entity.setStatus(taskDto.getStatus());
        entity.setUser(user);
        entity.setName(taskDto.getName());
        entity.setStartDate(LocalDateTime.now());
        entity.setEndDate(null);
        TaskEntity savedEntity = taskRepository.save(entity);
        return new TaskDto(savedEntity.getId(), savedEntity.getUser().getTeam().getName(), savedEntity.getUser().getName(), savedEntity.getName(),savedEntity.getStatus(), savedEntity.getStartDate(), savedEntity.getEndDate());
    }

    @Transactional
    public TaskDto updateTask(TaskDto taskDto) {
        TaskEntity taskEntity = taskRepository.findById(taskDto.getId()).orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND, "Task Not Found"));
        taskEntity.setName(taskDto.getName());
        taskEntity.setStartDate(taskDto.getStartDate());
        taskEntity.setEndDate(taskDto.getEndDate());
        taskEntity.setStatus(taskDto.getStatus());

        return new TaskDto(taskEntity.getId(), taskEntity.getUser().getTeam().getName(), taskEntity.getUser().getName(),
                taskEntity.getName(), taskEntity.getStatus(), taskEntity.getStartDate(), taskEntity.getEndDate());
    }
}
