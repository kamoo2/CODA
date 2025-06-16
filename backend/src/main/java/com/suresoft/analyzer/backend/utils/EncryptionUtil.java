package com.suresoft.analyzer.backend.utils;

import javax.crypto.Cipher;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.security.MessageDigest;
import java.util.Arrays;


public class EncryptionUtil {
    private static final String ALGORITHM = "AES";

    // SHA-256을 사용하여 AES 키 생성 (16바이트로 고정)
    private static byte[] generateKey(String key) throws Exception {
        MessageDigest sha = MessageDigest.getInstance("SHA-256");
        byte[] keyBytes = sha.digest(key.getBytes(StandardCharsets.UTF_8));
        return Arrays.copyOf(keyBytes, 16); // AES는 16바이트(128비트) 키 필요
    }

    // AES 암호화
    public static String encrypt(String value, String key) throws Exception {
        SecretKeySpec secretKeySpec = new SecretKeySpec(generateKey(key), ALGORITHM);
        Cipher cipher = Cipher.getInstance(ALGORITHM);
        cipher.init(Cipher.ENCRYPT_MODE, secretKeySpec);
        byte[] encryptedValue = cipher.doFinal(value.getBytes(StandardCharsets.UTF_8));
        return Base64.getEncoder().encodeToString(encryptedValue);
    }

    // AES 복호화
    public static String decrypt(String encryptedValue, String key) throws Exception {
        SecretKeySpec secretKeySpec = new SecretKeySpec(generateKey(key), ALGORITHM);
        Cipher cipher = Cipher.getInstance(ALGORITHM);
        cipher.init(Cipher.DECRYPT_MODE, secretKeySpec);
        byte[] decryptedValue = cipher.doFinal(Base64.getDecoder().decode(encryptedValue));
        return new String(decryptedValue, StandardCharsets.UTF_8);
    }
}