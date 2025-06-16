import axios, { AxiosError, AxiosHeaders, AxiosResponse } from 'axios';
import { ApiResponse } from '@/types/common';
import authService from '@/apis/services/authService';

const BASE_URL = `${import.meta.env.VITE_API_SERVER_BASE_URL}/api`;

const createClient = () =>
  axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
    withCredentials: true, // ✅ 쿠키 기반 refreshToken 포함을 위해 필요
    headers: {
      'Content-Type': 'application/json',
    },
  });

const publicApiClient = createClient();
const privateApiClient = createClient();

publicApiClient.interceptors.response.use(
  async <T>(response: AxiosResponse<ApiResponse<T>>): Promise<AxiosResponse<ApiResponse<T>>> => {
    return response;
  },
  async (error: AxiosError<ApiResponse<null>>): Promise<AxiosResponse<ApiResponse<null>>> => {
    const errorCode = error.response?.data?.errorCode;

    if (errorCode === 'E401-03' || errorCode === 'E401-01') {
      // ✅ REFRESH_TOKEN_EXPIRED 또는 UNAUTHORIZED (로그아웃 처리)
      localStorage.removeItem('accessToken');
      localStorage.removeItem('userId');
      window.location.href = '/login';
    }

    return Promise.resolve({
      ...error.response,
      data: error.response?.data ?? {
        success: false,
        message: '서버 요청 중 오류가 발생했습니다.',
        errorCode: 'UNKNOWN_ERROR',
        result: null,
      },
    } as AxiosResponse<ApiResponse<null>>);
  },
);

//  요청 인터셉터: 모든 요청 전에 Access Token 확인 및 자동 갱신
privateApiClient.interceptors.request.use(
  async (config) => {
    const accessToken = localStorage.getItem('accessToken');

    if (accessToken) {
      config.headers = new AxiosHeaders(config.headers);
      config.headers.set('Authorization', `Bearer ${accessToken}`);
    }
    return config;
  },
  (error) => Promise.reject(error),
);

//  응답 인터셉터: 401 에러 발생 시 자동으로 Refresh Token 사용하여 재시도
privateApiClient.interceptors.response.use(
  async <T>(response: AxiosResponse<ApiResponse<T>>): Promise<AxiosResponse<ApiResponse<T>>> => {
    return response;
  },
  async (error: AxiosError<ApiResponse<null>>): Promise<AxiosResponse<ApiResponse<null>>> => {
    const errorCode = error.response?.data?.errorCode;
    if (errorCode === 'E401-02') {
      // ✅ ACCESS_TOKEN_EXPIRED
      try {
        const response = await authService.refresh();
        console.log(response);

        if (response.success && error.config) {
          const newAccessToken = response.result.accessToken;
          localStorage.setItem('accessToken', newAccessToken);

          error.config.headers = new AxiosHeaders(error.config.headers);
          error.config.headers.set('Authorization', `Bearer ${newAccessToken}`);

          // ✅ 다시 privateApiClient로 요청해야 함
          return await privateApiClient.request(error.config);
        }
      } catch (refreshError) {
        console.log('refreshError:', refreshError);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('userId');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    if (errorCode === 'E401-03' || errorCode === 'E401-01') {
      // ✅ REFRESH_TOKEN_EXPIRED 또는 UNAUTHORIZED (로그아웃 처리)
      localStorage.removeItem('accessToken');
      localStorage.removeItem('userId');
      window.location.href = '/login';
    }

    return Promise.resolve({
      ...error.response,
      data: error.response?.data ?? {
        success: false,
        message: '서버 요청 중 오류가 발생했습니다.',
        errorCode: 'UNKNOWN_ERROR',
        result: null,
      },
    } as AxiosResponse<ApiResponse<null>>);
  },
);

export { publicApiClient, privateApiClient };
