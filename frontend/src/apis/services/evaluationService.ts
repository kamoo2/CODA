import { AxiosResponse } from 'axios';
import { privateApiClient } from '@/apis/apiClient';
import { ApiResponse, TreeNode } from '@/types/common';
import {
  EvalProjectCriteriaDto,
  EvalProjectDto,
  ProjectFileDto,
  PassEvalResultDto,
  CRITERIA_STATE,
  ScoreEvalResultDto,
  TaggingResultDto,
} from '@/types/analysis';

const evaluationService = {
  getProjects: async (): Promise<ApiResponse<EvalProjectDto[]>> => {
    const response: AxiosResponse<ApiResponse<EvalProjectDto[]>> = await privateApiClient.get('/evaluation/projects');
    return response.data; // ✅ Axios의 `data` 프로퍼티를 반환하여 오류 해결!
  },

  getMyEvalProjects: async (): Promise<ApiResponse<TreeNode<EvalProjectDto>[]>> => {
    const response: AxiosResponse<ApiResponse<TreeNode<EvalProjectDto>[]>> =
      await privateApiClient.get(`/evaluation/projects/my`);
    return response.data;
  },

  updateProjectByName: async (id: string, name: string): Promise<ApiResponse<EvalProjectDto>> => {
    const response = await privateApiClient.patch<ApiResponse<EvalProjectDto>>(`/evaluation/project/${id}/name`, {
      name: name,
    });
    return response.data;
  },

  getProjectsByUserID: async (): Promise<ApiResponse<EvalProjectDto[]>> => {
    const response: AxiosResponse<ApiResponse<EvalProjectDto[]>> =
      await privateApiClient.get(`/evaluation/projects_by_userid`);
    return response.data;
  },

  getEvalProjectFiles: async (projectId: string): Promise<ApiResponse<ProjectFileDto[]>> => {
    const response: AxiosResponse<ApiResponse<ProjectFileDto[]>> = await privateApiClient.get(
      `/evaluation/project_file_by_projectId?projectId=${projectId}`,
    );
    return response.data;
  },

  getPassCriteriasByProjectID: async (projectId: string): Promise<ApiResponse<EvalProjectCriteriaDto[]>> => {
    const response: AxiosResponse<ApiResponse<EvalProjectCriteriaDto[]>> = await privateApiClient.get(
      `/evaluation/pass_eval_criterias?projectId=${projectId}`,
    );
    return response.data;
  },

  getScoreCriteriasByProjectID: async (projectId: string): Promise<ApiResponse<EvalProjectCriteriaDto[]>> => {
    const response: AxiosResponse<ApiResponse<EvalProjectCriteriaDto[]>> = await privateApiClient.get(
      `/evaluation/score_eval_criterias?projectId=${projectId}`,
    );
    return response.data;
  },

  getTaggingCriteriasByProjectID: async (projectId: string): Promise<ApiResponse<EvalProjectCriteriaDto[]>> => {
    const response: AxiosResponse<ApiResponse<EvalProjectCriteriaDto[]>> = await privateApiClient.get(
      `/evaluation/tagging_criterias?projectId=${projectId}`,
    );
    return response.data;
  },

  getPassEvalResultsByProjectId: async (projectId: string): Promise<ApiResponse<PassEvalResultDto[]>> => {
    const response: AxiosResponse<ApiResponse<PassEvalResultDto[]>> = await privateApiClient.get(
      `/evaluation/pass_eval_results_by_projectId?projectId=${projectId}`,
    );
    return response.data;
  },

  getPassEvalResultsByEvaluationProjectCriteriaId: async (
    criteriaId: string,
  ): Promise<ApiResponse<PassEvalResultDto[]>> => {
    const response: AxiosResponse<ApiResponse<PassEvalResultDto[]>> = await privateApiClient.get(
      `/evaluation/pass_eval_results_by_criteriaId?criteriaId=${criteriaId}`,
    );
    return response.data;
  },

  getScoreEvalResultsByProjectId: async (projectId: string): Promise<ApiResponse<ScoreEvalResultDto[]>> => {
    const response: AxiosResponse<ApiResponse<ScoreEvalResultDto[]>> = await privateApiClient.get(
      `/evaluation/score_eval_results_by_projectId?projectId=${projectId}`,
    );
    return response.data;
  },

  getTaggingResultsByProjectId: async (projectId: string): Promise<ApiResponse<TaggingResultDto[]>> => {
    const response: AxiosResponse<ApiResponse<TaggingResultDto[]>> = await privateApiClient.get(
      `/evaluation/tagging_results_by_projectId?projectId=${projectId}`,
    );
    return response.data;
  },

  saveProject: async (projectData: EvalProjectDto): Promise<ApiResponse<EvalProjectDto>> => {
    const response: AxiosResponse<ApiResponse<EvalProjectDto>> = await privateApiClient.post(
      '/evaluation/save_project',
      projectData,
    );
    return response.data;
  },

  saveProjectCriteria: async (crt: EvalProjectCriteriaDto): Promise<ApiResponse<EvalProjectCriteriaDto>> => {
    const response: AxiosResponse<ApiResponse<EvalProjectCriteriaDto>> = await privateApiClient.post(
      '/evaluation/save_project_criteria',
      crt,
    );
    return response.data;
  },

  saveEvalProjectFile: async (projectData: ProjectFileDto): Promise<ApiResponse<ProjectFileDto>> => {
    const response: AxiosResponse<ApiResponse<ProjectFileDto>> = await privateApiClient.post(
      '/evaluation/save_project_file',
      projectData,
    );
    return response.data;
  },

  deleteProjectCriteria: async (projectCriteriaId: string) => {
    const response: AxiosResponse<ApiResponse<void>> = await privateApiClient.post(
      `/evaluation/delete_project_criteria?projectCriteriaId=${projectCriteriaId}`,
    );
    return response.data;
  },

  deletePassEvalResultsByEvaluationProjectCriteriaId: async (projectCriteriaId: string) => {
    const response: AxiosResponse<ApiResponse<void>> = await privateApiClient.post(
      `/evaluation/delete_pass_eval_results_by_prjCrtId?projectCriteriaId=${projectCriteriaId}`,
    );
    return response.data;
  },

  deleteScoreEvalResultsByEvaluationProjectCriteriaId: async (projectCriteriaId: string) => {
    const response: AxiosResponse<ApiResponse<void>> = await privateApiClient.post(
      `/evaluation/delete_score_eval_results_by_prjCrtId?projectCriteriaId=${projectCriteriaId}`,
    );
    return response.data;
  },

  deleteTaggingResultsByEvaluationProjectCriteriaId: async (projectCriteriaId: string) => {
    const response: AxiosResponse<ApiResponse<void>> = await privateApiClient.post(
      `/evaluation/delete_tagging_results_by_prjCrtId?projectCriteriaId=${projectCriteriaId}`,
    );
    return response.data;
  },

  deleteEvalProjectFile: async (projectId: string, fileId: string) => {
    const response: AxiosResponse<ApiResponse<void>> = await privateApiClient.post(`/evaluation/delete_project_file`, {
      projectId,
      fileId,
    });
    return response.data;
  },

  deleteProject: async (projectId: string) => {
    const response: AxiosResponse<ApiResponse<void>> = await privateApiClient.post(
      `/evaluation/delete_project?projectId=${projectId}`,
    );
    return response.data;
  },

  updateProjectCriteriaState: async (id: string, state: CRITERIA_STATE) => {
    const response: AxiosResponse<ApiResponse<void>> = await privateApiClient.post(
      `/evaluation/updateProjectCriteriaState`,
      { id, state },
    );
    return response.data;
  },

  updatePassEvalEnabled: async (id: string, value: boolean) => {
    const response: AxiosResponse<ApiResponse<void>> = await privateApiClient.post(
      `/evaluation/updatePassEvalEnabled`,
      { id, value },
    );
    return response.data;
  },

  updateScoreEvalEnabled: async (id: string, value: boolean) => {
    const response: AxiosResponse<ApiResponse<void>> = await privateApiClient.post(
      `/evaluation/updateScoreEvalEnabled`,
      { id, value },
    );
    return response.data;
  },

  updateTaggingEnabled: async (id: string, value: boolean) => {
    const response: AxiosResponse<ApiResponse<void>> = await privateApiClient.post(`/evaluation/updateTaggingEnabled`, {
      id,
      value,
    });
    return response.data;
  },

  updateTagColor: async (id: string, value: string) => {
    const response: AxiosResponse<ApiResponse<void>> = await privateApiClient.post(`/evaluation/updateTagColor`, {
      id,
      value,
    });
    return response.data;
  },

  updateEvalProjectDescription: async (id: string, value: string) => {
    const response: AxiosResponse<ApiResponse<void>> = await privateApiClient.post(
      `/evaluation/updateEvalProjectDescription`,
      {
        id,
        value,
      },
    );
    return response.data;
  },
};

export default evaluationService;
