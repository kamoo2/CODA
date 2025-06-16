import { AxiosResponse } from 'axios';
import { privateApiClient } from '@/apis/apiClient';
import { ApiResponse, TreeNode } from '@/types/common';
import {
  CRITERIA_STATE,
  CurationProjectCriteriaDto,
  CurationResultDto,
  CurationProjectDto,
  ProjectFileDto,
} from '@/types/analysis';

const curationService = {
  getProjects: async (): Promise<ApiResponse<CurationProjectDto[]>> => {
    const response: AxiosResponse<ApiResponse<CurationProjectDto[]>> = await privateApiClient.get('/curation/projects');
    return response.data; // ✅ Axios의 `data` 프로퍼티를 반환하여 오류 해결!
  },

  getMyProjects: async (): Promise<ApiResponse<TreeNode<CurationProjectDto>[]>> => {
    const response: AxiosResponse<ApiResponse<TreeNode<CurationProjectDto>[]>> =
      await privateApiClient.get(`/curation/projects/my`);
    return response.data;
  },

  getProjectsByUserID: async (): Promise<ApiResponse<CurationProjectDto[]>> => {
    const response: AxiosResponse<ApiResponse<CurationProjectDto[]>> =
      await privateApiClient.get(`/curation/projects_by_userid`);
    return response.data;
  },

  saveProject: async (projectData: CurationProjectDto): Promise<ApiResponse<CurationProjectDto>> => {
    const response: AxiosResponse<ApiResponse<CurationProjectDto>> = await privateApiClient.post(
      '/curation/save_project',
      projectData,
    );
    return response.data;
  },

  deleteProject: async (projectId: string) => {
    const response: AxiosResponse<ApiResponse<void>> = await privateApiClient.post(
      `/curation/delete_project?projectId=${projectId}`,
    );
    return response.data;
  },

  updateProjectDescription: async (id: string, value: string) => {
    const response: AxiosResponse<ApiResponse<void>> = await privateApiClient.post(
      `/curation/updateProjectDescription`,
      {
        id,
        value,
      },
    );
    return response.data;
  },

  getProjectFiles: async (projectId: string): Promise<ApiResponse<ProjectFileDto[]>> => {
    const response: AxiosResponse<ApiResponse<ProjectFileDto[]>> = await privateApiClient.get(
      `/curation/project_file_by_projectId?projectId=${projectId}`,
    );
    return response.data;
  },

  saveProjectFile: async (projectData: ProjectFileDto): Promise<ApiResponse<ProjectFileDto>> => {
    const response: AxiosResponse<ApiResponse<ProjectFileDto>> = await privateApiClient.post(
      '/curation/save_project_file',
      projectData,
    );
    return response.data;
  },

  deleteProjectFile: async (projectId: string, fileId: string) => {
    const response: AxiosResponse<ApiResponse<void>> = await privateApiClient.post(`/curation/delete_project_file`, {
      projectId,
      fileId,
    });
    return response.data;
  },

  updateProjectCriteriaState: async (id: string, state: CRITERIA_STATE) => {
    const response: AxiosResponse<ApiResponse<void>> = await privateApiClient.post(
      `/curation/updateProjectCriteriaState`,
      { id, state },
    );
    return response.data;
  },

  getCriteriasByProjectID: async (projectId: string): Promise<ApiResponse<CurationProjectCriteriaDto[]>> => {
    const response: AxiosResponse<ApiResponse<CurationProjectCriteriaDto[]>> = await privateApiClient.get(
      `/curation/criterias?projectId=${projectId}`,
    );
    return response.data;
  },

  getCurationResultsByProjectId: async (projectId: string): Promise<ApiResponse<CurationResultDto[]>> => {
    const response: AxiosResponse<ApiResponse<CurationResultDto[]>> = await privateApiClient.get(
      `/curation/curation_results_by_projectId?projectId=${projectId}`,
    );
    return response.data;
  },

  saveProjectCriteria: async (crt: CurationProjectCriteriaDto): Promise<ApiResponse<CurationProjectCriteriaDto>> => {
    const response: AxiosResponse<ApiResponse<CurationProjectCriteriaDto>> = await privateApiClient.post(
      '/curation/save_project_criteria',
      crt,
    );
    return response.data;
  },

  deleteCurationResultsByProjectCriteriaId: async (projectCriteriaId: string) => {
    const response: AxiosResponse<ApiResponse<void>> = await privateApiClient.post(
      `/curation/delete_curation_results_by_prjCrtId?projectCriteriaId=${projectCriteriaId}`,
    );
    return response.data;
  },

  deleteProjectCriteria: async (projectCriteriaId: string) => {
    const response: AxiosResponse<ApiResponse<void>> = await privateApiClient.post(
      `/curation/delete_project_criteria?projectCriteriaId=${projectCriteriaId}`,
    );
    return response.data;
  },
};

export default curationService;
