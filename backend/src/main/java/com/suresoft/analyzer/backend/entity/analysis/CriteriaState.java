package com.suresoft.analyzer.backend.entity.analysis;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum CriteriaState {
    NONE("NONE"),
    RUNNING("RUNNING"),
    COMPLETE("COMPLETE"),
    PAUSED("PAUSED"),
    ERROR("ERROR");

    private final String value;

    CriteriaState(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static CriteriaState fromString(String value) {
        for (CriteriaState type : CriteriaState.values()) {
            if (type.value.equalsIgnoreCase(value)) {
                return type;
            }
        }
        throw new IllegalArgumentException("Unknown enum value: " + value);
    }
}
