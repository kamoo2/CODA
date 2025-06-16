package com.suresoft.analyzer.backend.service.storage;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.suresoft.analyzer.backend.dto.common.TreeFolderNodeDto;
import com.suresoft.analyzer.backend.dto.storage.BucketDto;
import com.suresoft.analyzer.backend.dto.storage.UploadFileDto;
import com.suresoft.analyzer.backend.entity.auth.UserEntity;
import com.suresoft.analyzer.backend.entity.storage.BucketEntity;
import com.suresoft.analyzer.backend.entity.storage.UploadFileEntity;
import com.suresoft.analyzer.backend.exception.ApiException;
import com.suresoft.analyzer.backend.exception.ErrorCode;
import com.suresoft.analyzer.backend.repository.auth.UserRepository;
import com.suresoft.analyzer.backend.repository.storage.UploadFileRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;
import com.suresoft.analyzer.backend.repository.storage.BucketRepository;

import java.net.URI;
import java.util.*;
import java.util.stream.Collectors;


@Service
public class S3Service {
    private final SecureStorageService secureStorageService;
    private S3Client s3Client;
    //private String wasabiEndpoint = "https://s3.ap-northeast-1.wasabisys.com"; // 도쿄 리전
    private final BucketRepository bucketRepository;
    private UploadFileRepository uploadFileRepository;
    private UserRepository userRepository;

    public S3Service(SecureStorageService secureStorageService, BucketRepository bucketRepository, UploadFileRepository uploadFileRepository,UserRepository userRepository) {
        this.secureStorageService = secureStorageService;
        this.bucketRepository = bucketRepository;
        this.uploadFileRepository = uploadFileRepository;
        this.userRepository = userRepository;
    }

    /**
     * AWS Credentials 검증 (Access Key & Secret Key가 올바른지 확인)
     */
    public void validateCredentials(String accessKey, String secretKey, String regionStr) {
        try {
            Region region = Region.of(regionStr); // 문자열을 리전으로 변환
            String endpoint = String.format("https://s3.%s.wasabisys.com", regionStr); // endpoint 동적 구성

            // Wasabi S3 클라이언트 생성
            S3Client tempS3Client = S3Client.builder()
                    .credentialsProvider(StaticCredentialsProvider.create(
                            AwsBasicCredentials.create(accessKey, secretKey)))
                    .endpointOverride(URI.create(endpoint))
                    .region(region)
                    .build();

            // 버킷 목록 가져오기 (자격 검증)
            tempS3Client.listBuckets(ListBucketsRequest.builder().build());

        } catch (S3Exception e) {
            throw new ApiException(ErrorCode.INVAILD_STORAGE, "S3 자격 증명 검증 실패: " + e.awsErrorDetails().errorMessage());
        } catch (Exception e) {
            throw new ApiException(ErrorCode.INTERNAL_SERVER_ERROR, e.getMessage());
        }
    }
    public String validateAndDetectRegion(String accessKey, String secretKey) {
        List<String> knownWasabiRegions = List.of(
                "us-east-1", "us-east-2", "us-central-1", "us-west-1",
                "eu-central-1", "eu-west-1", "ap-northeast-1"
        );

        for (String regionStr : knownWasabiRegions) {
            try {
                Region region = Region.of(regionStr);
                String endpoint = String.format("https://s3.%s.wasabisys.com", regionStr);

                S3Client s3Client = S3Client.builder()
                        .credentialsProvider(StaticCredentialsProvider.create(
                                AwsBasicCredentials.create(accessKey, secretKey)))
                        .endpointOverride(URI.create(endpoint))
                        .region(region)
                        .build();

                s3Client.listBuckets(); // 성공하면 인증 완료

                return regionStr; // ✅ 사용 가능한 리전 반환

            } catch (S3Exception e) {
                // 무시하고 다음 리전으로
            }
        }

        throw new ApiException(ErrorCode.INVAILD_STORAGE, "입력한 키로 인증 가능한 리전을 찾을 수 없습니다.");
    }


//    public List<String> getBucketNameList(String accessKey, String secretKey, String regionStr) {
//        try {
//            AwsBasicCredentials awsCreds = AwsBasicCredentials.create(accessKey, secretKey);
//            Region region = Region.of(regionStr);
//            String endpoint = String.format("https://s3.%s.wasabisys.com", regionStr);
//
//            S3Client s3Client = S3Client.builder()
//                    .credentialsProvider(StaticCredentialsProvider.create(awsCreds))
//                    .endpointOverride(URI.create(endpoint))
//                    .region(region)
//                    .build();
//
//            ListBucketsResponse response = s3Client.listBuckets();
//
//            return response.buckets().stream()
//                    .map(Bucket::name)  // 이름만 추출
//                    .collect(Collectors.toList());
//
//        } catch (S3Exception e) {
//            throw new ApiException(ErrorCode.INVAILD_STORAGE);
//        } catch (Exception e) {
//            throw new ApiException(ErrorCode.INTERNAL_SERVER_ERROR);
//        }
//    }

