package com.suresoft.analyzer.backend.controller;

import com.suresoft.analyzer.backend.dto.auth.response.UserResponseDto;
import com.suresoft.analyzer.backend.dto.auth.request.AssignRequestDto;
import com.suresoft.analyzer.backend.dto.auth.request.LoginRequestDto;
import com.suresoft.analyzer.backend.dto.auth.response.LoginResponseDto;
import com.suresoft.analyzer.backend.dto.auth.response.RefreshResponseDto;
import com.suresoft.analyzer.backend.dto.common.ApiResponse;
import com.suresoft.analyzer.backend.entity.auth.TeamEntity;
import com.suresoft.analyzer.backend.entity.auth.UserEntity;
import com.suresoft.analyzer.backend.entity.storage.BucketEntity;
import com.suresoft.analyzer.backend.exception.ApiException;
import com.suresoft.analyzer.backend.exception.ErrorCode;
import com.suresoft.analyzer.backend.repository.auth.TeamRepository;
import com.suresoft.analyzer.backend.repository.auth.UserRepository;
import com.suresoft.analyzer.backend.security.CustomUserDetails;
import com.suresoft.analyzer.backend.service.auth.AuthService;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final TeamRepository teamRepository;
    private final UserRepository userRepository;

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponseDto>> login(@RequestBody LoginRequestDto request, HttpServletResponse response) {
        return ResponseEntity.ok(ApiResponse.success("로그인 성공",authService.login(request,response)));
    }


    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<RefreshResponseDto>> refreshToken(@CookieValue(name = "refreshToken", required = false) String refreshToken, HttpServletResponse response) {
        return ResponseEntity.ok(ApiResponse.success("토큰 재발급 성공", authService.refresh(refreshToken, response)));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(@AuthenticationPrincipal CustomUserDetails userDetails, HttpServletResponse response) {
        authService.logout(userDetails.getUserId(), response);
        return ResponseEntity.ok(ApiResponse.success("로그아웃 성공", null));
    }

    @PostMapping("/assign")
    public ResponseEntity<ApiResponse<Void>> assignUser(@RequestBody AssignRequestDto user) {
        authService.assign(user);
        return ResponseEntity.ok(ApiResponse.success("회원가입 성공",null));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserResponseDto>> getUserDetails(@AuthenticationPrincipal CustomUserDetails userDetails) {
        UserEntity user = userRepository.findById(userDetails.getUserId()).orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));
        BucketEntity bucket =  user.getCurrentUsedBucket();
        TeamEntity team = user.getTeam();
        UserResponseDto userDto = UserResponseDto.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .teamId(team != null ? team.getId() : null)
                .teamName(team != null ? team.getName() : null)
                .currentUsedBucketName(bucket != null ? bucket.getName() : null)
                .build();


        return ResponseEntity.ok(ApiResponse.success("유저 정보 조회 성공",userDto));
    }

    @PostMapping("/team")
    public ResponseEntity<ApiResponse<Void>> assignTeam() {
        TeamEntity team = new TeamEntity();
        team.setName("클라우드분석팀");
        teamRepository.save(team);

        return ResponseEntity.ok(ApiResponse.success("팀 생성 성공",null));
    }
}