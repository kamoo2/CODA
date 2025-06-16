import { privateApiClient, publicApiClient } from '@/apis/apiClient';
import { LoginRequest, LoginResponse, User } from '@/types/auth';
import { ApiResponse } from '@/types/common';

const authService = {
  login: async ({ email, password }: LoginRequest): Promise<ApiResponse<LoginResponse>> => {
    const response = await publicApiClient.post<ApiResponse<LoginResponse>>('/auth/login', { email, password });
    return response.data;
  },

  logout: async (): Promise<ApiResponse<void>> => {
    const response = await privateApiClient.post<ApiResponse<void>>('/auth/logout');
    return response.data;
  },

  refresh: async (): Promise<ApiResponse<LoginResponse>> => {
    const response = await publicApiClient.post<ApiResponse<LoginResponse>>('/auth/refresh');
    console.log(response);
    return response.data;
  },

  getUserDetails: async (): Promise<ApiResponse<User>> => {
    const response = await privateApiClient.get<ApiResponse<User>>('/auth/me');
    return response.data;
  },
};

export default authService;