    public List<String> getBucketNameList(String accessKey, String secretKey, String regionStr) {
        try {
            AwsBasicCredentials awsCreds = AwsBasicCredentials.create(accessKey, secretKey);
            Region region = Region.of(regionStr);
            String endpoint = String.format("https://s3.%s.wasabisys.com", regionStr);

            S3Client s3Client = S3Client.builder()
                    .credentialsProvider(StaticCredentialsProvider.create(awsCreds))
                    .endpointOverride(URI.create(endpoint))
                    .region(region)
                    .build();

            List<String> regionBuckets = new ArrayList<>();

            ListBucketsResponse response = s3Client.listBuckets();

            for (Bucket bucket : response.buckets()) {
                try {
                    s3Client.headBucket(b -> b.bucket(bucket.name()));
                    // headBucket 성공하면 현재 region에서 접근 가능 → 포함
                    regionBuckets.add(bucket.name());
                } catch (S3Exception e) {
                    // 해당 region에서 접근 안 되면 무시
                }
            }

            return regionBuckets;

        } catch (S3Exception e) {
            throw new ApiException(ErrorCode.INVAILD_STORAGE);
        } catch (Exception e) {
            throw new ApiException(ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }


    /**
     * AWS Key를 암호화하여 저장
     */
    public void setAwsCredentials(String accessKey, String secretKey, String region, String name, UserEntity user, Boolean isUsed) {
        // Access Key & Secret Key 암호화 후 저장
        String encryptedAccessKey = secureStorageService.encrypt(accessKey);
        String encryptedSecretKey = secureStorageService.encrypt(secretKey);

        //기존 동일한 버킷이 있는지 확인 (중복 방지)
        Optional<BucketEntity> existingBucket = bucketRepository.findByName(name);
        if (existingBucket.isPresent()) {
            throw new ApiException(ErrorCode.DUPLICATE_RESOURCE ,"이미 저장되어있는 버킷입니다.");
        }

        //새로운 BucketEntity 생성 및 저장
        BucketEntity bucket = new BucketEntity(encryptedAccessKey, encryptedSecretKey, region, name, user, false);
        bucketRepository.save(bucket);

    }


    public List<BucketDto> getUserBuckets(UserEntity user) {
        // 여러 결과를 받을 수 있도록 수정
        List<BucketEntity> buckets = bucketRepository.findAllByUserId(user.getId());

        return buckets.stream()
                .map(bucket -> new BucketDto(
                        bucket.getId(),
                        bucket.getName(),
                        bucket.getRegion(),
                        secureStorageService.getDecryptedValue("accessKey", bucket.getAccessKey()),
                        secureStorageService.getDecryptedValue("secretKey", bucket.getSecretKey()),
                        bucket.getCreatedAt()
                        //bucket.getIsUsed()
                ))
                .collect(Collectors.toList());
    }

    // BucketDto 기반으로 버킷 디테일을 가져오는 메서드
    public BucketDto getBucketDetailById(UserEntity user, String bucketId) {
        // 사용자 ID와 버킷 ID를 기준으로 단일 결과 조회
        Optional<BucketEntity> optionalBucket = bucketRepository.findByUserIdAndId(user.getId(), bucketId);

        // 버킷이 존재하지 않는 경우 예외 처리
        if (!optionalBucket.isPresent()) {
            throw new IllegalStateException("해당 ID의 버킷을 찾을 수 없음: " + bucketId);
        }

        BucketEntity bucket = optionalBucket.get();

        // BucketEntity를 BucketDto로 변환해서 반환
        return new BucketDto(
                bucket.getId(),
                bucket.getName(),
                bucket.getRegion(),
                secureStorageService.getDecryptedValue("accessKey", bucket.getAccessKey()),
                secureStorageService.getDecryptedValue("secretKey", bucket.getSecretKey()),
                bucket.getCreatedAt()
//                bucket.getIsUsed()
        );
    }


    public void initializeS3Client(String bucketName) {
        Optional<BucketEntity> bucketOptional = bucketRepository.findByName(bucketName);

        if (bucketOptional.isEmpty()) {
            throw new IllegalStateException("해당 이름의 버킷을 찾을 수 없음: " + bucketName);
        }

        BucketEntity bucket = bucketOptional.get();
        String accessKey = secureStorageService.getDecryptedValue("accessKey", bucket.getAccessKey());
        String secretKey = secureStorageService.getDecryptedValue("secretKey", bucket.getSecretKey());
        String regionStr = bucket.getRegion();

        Region region;
        try {
            region = Region.of(regionStr);
        } catch (Exception e) {
            throw new ApiException(ErrorCode.INVAILD_STORAGE, "유효하지 않은 리전입니다: " + regionStr);
        }

        //  사용자 region 기반으로 endpoint 구성
        String endpoint = String.format("https://s3.%s.wasabisys.com", regionStr);

        this.s3Client = S3Client.builder()
                .endpointOverride(URI.create(endpoint)) //  사용자 리전 기반 endpoint
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(accessKey, secretKey)
                ))
                .region(region) //  리전도 동적으로 설정
                .build();

        System.out.println("Wasabi Storage 연결 완료 (" + bucketName + ", " + regionStr + ")");
    }


