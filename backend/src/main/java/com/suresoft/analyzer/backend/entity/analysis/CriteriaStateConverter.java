package com.suresoft.analyzer.backend.entity.analysis;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class CriteriaStateConverter implements AttributeConverter<CriteriaState, String> {
    @Override
    public String convertToDatabaseColumn(CriteriaState criteriaState) {
        if(criteriaState == null) {
            return null;
        }
        return criteriaState.name();
    }

    @Override
    public CriteriaState convertToEntityAttribute(String dbData) {
        if(dbData == null) {
            return null;
        }
        return CriteriaState.valueOf(dbData);
    }
}
