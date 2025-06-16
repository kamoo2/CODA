package com.suresoft.analyzer.backend.service.system;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.suresoft.analyzer.backend.config.EnvProperties;
import com.suresoft.analyzer.backend.dto.system.response.FileExtensionResponseDto;
import com.suresoft.analyzer.backend.dto.system.response.ParserResponseDto;
import com.suresoft.analyzer.backend.dto.visualization.response.DbcMessageDto;
import com.suresoft.analyzer.backend.entity.storage.BucketEntity;
import com.suresoft.analyzer.backend.entity.storage.UploadFileEntity;
import com.suresoft.analyzer.backend.entity.system.ExtensionEntity;
import com.suresoft.analyzer.backend.entity.system.ParserEntity;
import com.suresoft.analyzer.backend.exception.ApiException;
import com.suresoft.analyzer.backend.exception.ErrorCode;
import com.suresoft.analyzer.backend.repository.storage.BucketRepository;
import com.suresoft.analyzer.backend.repository.storage.UploadFileRepository;
import com.suresoft.analyzer.backend.repository.system.ExtensionParserRepository;
import com.suresoft.analyzer.backend.repository.system.ExtensionRepository;
import com.suresoft.analyzer.backend.repository.system.ParserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SystemService {

    private final ExtensionRepository extensionRepository;
    private final ExtensionParserRepository extensionParserRepository;
    private final ParserRepository parserRepository;
    private final UploadFileRepository uploadFileRepository;
    private final BucketRepository bucketRepository;
    private final EnvProperties env;

    public List<FileExtensionResponseDto> getFileExtensions() {
        List<ExtensionEntity> extensions = extensionRepository.findAll();
        return extensions.stream()
                .map((extension) -> FileExtensionResponseDto.builder()
                        .id(extension.getId())
                        .name(extension.getName())
                        .build()).toList();
    }

    public List<ParserResponseDto> getParsersByExtId(String id) {
        ExtensionEntity ext = extensionRepository.findById(id).orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND, "확장자 조회 실패"));

        List<ParserEntity> parsers = extensionParserRepository.findParsersByExtensionId(ext.getId());

        return parsers.stream().map(parser-> ParserResponseDto.builder()
                .id(parser.getId())
                .name(parser.getName())
                .build())
                .toList();
    }

    public List<ParserResponseDto> getParsers() {
        List<ParserEntity> parsers = parserRepository.findAll();

        return parsers.stream()
                .map((parser) -> ParserResponseDto.builder()
                        .id(parser.getId())
                        .name(parser.getName())
                        .build())
                .toList();
    }

    public List<DbcMessageDto> parsingDbcFile(String userId, String uploadFileId) {
        UploadFileEntity uploadFile = uploadFileRepository.findById(uploadFileId).orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND, "UploadFile"));

        BucketEntity bucket = bucketRepository.findById(uploadFile.getBucket().getId()).orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND, "Bucket"));

        if(!bucket.getUser().getId().equals(userId)){
            throw new ApiException(ErrorCode.FORBIDDEN, "해당 버킷에 접근 할 수 없는 사용자입니다.");
        }

//        String dbcFilePath = "C:/nginx/dbc-files/" + userId + "/" + uploadFile.getDbc().getName();
        String dbcFilePath = env.getPath() + "/dbc/" + userId + "/" + uploadFile.getDbc().getName();

        return runDbcParserDockerContainer(dbcFilePath);

    }

    private List<DbcMessageDto> runDbcParserDockerContainer(String dbcFilePath){
        try {
            Path dbcPath = Paths.get(dbcFilePath);
            String hostDir = dbcPath.getParent().toString(); // 디렉토리만
            String fileName = dbcPath.getFileName().toString(); // 파일명만

            ProcessBuilder pb = new ProcessBuilder(
                    "docker", "run", "--rm",
                    "-v", hostDir + ":/data",       // 디렉터리만 마운트
                    "dbc-parser",
                    "/data/" + fileName             // 내부 경로에서 접근
            );

            Process process = pb.start();

            BufferedReader outputReader = new BufferedReader(new InputStreamReader(process.getInputStream()));
            String jsonOutput = outputReader.lines().collect(Collectors.joining());

            BufferedReader errorReader = new BufferedReader(new InputStreamReader(process.getErrorStream()));
            String errorOutput = errorReader.lines().collect(Collectors.joining("\n"));

            int exitCode = process.waitFor();

            if(!errorOutput.isBlank()){
                System.out.println("Docker STDERR: \n" + errorOutput);
            }

            if (exitCode != 0){
                throw new ApiException(ErrorCode.INTERNAL_SERVER_ERROR, "Docker Container Fail");
            }

            if (jsonOutput.isBlank()){
                throw new ApiException(ErrorCode.INTERNAL_SERVER_ERROR, "Docker Stdout Blank");
            }

            ObjectMapper mapper = new ObjectMapper();
            return mapper.readValue(jsonOutput, new TypeReference<List<DbcMessageDto>>() {});

        } catch (Exception e) {
            throw new ApiException(ErrorCode.INTERNAL_SERVER_ERROR, "DBC 파싱 Docker 실행 실패");
        }
    }
}
