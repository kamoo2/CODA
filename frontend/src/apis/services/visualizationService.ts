import { privateApiClient } from '@/apis/apiClient';
import { ApiResponse, TreeNode } from '@/types/common';
import {
  BlueprintVisualizationStatus,
  StartVisualizationRequest,
  VisualizationProject,
  SimpleVisualizationProject,
  CreateProjectRequest,
  CreateProjectBlueprintSettingRequest,
} from '@/types/visualization';

const visualizationService = {
  getTeamProjects: async () => {
    const response = await privateApiClient.get<ApiResponse<TreeNode<SimpleVisualizationProject>[]>>(
      `/visualization/projects/my-team`,
    );
    return response.data;
  },
  getMyProjects: async () => {
    const response =
      await privateApiClient.get<ApiResponse<SimpleVisualizationProject[]>>(`/visualization/projects/my`);
    return response.data;
  },
  getProjectById: async (id: string) => {
    const response = await privateApiClient.get<ApiResponse<VisualizationProject>>(`/visualization/project/${id}`);
    return response.data; // ✅ 항상 `response.data`를 반환하도록 변경
  },
  startVisualization: async (projectId: string, blueprints: CreateProjectBlueprintSettingRequest[]) => {
    const request: StartVisualizationRequest = {
      projectId,
      blueprints,
    };

    const response = await privateApiClient.post<ApiResponse<VisualizationProject>>('/visualization/start', request);

    return response.data;
  },
  createProject: async (projectName: string, blueprints: CreateProjectBlueprintSettingRequest[]) => {
    const request: CreateProjectRequest = {
      projectName,
      blueprints,
    };
    const response = await privateApiClient.post<ApiResponse<SimpleVisualizationProject>>(
      '/visualization/project',
      request,
    );
    return response.data;
  },
  cloneProjectFromBlueprint: async (cloneId: string, projectName: string) => {
    const response =
      await privateApiClient.post<ApiResponse<SimpleVisualizationProject>>('/visualization/clone-project');
    return response.data;
  },
  updateVisualizationProjectByName: async (id: string, name: string) => {
    const response = await privateApiClient.patch<ApiResponse<SimpleVisualizationProject>>(
      `/visualization/project/${id}/name`,
      {
        name,
      },
    );
    return response.data;
  },

  deleteVisualizationProject: async (id: string) => {
    const response = await privateApiClient.delete<ApiResponse<void>>(`/visualization/project/${id}`);
    return response.data;
  },

  deleteVisualizationProjectByIds: async (ids: string[]) => {
    const response = await privateApiClient.delete<ApiResponse<void>>(`/visualization/projects`, { data: ids });
    return response.data;
  },

  checkUsedBlueprintSettings: async (blueprintSettings: CreateProjectBlueprintSettingRequest[]) => {
    const response = await privateApiClient.post<ApiResponse<BlueprintVisualizationStatus>>(
      `/visualization/blueprints/visualization-status`,
      blueprintSettings,
    );

    return response.data;
  },

  getRRDFiles: async (projectId: string) => {
    const response = await privateApiClient.get(`/visualization/rrd-files?projectId=${projectId}`);

    return response.data;
  },
};

export default visualizationService;
