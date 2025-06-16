package com.suresoft.analyzer.backend.repository.auth;

import com.suresoft.analyzer.backend.entity.auth.RefreshTokenEntity;
import com.suresoft.analyzer.backend.entity.auth.UserEntity;
import jakarta.transaction.Transactional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshTokenEntity, String> {
    Optional<RefreshTokenEntity> findByUserId(String userId);

    @Transactional
    @Modifying
    @Query("DELETE FROM RefreshTokenEntity r WHERE r.userId = :userId")
    void deleteByUserId(@Param("userId") String userId);
}
