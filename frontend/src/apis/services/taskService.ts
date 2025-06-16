import { AxiosResponse } from 'axios';
import { privateApiClient } from '@/apis/apiClient';
import { ApiResponse } from '@/types/common';
import { TaskDto } from '@/types/task';

const taskService = {
  getTasks: async (): Promise<ApiResponse<TaskDto[]>> => {
    const response: AxiosResponse<ApiResponse<TaskDto[]>> = await privateApiClient.get('/task/tasks');
    return response.data; // ✅ Axios의 `data` 프로퍼티를 반환하여 오류 해결!
  },

  saveTask: async (task: TaskDto): Promise<ApiResponse<TaskDto>> => {
    const response: AxiosResponse<ApiResponse<TaskDto>> = await privateApiClient.post('/task/save-task', task);
    return response.data;
  },
};

export default taskService;