    public Map<String, Object> convertJsonToMap(JsonNode node) {
        Map<String, Object> result = new LinkedHashMap<>();
        Iterator<Map.Entry<String, JsonNode>> fields = node.fields();

        while (fields.hasNext()) {
            Map.Entry<String, JsonNode> entry = fields.next();
            String key = entry.getKey();
            JsonNode value = entry.getValue();

            if (value.isObject()) {
                //  진짜 파일인지 확인: type == "File" 인 경우에만 무시
                if (value.has("type") && "File".equals(value.get("type").asText())) {
                    continue;
                }

                // 폴더면 재귀적으로 파싱
                result.put(key, convertJsonToMap(value));
            }
        }

        return result;
    }


    public List<TreeFolderNodeDto> extractFoldersOnly(String bucketName, String prefix) throws Exception {
        String json = getBucketAndObjectsInfoAsJson(bucketName, prefix);

        ObjectMapper mapper = new ObjectMapper();
        JsonNode root = mapper.readTree(json);
        JsonNode filesNode = root.get("files");

        Map<String, Object> folderMap = convertJsonToMap(filesNode);
        return TreeNodeConverter.convertFolderMapToTree(folderMap, "");
    }

    public class TreeNodeConverter {
        public static List<TreeFolderNodeDto> convertFolderMapToTree(Map<String, Object> folderMap, String parentPath) {
            List<TreeFolderNodeDto> result = new ArrayList<>();

            for (Map.Entry<String, Object> entry : folderMap.entrySet()) {
                String folderName = entry.getKey();
                Object value = entry.getValue();

                String currentPath = parentPath.isEmpty() ? folderName : parentPath + "/" + folderName;

                TreeFolderNodeDto node = new TreeFolderNodeDto();
                node.setTitle(folderName);
                node.setKey(currentPath);

                if (value instanceof Map) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> childrenMap = (Map<String, Object>) value;
                    node.setChildren(convertFolderMapToTree(childrenMap, currentPath));
                }

                result.add(node);
            }

