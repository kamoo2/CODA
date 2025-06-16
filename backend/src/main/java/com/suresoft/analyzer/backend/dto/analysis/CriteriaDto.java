package com.suresoft.analyzer.backend.dto.analysis;
import com.suresoft.analyzer.backend.entity.analysis.CriteriaEntity;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CriteriaDto {
    private String name;
    private LocalDateTime createdAt;
    private List<VariableDto> variables;
    private String type;
    private String id;
    
    public CriteriaDto(CriteriaEntity entity) {
        setId(entity.getId());
        setType(entity.getType());
        setVariables(new ArrayList<>());
        setName(entity.getName());
        setCreatedAt(entity.getCreatedAt());
    }
}
