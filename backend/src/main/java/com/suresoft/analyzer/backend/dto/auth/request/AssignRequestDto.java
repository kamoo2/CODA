package com.suresoft.analyzer.backend.dto.auth.request;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class AssignRequestDto {
    private String email;
    private String password;
    private String name;
    private String phoneNumber;
    private String role;
    private String teamId;
}
