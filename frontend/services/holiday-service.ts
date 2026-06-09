import apiClient from '@/lib/api';
import { RequestStatus } from '@/types/index';

export interface Holiday {
  id: number;
  employeeId: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  status: RequestStatus;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
  employee?: {
    name: string;
    department: string | null;
  };
}

export const holidayService = {
  // Employee: submit leave request
  create: async (data: { startDate: string; endDate: string; reason: string }): Promise<Holiday> => {
    const response = await apiClient.post<Holiday>('/v1/holiday', data);
    return response.data;
  },

  // Employee: get own requests
  getMine: async (): Promise<Holiday[]> => {
    const response = await apiClient.get<Holiday[]>('/v1/holiday/mine');
    return response.data;
  },

  // Admin: get all requests
  getAll: async (): Promise<Holiday[]> => {
    const response = await apiClient.get<Holiday[]>('/v1/holiday/all');
    return response.data;
  },

  // Admin: approve/reject with note
  updateStatus: async (id: number, status: RequestStatus, adminNote: string): Promise<Holiday> => {
    const response = await apiClient.patch<Holiday>(`/v1/holiday/${id}/status`, { status, adminNote });
    return response.data;
  },
};