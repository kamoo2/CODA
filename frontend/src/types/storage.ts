// Request

// Response
export interface UploadFileDto {
  id: string;
  name: string;
  s3Url: string;
  parserName: string;
  dbcFileName: string | null;
  timestamp: number;
  parserId: string;
  dbcFileId: string | null;
}
export interface StorageCredentialsDto {
  accessKey: string;
  secretKey: string;
}

export interface StorageSetDto {
  accessKey: string;
  secretKey: string;
  region: string;
  name: string;
}

export interface Bucket {
  id: string;
  name: string;
  region: string;
  accessKey: string;
  secretKey: string;
  createdAt: string;
  isUsed: boolean;
}
export interface BucketWithoutKeyDto {
  id: string;
  name: string;
}
export interface GetBucketsDto {
  region: string;
  accessKey: string;
  secretKey: string;
}

export interface GetBucketDetailsDto {
  bucketId: string;
}

export interface GetBucketFolder {
  bucketName: string;
  prefix: string;
}

export interface UploadFileCreateRequestDto {
  name: string;
  path: string;
  bucketId: string;
  parserId: string;
  dbcFileId: string | null;
}

export type SelectedFileWithParserAndDbc = {
  title: string; // 파일 이름
  extension?: string; // 확장자
  parserName?: string; // 선택한 파서 (lidar, gps 등)
  parserId?: string; // 선택한 파서 (lidar, gps 등)
  dbcFilePath?: string | null; // 선택한 DBC 파일
  dbcFileName?: string; // DBC 파일 이름 (표시용)
  dbcFileId?: string; // DBC 파일 이름 (표시용)
  path: string; // S3 경로 (예: bucketName/fileName)
  fileId: string;
};

export type UploadFileCreateRequest = {
  name: string;
  path: string;
  parserId: string;
  extension: string;
};

export type DbcFileEntity = {
  dbc_file_id: string;
  path: string;
};

export interface DbcFileDto {
  id: string;
  name: string;
  createdAt: string;
}
