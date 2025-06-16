package com.suresoft.analyzer.backend.dto.task;

import com.suresoft.analyzer.backend.entity.task.TaskEntity;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class TaskDto {
    private String id;
    private String userTeam;
    private String userName;
    private String name;
    private String status;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
//    private int priority;

    public TaskDto(TaskEntity entity) {
        setId(entity.getId());
        setName(entity.getName());
        setUserTeam(entity.getUser().getTeam().getName());
        setUserName(entity.getUser().getName());
        setStatus(entity.getStatus());
        setStartDate(entity.getStartDate());
        setEndDate(entity.getEndDate());
    }
}
