package com.suresoft.analyzer.backend.dto.storage;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@AllArgsConstructor
@NoArgsConstructor
public class DeleteUploadFilesResultDto {
    private List<String> deleted; // 성공한 파일 ID 목록
    private List<UploadFileUsageDto> skipped; // 사용 중이라 삭제 안 된 파일
}
