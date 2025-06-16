package com.suresoft.analyzer.backend.controller;

import com.suresoft.analyzer.backend.dto.analysis.CriteriaDto;
import com.suresoft.analyzer.backend.dto.common.ApiResponse;
import com.suresoft.analyzer.backend.dto.task.TaskDto;
import com.suresoft.analyzer.backend.security.CustomUserDetails;
import com.suresoft.analyzer.backend.service.analysis.CriteriaService;
import com.suresoft.analyzer.backend.service.task.TaskService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/task")
@RequiredArgsConstructor
public class TaskController {
    private  final TaskService taskService;

    @GetMapping("/tasks")
    public ResponseEntity<ApiResponse<List<TaskDto>>> getTasks() {
        List<TaskDto> tasks = taskService.getTasks();
        return ResponseEntity.ok(ApiResponse.success("작업 목록 조회 성공", tasks));
    }

    @PostMapping("/save-task")
    public ResponseEntity<ApiResponse<TaskDto>> saveTask(@AuthenticationPrincipal CustomUserDetails userDetails, @RequestBody TaskDto task) {
        TaskDto savedTask = taskService.saveTask(userDetails.getUserId(), task);
        return ResponseEntity.ok(ApiResponse.success("작업 저장 성공", savedTask));
    }
}
