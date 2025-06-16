package com.suresoft.analyzer.backend.dto.visualization.response;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class DbcSignalDto {
    private String name;
    private int startBit;
    private int length;
    private double factor;
    private double offset;
    private String unit;
}