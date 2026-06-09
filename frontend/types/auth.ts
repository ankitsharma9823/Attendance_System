export interface User {
  id: number;
  username: string;
  email: string;
  role?: string;
  employeeId: string; 
}

export interface AuthResponse {
  msg: string;
  message?: string;
  code?: string;
  token?: string;
  user?: User;
  email?: string;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface VerifyEmailPayload {
  email: string;
  otp: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  newPassword: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<AuthResponse>;
  logout: () => void;
}
