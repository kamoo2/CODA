package com.suresoft.analyzer.backend.service.analysis;

import com.suresoft.analyzer.backend.dto.analysis.CriteriaDto;
import com.suresoft.analyzer.backend.dto.analysis.VariableDto;
import com.suresoft.analyzer.backend.dto.common.TreeFolderNodeDto;
import com.suresoft.analyzer.backend.entity.analysis.CriteriaEntity;
import com.suresoft.analyzer.backend.entity.analysis.VariableEntity;
import com.suresoft.analyzer.backend.entity.analysis.dataset.curation.CurationProjectCriteriaEntity;
import com.suresoft.analyzer.backend.entity.analysis.evaluation.EvaluationProjectCriteriaEntity;
import com.suresoft.analyzer.backend.entity.auth.UserEntity;
import com.suresoft.analyzer.backend.exception.ApiException;
import com.suresoft.analyzer.backend.exception.ErrorCode;
import com.suresoft.analyzer.backend.repository.analysis.CriteriaRepository;
import com.suresoft.analyzer.backend.repository.analysis.VariableRepository;
import com.suresoft.analyzer.backend.repository.analysis.dataset.curation.CurationProjectCriteriaRepository;
import com.suresoft.analyzer.backend.repository.analysis.evaluation.EvaluationProjectCriteriaRepository;
import com.suresoft.analyzer.backend.repository.auth.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CriteriaService {
    private final VariableRepository variableRepository;
    private final CriteriaRepository criteriaRepository;
    private final UserRepository userRepository;
    private final CurationProjectCriteriaRepository curationProjectCriteriaRepository;
    private final EvaluationProjectCriteriaRepository evaluationProjectCriteriaRepository;
    private final CurationService curationService;
    private final EvaluationService evaluationService;

    public List<CriteriaDto> getAllCriteria(){
        return  criteriaRepository.findAll().stream().sorted(Comparator.comparing(CriteriaEntity::getName))
                .map(criteriaEntity -> {
                    CriteriaDto dto = new CriteriaDto(criteriaEntity);
                    dto.setVariables(variableRepository.findByCriteriaId(dto.getId()).stream().map(VariableDto::new).collect(Collectors.toList()));
                    return dto;
                })
                .collect(Collectors.toList());
    }

    public List<TreeFolderNodeDto<CriteriaDto>> getMyCriteria(String userId) {
        List<CriteriaEntity> crts = criteriaRepository.findByUserId(userId);
        List<TreeFolderNodeDto<CriteriaDto>> result = new ArrayList<>();

        if (crts.size() > 0) {
            // 생성된 날짜 기준으로 읽어오기
            List<CriteriaDto> crtDtos = crts.stream()
                    .sorted(Comparator.comparing(CriteriaEntity::getType)
                            .thenComparing(criteriaEntity -> criteriaEntity.getCreatedAt()).reversed())
                    .map(criteriaEntity -> {
                        CriteriaDto dto = new CriteriaDto(criteriaEntity);
                        dto.setVariables(variableRepository.findByCriteriaId(dto.getId()).stream().map(VariableDto::new).collect(Collectors.toList()));
                        return dto;})
                    .toList();
            Map<String, List<TreeFolderNodeDto<CriteriaDto>>> folderMap = new LinkedHashMap<>();
            // type으로 폴더링
            for (CriteriaDto crtDto : crtDtos) {
                String folderName = crtDto.getType();
                TreeFolderNodeDto fileNodeDto = new TreeFolderNodeDto(
                        crtDto.getName(),
                        crtDto.getId(),
                        true,
                        crtDto,
                        null
                );
                if(folderMap.containsKey(folderName)) {
                    folderMap.get(folderName).add(fileNodeDto);
                }else {
                    List<TreeFolderNodeDto<CriteriaDto>> files = new ArrayList<TreeFolderNodeDto<CriteriaDto>>();
                    files.add(fileNodeDto);
                    folderMap.put(folderName,files);
                }
            }
            // tree folder 객체로 생성
            // script,
            for(String key : folderMap.keySet()) {
                result.add(new TreeFolderNodeDto<>(
                        key,
                        key,
                        false,
                        null,
                        folderMap.get(key)
                ));
            }
        }
        return result;
    }

    public List<CriteriaDto> getCriteriasByUserId(String userId) {
        return criteriaRepository.findByUserId(userId).stream().sorted(Comparator.comparing(CriteriaEntity::getName))
                .map(criteriaEntity -> {
                    CriteriaDto dto = new CriteriaDto(criteriaEntity);
                    dto.setVariables(variableRepository.findByCriteriaId(dto.getId()).stream().map(VariableDto::new).collect(Collectors.toList()));
                    return dto;})
                .collect(Collectors.toList());
    }

    public CriteriaDto saveCriteria(String userId, CriteriaDto crtDto) {
        UserEntity user = userRepository.findById(userId).orElseThrow(() ->  new ApiException(ErrorCode.RESOURCE_NOT_FOUND, "User Not Found"));
        CriteriaEntity newEntity = new CriteriaEntity();
        newEntity.setUser(user);
        newEntity.setCreatedAt(crtDto.getCreatedAt());
        newEntity.setName(crtDto.getName());
        newEntity.setType(crtDto.getType());
        newEntity.setScript_path("");
        CriteriaEntity savedEntity = criteriaRepository.save(newEntity);
        // variable 저장
        crtDto.getVariables().stream().map(variableDto -> {
            VariableEntity variableEntity = new VariableEntity();
            variableEntity.setCriteria(savedEntity);
            variableEntity.setName(variableDto.getName());
            variableEntity.setPath(variableDto.getPath());
            return variableRepository.save(variableEntity);
        });

        CriteriaDto resultDto = new CriteriaDto(savedEntity);
        resultDto.setVariables(variableRepository.findByCriteriaId(resultDto.getId()).stream().map(VariableDto::new).collect(Collectors.toList()));
        return resultDto;
    }

    @Transactional
    public void updateCriteria(CriteriaDto crtDto) {
        CriteriaEntity crtEntity = criteriaRepository.findById(crtDto.getId()).orElseThrow(() -> new IllegalArgumentException("기준이 존재하지 않습니다."));
        crtEntity.setName(crtDto.getName());
        for(VariableDto variableDto : crtDto.getVariables()){
            boolean isUpdated = false;
            for(VariableEntity variableEntity : variableRepository.findByCriteriaId(crtEntity.getId()))
            {
                if(variableEntity.getId().equals(variableDto.getId())) {
                    variableEntity.setName(variableDto.getName());
                    variableEntity.setPath((variableDto.getPath()));
                    isUpdated = true;
                    break;
                }
            }
            // 업데이트 되지 않았다면, 새로 추가된 변수로 새로 추가해준다.
            if(!isUpdated) {
                VariableEntity newVariable = new VariableEntity();
                newVariable.setCriteria(crtEntity);
                newVariable.setName(variableDto.getName());
                newVariable.setPath(variableDto.getPath());
                variableRepository.save(newVariable);
            }
        }
    }

    public void deleteCriteriaVariable(String variableId){
        // 엔티티 존재 여부 확인
        if(!variableRepository.existsById(variableId)) {
            throw new IllegalArgumentException("변수가 존재하지 않습니다. "+variableId);
        }
        // 변수 삭제
        variableRepository.deleteById(variableId);
    }

    public VariableDto saveVariable(String crtId, VariableDto variableDto) {
        CriteriaEntity criteria = criteriaRepository.findById(crtId).orElseThrow();
        VariableEntity newVariableEntity = new VariableEntity();
        newVariableEntity.setCriteria(criteria);
        newVariableEntity.setName(variableDto.getName());
        newVariableEntity.setPath(variableDto.getPath());

        VariableEntity savedEntity = variableRepository.save(newVariableEntity);
        return new VariableDto(savedEntity);
    }

    @Transactional
    public CriteriaDto saveScript(String crtId, String script) {
        CriteriaEntity criteria = criteriaRepository.findById(crtId).orElseThrow();
        // script file save
        String scriptsDir = "C:/nginx/script-files";
        try {
            // 디렉토리 존재 확인 및 없으면 생성
            Path directoryPath = Paths.get(scriptsDir);
            if (!Files.exists(directoryPath)) {
                Files.createDirectories(directoryPath);
            }
            // 파일 경로 설정
            Path filePath = Paths.get(scriptsDir, criteria.getName() + ".py");
            // 파일로 내용 저장
            Files.writeString(filePath, script);
            // 기준의 script path 등록
            criteria.setScript_path(filePath.toString());
        }catch (IOException e) {
            throw new IllegalArgumentException(e.getMessage());
        }
        return new CriteriaDto(criteria);
    }

    public String getScript(String crtId) {
        CriteriaEntity criteria = criteriaRepository.findById(crtId).orElseThrow();
        String script = "";
        try {
            // 디렉토리 존재 확인 및 없으면 생성
            Path filePath = Paths.get(criteria.getScript_path());
            if (Files.exists(filePath)) {
                script = Files.readString(filePath);
            }
        }catch (IOException e) {
            throw new IllegalArgumentException(e.getMessage());
        }
        return script;
    }

    @Transactional
    public CriteriaDto saveQuery(String crtId, String query) {
        CriteriaEntity criteria = criteriaRepository.findById(crtId).orElseThrow();
        // script file save
        String scriptsDir = "C:/nginx/query-files";
        try {
            // 디렉토리 존재 확인 및 없으면 생성
            Path directoryPath = Paths.get(scriptsDir);
            if (!Files.exists(directoryPath)) {
                Files.createDirectories(directoryPath);
            }
            // 파일 경로 설정
            Path filePath = Paths.get(scriptsDir, criteria.getName() + ".query");
            // 파일로 내용 저장
            Files.writeString(filePath, query);
            // 기준의 script path 등록
            criteria.setScript_path(filePath.toString());
        }catch (IOException e) {
            throw new IllegalArgumentException(e.getMessage());
        }
        return new CriteriaDto(criteria);
    }

    public String getQuery(String crtId) {
        CriteriaEntity criteria = criteriaRepository.findById(crtId).orElseThrow();
        String query = "";
        try {
            // 디렉토리 존재 확인 및 없으면 생성
            Path filePath = Paths.get(criteria.getScript_path());
            if (Files.exists(filePath)) {
                query = Files.readString(filePath);
            }
        }catch (IOException e) {
            throw new IllegalArgumentException(e.getMessage());
        }
        return query;
    }

    @Transactional
    public void deleteCriteria(String crtId) {
        // 엔티티 존재 여부 확인
        if (!criteriaRepository.existsById(crtId)) {
            throw new IllegalArgumentException("기준이 존재하지 않습니다.");
        }
        // 해당 기준을 사용하는 프로젝트 기준 삭제
        List<CurationProjectCriteriaEntity> curationProjectCriteriaEntities = curationProjectCriteriaRepository.findByCriteriaIdOrderByCreatedAtAsc(crtId);
        for(CurationProjectCriteriaEntity deleteEntity : curationProjectCriteriaEntities) {
            curationService.deleteProjectCriteria(deleteEntity.getId());
        }

        List<EvaluationProjectCriteriaEntity> evaluationProjectCriteriaEntities = evaluationProjectCriteriaRepository.findByCriteriaIdOrderByCreatedAtAsc(crtId);
        for(EvaluationProjectCriteriaEntity deleteEntity : evaluationProjectCriteriaEntities) {
            evaluationService.deleteProjectCriteria(deleteEntity.getId());
        }
        // 기준 변수 삭제
        variableRepository.deleteByCriteriaId(crtId);
        // 기준 삭제
        criteriaRepository.deleteById(crtId);
    }
}
