package com.suresoft.analyzer.backend.dto.analysis;

import com.suresoft.analyzer.backend.entity.analysis.VariableEntity;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class VariableDto {
    private String id;
    private  String name;
    private  String path;

    public VariableDto(VariableEntity entity) {
        setId(entity.getId());
        setName(entity.getName());
        // TODO 변수 연결 테이블 추가 후 작업 필요
        setPath(entity.getPath());
    }
}
