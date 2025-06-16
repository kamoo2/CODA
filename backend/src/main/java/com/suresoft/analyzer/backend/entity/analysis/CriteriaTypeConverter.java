package com.suresoft.analyzer.backend.entity.analysis;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class CriteriaTypeConverter implements AttributeConverter<CriteriaType, String> {
    @Override
    public String convertToDatabaseColumn(CriteriaType criteriaType) {
        if(criteriaType == null) {
            return null;
        }
        return criteriaType.name();
    }

    @Override
    public CriteriaType convertToEntityAttribute(String dbData) {
        if(dbData == null) {
            return null;
        }
        return CriteriaType.valueOf(dbData);
    }
}
