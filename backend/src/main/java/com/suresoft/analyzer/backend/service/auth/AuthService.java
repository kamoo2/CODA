package com.suresoft.analyzer.backend.service.auth;

import com.suresoft.analyzer.backend.config.EnvProperties;
import com.suresoft.analyzer.backend.dto.auth.request.AssignRequestDto;
import com.suresoft.analyzer.backend.dto.auth.request.LoginRequestDto;
import com.suresoft.analyzer.backend.dto.auth.response.LoginResponseDto;
import com.suresoft.analyzer.backend.dto.auth.response.RefreshResponseDto;
import com.suresoft.analyzer.backend.entity.auth.RefreshTokenEntity;
import com.suresoft.analyzer.backend.entity.auth.TeamEntity;
import com.suresoft.analyzer.backend.entity.auth.UserEntity;
import com.suresoft.analyzer.backend.exception.ApiException;
import com.suresoft.analyzer.backend.exception.ErrorCode;
import com.suresoft.analyzer.backend.repository.auth.RefreshTokenRepository;
import com.suresoft.analyzer.backend.repository.auth.TeamRepository;
import com.suresoft.analyzer.backend.repository.auth.UserRepository;
import com.suresoft.analyzer.backend.security.CustomUserDetails;
import com.suresoft.analyzer.backend.security.JwtTokenProvider;
import com.suresoft.analyzer.backend.security.TokenType;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AuthService {
    private final UserRepository userRepository;
    private final TeamRepository teamRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;
    private final EnvProperties env;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public void assign(AssignRequestDto user) {
        if (userRepository.existsByEmail(user.getEmail())) {
            throw new ApiException(ErrorCode.DUPLICATE_RESOURCE, "이미 가입된 이메일입니다.");
        }

        String encodedPassword = passwordEncoder.encode(user.getPassword());

        // UserEntity 빌드 (초기에는 팀이 없을 수도 있음)
        UserEntity.UserEntityBuilder userBuilder = UserEntity.builder()
                .email(user.getEmail())
                .password(encodedPassword)
                .name(user.getName())
                .phoneNumber(user.getPhoneNumber())
                .role(user.getRole());

        // Team이 선택된 경우만 조회 후 설정
        if (user.getTeamId() != null) {
            TeamEntity team = teamRepository.findById(user.getTeamId())
                    .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND,"팀을 찾을수 없습니다."));
            userBuilder.team(team); // team 설정
        }

        UserEntity userEntity = userBuilder.build();
        userRepository.save(userEntity);
    }

    public LoginResponseDto login(LoginRequestDto request, HttpServletResponse response) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
            );

            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
            String userId = userDetails.getUserId();

            String accessToken = jwtTokenProvider.generateAccessToken(userId, userDetails.getAuthorities().stream()
                    .map(GrantedAuthority::getAuthority).toList());
            String refreshToken = jwtTokenProvider.generateRefreshToken(userId);

            // ✅ 기존 refreshToken 제거 후 새로 저장
            refreshTokenRepository.findByUserId(userId).ifPresent(refreshTokenRepository::delete);
            refreshTokenRepository.save(RefreshTokenEntity.builder()
                    .userId(userId)
                    .token(refreshToken)
                    .expiresAt(Instant.now().plusMillis(env.getJwtRefreshTokenExpiration()))
                    .build());

            setRefreshTokenCookie(refreshToken, response);
            return LoginResponseDto.builder()
                    .accessToken(accessToken)
                    .userName(userDetails.getUsername())
                    .userId(userId)
                    .build();
        } catch (AuthenticationException e) {
            throw new ApiException(ErrorCode.LOGIN_FAILED, "아이디 또는 비밀번호가 올바르지 않습니다.");
        }
    }

    public void logout(String userId, HttpServletResponse response){
        refreshTokenRepository.deleteByUserId(userId);

        // 쿠키 삭제
        ResponseCookie cookie = ResponseCookie.from("refreshToken", "")
                .httpOnly(true)
                .secure(true)
                .path("/")
                .sameSite("Lax")
                .maxAge(0)
                .build();
        response.setHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    public RefreshResponseDto refresh(String refreshToken, HttpServletResponse response) {
        // ✅ 1. refreshToken 유효성 검증 (만료/변조 모두 처리)
        jwtTokenProvider.isValidateToken(refreshToken, TokenType.REFRESH);

        // userId 추출
        String userId = jwtTokenProvider.getUserId(refreshToken);

        // DB 조회 -> DB에 userId에 대한 refreshToken이 없다면 401에러 발생
        RefreshTokenEntity tokenInDB = refreshTokenRepository.findByUserId(userId)
                .orElseThrow(() ->{
                    ResponseCookie cookie = ResponseCookie.from("refreshToken", "")
                            .httpOnly(true)
                            .secure(true)
                            .path("/")
                            .sameSite("Lax")
                            .maxAge(0)
                            .build();

                    response.setHeader(HttpHeaders.SET_COOKIE, cookie.toString());
                    return new ApiException(ErrorCode.UNAUTHORIZED, "DB에 User에 대한 Refresh Token이 존재하지 않음.");
                });

        if (!tokenInDB.getToken().equals(refreshToken)) {
            logout(userId, response);
            throw new ApiException(ErrorCode.UNAUTHORIZED,"DB에 저장된 리프레쉬 토큰과 불일치");
        }

        if (tokenInDB.isExpired()) {
            logout(userId, response);
            throw new ApiException(ErrorCode.REFRESH_TOKEN_EXPIRED,"리프레쉬토큰 만료");
        }

        // ✅ 새 토큰들 발급
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND));
        String newAccessToken = jwtTokenProvider.generateAccessToken(userId, List.of(user.getRole()));
        String newRefreshToken = jwtTokenProvider.generateRefreshToken(userId);

        // ✅ DB 갱신
        tokenInDB.setToken(newRefreshToken);
        tokenInDB.setExpiresAt(Instant.now().plusMillis(env.getJwtRefreshTokenExpiration()));
        refreshTokenRepository.save(tokenInDB);
        setRefreshTokenCookie(newRefreshToken, response);
        // 새로운 AccessToken 생성
        return RefreshResponseDto.builder()
                .accessToken(newAccessToken)
                .build();
    }

    private void setRefreshTokenCookie(String token, HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from("refreshToken", token)
                .httpOnly(true)
                .secure(true)
                .path("/")
                .maxAge(env.getJwtRefreshTokenExpiration()/1000)
                .sameSite("Lax")
                .build();
        response.setHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }
}