            return result;
        }
    }

    public String getBucketAndObjectsInfoAsJson(String bucketName, String prefix) throws Exception {
        S3Client s3Client = createS3ClientFromBucketName(bucketName);

        // JSON 변환을 위한 ObjectMapper 생성
        ObjectMapper objectMapper = new ObjectMapper();
        ObjectNode rootNode = objectMapper.createObjectNode();

        // 🔹 버킷 소유자 및 크기 가져오기
        GetBucketAclResponse bucketAclResponse = s3Client.getBucketAcl(
                GetBucketAclRequest.builder().bucket(bucketName).build()
        );
        rootNode.put("bucketName", bucketName);
        rootNode.put("bucketOwner", bucketAclResponse.owner().displayName());
        rootNode.put("bucketSize", getBucketSize(bucketName));

        // 🔹 파일 목록 JSON 트리 구조 생성
        ObjectNode filesNode = objectMapper.createObjectNode();
        Map<String, ObjectNode> folderMap = new HashMap<>();
        folderMap.put("", filesNode); // 루트 폴더

        ListObjectsV2Request listRequest = ListObjectsV2Request.builder()
                .bucket(bucketName)
                .prefix(prefix)
                .fetchOwner(true)
                .build();
        ListObjectsV2Response listResponse = s3Client.listObjectsV2(listRequest);

        for (S3Object s3Object : listResponse.contents()) {
            String filePath = s3Object.key(); // 파일의 전체 키(경로명)
            String[] pathParts = filePath.split("/");
            ObjectNode parent = filesNode;
            StringBuilder currentPath = new StringBuilder();

            // 🔹 폴더 구조를 생성 (재귀 없이)
            for (int i = 0; i < pathParts.length - 1; i++) {
                currentPath.append(pathParts[i]).append("/");

                // Key가 없을 때만 값 추가 (폴더 구조 유지)
                folderMap.putIfAbsent(currentPath.toString(), objectMapper.createObjectNode());
                parent.set(pathParts[i], folderMap.get(currentPath.toString()));
                parent = folderMap.get(currentPath.toString());
            }

            // 🔹 파일인지 폴더인지 확인
            if (s3Object.size() > 0) {
                //  파일이면 파일 정보 추가
                ObjectNode fileNode = objectMapper.createObjectNode();
                fileNode.put("filePath", filePath);
                fileNode.put("owner", s3Object.owner() != null ? s3Object.owner().displayName() : "Unknown");
                fileNode.put("lastModified", s3Object.lastModified().toString());
                fileNode.put("fileSize", s3Object.size());
                fileNode.put("type", "File");  //  파일 타입 추가
                parent.set(pathParts[pathParts.length - 1], fileNode);
            } else {
                //  폴더면 파일 정보 없이 유지 + "Folder" 타입 추가
                if (!folderMap.containsKey(filePath)) { // 폴더가 이미 있지 않다면
                    ObjectNode folderNode = objectMapper.createObjectNode();
                    folderNode.put("filePath", filePath);
                    folderNode.put("owner", s3Object.owner() != null ? s3Object.owner().displayName() : "Unknown");
                    folderNode.put("lastModified", s3Object.lastModified().toString());
                    folderNode.put("type", "Folder");  //  파일 타입 추가
                    parent.set(pathParts[pathParts.length - 1], folderNode);
                }
            }
        }

        rootNode.set("files", filesNode);
        return objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(rootNode);
    }


    public long getBucketSize(String bucketName) {
        S3Client s3Client = createS3ClientFromBucketName(bucketName);
        long totalSize = 0;
        ListObjectsV2Request request = ListObjectsV2Request.builder()
                .bucket(bucketName)
                .build();

        ListObjectsV2Response response;
        do {
            response = s3Client.listObjectsV2(request);
            totalSize += response.contents().stream()
                    .mapToLong(S3Object::size)
                    .sum();
            request = request.toBuilder()
                    .continuationToken(response.nextContinuationToken())
                    .build();
        } while (response.isTruncated());

        return totalSize;
    }

