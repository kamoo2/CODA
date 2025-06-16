package com.suresoft.analyzer.backend.dto.visualization.response;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class DbcMessageDto {
    private int id;
    private String name;
    private int dlc;
    private List<DbcSignalDto> signals;
}