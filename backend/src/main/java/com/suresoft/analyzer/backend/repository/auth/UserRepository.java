package com.suresoft.analyzer.backend.repository.auth;


import com.suresoft.analyzer.backend.entity.auth.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<UserEntity, String> { // <User -> 유저 엔티티를 데이터베이스와 매핑
    @Query("SELECT u FROM UserEntity u JOIN FETCH u.team WHERE u.id = :userId")
    Optional<UserEntity> findWithTeamById(String userId);

    Optional<UserEntity> findByEmail(String email);
    boolean existsByEmail(String email);
}

