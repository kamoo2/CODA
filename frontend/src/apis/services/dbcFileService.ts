import { check } from 'prettier';
import { ApiResponse } from '@/types/common'; // 응답 wrapper 타입 정의된 경우
import { privateApiClient } from '@/apis/apiClient';
import { DbcFileEntity, DbcFileDto } from '@/types/storage';

const dbcService = {
  async loadDbcFiles(): Promise<string[]> {
    const res = await privateApiClient.get<ApiResponse<string[]>>('/dbc/list');
    if (res.data.success) {
      return res.data.result;
    }
    throw new Error('DBC 파일 목록을 불러오지 못했습니다.');
  },

  uploadDbcToNginx: async (formData: FormData): Promise<string> => {
    const res = await privateApiClient.post<ApiResponse<string>>('/dbc/upload-cloud', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    if (res.data.success) {
      return res.data.result;
    }
    throw new Error('DBC 등록 실패');
  },

  uploadDbcToDatabase: async (name: string): Promise<{ id: string; name: string }> => {
    const res = await privateApiClient.post<ApiResponse<{ id: string; name: string }>>('/dbc/upload-db', { name });

    if (res.data.success) {
      return res.data.result;
    }
    throw new Error('DBC 등록 실패');
  },
  async loadDbcFilesInDatabase(): Promise<DbcFileDto[]> {
    const res = await privateApiClient.get<ApiResponse<{ id: string; name: string; createdAt: string }[]>>('/dbc/map');
    if (!res.data.success) {
      throw new Error('DBC 목록 조회 실패');
    }
    return res.data.result.map((item) => ({
      id: item.id,
      name: item.name,
      createdAt: item.createdAt,
    }));
  },

  deleteDbcFiles: async (ids: string[], userId: string): Promise<void> => {
    const res = await privateApiClient.post(`/dbc/delete-dbc-files-batch?userId=${userId}`, { ids });
    if (!res.data.success) {
      throw new Error(res.data.message ?? 'DBC 파일 삭제 실패');
    }
  },

  checkDbcFileExists: async (fileName: string): Promise<boolean> => {
    const res = await privateApiClient.get<ApiResponse<boolean>>(
      `/dbc/check-duplicate?name=${encodeURIComponent(fileName)}`,
    );
    if (res.data.success) {
      return res.data.result;
    }
    throw new Error('DBC 파일 존재 여부 확인 실패');
  },
};

export { dbcService };
