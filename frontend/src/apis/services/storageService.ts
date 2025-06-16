import { AxiosResponse } from 'axios';
import { privateApiClient } from '@/apis/apiClient';
import {
  StorageSetDto,
  StorageCredentialsDto,
  GetBucketsDto,
  Bucket,
  GetBucketDetailsDto,
  GetBucketFolder,
  BucketWithoutKeyDto,
  SelectedFileWithParserAndDbc,
} from '@/types/storage';
import { FolderNode } from '@/types/common';
import { ApiResponse } from '@/types/common';
export { storageService };
import { UploadFileDto, UploadFileCreateRequestDto } from '@/types/storage';

const storageService = {
  getUploadFiles: async (): Promise<ApiResponse<UploadFileDto[]>> => {
    const response: AxiosResponse<ApiResponse<UploadFileDto[]>> =
      await privateApiClient.get(`/storage/upload-files/me`);
    return response.data; // ✅ Axios의 `data` 프로퍼티를 반환하여 오류 해결!
  },

  getUploadFile: async (id: string): Promise<ApiResponse<UploadFileDto>> => {
    const response: AxiosResponse<ApiResponse<UploadFileDto>> = await privateApiClient.get(
      `/storage/upload-file?id=${id}`,
    );
    return response.data; // ✅ Axios의 `data` 프로퍼티를 반환하여 오류 해결!
  },

  uploadFilesToServer: async (localSelectedFiles: SelectedFileWithParserAndDbc[], bucketId: string): Promise<void> => {
    const filtered = localSelectedFiles.filter((f) => f.parserName && f.extension !== undefined);

    for (const file of filtered) {
      try {
        const requestBody: UploadFileCreateRequestDto = {
          name: file.title,
          path: file.path,
          parserId: file.parserName!,
          bucketId: bucketId,
          dbcFileId: file.dbcFileId ?? null,
        };

        console.log('업로드 요청:', requestBody);
        const res = await privateApiClient.post<ApiResponse<string>>('/storage/upload-files', requestBody);
        console.log(` ${file.title} 업로드 성공:`, res.data.result);
      } catch (err) {
        console.error(` ${file.title} 업로드 실패`, err);
      }
    }
  },

  uploadMultipleFiles: async (files: UploadFileCreateRequestDto[]): Promise<string[]> => {
    const response = await privateApiClient.post<ApiResponse<string[]>>('/storage/upload-files/batch', files);
    return response.data.result;
  },

  checkUploadedBatch: async (s3Keys: string[]): Promise<Record<string, boolean>> => {
    const response: AxiosResponse<ApiResponse<Record<string, boolean>>> = await privateApiClient.post(
      '/s3/upload-status/batch',
      s3Keys,
    );

    // ApiResponse의 data를 반환
    return response.data.result;
  },
  checkStorageCredentials: async ({ accessKey, secretKey }: StorageCredentialsDto): Promise<ApiResponse<string>> => {
    const response = await privateApiClient.post<ApiResponse<string>>('/s3/check-credentials', {
      accessKey,
      secretKey,
    });
    return response.data;
  },

  getStorageBuckets: async ({ accessKey, secretKey, region }: GetBucketsDto): Promise<ApiResponse<string>> => {
    const response = await privateApiClient.post<ApiResponse<string>>('/s3/buckets-list', {
      accessKey,
      secretKey,
      region,
    });
    return response.data;
  },
  getMyStorageBucketsList: async (): Promise<ApiResponse<Bucket[]>> => {
    const response = await privateApiClient.get<ApiResponse<Bucket[]>>('/s3/my-buckets');
    return response.data;
  },

  getMyStorageBucketsListWithoutKey: async ({ name, id }: BucketWithoutKeyDto): Promise<ApiResponse<Bucket>> => {
    const response = await privateApiClient.get<ApiResponse<Bucket>>('/s3/my-buckets', {
      params: {
        name,
        id,
      },
    });

    return response.data;
  },

  saveStorageBuckets: async ({
    accessKey,
    secretKey,
    region,
    name: bucketName,
  }: StorageSetDto): Promise<ApiResponse<string>> => {
    const response = await privateApiClient.post<ApiResponse<string>>('/s3/set-credentials', {
      accessKey,
      secretKey,
      region,
      name: bucketName,
    });
    return response.data;
  },

  getBucketDetails: async ({ bucketId }: GetBucketDetailsDto): Promise<ApiResponse<Bucket>> => {
    const response = await privateApiClient.get<ApiResponse<Bucket>>('/s3/get-my-bucket-details', {
      params: {
        bucketId, // 쿼리 파라미터로 전달
      },
    });
    return response.data;
  },

  getBucketAllFiles: async ({ bucketName, prefix }: GetBucketFolder): Promise<ApiResponse<object>> => {
    const response = await privateApiClient.get<ApiResponse<object>>('/s3/get-bucket-objects', {
      params: {
        bucketName,
        prefix: prefix ?? '', // ✅ 빈 문자열이라도 명시적으로 보내기
      },
    });
    return response.data;
  },

  postUsingBucket: async ({ bucketId }: GetBucketDetailsDto): Promise<ApiResponse<FolderNode[]>> => {
    const response = await privateApiClient.get<ApiResponse<FolderNode[]>>('/s3/change-use-bucket', {
      params: { bucketId },
    });
    return response.data;
  },

  getBucketUsage: async (bucketName: string): Promise<ApiResponse<{ usedSize: number }>> => {
    const response = await privateApiClient.get<ApiResponse<{ usedSize: number }>>('/s3/bucket-usage', {
      params: { bucketName },
    });

    return response.data;
  },

  deleteBucket: async ({ bucketId }: GetBucketDetailsDto): Promise<ApiResponse<string>> => {
    const response = await privateApiClient.delete<ApiResponse<string>>('/s3/delete-bucket', {
      params: { bucketId },
    });
    return response.data;
  },

  updateUploadFile: async (id: string, parserId?: string, dbcFileId?: string) => {
    const params: Record<string, string> = {};
    if (parserId) params.parserId = parserId;
    if (dbcFileId) params.dbcFileId = dbcFileId;

    return privateApiClient.patch(`/storage/upload-file/${id}`, null, { params });
  },

  deleteUploadFiles: async (fileIds: string[]): Promise<DeleteUploadFilesResult> => {
    const res = await privateApiClient.post<ApiResponse<DeleteUploadFilesResult>>(
      '/storage/delete-upload-files',
      fileIds,
    );
    return res.data.result;
  },

  // 아래부터는 buecket의 원본만 건드는 부분
  getBucketFolders: async ({ bucketName, prefix }: GetBucketFolder): Promise<ApiResponse<FolderNode[]>> => {
    const response = await privateApiClient.get<ApiResponse<FolderNode[]>>('/s3/get-bucket-folder-tree', {
      params: { bucketName, prefix },
    });
    return response.data;
  },
  assignCurrentBucket: async ({ bucketId }: { bucketId: string }) => {
    const response = await privateApiClient.put(`/s3/set-currentUsed-bucket/${bucketId}`);
    return response.data;
  },

  getFilesUnderFolder: async (bucketName: string, prefix: string): Promise<ApiResponse<any[]>> => {
    const res = await privateApiClient.get<ApiResponse<any[]>>(`/s3/get-files-under-folder`, {
      params: {
        bucketName,
        prefix,
      },
    });
    return res.data;
  },
};
type DeleteUploadFilesResult = {
  deleted: string[];
  skipped: {
    uploadFileId: string;
    fileName: string;
    usedIn: string[];
  }[];
};
export default storageService;
