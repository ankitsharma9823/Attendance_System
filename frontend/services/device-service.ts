import apiClient from '@/lib/api';

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export const deviceService = {
  syncEmployees: async (): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post<ApiResponse<{ success: boolean; message: string }>>('/device/sync-employees');
    return response.data.data;
  },

  restoreUsersFromDb: async (): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post<ApiResponse<{ success: boolean; message: string }>>('/device/sync-from-db');
    return response.data.data;
  },
};
