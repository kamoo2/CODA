package com.suresoft.analyzer.backend.security;

import com.suresoft.analyzer.backend.entity.auth.UserEntity;
import com.suresoft.analyzer.backend.exception.ApiException;
import com.suresoft.analyzer.backend.exception.ErrorCode;
import com.suresoft.analyzer.backend.repository.auth.UserRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class CustomUserDetailsService implements UserDetailsService {
    private final UserRepository userRepository;

    public CustomUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }


    /*
    jwt 가 있는 요청이 들어오면 받는 사용자 정보를 구하기 위한 로직
    Userservice 는 일반적인 사용자 관리 로직, CustomUserDetailsService는 spring security 와 연동하여 인증을 위한 사용자 조회만 수행
    UserDetailsService를 구현한 클래스를 만들어야 Spring Security가 자동으로 사용자 정보를 가져올 수 있음
    JWT 인증 과정에서도 같은 사용자 조회 로직을 사용
    userRepository.fineByEmail()을 사용하지 않는 이유 => Spring Security와의 연동 및 인증 체계 유지 때문

    Spring Security에서 UserDetailsService 인터페이스는 사용자 인증을 위해 반드시 loadUserByUsername() 메서드를 구현하도록 설계되어있음
    즉 이름은 고정해야됨
    */
    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        UserEntity userEntity = userRepository.findByEmail(email)
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND,"해당 Email을 가진 User가 없습니다."));


        return new CustomUserDetails(userEntity);
    }
}