package com.suresoft.analyzer.backend.dto.common;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class TreeFolderNodeDto<T> {
    private String title; // 유저 이름 or 프로젝트 이름
    private String key; // 유니크한 키
    private Boolean isLeaf; // 파일 여부
    private T metadata; // 필요한 경우 (데이터 파일인 경우)
    private List<TreeFolderNodeDto<T>> children;
}
