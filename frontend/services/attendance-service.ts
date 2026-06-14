import apiClient from '@/lib/api';
import { AttendanceStatus, WorkRecord, YearlyAttendanceStat } from '@/types/index';

type ApiResponse<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

type AttendanceFilters = {
  year?: number;
  date?: string;
  employeeId?: string;
};

const unwrapData = <T>(response: ApiResponse<T>, fallback: T): T => {
  return response.data ?? fallback;
};

export const attendanceService = {

 getAttendance: async (filters: AttendanceFilters = {}): Promise<WorkRecord[]> => {
  const { date, year = new Date().getFullYear(), employeeId } = filters;
  const response = await apiClient.get<ApiResponse<WorkRecord[]>>(
    date ? '/attendance/daily-full' : '/attendance/yearly',  // ← changed
    {
      params: date ? { date, employeeId } : { year, employeeId },
    },
  );
  return unwrapData(response.data, []);
},

  getYearlyStats: async (year: number): Promise<YearlyAttendanceStat[]> => {
    const response = await apiClient.get<ApiResponse<YearlyAttendanceStat[]>>('/attendance/stats/yearly', {
      params: { year },
    });
    return unwrapData(response.data, []);
  },

  triggerSync: async (): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post('/device/sync');
    return response.data;
  },

  syncEmployees: async (): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post('/device/sync-employees');
    return response.data;
  },

  deleteRecord: async (id: number): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete(`/attendance/${id}`);
    return response.data;
  },
 updateStatus: async (
  id: number, 
  status: AttendanceStatus,
  employeeId?: string,
  date?: string,
): Promise<{ success: boolean; message: string }> => {
  const response = await apiClient.patch<{ success: boolean; message: string }>(
    `/attendance/${id}/status`, 
    { status, employeeId, date }
  );
  return response.data;
},
};
