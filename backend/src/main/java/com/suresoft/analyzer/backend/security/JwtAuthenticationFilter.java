package com.suresoft.analyzer.backend.security;


import com.fasterxml.jackson.databind.ObjectMapper;
import com.suresoft.analyzer.backend.dto.common.ApiResponse;
import com.suresoft.analyzer.backend.entity.auth.UserEntity;
import com.suresoft.analyzer.backend.exception.ApiException;
import com.suresoft.analyzer.backend.exception.ErrorCode;
import com.suresoft.analyzer.backend.repository.auth.RefreshTokenRepository;
import com.suresoft.analyzer.backend.repository.auth.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final JwtTokenProvider jwtTokenProvider;
    private final UserRepository userRepository;


    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        try{
            String token = resolveToken(request);

            if (token != null) {
                // ✅ access 토큰을 검증 (여기서 만료/변조 구분됨)
                jwtTokenProvider.isValidateToken(token, TokenType.ACCESS);

                // ✅ 여기까지 통과했다는 건 accessToken은 유효하다는 뜻
                String userId = jwtTokenProvider.getUserId(token);

                List<GrantedAuthority> authorities = jwtTokenProvider.getRoles(token).stream()
                        .map(SimpleGrantedAuthority::new)
                        .collect(Collectors.toList());

                UserEntity user = userRepository.findById(userId)
                        .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND, "해당 User가 존재하지 않습니다."));

                CustomUserDetails userDetails = new CustomUserDetails(user);

                UsernamePasswordAuthenticationToken authenticationToken =
                        new UsernamePasswordAuthenticationToken(userDetails, null, authorities);

                SecurityContextHolder.getContext().setAuthentication(authenticationToken);
            }

            filterChain.doFilter(request, response);
        }catch (ApiException e){
            response.setStatus(e.getErrorCode().getStatus().value());
            response.setContentType("application/json;charset=UTF-8");

            String body = new ObjectMapper().writeValueAsString(
                    ApiResponse.failure(e.getCustomMessage(), e.getErrorCode().getCode())
            );
            response.getWriter().write(body);
        }
    }

    private String resolveToken(HttpServletRequest request) {
        String bearer = request.getHeader("Authorization");
        if (bearer != null && bearer.startsWith("Bearer ")) {
            return bearer.substring(7);
        }
        return null;
    }

}
