import apiClient from '@/lib/api';
import {
  RegisterPayload,
  LoginPayload,
  VerifyEmailPayload,
  ForgotPasswordPayload,
  ResetPasswordPayload,
  AuthResponse,
} from '@/types/auth';

export const authService = {
  register: async (payload: RegisterPayload): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/admin/register', payload);
    return response.data;
  },

  verifyEmail: async (payload: VerifyEmailPayload): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/verify-email', payload);
    return response.data;
  },

  resendVerification: async (email: string): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/resend-verification', { email });
    return response.data;
  },

  login: async (payload: LoginPayload): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/login', payload);
    return response.data;
  },

  forgotPassword: async (payload: ForgotPasswordPayload): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/forgot-password', payload);
    return response.data;
  },

  resetPassword: async (payload: ResetPasswordPayload): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/reset-password', payload);
    return response.data;
  },
};
