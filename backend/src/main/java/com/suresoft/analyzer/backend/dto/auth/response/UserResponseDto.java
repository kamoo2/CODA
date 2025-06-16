package com.suresoft.analyzer.backend.dto.auth.response;

import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponseDto {
    private String id;
    private String name;
    private String teamId;
    private String teamName;
    private String email;
    private String currentUsedBucketName;
}
