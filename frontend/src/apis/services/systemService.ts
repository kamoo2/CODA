import { privateApiClient } from '@/apis/apiClient';
import { ApiResponse } from '@/types/common';
import { FileExtensionDto, ParserDto } from '@/types/system';
import { Message } from '@/types/visualization';

const systemService = {
  getSupportedExtensions: async (): Promise<ApiResponse<FileExtensionDto[]>> => {
    const response = await privateApiClient.get('/system/extension');
    return response.data;
  },

  getSupportedParsers: async (): Promise<ApiResponse<ParserDto[]>> => {
    const response = await privateApiClient.get('/system/parser');
    return response.data;
  },

  getParsersByExtId: async (id: string): Promise<ApiResponse<ParserDto[]>> => {
    const response = await privateApiClient.get(`/system/extension/${id}/parser`);
    return response.data;
  },

  parsingDbcFile: async (id: string): Promise<ApiResponse<Message[]>> => {
    const response = await privateApiClient.post(`/system/dbc/${id}/parsing`);
    return response.data;
  },
};

export default systemService;
