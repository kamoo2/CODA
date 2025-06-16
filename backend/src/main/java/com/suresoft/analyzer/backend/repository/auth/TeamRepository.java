package com.suresoft.analyzer.backend.repository.auth;

import com.suresoft.analyzer.backend.entity.auth.TeamEntity;
import com.suresoft.analyzer.backend.entity.auth.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TeamRepository extends JpaRepository<TeamEntity, String> {
    // 특정 팀 ID를 가지는 모든 유저 ID 가져오기
    @Query("SELECT u FROM UserEntity u WHERE u.team.id = :teamId")
    List<UserEntity> findUserIdsByTeamId(@Param("teamId") String teamId);
}
