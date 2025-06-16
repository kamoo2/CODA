package com.suresoft.analyzer.backend.service.storage;

import com.suresoft.analyzer.backend.config.EnvProperties;
import com.suresoft.analyzer.backend.utils.EncryptionUtil;

import io.github.cdimascio.dotenv.Dotenv;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class SecureStorageService {
    private final EnvProperties env;

    /**
     * AWS Credentials를 AES 암호화
     */
    public String encrypt(String value) {
        try {
            return EncryptionUtil.encrypt(value, env.getAesMasterKey()); // AES 암호화 수행
        } catch (Exception e) {
            throw new RuntimeException("암호화 실패", e);
        }
    }

    /**
     * AWS Credentials를 복호화
     */
    public String decrypt(String encryptedValue) {
        try {
            return EncryptionUtil.decrypt(encryptedValue, env.getAesMasterKey()); // AES 복호화 수행
        } catch (Exception e) {
            throw new RuntimeException("복호화 실패", e);
        }
    }

    /**
     * Key를 복호화하여 불러오기
     */
    public String getDecryptedValue(String keyType, String key) {
        try{
            String encryptedValue =decrypt(key);
            // SHA-256 기반 AES 복호화 적용 (MASTER_KEY 사용)
            return encryptedValue != null ? decrypt(key) : null;
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }
}