//    @Transactional
//    public void changeUsedBucket(UserEntity user, String bucketId) {
//        // 1. 유저의 모든 버킷 가져오기
//        List<BucketEntity> userBuckets = repository.findAllByUserId(user.getId());
//
//        if (userBuckets.isEmpty()) {
//            throw new IllegalStateException("해당 사용자의 버킷이 없습니다.");
//        }
//
//        // 2. 전체 false 처리
//        for (BucketEntity bucket : userBuckets) {
//            bucket.setIsUsed(false);
//        }
//
//        // 3. 특정 버킷만 true 처리
//        boolean found = userBuckets.stream()
//                .filter(bucket -> bucket.getId().equals(bucketId))
//                .findFirst()
//                .map(bucket -> {
//                    bucket.setIsUsed(true);
//                    return true;
//                })
//                .orElse(false);
//
//        if (!found) {
//            throw new IllegalArgumentException("해당 이름의 버킷을 찾을 수 없습니다: " + bucketId);
//        }
//
//        // 4. 저장
//        repository.saveAll(userBuckets);
//    }

    public boolean doesFileExist(String bucketName, String key) {
        try {
            S3Client s3Client = createS3ClientFromBucketName(bucketName);

            HeadObjectRequest request = HeadObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .build();

            s3Client.headObject(request);
            return true;
        } catch (S3Exception e) {
            return e.statusCode() != 404;
        } catch (Exception e) {
            return false;
        }
    }

    public Map<String, Boolean> checkUploadedStatus(List<String> s3Keys) {
        Map<String, Boolean> result = new HashMap<>();
        for (String key : s3Keys) {
            boolean exists = uploadFileRepository.existsByS3Url(key);
            result.put(key, exists);
        }
        return result;
    }

    public long calculateTotalSize(String bucketName) {
        S3Client s3Client = createS3ClientFromBucketName(bucketName);

        long totalSize = 0L;
        String continuationToken = null;

        do {
            ListObjectsV2Request request = ListObjectsV2Request.builder()
                    .bucket(bucketName)
                    .continuationToken(continuationToken)
                    .build();

            ListObjectsV2Response response = s3Client.listObjectsV2(request);

            totalSize += response.contents().stream()
                    .mapToLong(S3Object::size)
                    .sum();

            continuationToken = response.nextContinuationToken();

        } while (continuationToken != null);

        return totalSize;
    }

    public BucketEntity findBucketOrThrow(String bucketId) {
        return bucketRepository.findById(bucketId)
                .orElseThrow(() -> new RuntimeException("버킷이 존재하지 않습니다."));
    }

    @Transactional
    public void deleteBucketFromDb(String bucketId) {
        bucketRepository.deleteById(bucketId);
    }

    @Transactional
    public UserEntity assignBucketToUser(String userId, String bucketId) {
        UserEntity user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
        BucketEntity bucket = bucketRepository.findById(bucketId).orElseThrow(() -> new RuntimeException("Bucket not found"));

        user.setCurrentUsedBucket(bucket);
        return userRepository.save(user);
    }


    private S3Client createS3ClientFromBucketName(String bucketName) {
        BucketEntity bucket = bucketRepository.findByName(bucketName)
                .orElseThrow(() -> new ApiException(ErrorCode.RESOURCE_NOT_FOUND, "버킷을 찾을 수 없습니다."));

        String region = bucket.getRegion();
        String endpoint = "https://s3." + region + ".wasabisys.com";

        String accessKey = secureStorageService.getDecryptedValue("accessKey", bucket.getAccessKey());
        String secretKey = secureStorageService.getDecryptedValue("secretKey", bucket.getSecretKey());

        return S3Client.builder()
                .credentialsProvider(StaticCredentialsProvider.create(AwsBasicCredentials.create(accessKey, secretKey)))
                .region(Region.of(region))
                .endpointOverride(URI.create(endpoint))
                .build();
    }
    public List<Map<String, Object>> getAllFilesUnderFolder(String bucketName, String prefix) throws Exception {
        S3Client s3Client = createS3ClientFromBucketName(bucketName);

        ListObjectsV2Request listRequest = ListObjectsV2Request.builder()
                .bucket(bucketName)
                .prefix(prefix)
                .fetchOwner(true)
                .build();

        ListObjectsV2Response listResponse = s3Client.listObjectsV2(listRequest);

        List<Map<String, Object>> result = new ArrayList<>();
        List<String> filePaths = new ArrayList<>();

        for (S3Object s3Object : listResponse.contents()) {
            if (s3Object.size() == 0) continue;

            String filePath = s3Object.key();
            filePaths.add(filePath); // 📌 업로드 정보 추적용

            Map<String, Object> fileInfo = new HashMap<>();
            fileInfo.put("filePath", filePath);
            fileInfo.put("title", extractFileName(filePath));
            fileInfo.put("fileSize", s3Object.size());
            fileInfo.put("owner", s3Object.owner() != null ? s3Object.owner().displayName() : "Unknown");
            fileInfo.put("lastModified", s3Object.lastModified().toString());
            fileInfo.put("type", "File");

            result.add(fileInfo);
        }

        // 🔹 업로드된 파일 메타 정보 조회
        List<UploadFileEntity> uploadedFiles = uploadFileRepository.findByS3UrlIn(filePaths);
        Map<String, UploadFileEntity> pathToUploadFileMap = uploadedFiles.stream()
                .collect(Collectors.toMap(
                        UploadFileEntity::getS3Url,
                        file -> file
                ));

        // 🔹 메타정보를 각 결과에 추가
        for (Map<String, Object> file : result) {
            String filePath = (String) file.get("filePath");
            UploadFileEntity uploaded = pathToUploadFileMap.get(filePath);

            if (uploaded != null) {
                file.put("parserName", uploaded.getParser() != null ? uploaded.getParser().getName() : "");
                file.put("parserId", uploaded.getParser() != null ? uploaded.getParser().getId() : "");
                file.put("dbcFileId", uploaded.getDbc() != null ? uploaded.getDbc().getId() : null);
                file.put("id", uploaded.getId()); // UploadFile의 기본 ID
            }
        }

        return result;
    }

    private String extractFileName(String fullPath) {
        String[] parts = fullPath.split("/");
        return parts.length > 0 ? parts[parts.length - 1] : fullPath;
    }

}