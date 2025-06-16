package com.suresoft.analyzer.backend.dto.common;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class TreeFileNodeDto<T> {
    private String title;
    private String key;
    private boolean isLeaf = true; // 파일 노드니까 true 고정
    private T metadata;
}
