import { AxiosResponse } from 'axios';
import { privateApiClient } from '@/apis/apiClient';
import { ApiResponse, TreeNode } from '@/types/common';
import { CriteriaDto, VariableDto } from '@/types/criteria';

const criteriaService = {
  getCreterias: async (): Promise<ApiResponse<CriteriaDto[]>> => {
    const response = await privateApiClient.get<ApiResponse<CriteriaDto[]>>('/criteria/criterias');
    return response.data;
  },

  getMyCriteria: async (): Promise<ApiResponse<TreeNode<CriteriaDto>[]>> => {
    const response: AxiosResponse<ApiResponse<TreeNode<CriteriaDto>[]>> =
      await privateApiClient.get(`/criteria/my-criteria`);
    return response.data;
  },

  getCriteriaByUserId: async (): Promise<ApiResponse<CriteriaDto[]>> => {
    const response = await privateApiClient.get<ApiResponse<CriteriaDto[]>>(`/criteria/criteria-by-userid`);
    return response.data;
  },

  saveCriteria: async (crt: CriteriaDto): Promise<ApiResponse<CriteriaDto>> => {
    const response: AxiosResponse<ApiResponse<CriteriaDto>> = await privateApiClient.post(
      '/criteria/save_criteria',
      crt,
    );
    return response.data;
  },

  saveScript: async (crtId: string, script: string): Promise<ApiResponse<CriteriaDto>> => {
    const response: AxiosResponse<ApiResponse<CriteriaDto>> = await privateApiClient.post('/criteria/save-script', {
      crtId,
      script,
    });
    return response.data;
  },

  getScript: async (crtId: string): Promise<ApiResponse<string>> => {
    const response = await privateApiClient.get<ApiResponse<string>>(`/criteria/get-script?crtId=${crtId}`);
    return response.data;
  },

  saveQuery: async (crtId: string, query: string): Promise<ApiResponse<CriteriaDto>> => {
    const response: AxiosResponse<ApiResponse<CriteriaDto>> = await privateApiClient.post('/criteria/save-query', {
      crtId,
      query,
    });
    return response.data;
  },

  getQuery: async (crtId: string): Promise<ApiResponse<string>> => {
    const response = await privateApiClient.get<ApiResponse<string>>(`/criteria/get-query?crtId=${crtId}`);
    return response.data;
  },

  updateCriteria: async (crt: CriteriaDto) => {
    const response: AxiosResponse<ApiResponse<void>> = await privateApiClient.post(`/criteria/update-criteria`, crt);
    return response.data;
  },

  deleteCriteria: async (crtId: string) => {
    const response: AxiosResponse<ApiResponse<void>> = await privateApiClient.post(
      `/criteria/delete-criteria?crtId=${crtId}`,
    );
    return response.data;
  },

  saveVariable: async (crtId: string, variable: VariableDto): Promise<ApiResponse<VariableDto>> => {
    const response: AxiosResponse<ApiResponse<VariableDto>> = await privateApiClient.post('/criteria/save-variable', {
      crtId,
      variable,
    });
    return response.data;
  },

  deleteVariable: async (variableId: string) => {
    const response: AxiosResponse<ApiResponse<void>> = await privateApiClient.post(
      `/criteria/delete-variable?variableId=${variableId}`,
    );
    return response.data;
  },
};

export default criteriaService;
