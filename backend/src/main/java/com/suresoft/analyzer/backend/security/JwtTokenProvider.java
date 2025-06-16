package com.suresoft.analyzer.backend.security;

import com.suresoft.analyzer.backend.config.EnvProperties;
import com.suresoft.analyzer.backend.exception.ApiException;
import com.suresoft.analyzer.backend.exception.ErrorCode;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Date;
import java.util.List;

@RequiredArgsConstructor
@Component
public class JwtTokenProvider {
    private final EnvProperties env;

    public String generateAccessToken(String userId, List<String> roles) {
        return createToken(userId, roles, env.getJwtAccessTokenExpiration());
    }

    public String generateRefreshToken(String userId) {
        return createToken(userId, List.of(), env.getJwtRefreshTokenExpiration());
    }


    private String createToken(String userId, List<String> roles, long expirationMillis) {
        Claims claims = Jwts.claims().setSubject(userId); // 사용자를 식별하는 핵심 정보
        claims.put("roles", roles); // 인가 처리를 위한 권한 정보
        Date now = new Date();
        Date expiry = new Date(now.getTime() + expirationMillis);
        return Jwts.builder()
                .setClaims(claims)
                .setIssuedAt(now)
                .setExpiration(expiry)
                .signWith(Keys.hmacShaKeyFor(env.getJwtSecretKey().getBytes()), SignatureAlgorithm.HS256)
                .compact();
    }

    public String getUserId(String token) {
        return Jwts.parserBuilder().setSigningKey(Keys.hmacShaKeyFor(env.getJwtSecretKey().getBytes())).build().parseClaimsJws(token).getBody().getSubject();
    }

    public List<String> getRoles(String token) {
        Claims claims = Jwts.parserBuilder().setSigningKey(Keys.hmacShaKeyFor(env.getJwtSecretKey().getBytes())).build().parseClaimsJws(token).getBody();
        return (List<String>) claims.get("roles");
    }

    public boolean isValidateToken(String token, TokenType tokenType) {
        try {
            Jwts.parserBuilder()
                    .setSigningKey(Keys.hmacShaKeyFor(env.getJwtSecretKey().getBytes()))
                    .build()
                    .parseClaimsJws(token);
            return true;
        } catch (ExpiredJwtException e) {
            if (tokenType == TokenType.ACCESS) {
                throw new ApiException(ErrorCode.ACCESS_TOKEN_EXPIRED); // E401-02
            } else if (tokenType == TokenType.REFRESH) {
                throw new ApiException(ErrorCode.REFRESH_TOKEN_EXPIRED); // E401-03
            }
            throw new ApiException(ErrorCode.UNAUTHORIZED); // 혹시 모를 경우
        } catch (JwtException | IllegalArgumentException e) {
            throw new ApiException(ErrorCode.UNAUTHORIZED); // 변조/형식 문제
        }
    }
}
