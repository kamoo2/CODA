package com.suresoft.analyzer.backend.service.storage;

import com.suresoft.analyzer.backend.dto.storage.DbcFileDto;
import com.suresoft.analyzer.backend.entity.storage.DbcFileEntity;
import com.suresoft.analyzer.backend.repository.storage.DbcFileRepository;
import org.springframework.stereotype.Service;

import java.io.File;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class DbcFileService {
    private final DbcFileRepository dbcFileRepository;
    private static final String DBC_FILES_DIR = "C:/nginx/dbc-files";

    public DbcFileService(DbcFileRepository dbcFileRepository) {
        this.dbcFileRepository = dbcFileRepository;
    }

    public DbcFileEntity save(DbcFileEntity dbcFile) {
        return dbcFileRepository.save(dbcFile);
    }

    public List<DbcFileEntity> findAll() {
        return dbcFileRepository.findAll();
    }

    public Optional<DbcFileEntity> findById(String id) {
        return dbcFileRepository.findById(id);
    }



    public DbcFileEntity saveIfNotExists(String name) {
        return dbcFileRepository.findByName(name)
                .orElseGet(() -> {
                    DbcFileEntity newFile = new DbcFileEntity();
                    newFile.setName(name);
                    return dbcFileRepository.save(newFile);
                });
    }

    public List<DbcFileDto> getAllDbcFiles() {
        return dbcFileRepository.findAll().stream()
                .map(e -> new DbcFileDto(e.getId(), e.getName(), e.getCreatedAt()))
                .collect(Collectors.toList());
    }


    public void deleteMultipleDbcFiles(List<String> ids , String userId) {
        for (String id : ids) {
            DbcFileEntity entity = dbcFileRepository.findById(id)
                    .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 ID: " + id));

            String userDirPath = DBC_FILES_DIR + "/" + userId;
            File file = new File(userDirPath, entity.getName());
            if (file.exists()) {
                file.delete(); // 삭제 실패는 무시
            }

            dbcFileRepository.delete(entity);
        }
    }


    public boolean existsByName(String name) {
        return dbcFileRepository.existsByName(name);
    }

}
