package com.suresoft.analyzer.backend.dto.visualization;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class FileMetadataDto {
    private String uploadFilePath;
    private String parserName;
    private String entityName;
    private String dbcFileName;
    private List<SelectedSignalDto> selectedSignals;

    @Getter
    @AllArgsConstructor
    @NoArgsConstructor
    public static class SelectedSignalDto {
        private String messageName;
        private List<String> signalNames;
    }
}
